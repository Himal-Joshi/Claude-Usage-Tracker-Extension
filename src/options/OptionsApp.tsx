import React, { useState, useEffect } from 'react';
import { Settings, BarChart2, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { StorageManager } from '../storage';
import type { UserSettings, ExtensionState } from '../types';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const OptionsApp: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'settings' | 'analytics'>('settings');
  const [settings, setSettings] = useState<UserSettings>({ anthropicApiKey: '', claudePlan: 'Free' });
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [statsData, setStatsData] = useState<any[]>([]);

  useEffect(() => {
    chrome.storage.local.get('activeTab', (data) => {
      if (data.activeTab === 'analytics') setActiveTab('analytics');
      chrome.storage.local.remove('activeTab');
    });

    StorageManager.getState().then((state) => {
      setSettings(state.settings);
      
      // Transform stats for chart
      const chartData = Object.values(state.stats).map(stat => ({
        date: stat.date,
        tokens: stat.inputTokens + stat.outputTokens,
        cost: ((stat.inputTokens + stat.outputTokens) / 1000000) * 15 // Roughly $15/M
      }));
      setStatsData(chartData);
    });
  }, []);

  const handleSave = async () => {
    setSaveStatus('saving');
    await StorageManager.updateSettings(settings);
    setTimeout(() => setSaveStatus('saved'), 500);
    setTimeout(() => setSaveStatus('idle'), 2500);
  };

  const handleClearKey = () => {
    setSettings({ ...settings, anthropicApiKey: '' });
  };

  return (
    <div className="w-[500px] min-h-[550px] bg-[#111118] text-gray-200 p-6 font-sans">
      <div className="flex items-center gap-3 mb-6 border-b border-white/10 pb-4">
        <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center border border-indigo-500/30 shadow-[0_0_15px_rgba(99,102,241,0.2)]">
          <img src="/public/icon.png" alt="Logo" className="w-5 h-5 opacity-80" onError={(e) => e.currentTarget.style.display='none'} />
        </div>
        <h1 className="text-xl font-bold text-indigo-400 tracking-wide">Claude Tracker</h1>
      </div>
      
      <div className="flex gap-2 mb-6">
        <button 
          onClick={() => setActiveTab('settings')}
          className={`px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors ${activeTab === 'settings' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'bg-white/5 hover:bg-white/10'}`}
        >
          <Settings size={16} /> Settings
        </button>
        <button 
          onClick={() => setActiveTab('analytics')}
          className={`px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors ${activeTab === 'analytics' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'bg-white/5 hover:bg-white/10'}`}
        >
          <BarChart2 size={16} /> Analytics
        </button>
      </div>

      {activeTab === 'settings' && (
        <div className="bg-[#1e1e2e] p-5 rounded-xl shadow-xl border border-white/5 animate-in fade-in slide-in-from-bottom-2">
          <h2 className="text-lg font-semibold mb-4 text-white">General Settings</h2>
          
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-400 mb-2">Claude Plan</label>
            <select 
              value={settings.claudePlan || 'Free'}
              onChange={(e) => setSettings({ ...settings, claudePlan: e.target.value as any })}
              className="w-full bg-[#111118] border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors appearance-none"
            >
              <option value="Free">Free Plan (100k Context Est.)</option>
              <option value="Pro">Pro Plan (200k Context)</option>
              <option value="Team">Team Plan (200k Context)</option>
            </select>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-400 mb-2">Anthropic API Key (Optional)</label>
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 mb-3 flex gap-3">
               <AlertTriangle size={16} className="text-amber-400 flex-shrink-0 mt-0.5" />
               <p className="text-[11px] text-amber-200/70 leading-relaxed">
                 Providing an API key enables exact token tracking via Anthropic's token counting API. <strong>Security Warning:</strong> Keys are stored in Chrome's local storage unencrypted. Only use keys with restricted permissions if possible.
               </p>
            </div>
            <div className="flex gap-2">
              <input 
                type="password" 
                value={settings.anthropicApiKey || ''}
                onChange={(e) => setSettings({ ...settings, anthropicApiKey: e.target.value })}
                placeholder="sk-ant-api03-..." 
                className="w-full bg-[#111118] border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"
              />
              {settings.anthropicApiKey && (
                <button onClick={handleClearKey} className="px-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-lg transition-colors text-sm font-medium">Clear</button>
              )}
            </div>
          </div>

          <button 
            onClick={handleSave}
            disabled={saveStatus === 'saving'}
            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-70 text-white px-4 py-2.5 rounded-lg font-medium transition-all flex items-center justify-center gap-2"
          >
            {saveStatus === 'saved' ? <><CheckCircle2 size={18} /> Saved!</> : 'Save Configuration'}
          </button>
        </div>
      )}

      {activeTab === 'analytics' && (
        <div className="bg-[#1e1e2e] p-5 rounded-xl shadow-xl border border-white/5 animate-in fade-in slide-in-from-bottom-2">
          <h2 className="text-lg font-semibold mb-4 text-white">Usage Analytics</h2>
          
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-[#111118] p-4 rounded-lg border border-white/5 relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-purple-500 opacity-50 group-hover:opacity-100 transition-opacity" />
              <div className="text-xs text-gray-500 mb-1">Tokens Tracked</div>
              <div className="text-2xl font-mono text-indigo-400">
                {statsData.reduce((acc, curr) => acc + curr.tokens, 0).toLocaleString()}
              </div>
            </div>
            <div className="bg-[#111118] p-4 rounded-lg border border-white/5 relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 to-teal-500 opacity-50 group-hover:opacity-100 transition-opacity" />
              <div className="text-xs text-gray-500 mb-1">Est. Value Used</div>
              <div className="text-2xl font-mono text-emerald-400">
                ${statsData.reduce((acc, curr) => acc + curr.cost, 0).toFixed(2)}
              </div>
            </div>
          </div>

          <div className="h-[200px] w-full mt-4 bg-[#111118] rounded-lg border border-white/5 p-4 pt-6">
            {statsData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={statsData}>
                  <defs>
                    <linearGradient id="colorTokens" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                  <XAxis dataKey="date" stroke="#ffffff40" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis stroke="#ffffff40" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(val) => `${(val/1000).toFixed(0)}k`} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1e1e2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                    itemStyle={{ color: '#818cf8' }}
                  />
                  <Area type="monotone" dataKey="tokens" stroke="#818cf8" strokeWidth={2} fillOpacity={1} fill="url(#colorTokens)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-gray-500 text-sm">
                <BarChart2 size={32} className="mb-2 opacity-20" />
                No data recorded yet
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default OptionsApp;
