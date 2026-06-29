import React, { useState, useEffect } from 'react';
import { X, Loader2, Sparkles, AlertCircle, CheckCircle2 } from 'lucide-react';
import { OPTIMIZATION_PROFILES, localOptimizePrompt } from '../utils/promptOptimizer';
import { CLAUDE_INPUT_SELECTOR } from '../utils/domConstants';
import { COPY_FEEDBACK_DURATION_MS } from '../utils/constants';

interface PromptOptimizerModalProps {
  onClose: () => void;
}

/**
 * A modal that allows users to optimize their current prompt using either
 * local rule-based personas or the Anthropic API (if configured).
 */
const PromptOptimizerModal: React.FC<PromptOptimizerModalProps> = ({ onClose }) => {
  const [rawPrompt, setRawPrompt] = useState('');
  const [optimizedPrompt, setOptimizedPrompt] = useState('');
  const [selectedProfile, setSelectedProfile] = useState('general');
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasApiKey, setHasApiKey] = useState(false);
  const [useApi, setUseApi] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [isReplaced, setIsReplaced] = useState(false);

  useEffect(() => {
    // 1. Check API key status
    chrome.runtime.sendMessage({ action: 'get_public_settings' }, (response) => {
      if (response && response.success) {
        setHasApiKey(response.hasApiKey);
        setUseApi(response.hasApiKey);
      }
    });

    // 2. Grab current text from the chat input box
    const inputElement = document.querySelector(CLAUDE_INPUT_SELECTOR);
    if (inputElement) {
      setRawPrompt(inputElement.textContent || '');
    }
  }, []);

  const handleOptimize = async () => {
    if (!rawPrompt.trim()) {
      setError('Please enter a prompt first.');
      return;
    }

    setIsOptimizing(true);
    setError(null);

    const profile = OPTIMIZATION_PROFILES.find((p) => p.id === selectedProfile) || OPTIMIZATION_PROFILES[0];

    if (!useApi) {
      // Local optimization (instant)
      const optimized = localOptimizePrompt(rawPrompt, profile.id);
      setOptimizedPrompt(optimized);
      setIsOptimizing(false);
      return;
    }

    // API optimization
    chrome.runtime.sendMessage(
      {
        action: 'optimize_prompt',
        systemPrompt: profile.systemPrompt,
        userPrompt: rawPrompt,
      },
      (response) => {
        setIsOptimizing(false);
        if (response && response.success) {
          setOptimizedPrompt(response.optimizedText);
        } else {
          setError(response?.error || 'Failed to optimize prompt. Check your API key.');
        }
      }
    );
  };

  const handleCopy = async () => {
    if (!optimizedPrompt) return;
    try {
      await navigator.clipboard.writeText(optimizedPrompt);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), COPY_FEEDBACK_DURATION_MS);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  const handleReplace = () => {
    if (!optimizedPrompt) return;
    const inputElement = document.querySelector(CLAUDE_INPUT_SELECTOR) as HTMLElement;
    
    if (inputElement) {
      inputElement.focus();
      const successful = document.execCommand('insertText', false, optimizedPrompt);
      if (!successful) {
        inputElement.textContent = optimizedPrompt;
      }
      
      setIsReplaced(true);
      setTimeout(() => {
        setIsReplaced(false);
        onClose();
      }, 500);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 font-sans text-gray-200">
      <div
        className="w-full max-w-2xl bg-[#1e1b26] border border-white/[0.08] rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        style={{ maxHeight: '90vh' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06] bg-white/[0.02]">
          <div className="flex items-center gap-2 text-orange-400">
            <Sparkles size={18} />
            <h2 className="text-sm font-semibold tracking-wide uppercase text-gray-200">Prompt Optimizer</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-5 scrollbar-thin">
          {/* Engine Selection */}
          <div className="flex flex-col gap-2">
            <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Engine</label>
            <div className="flex bg-black/20 rounded-lg p-1 border border-white/[0.04]">
              <button
                onClick={() => setUseApi(false)}
                className={`flex-1 py-1.5 px-3 text-xs font-medium rounded-md transition-all cursor-pointer ${
                  !useApi ? 'bg-orange-500/20 text-orange-400 shadow-sm' : 'text-gray-400 hover:text-gray-300'
                }`}
              >
                Local (Rule-based)
              </button>
              <button
                onClick={() => setUseApi(true)}
                disabled={!hasApiKey}
                title={!hasApiKey ? 'Requires Anthropic API Key in Settings' : ''}
                className={`flex-1 py-1.5 px-3 text-xs font-medium rounded-md transition-all cursor-pointer ${
                  useApi
                    ? 'bg-orange-500/20 text-orange-400 shadow-sm'
                    : 'text-gray-400 hover:text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed'
                }`}
              >
                API (AI Rewrite)
              </button>
            </div>
            {!hasApiKey && (
              <p className="text-[10px] text-gray-500 mt-1 flex items-center gap-1">
                <AlertCircle size={10} />
                To use the AI-powered rewrite engine, configure your Anthropic API Key in the extension Settings.
              </p>
            )}
          </div>

          {/* Profile Selection */}
          <div className="flex flex-col gap-2">
            <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Profile</label>
            <div className="grid grid-cols-2 gap-2">
              {OPTIMIZATION_PROFILES.map((profile) => (
                <button
                  key={profile.id}
                  onClick={() => setSelectedProfile(profile.id)}
                  className={`flex flex-col items-start p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    selectedProfile === profile.id
                      ? 'border-orange-500/50 bg-orange-500/10'
                      : 'border-white/[0.06] bg-black/20 hover:border-white/20'
                  }`}
                >
                  <span className={`text-sm font-semibold ${selectedProfile === profile.id ? 'text-orange-400' : 'text-gray-300'}`}>
                    {profile.name}
                  </span>
                  <span className="text-[10px] text-gray-500 mt-1 leading-relaxed line-clamp-2">
                    {profile.description}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Raw Prompt */}
          <div className="flex flex-col gap-2">
            <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Your Prompt</label>
            <textarea
              value={rawPrompt}
              onChange={(e) => setRawPrompt(e.target.value)}
              className="w-full h-24 bg-black/30 border border-white/[0.06] rounded-xl p-3 text-sm text-gray-300 focus:outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/50 resize-y"
              placeholder="Enter your prompt here..."
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl text-xs flex items-start gap-2">
              <AlertCircle size={14} className="shrink-0 mt-0.5" />
              <p>{error}</p>
            </div>
          )}

          {/* Action Button */}
          <button
            onClick={handleOptimize}
            disabled={isOptimizing || !rawPrompt.trim()}
            className="w-full py-3 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
          >
            {isOptimizing ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Optimizing...
              </>
            ) : (
              <>
                <Sparkles size={16} />
                Optimize Prompt
              </>
            )}
          </button>

          {/* Optimized Output */}
          {optimizedPrompt && (
            <div className="flex flex-col gap-2 mt-2 pt-5 border-t border-white/[0.06] animate-in fade-in slide-in-from-bottom-2">
              <label className="text-[11px] font-semibold text-orange-400 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles size={12} /> Optimized Result
              </label>
              <div className="relative">
                <textarea
                  readOnly
                  value={optimizedPrompt}
                  className="w-full h-40 bg-[#14121a] border border-orange-500/30 rounded-xl p-3 text-sm text-orange-50/90 focus:outline-none resize-y"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleCopy}
                  className="flex-1 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 font-medium rounded-lg transition-colors flex items-center justify-center gap-2 text-sm cursor-pointer"
                >
                  {isCopied ? <CheckCircle2 size={16} className="text-green-400" /> : 'Copy Text'}
                </button>
                <button
                  onClick={handleReplace}
                  className="flex-1 py-2 bg-orange-500/20 hover:bg-orange-500/30 border border-orange-500/40 text-orange-400 font-medium rounded-lg transition-colors flex items-center justify-center gap-2 text-sm cursor-pointer"
                >
                  {isReplaced ? <CheckCircle2 size={16} /> : 'Replace in Chat'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PromptOptimizerModal;
