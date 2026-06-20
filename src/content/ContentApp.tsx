import React, { useState } from 'react';
import { Settings, Download, BarChart2, X, Sparkles } from 'lucide-react';
import { useTokenTracker } from '../hooks/useTokenTracker';
import { Exporter } from '../export';
import PromptOptimizerModal from '../components/PromptOptimizerModal';

const ContentApp: React.FC = () => {
  const { tokens, isExact, contextLimit, isTruncated, todayTotal } = useTokenTracker();
  const [isOptimizerOpen, setIsOptimizerOpen] = useState(false);
  const contextPercentage = (tokens.total / contextLimit) * 100;
  
  // Estimate cost based on Claude 3 Opus pricing ($15/M input)
  const estimatedCost = (tokens.total / 1000000) * 15;

  const handleExport = () => {
    const text = document.querySelector('.flex-1.overflow-hidden')?.textContent || document.body.textContent || '';
    Exporter.exportMarkdown({
      id: Date.now().toString(),
      url: window.location.href,
      title: document.title || 'Claude Chat',
      messages: [{ id: '1', role: 'user', content: text, tokens: tokens.total, timestamp: Date.now() }],
      totalInputTokens: tokens.input,
      totalOutputTokens: tokens.output,
      lastUpdated: Date.now()
    });
  };

  const handleOpenSettings = () => {
    chrome.runtime.sendMessage({ action: 'open_options' });
  };

  return (
    <>
      <div className="flex items-center gap-4 bg-transparent text-gray-400 px-1 py-0.5 rounded text-[11px] font-sans transition-all">
        
        <div className="flex items-center gap-2">
          <span className="font-semibold text-[10px] uppercase tracking-wider text-gray-300">Context</span>
          {isExact ? (
            <span className="bg-emerald-500/20 text-emerald-400 text-[9px] px-1.5 py-0.5 rounded flex items-center font-medium">Exact</span>
          ) : (
            <span className="bg-amber-500/20 text-amber-400 text-[9px] px-1.5 py-0.5 rounded flex items-center font-medium">Est.</span>
          )}
          {isTruncated && (
            <span className="bg-red-500/20 text-red-400 text-[9px] px-1.5 py-0.5 rounded flex items-center font-medium" title="Estimate based on partial text">Truncated</span>
          )}
          
          <div className="flex items-center gap-3 ml-1">
            <div className="flex flex-col items-end">
              <span className="font-mono text-xs text-white font-medium whitespace-nowrap">{tokens.total.toLocaleString()} <span className="text-gray-500 text-[9px]">/ {contextLimit.toLocaleString()}</span></span>
              <span className="font-mono text-[9px] text-emerald-400 opacity-80 whitespace-nowrap">${estimatedCost.toFixed(4)} est.</span>
            </div>
            <div className="w-32 h-2 bg-black/40 rounded-full overflow-hidden shadow-inner">
              <div 
                className={`h-full rounded-full transition-all duration-500 ${contextPercentage > 90 ? 'bg-red-500' : contextPercentage > 75 ? 'bg-amber-500' : 'bg-indigo-500'}`}
                style={{ width: `${Math.min(contextPercentage, 100)}%` }}
              />
            </div>
          </div>
          
          <div className="h-4 w-px bg-white/20 mx-1"></div>
          <div className="flex flex-col items-start pl-1">
            <span className="font-semibold text-[8px] uppercase tracking-wider text-gray-500">Today</span>
            <span className="font-mono text-[11px] text-indigo-400 font-medium whitespace-nowrap">{todayTotal.toLocaleString()}</span>
          </div>
        </div>

        <div className="flex items-center gap-0.5 ml-2">
          <button 
            onClick={() => setIsOptimizerOpen(true)} 
            className="p-1 hover:bg-white/10 rounded transition-colors text-gray-500 hover:text-white group relative"
            title="Optimize Prompt"
          >
            <Sparkles size={12} />
          </button>
          <button onClick={handleExport} className="p-1 hover:bg-white/10 rounded transition-colors text-gray-500 hover:text-white group relative" title="Export Markdown">
            <Download size={12} />
          </button>
          <button onClick={handleOpenSettings} className="p-1 hover:bg-white/10 rounded transition-colors text-gray-500 hover:text-white group relative" title="Settings">
            <Settings size={12} />
          </button>
        </div>
      </div>
      {isOptimizerOpen && <PromptOptimizerModal onClose={() => setIsOptimizerOpen(false)} />}
    </>
  );
};

export default ContentApp;
