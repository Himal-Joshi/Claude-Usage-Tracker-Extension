import React from 'react';
import { Settings, Download, BarChart2 } from 'lucide-react';
import { useTokenTracker } from '../hooks/useTokenTracker';
import { Exporter } from '../export';

const ContentApp: React.FC = () => {
  const { tokens, isExact } = useTokenTracker();
  const CONTEXT_LIMIT = 200000;
  const contextPercentage = (tokens.total / CONTEXT_LIMIT) * 100;

  const handleExport = () => {
    // In a full implementation, we'd parse the specific messages into an array.
    // Here we generate a simple conversation object representing the current state.
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

  return (
    <div className="flex items-center gap-4 bg-[#1e1e2e]/90 backdrop-blur-md text-gray-200 px-4 py-2 rounded-xl shadow-2xl border border-white/10 text-xs font-sans transition-all hover:bg-[#1e1e2e]">
      
      <div className="flex flex-col">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-white/60 font-semibold text-[10px] uppercase tracking-wider">Context</span>
          {isExact ? (
            <span className="bg-emerald-500/20 text-emerald-400 text-[8px] px-1.5 py-0.5 rounded flex items-center">Official</span>
          ) : (
            <span className="bg-amber-500/20 text-amber-400 text-[8px] px-1.5 py-0.5 rounded flex items-center">Estimated</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm">{tokens.total.toLocaleString()}</span>
          <div className="w-16 h-1.5 bg-gray-700 rounded-full overflow-hidden">
            <div 
              className="h-full bg-indigo-500 rounded-full transition-all"
              style={{ width: `${Math.min(contextPercentage, 100)}%` }}
            />
          </div>
        </div>
      </div>

      <div className="w-px h-6 bg-white/10 mx-2" />

      <div className="flex items-center gap-3">
        <button onClick={handleExport} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors text-gray-400 hover:text-white group relative">
          <Download size={14} />
          <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-black text-white text-[10px] rounded opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none">Export Chat</span>
        </button>
        <button className="p-1.5 hover:bg-white/10 rounded-lg transition-colors text-gray-400 hover:text-white group relative">
          <BarChart2 size={14} />
          <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-black text-white text-[10px] rounded opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none">Analytics</span>
        </button>
        <button className="p-1.5 hover:bg-white/10 rounded-lg transition-colors text-gray-400 hover:text-white group relative">
          <Settings size={14} />
          <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-black text-white text-[10px] rounded opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none">Settings</span>
        </button>
      </div>

    </div>
  );
};

export default ContentApp;
