import React, { useState, useEffect } from 'react';
import { X, Sparkles, Copy, Check, AlertTriangle } from 'lucide-react';
import { OPTIMIZATION_PROFILES, localOptimizePrompt } from '../utils/promptOptimizer';

interface PromptOptimizerModalProps {
  onClose: () => void;
}

const PromptOptimizerModal: React.FC<PromptOptimizerModalProps> = ({ onClose }) => {
  const [rawPrompt, setRawPrompt] = useState('');
  const [selectedProfile, setSelectedProfile] = useState('general');
  const [optimizedPrompt, setOptimizedPrompt] = useState('');
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [hasKey, setHasKey] = useState(false);

  useEffect(() => {
    // Check if user has API key configured
    chrome.runtime.sendMessage({ action: 'get_public_settings' }, (response) => {
      if (response && response.success) {
        setHasKey(response.hasApiKey);
      }
    });

    // Grab text currently in Claude's text input box (if any)
    const inputElement = document.querySelector(
      'form div[contenteditable="true"], fieldset div[contenteditable="true"], div[contenteditable="true"]'
    ) as HTMLDivElement;
    if (inputElement) {
      setRawPrompt(inputElement.textContent || '');
    }
  }, []);

  const activeProfile = OPTIMIZATION_PROFILES.find((p) => p.id === selectedProfile) || OPTIMIZATION_PROFILES[0];

  const handleAIOptimize = () => {
    if (!rawPrompt.trim()) return;
    setIsOptimizing(true);
    setError(null);

    chrome.runtime.sendMessage(
      {
        action: 'optimize_prompt',
        systemPrompt: activeProfile.systemPrompt,
        userPrompt: rawPrompt
      },
      (response) => {
        setIsOptimizing(false);
        if (response && response.success && response.optimizedText) {
          setOptimizedPrompt(response.optimizedText);
        } else {
          setError(
            response?.error || 'Failed to optimize prompt. Please check your network or API Key settings.'
          );
        }
      }
    );
  };

  const handleLocalOptimize = () => {
    if (!rawPrompt.trim()) return;
    setError(null);
    const optimized = localOptimizePrompt(rawPrompt, selectedProfile);
    setOptimizedPrompt(optimized);
  };

  const handleCopyToClipboard = async () => {
    if (!optimizedPrompt) return;
    try {
      await navigator.clipboard.writeText(optimizedPrompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const handleUsePrompt = () => {
    if (!optimizedPrompt) return;
    
    const inputElement = document.querySelector(
      'form div[contenteditable="true"], fieldset div[contenteditable="true"], div[contenteditable="true"]'
    ) as HTMLDivElement;
    
    if (inputElement) {
      inputElement.focus();
      try {
        // Select all text and replace with optimized version to trigger React states correctly
        document.execCommand('selectAll', false, undefined);
        document.execCommand('insertText', false, optimizedPrompt);
      } catch (err) {
        console.warn('execCommand failed, using textContent fallback', err);
        inputElement.textContent = optimizedPrompt;
        inputElement.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
      }
    }
    onClose();
  };

  const handleOpenSettings = () => {
    chrome.runtime.sendMessage({ action: 'open_options' });
  };

  return (
    <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 font-sans text-gray-200">
      <div 
        className="bg-[#1e1e2e] border border-white/10 rounded-2xl w-full max-w-[620px] max-h-[90vh] overflow-hidden flex flex-col shadow-2xl animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-white/5 flex items-center justify-between bg-[#1b1b2a]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center border border-indigo-500/30 text-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.25)]">
              <Sparkles size={16} />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-wide">Prompt Optimizer</h2>
              <p className="text-[11px] text-gray-400">Structure and refine your prompts for the best results with Claude</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 hover:bg-white/10 text-gray-400 hover:text-white rounded-lg transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4 bg-[#141421]/50">
          
          {/* Profile Selector */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-indigo-400 block">
              Optimization Profile
            </label>
            <div className="flex rounded-lg bg-[#111118] p-1 gap-1 border border-white/5">
              {OPTIMIZATION_PROFILES.map((profile) => (
                <button
                  key={profile.id}
                  onClick={() => setSelectedProfile(profile.id)}
                  className={`flex-1 py-2 px-1 text-[11px] font-semibold rounded-md transition-all ${
                    selectedProfile === profile.id
                      ? 'bg-indigo-600 text-white shadow'
                      : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
                  }`}
                >
                  {profile.name}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-gray-400 italic px-1">
              {activeProfile.description}
            </p>
          </div>

          {/* Raw Prompt Textarea */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <label className="text-[10px] font-bold uppercase tracking-wider text-indigo-400">
                Your Raw Prompt
              </label>
              <span className="text-[10px] text-gray-500 font-mono">
                {rawPrompt.length} chars
              </span>
            </div>
            <textarea
              value={rawPrompt}
              onChange={(e) => setRawPrompt(e.target.value)}
              placeholder="Paste or type your prompt here..."
              className="w-full h-32 bg-[#111118] border border-gray-700 rounded-xl px-4 py-3 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition-colors resize-none font-sans"
            />
          </div>

          {/* Optimizer Action Buttons */}
          <div className="flex gap-3">
            {hasKey ? (
              <button
                onClick={handleAIOptimize}
                disabled={isOptimizing || !rawPrompt.trim()}
                className="flex-1 bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 disabled:opacity-50 text-white py-2.5 px-4 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/10 cursor-pointer"
              >
                {isOptimizing ? (
                  <>
                    <svg className="animate-spin h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Optimizing via AI...
                  </>
                ) : (
                  <>
                    <Sparkles size={13} />
                    AI Optimize
                  </>
                )}
              </button>
            ) : (
              <button
                onClick={handleOpenSettings}
                className="flex-1 bg-[#2a1b1b] border border-amber-500/20 hover:border-amber-500/30 text-amber-300 py-2.5 px-4 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <AlertTriangle size={13} className="text-amber-400" />
                Configure API Key for AI Optimization
              </button>
            )}
            
            <button
              onClick={handleLocalOptimize}
              disabled={isOptimizing || !rawPrompt.trim()}
              className="px-4 py-2.5 bg-white/5 hover:bg-white/10 disabled:opacity-50 border border-white/5 rounded-xl text-xs font-semibold text-gray-300 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              title="Apply quick formatting templates offline"
            >
              Local Optimize
            </button>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 flex gap-2.5 items-start">
              <AlertTriangle size={14} className="text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-[11px] text-red-200/80 leading-relaxed">{error}</p>
            </div>
          )}

          {/* Optimized Output */}
          {optimizedPrompt && (
            <div className="space-y-2 pt-2 border-t border-white/5 animate-in fade-in slide-in-from-bottom-3 duration-300">
              <div className="flex justify-between items-center">
                <label className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                  Optimized Prompt Preview
                </label>
                <button
                  onClick={handleCopyToClipboard}
                  className="flex items-center gap-1 text-[10px] text-indigo-400 hover:text-indigo-300 transition-colors font-medium px-2 py-1 rounded bg-indigo-500/5 border border-indigo-500/10 cursor-pointer"
                >
                  {copied ? (
                    <>
                      <Check size={10} className="text-emerald-400" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy size={10} />
                      Copy
                    </>
                  )}
                </button>
              </div>
              <textarea
                value={optimizedPrompt}
                onChange={(e) => setOptimizedPrompt(e.target.value)}
                className="w-full h-40 bg-[#111118] border border-emerald-500/20 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-emerald-500 transition-colors resize-none font-sans"
              />
            </div>
          )}
        </div>

        {/* Footer Actions */}
        {optimizedPrompt && (
          <div className="p-4 border-t border-white/5 bg-[#1b1b2a] flex justify-end gap-3">
            <button
              onClick={() => setOptimizedPrompt('')}
              className="px-4 py-2 hover:bg-white/5 text-gray-400 hover:text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer"
            >
              Reset
            </button>
            <button
              onClick={handleUsePrompt}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2 px-5 rounded-xl text-xs flex items-center gap-1.5 transition-colors shadow-lg shadow-emerald-600/10 cursor-pointer"
            >
              <Check size={13} />
              Use Optimized Prompt
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default PromptOptimizerModal;
