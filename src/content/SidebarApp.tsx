import React from 'react';
import { Settings } from 'lucide-react';
import { useMessageTracker } from '../hooks/useMessageTracker';

const SidebarApp: React.FC = () => {
  const { stats } = useMessageTracker();

  const handleOpenSettings = () => {
    chrome.runtime.sendMessage({ action: 'open_options' });
  };

  const sessionBarColor = stats.sessionPercentage > 90
    ? 'bg-gradient-to-r from-red-500 to-rose-400'
    : stats.sessionPercentage > 75
      ? 'bg-gradient-to-r from-amber-500 to-orange-400'
      : 'bg-gradient-to-r from-orange-500 to-amber-400';

  const weeklyBarColor = stats.weeklyPercentage > 90
    ? 'bg-gradient-to-r from-red-500 to-rose-400'
    : stats.weeklyPercentage > 75
      ? 'bg-gradient-to-r from-amber-500 to-orange-400'
      : 'bg-gradient-to-r from-orange-500 to-amber-400';

  return (
    <div className="flex flex-col gap-2.5 py-3 px-3 rounded-xl border border-white/[0.06] text-[12px] font-sans select-none mb-3"
      style={{ background: 'linear-gradient(135deg, rgba(30,27,38,0.95) 0%, rgba(25,22,35,0.98) 100%)' }}
    >
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
              width: `${Math.max(stats.sessionPercentage, 2)}%`,
              boxShadow: stats.sessionPercentage > 0 ? '0 0 8px rgba(251,146,60,0.3)' : 'none'
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
              width: `${Math.max(stats.weeklyPercentage, 2)}%`,
              boxShadow: stats.weeklyPercentage > 0 ? '0 0 8px rgba(251,146,60,0.3)' : 'none'
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default SidebarApp;
