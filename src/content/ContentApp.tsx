import React, { useState } from 'react';
import { Settings, Download, BarChart2, X } from 'lucide-react';
import { useTokenTracker } from '../hooks/useTokenTracker';
import { Exporter } from '../export';
import OptionsApp from '../options/OptionsApp';

const ContentApp: React.FC = () => {
  const { tokens, isExact } = useTokenTracker();
  const [modalOpen, setModalOpen] = useState(false);
  const CONTEXT_LIMIT = 200000;
  const contextPercentage = (tokens.total / CONTEXT_LIMIT) * 100;

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

  return (
    <>
      <div className="flex items-center gap-4 bg-transparent text-gray-400 px-1 py-0.5 rounded text-[11px] font-sans transition-all">
        
        <div className="flex items-center gap-1.5">
          <span className="font-semibold text-[9px] uppercase tracking-wider opacity-60">Context</span>
          {isExact ? (
            <span className="bg-emerald-500/20 text-emerald-400 text-[8px] px-1 rounded flex items-center">Official</span>
          ) : (
            <span className="bg-amber-500/20 text-amber-400 text-[8px] px-1 rounded flex items-center">Estimated</span>
          )}
          
          <div className="flex items-center gap-2 ml-1">
            <span className="font-mono text-xs text-gray-200">{tokens.total.toLocaleString()}</span>
            <div className="w-48 h-1.5 bg-gray-700/50 rounded-full overflow-hidden ml-1">
              <div 
                className="h-full bg-indigo-500 rounded-full transition-all"
                style={{ width: `${Math.min(contextPercentage, 100)}%` }}
              />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-0.5">
          <button onClick={handleExport} className="p-1 hover:bg-white/10 rounded transition-colors text-gray-500 hover:text-white group relative">
            <Download size={12} />
          </button>
          <button onClick={() => setModalOpen(true)} className="p-1 hover:bg-white/10 rounded transition-colors text-gray-500 hover:text-white group relative">
            <Settings size={12} />
          </button>
        </div>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-[9999999] bg-black/60 backdrop-blur-sm flex items-center justify-center font-sans text-left text-base" style={{ left: 0, top: 0, width: '100vw', height: '100vh' }}>
          <div className="relative bg-[#111118] border border-white/10 shadow-2xl rounded-2xl overflow-hidden w-[500px] max-w-[90vw]">
            <button 
              onClick={() => setModalOpen(false)}
              className="absolute top-4 right-4 p-1 bg-white/5 hover:bg-white/10 text-white rounded-full z-50 transition-colors"
            >
              <X size={16} />
            </button>
            <div className="h-[600px] overflow-y-auto">
              <OptionsApp />
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ContentApp;
