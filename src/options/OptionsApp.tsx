import React, { useState, useEffect } from 'react';
import { Settings, BarChart2, HardDrive } from 'lucide-react';

const OptionsApp: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'settings' | 'analytics'>('settings');

  useEffect(() => {
    chrome.storage.local.get('activeTab', (data) => {
      if (data.activeTab === 'analytics') {
        setActiveTab('analytics');
      }
      chrome.storage.local.remove('activeTab');
    });
  }, []);

  return (
    <div className="w-[450px] min-h-[500px] bg-[#111118] text-gray-200 p-6 font-sans">
      <div className="flex items-center gap-3 mb-6 border-b border-white/10 pb-4">
        <h1 className="text-xl font-bold text-indigo-400">Claude Tracker</h1>
      </div>
      
      <div className="flex gap-2 mb-6">
        <button 
          onClick={() => setActiveTab('settings')}
          className={`px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors ${activeTab === 'settings' ? 'bg-indigo-600 text-white' : 'bg-white/5 hover:bg-white/10'}`}
        >
          <Settings size={16} /> Settings
        </button>
        <button 
          onClick={() => setActiveTab('analytics')}
          className={`px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors ${activeTab === 'analytics' ? 'bg-indigo-600 text-white' : 'bg-white/5 hover:bg-white/10'}`}
        >
          <BarChart2 size={16} /> Analytics
        </button>
      </div>

      {activeTab === 'settings' && (
        <div className="bg-[#1e1e2e] p-5 rounded-xl shadow-xl border border-white/5 animate-in fade-in slide-in-from-bottom-2">
          <h2 className="text-lg font-semibold mb-4 text-white">General Settings</h2>
          
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-400 mb-2">Anthropic API Key (Optional)</label>
            <p className="text-[11px] text-gray-500 mb-3">
              Use exact tracking directly from Anthropic (Mode A). Otherwise, the extension uses safe, local browser estimation (Mode B).
            </p>
            <input 
              type="password" 
              placeholder="sk-ant-api03-..." 
              className="w-full bg-[#111118] border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>

          <button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-lg font-medium transition-colors">
            Save Configuration
          </button>
        </div>
      )}

      {activeTab === 'analytics' && (
        <div className="bg-[#1e1e2e] p-5 rounded-xl shadow-xl border border-white/5 animate-in fade-in slide-in-from-bottom-2">
          <h2 className="text-lg font-semibold mb-4 text-white">Daily Usage</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-[#111118] p-4 rounded-lg border border-white/5">
              <div className="text-xs text-gray-500 mb-1">Today's Tokens</div>
              <div className="text-2xl font-mono text-indigo-400">12,450</div>
            </div>
            <div className="bg-[#111118] p-4 rounded-lg border border-white/5">
              <div className="text-xs text-gray-500 mb-1">Total Context</div>
              <div className="text-2xl font-mono text-emerald-400">6.2%</div>
            </div>
          </div>
          <p className="text-xs text-center text-gray-500 mt-6 mt-4">
            Full dashboard features are coming soon!
          </p>
        </div>
      )}
    </div>
  );
};

export default OptionsApp;
