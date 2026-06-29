import React, { useState } from 'react';
import { Settings, Download, Sparkles } from 'lucide-react';
import { useTokenTracker } from '../hooks/useTokenTracker';
import { useMessageTracker } from '../hooks/useMessageTracker';
import { Exporter } from '../export';
import PromptOptimizerModal from '../components/PromptOptimizerModal';
import { isContextValid, dedupeByAncestor } from '../utils/chromeHelpers';
import { USER_MESSAGE_SELECTOR_STRING } from '../utils/domConstants';
import { getUsageBarColor } from '../utils/domConstants';
import { MIN_TOKENS_PER_TURN, MIN_PROGRESS_BAR_PERCENT } from '../utils/constants';

const DISCLAIMER_TEXT = '⚠ Estimate excludes: uploaded files, project knowledge, system prompts, and prompt cache. Actual usage may be higher.';

/** Main content widget injected below the Claude chat input box. */
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
      lastUpdated: Date.now(),
    });
  };

  const handleOpenSettings = () => {
    if (!isContextValid()) return;
    chrome.runtime.sendMessage({ action: 'open_options' });
  };

  const rawUserMessages = Array.from(document.querySelectorAll(USER_MESSAGE_SELECTOR_STRING));
  const turnsCount = dedupeByAncestor(rawUserMessages).length;
  const avgTurnTokens = Math.max(MIN_TOKENS_PER_TURN, turnsCount > 0 ? tokens.total / turnsCount : MIN_TOKENS_PER_TURN);
  const remainingTokens = Math.max(0, contextLimit - tokens.total);
  const chatMessagesLeft = Math.floor(remainingTokens / Math.max(1, avgTurnTokens));

  const barColor = getUsageBarColor(stats.sessionPercentage);

  return (
    <>
      <div className="flex items-center justify-between w-full border-t border-white/[0.06] pt-2 pb-1.5 px-4 text-gray-400 text-[11px] font-sans transition-all select-none">
        {/* Left Side: Session & Today */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 cursor-help" title={DISCLAIMER_TEXT}>
            <span className="font-semibold text-[9px] uppercase tracking-wider text-orange-300/70">Session</span>
            <span className="font-mono text-[11px] text-orange-200 font-semibold whitespace-nowrap">{stats.sessionPercentage}%</span>
            <div className="w-48 h-1 bg-white/[0.04] rounded-full overflow-hidden border border-white/[0.04]">
              <div
                className={`h-full rounded-full transition-all duration-700 ease-out ${barColor}`}
                style={{
                  width: `${Math.max(Math.min(stats.sessionPercentage, 100), MIN_PROGRESS_BAR_PERCENT)}%`,
                  boxShadow: stats.sessionPercentage > 0 ? '0 0 6px rgba(251,146,60,0.35)' : 'none',
                }}
              />
            </div>
          </div>

          <span className="text-white/10">│</span>

          <div className="flex items-center gap-1 cursor-help" title={DISCLAIMER_TEXT}>
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
