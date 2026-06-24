import React, { useState } from 'react';
import { Settings, Download, Sparkles } from 'lucide-react';
import { useTokenTracker } from '../hooks/useTokenTracker';
import { useMessageTracker } from '../hooks/useMessageTracker';
import { Exporter } from '../export';
import PromptOptimizerModal from '../components/PromptOptimizerModal';

const ContentApp: React.FC = () => {
  const { tokens, todayTotal, contextLimit } = useTokenTracker();
  const { stats } = useMessageTracker();
  const [isOptimizerOpen, setIsOptimizerOpen] = useState(false);

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

  // Estimate average turn size and remaining messages in this chat before context limit
  const userMessages = document.querySelectorAll('.font-user-message, [data-is-user="true"], [data-testid*="user-message"], [data-message-author="user"], .user-message, [class*="user-message"], [class*="UserMessage"]');
  const turnsCount = userMessages.length;
  
  // Calculate average tokens per turn. Enforce a minimum average turn size of 2500 tokens to keep estimates realistic.
  const avgTurnTokens = Math.max(2500, turnsCount > 0 ? (tokens.total / turnsCount) : 2500);
  
  // Remaining tokens capacity
  const remainingTokens = Math.max(0, contextLimit - tokens.total);
  
  // Remaining messages before hitting the limit
  const chatMessagesLeft = Math.floor(remainingTokens / Math.max(1, avgTurnTokens));

  const barColor = stats.sessionPercentage > 90
    ? 'bg-gradient-to-r from-red-500 to-rose-400'
    : stats.sessionPercentage > 75
      ? 'bg-gradient-to-r from-amber-500 to-orange-400'
      : 'bg-gradient-to-r from-orange-500 to-amber-400';

  const disclaimerText = "⚠ Estimate excludes: uploaded files, project knowledge, system prompts, and prompt cache. Actual usage may be higher.";

  return (
    <>
      <div className="flex items-center justify-between w-full border-t border-white/[0.06] pt-2 pb-1.5 px-4 text-gray-400 text-[11px] font-sans transition-all select-none">
        {/* Left Side: Session & Today */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 cursor-help" title={disclaimerText}>
            <span className="font-semibold text-[9px] uppercase tracking-wider text-orange-300/70">Session</span>
            <span className="font-mono text-[11px] text-orange-200 font-semibold whitespace-nowrap">{stats.sessionPercentage}%</span>
            
            <div className="w-48 h-1 bg-white/[0.04] rounded-full overflow-hidden border border-white/[0.04]">
              <div 
                className={`h-full rounded-full transition-all duration-700 ease-out ${barColor}`}
                style={{ 
                  width: `${Math.max(Math.min(stats.sessionPercentage, 100), 2)}%`,
                  boxShadow: stats.sessionPercentage > 0 ? '0 0 6px rgba(251,146,60,0.35)' : 'none'
                }}
              />
            </div>
          </div>

          <span className="text-white/10">│</span>

          <div className="flex items-center gap-1 cursor-help" title={disclaimerText}>
            <span className="font-semibold text-[9px] uppercase tracking-wider text-gray-500">Today</span>
            <span className="font-mono text-[11px] text-orange-400 font-medium whitespace-nowrap">{todayTotal.toLocaleString()}</span>
          </div>
        </div>

        {/* Center: Actions */}
        <div className="flex items-center gap-0.5">
          <button 
            onClick={() => setIsOptimizerOpen(true)} 
            className="p-1 hover:bg-orange-500/10 rounded transition-colors text-gray-500 hover:text-orange-300 group relative cursor-pointer"
            title="Optimize Prompt"
          >
            <Sparkles size={12} />
          </button>
          <button 
            onClick={handleExport} 
            className="p-1 hover:bg-orange-500/10 rounded transition-colors text-gray-500 hover:text-orange-300 group relative cursor-pointer" 
            title="Export Markdown"
          >
            <Download size={12} />
          </button>
          <button 
            onClick={handleOpenSettings} 
            className="p-1 hover:bg-orange-500/10 rounded transition-colors text-gray-500 hover:text-orange-300 group relative cursor-pointer" 
            title="Settings"
          >
            <Settings size={12} />
          </button>
        </div>

        {/* Right Side: Chat Capacity & Reset Timer */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1" title="Remaining messages in this chat before hitting context window limit">
            <span className="text-gray-500 font-medium">Chat Left:</span>
            <span className="font-mono text-gray-400 font-semibold">{chatMessagesLeft}</span>
          </div>

          <span className="text-white/10">│</span>

          <div className="flex items-center gap-1" title="Time until rate limit usage resets">
            <span className="text-gray-500 font-medium">Reset:</span>
            <span className="font-mono text-gray-400">{stats.resetTime}</span>
          </div>
        </div>
      </div>
      {isOptimizerOpen && <PromptOptimizerModal onClose={() => setIsOptimizerOpen(false)} />}
    </>
  );
};

export default ContentApp;
