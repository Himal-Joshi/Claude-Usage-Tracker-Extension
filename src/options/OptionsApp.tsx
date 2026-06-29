import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, BarChart2, Shield, AlertCircle, CheckCircle2, ChevronRight, MessageSquare, Save, Zap, Copy, ClipboardCheck, Download, RefreshCw } from 'lucide-react';
import { StorageManager } from '../storage';
import { RATES, TOKENS_PER_MILLION, COPY_FEEDBACK_DURATION_MS } from '../utils/constants';
import type { UserSettings, DailyStats, ActiveChatContext } from '../types';
import '../content/index.css';

/**
 * Options/Popup page for the extension.
 * Provides settings configuration (API key, limits, plan) and usage analytics.
 */
const OptionsApp: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'settings' | 'analytics'>('settings');
  const [settings, setSettings] = useState<UserSettings>({
    anthropicApiKey: '',
    rememberApiKey: true,
    autoBackup: false,
    claudePlan: 'Free',
    sessionMessageLimit: 40,
    weeklyMessageLimit: 50
  });
  const [stats, setStats] = useState<Record<string, DailyStats>>({});
  const [isSaved, setIsSaved] = useState(false);
  const [activeChat, setActiveChat] = useState<ActiveChatContext | null>(null);
  const [activeChatLoading, setActiveChatLoading] = useState(true);
  const [copiedContext, setCopiedContext] = useState(false);

  const fetchActiveChat = () => {
    setActiveChatLoading(true);
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0];
      if (tab && tab.id && tab.url && tab.url.includes('claude.ai/chat/')) {
        chrome.tabs.sendMessage(tab.id, { action: 'get_chat_context' }, (response) => {
          if (chrome.runtime.lastError) {
            console.log("No response from content script:", chrome.runtime.lastError);
            setActiveChatLoading(false);
            return;
          }
          if (response && response.success) {
            setActiveChat({
              title: response.title,
              turns: response.turns,
              url: tab.url || '',
              markdown: response.markdown,
              plainText: response.plainText,
              model: response.model
            });
          }
          setActiveChatLoading(false);
        });
      } else {
        setActiveChatLoading(false);
      }
    });
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        const state = await StorageManager.getState();
        setSettings(state.settings);
        setStats(state.stats);
        
        fetchActiveChat();
      } catch (err) {
        console.error('Failed to load extension state:', err);
      }
    };
    loadData();
  }, []);

  const handleSaveSettings = async () => {
    try {
      await StorageManager.updateSettings(settings);
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), COPY_FEEDBACK_DURATION_MS);
    } catch (err) {
      console.error('Failed to save settings:', err);
    }
  };

  const calculateTotalCost = () => {
    let total = 0;
    Object.values(stats).forEach(stat => {
      const inputMillions = stat.inputTokens / TOKENS_PER_MILLION;
      const outputMillions = stat.outputTokens / TOKENS_PER_MILLION;
      total += (inputMillions * RATES.sonnet.input) + (outputMillions * RATES.sonnet.output);
    });
    return total;
  };

  const handleContinueIn = async (targetModel: string, url: string) => {
    if (!activeChat) return;
    
    // Save the target destination along with the context
    await chrome.storage.local.set({ 
      pendingChatContext: { ...activeChat, targetModel } 
    });

    // Also copy to clipboard as fallback
    try {
      await navigator.clipboard.writeText(activeChat.plainText);
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
    }
    
    chrome.tabs.create({ url });
  };

  const handleCopyContext = async () => {
    if (!activeChat) return;
    try {
      await navigator.clipboard.writeText(activeChat.markdown);
      setCopiedContext(true);
      setTimeout(() => setCopiedContext(false), 2000);
    } catch (err) {
      console.error('Failed to copy context:', err);
    }
  };

  const handleDownloadMD = () => {
    if (!activeChat) return;
    const blob = new Blob([activeChat.markdown], { type: 'text/markdown;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    const cleanTitle = activeChat.title.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'claude-chat';
    link.download = `${cleanTitle}-${Date.now()}.md`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  return (
    <div className="w-[400px] h-[600px] bg-[#1a1825] text-gray-200 font-sans flex flex-col overflow-hidden">
      {/* Header */}
      <div className="p-5 border-b border-white/[0.06] bg-gradient-to-b from-white/[0.02] to-transparent flex justify-between items-start">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center border border-orange-500/20">
            <img src="/icon.png" alt="Logo" className="w-6 h-6 opacity-80" onError={(e) => e.currentTarget.style.display='none'} />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-100 tracking-wide">Claude Tracker</h1>
            <p className="text-xs text-gray-500 font-medium tracking-wide uppercase">Usage & Limits</p>
          </div>
        </div>
        <button 
          onClick={fetchActiveChat} 
          className="text-gray-500 hover:text-white p-1.5 rounded-lg hover:bg-white/[0.05] transition-colors" 
          title="Refresh Context"
        >
          <RefreshCw size={16} className={activeChatLoading ? "animate-spin text-orange-400" : ""} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex px-5 pt-4 gap-6 border-b border-white/[0.06]">
        <button
          onClick={() => setActiveTab('settings')}
          className={`pb-3 text-sm font-semibold tracking-wide transition-colors relative cursor-pointer ${
            activeTab === 'settings' ? 'text-orange-400' : 'text-gray-500 hover:text-gray-300'
          }`}
        >
          <div className="flex items-center gap-2">
            <SettingsIcon size={16} />
            Settings
          </div>
          {activeTab === 'settings' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-500 rounded-t-full shadow-[0_-2px_8px_rgba(249,115,22,0.5)]" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('analytics')}
          className={`pb-3 text-sm font-semibold tracking-wide transition-colors relative cursor-pointer ${
            activeTab === 'analytics' ? 'text-orange-400' : 'text-gray-500 hover:text-gray-300'
          }`}
        >
          <div className="flex items-center gap-2">
            <BarChart2 size={16} />
            Analytics
          </div>
          {activeTab === 'analytics' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-500 rounded-t-full shadow-[0_-2px_8px_rgba(249,115,22,0.5)]" />
          )}
        </button>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-5 scrollbar-thin">
        
        {/* Continue Chat Section */}
        {activeTab === 'settings' && !activeChatLoading && (
          <div className="bg-white/[0.02] p-5 rounded-xl border border-white/5 mb-6 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-orange-500 to-amber-500 opacity-60" />
            
            <h2 className="text-[10px] font-extrabold uppercase tracking-widest text-orange-400/80 mb-3">
              Continue This Chat In
            </h2>
            
            {activeChat ? (
              <div>
                <div className="flex items-baseline mb-4">
                  <span className="text-sm font-medium text-white italic truncate max-w-[280px]" title={activeChat.title}>
                    &ldquo;{activeChat.title}&rdquo;
                  </span>
                  <span className="text-xs text-gray-400 ml-2 font-normal">
                    &bull; {activeChat.turns} {activeChat.turns === 1 ? 'turn' : 'turns'}
                  </span>
                </div>
                
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={() => handleContinueIn('chatgpt', 'https://chatgpt.com')}
                    className="bg-[#10a37f] hover:bg-[#10a37f]/80 text-white font-semibold text-xs py-2 px-3.5 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer shadow-md"
                  >
                    ChatGPT
                  </button>
                  
                  <button
                    onClick={() => handleContinueIn('gemini', 'https://gemini.google.com')}
                    className="bg-[#4285f4]/10 hover:bg-[#4285f4]/20 text-[#4285f4] border border-[#4285f4]/20 font-semibold text-xs py-2 px-3.5 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer shadow"
                  >
                    Gemini
                  </button>
                  
                  <button
                    onClick={() => handleContinueIn('grok', 'https://x.com/i/grok')}
                    className="bg-white/5 hover:bg-white/10 text-gray-300 border border-white/5 font-semibold text-xs py-2 px-3.5 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer shadow"
                  >
                    Grok
                  </button>
                  
                  <button
                    onClick={handleCopyContext}
                    className="bg-white/5 hover:bg-white/10 text-gray-300 border border-white/5 p-2 rounded-lg transition-colors cursor-pointer relative"
                    title="Copy Context (Markdown)"
                  >
                    {copiedContext ? <ClipboardCheck size={14} className="text-emerald-400" /> : <Copy size={14} />}
                  </button>
                  
                  <button
                    onClick={handleDownloadMD}
                    className="bg-white/5 hover:bg-white/10 text-gray-300 border border-white/5 p-2 rounded-lg transition-colors cursor-pointer"
                    title="Download Markdown File"
                  >
                    <Download size={14} />
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-gray-400 text-xs py-1.5 text-center leading-relaxed">
                Open a conversation on <a href="https://claude.ai" target="_blank" rel="noreferrer" className="text-orange-400 hover:underline font-semibold">Claude.ai</a> to continue it in other AI models.
              </div>
            )}
          </div>
        )}

        {activeTab === 'settings' ? (
          <div className="flex flex-col gap-6">
            
            {/* Claude Plan */}
            <div className="space-y-3">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                Subscription Plan
              </h3>
              <div className="grid grid-cols-3 gap-2">
                {['Free', 'Pro', 'Team'].map((plan) => (
                  <button
                    key={plan}
                    onClick={() => setSettings({ ...settings, claudePlan: plan as any })}
                    className={`py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
                      settings.claudePlan === plan
                        ? 'bg-orange-500/20 text-orange-400 border border-orange-500/50'
                        : 'bg-black/20 text-gray-400 border border-white/[0.04] hover:bg-white/[0.02]'
                    }`}
                  >
                    {plan}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Limits */}
            <div className="space-y-3">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                Rate Limits (Override Defaults)
              </h3>
              <div className="flex gap-4">
                <div className="flex-1 space-y-1.5">
                  <label className="text-[11px] text-gray-500">Session (5h) Limit</label>
                  <input
                    type="number"
                    value={settings.sessionMessageLimit}
                    onChange={(e) => setSettings({ ...settings, sessionMessageLimit: parseInt(e.target.value) || 0 })}
                    className="w-full bg-black/20 border border-white/[0.06] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-500/50"
                  />
                </div>
                <div className="flex-1 space-y-1.5">
                  <label className="text-[11px] text-gray-500">Weekly Limit</label>
                  <input
                    type="number"
                    value={settings.weeklyMessageLimit}
                    onChange={(e) => setSettings({ ...settings, weeklyMessageLimit: parseInt(e.target.value) || 0 })}
                    className="w-full bg-black/20 border border-white/[0.06] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-500/50"
                  />
                </div>
              </div>
            </div>

            <hr className="border-white/[0.06]" />

            {/* Anthropic API Key */}
            <div className="space-y-3">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                <Shield size={14} className="text-orange-400" />
                Anthropic API Key (Optional)
              </h3>
              <p className="text-[11px] text-gray-500 leading-relaxed">
                Provide an API key to enable 100% accurate token counting via the Anthropic API instead of local BPE estimation.
              </p>
              
              <input
                type="password"
                placeholder="sk-ant-..."
                value={settings.anthropicApiKey}
                onChange={(e) => setSettings({ ...settings, anthropicApiKey: e.target.value })}
                className="w-full bg-black/20 border border-white/[0.06] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-orange-500/50 transition-colors"
              />
              
              <label className="flex items-center gap-2 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={settings.rememberApiKey}
                  onChange={(e) => setSettings({ ...settings, rememberApiKey: e.target.checked })}
                  className="rounded border-white/[0.1] bg-black/20 text-orange-500 focus:ring-orange-500/50 focus:ring-offset-0"
                />
                <span className="text-xs text-gray-400 group-hover:text-gray-300 transition-colors">
                  Save key to persistent local storage (uncheck for session-only)
                </span>
              </label>

              {!settings.rememberApiKey && settings.anthropicApiKey && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 mt-2">
                  <AlertCircle size={14} className="text-blue-400 shrink-0 mt-0.5" />
                  <p className="text-[11px] text-blue-300 leading-relaxed">
                    Key will be stored in memory only and will be wiped when the browser is closed.
                  </p>
                </div>
              )}
            </div>

            {/* Save Button */}
            <div className="pt-4 pb-8">
              <button
                onClick={handleSaveSettings}
                className="w-full py-3 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20 cursor-pointer"
              >
                {isSaved ? <CheckCircle2 size={18} /> : <Save size={18} />}
                {isSaved ? 'Settings Saved' : 'Save Settings'}
              </button>
            </div>

          </div>
        ) : (
          <div className="flex flex-col gap-5">
            {/* Analytics Dashboard */}
            
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-black/20 border border-white/[0.06] p-4 rounded-xl flex flex-col gap-1">
                <span className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider">Total Days Tracked</span>
                <span className="text-2xl font-bold text-gray-200">{Object.keys(stats).length}</span>
              </div>
              
              <div className="bg-black/20 border border-white/[0.06] p-4 rounded-xl flex flex-col gap-1">
                <span className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider">Est. Token Cost</span>
                <span className="text-2xl font-bold text-green-400">${calculateTotalCost().toFixed(2)}</span>
              </div>
            </div>

            <div className="bg-black/20 border border-white/[0.06] rounded-xl overflow-hidden mt-2">
              <div className="px-4 py-3 border-b border-white/[0.06] bg-white/[0.02]">
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">History (Last 7 Days)</h3>
              </div>
              <div className="divide-y divide-white/[0.04]">
                {Object.values(stats)
                  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                  .slice(0, 7)
                  .map((stat, idx) => (
                    <div key={idx} className="p-4 flex items-center justify-between hover:bg-white/[0.02] transition-colors">
                      <div className="flex flex-col gap-1">
                        <span className="text-sm font-medium text-gray-300">
                          {new Date(stat.date + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                        </span>
                        <span className="text-[10px] text-gray-500 font-medium">
                          {stat.conversationsCount || 1} conversations
                        </span>
                      </div>
                      
                      <div className="flex gap-4 text-right">
                        <div className="flex flex-col">
                          <span className="text-[10px] text-gray-500 uppercase font-semibold">Input</span>
                          <span className="text-xs text-orange-400 font-mono">{(stat.inputTokens / 1000).toFixed(1)}k</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[10px] text-gray-500 uppercase font-semibold">Output</span>
                          <span className="text-xs text-orange-400 font-mono">{(stat.outputTokens / 1000).toFixed(1)}k</span>
                        </div>
                      </div>
                    </div>
                  ))}
                
                {Object.keys(stats).length === 0 && (
                  <div className="p-8 text-center text-gray-500 text-sm">
                    No usage data recorded yet.
                  </div>
                )}
              </div>
            </div>
            
          </div>
        )}
      </div>
    </div>
  );
};

export default OptionsApp;
