import React, { useState, useEffect, useRef } from 'react';
import { Settings } from 'lucide-react';
import { useMessageTracker } from '../hooks/useMessageTracker';
import { isContextValid } from '../utils/chromeHelpers';
import { getUsageBarColor } from '../utils/domConstants';
import { COLLAPSED_SIDEBAR_THRESHOLD_PX, MIN_PROGRESS_BAR_PERCENT } from '../utils/constants';

/** Sidebar usage widget injected into Claude's navigation panel. */
const SidebarApp: React.FC = () => {
  const { stats } = useMessageTracker();
  const containerRef = useRef<HTMLDivElement>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setIsCollapsed(entry.contentRect.width < COLLAPSED_SIDEBAR_THRESHOLD_PX);
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const handleOpenSettings = () => {
    if (!isContextValid()) return;
    chrome.runtime.sendMessage({ action: 'open_options' });
  };

  const sessionBarColor = getUsageBarColor(stats.sessionPercentage);
  const weeklyBarColor = getUsageBarColor(stats.weeklyPercentage);

  return (
    <div
      ref={containerRef}
      className={`flex flex-col rounded-xl border border-white/[0.06] font-sans select-none mb-3 transition-all duration-300 ${
        isCollapsed ? 'gap-2 py-3 px-1 text-[10px] items-center' : 'gap-2.5 py-3 px-3 text-[12px]'
      }`}
      style={{ background: 'linear-gradient(135deg, rgba(30,27,38,0.95) 0%, rgba(25,22,35,0.98) 100%)' }}
    >
      {isCollapsed ? (
        <>
          {/* Pulsing indicator & Settings Button */}
          <div className="flex flex-col items-center gap-1.5 mb-0.5">
            <span className="w-1.5 h-1.5 rounded-full bg-orange-400 shadow-[0_0_6px_rgba(251,146,60,0.6)] animate-pulse"></span>
            <button
              onClick={handleOpenSettings}
              className="text-gray-500 hover:text-orange-400 transition-colors cursor-pointer"
              title="Open Settings"
            >
              <Settings size={13} />
            </button>
          </div>

          {/* Session (5h) */}
          <div className="flex flex-col items-center w-full gap-0.5 px-1">
            <span className="text-gray-500 font-semibold text-[8px] uppercase tracking-wider">Ses</span>
            <span className="font-mono font-semibold text-orange-300 text-[10px]">{stats.sessionPercentage}%</span>
            <div className="w-full h-1 bg-white/[0.04] rounded-full overflow-hidden border border-white/[0.04] mt-0.5">
              <div
                className={`h-full rounded-full transition-all duration-700 ease-out ${sessionBarColor}`}
                style={{ width: `${Math.max(stats.sessionPercentage, MIN_PROGRESS_BAR_PERCENT)}%` }}
              />
            </div>
          </div>

          {/* Weekly */}
          <div className="flex flex-col items-center w-full gap-0.5 px-1">
            <span className="text-gray-500 font-semibold text-[8px] uppercase tracking-wider">Wk</span>
            <span className="font-mono font-semibold text-orange-300 text-[10px]">{stats.weeklyPercentage}%</span>
            <div className="w-full h-1 bg-white/[0.04] rounded-full overflow-hidden border border-white/[0.04] mt-0.5">
              <div
                className={`h-full rounded-full transition-all duration-700 ease-out ${weeklyBarColor}`}
                style={{ width: `${Math.max(stats.weeklyPercentage, MIN_PROGRESS_BAR_PERCENT)}%` }}
              />
            </div>
          </div>
        </>
      ) : (
        <>
          {/* Header */}
          <div className="flex items-center justify-between mb-0.5">
            <span className="flex items-center gap-1.5 font-semibold text-[10px] tracking-widest uppercase text-gray-400">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-400 shadow-[0_0_6px_rgba(251,146,60,0.6)] animate-pulse"></span>
              Usage
            </span>
            <button
              onClick={handleOpenSettings}
              className="text-gray-500 hover:text-orange-400 transition-colors cursor-pointer"
              title="Open Settings"
            >
              <Settings size={13} />
            </button>
          </div>

          {/* Session (5h) */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <span className="text-gray-400 font-medium">Session (5h):</span>
              <span className="font-mono font-semibold text-orange-300 text-[12px]">{stats.sessionPercentage}%</span>
            </div>
            <div className="w-full h-2 bg-white/[0.04] rounded-full overflow-hidden border border-white/[0.04]">
              <div
                className={`h-full rounded-full transition-all duration-700 ease-out ${sessionBarColor}`}
                style={{
                  width: `${Math.max(stats.sessionPercentage, MIN_PROGRESS_BAR_PERCENT)}%`,
                  boxShadow: stats.sessionPercentage > 0 ? '0 0 8px rgba(251,146,60,0.3)' : 'none',
                }}
              />
            </div>
          </div>

          {/* Weekly */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <span className="text-gray-400 font-medium">Weekly:</span>
              <span className="font-mono font-semibold text-orange-300 text-[12px]">{stats.weeklyPercentage}%</span>
            </div>
            <div className="w-full h-2 bg-white/[0.04] rounded-full overflow-hidden border border-white/[0.04]">
              <div
                className={`h-full rounded-full transition-all duration-700 ease-out ${weeklyBarColor}`}
                style={{
                  width: `${Math.max(stats.weeklyPercentage, MIN_PROGRESS_BAR_PERCENT)}%`,
                  boxShadow: stats.weeklyPercentage > 0 ? '0 0 8px rgba(251,146,60,0.3)' : 'none',
                }}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default SidebarApp;
