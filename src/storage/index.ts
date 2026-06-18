import type { ExtensionState, UserSettings, DailyStats, Conversation } from '../types';

const DEFAULT_SETTINGS: UserSettings = {
  anthropicApiKey: '',
  rememberApiKey: true,
  autoBackup: false,
  claudePlan: 'Free',
};

export const StorageManager = {
  async getState(): Promise<ExtensionState> {
    const data = await chrome.storage.local.get(null);
    let sessionData: any = {};
    try {
      sessionData = await chrome.storage.session?.get(null) || {};
    } catch (e) {}

    const localSettings = (data.settings as UserSettings) || DEFAULT_SETTINGS;
    const sessionSettings = (sessionData.settings as UserSettings) || {};
    
    return {
      settings: { ...localSettings, ...sessionSettings },
      stats: (data.stats as Record<string, DailyStats>) || {},
      conversations: (data.conversations as Record<string, Conversation>) || {},
    };
  },

  async getSettings(): Promise<UserSettings> {
    const { settings: localSettings } = await chrome.storage.local.get('settings');
    let sessionSettings: any = {};
    try {
      const res = await chrome.storage.session?.get('settings');
      sessionSettings = res?.settings || {};
    } catch (e) {}

    return { ...DEFAULT_SETTINGS, ...(localSettings as UserSettings), ...sessionSettings };
  },

  async updateSettings(settings: Partial<UserSettings>): Promise<void> {
    const current = await this.getSettings();
    const newSettings = { ...current, ...settings };
    
    const localSettingsToSave = { ...newSettings };
    const sessionSettingsToSave: any = {};

    if (newSettings.rememberApiKey === false) {
      // Store API key in session, remove from local
      sessionSettingsToSave.anthropicApiKey = newSettings.anthropicApiKey;
      delete localSettingsToSave.anthropicApiKey;
    } else {
      // Store API key in local, remove from session
      // localSettingsToSave already has anthropicApiKey
      sessionSettingsToSave.anthropicApiKey = undefined; // Actually we just clear session settings
    }

    await chrome.storage.local.set({ settings: localSettingsToSave });
    
    try {
      if (newSettings.rememberApiKey === false) {
        await chrome.storage.session?.set({ settings: sessionSettingsToSave });
      } else {
        await chrome.storage.session?.remove('settings');
      }
    } catch (e) {
      console.warn('Session storage not available', e);
    }
  },

  async saveConversation(conv: Conversation): Promise<void> {
    const data = await chrome.storage.local.get('conversations');
    const conversations = (data.conversations as Record<string, Conversation>) || {};
    conversations[conv.id] = conv;
    await chrome.storage.local.set({ conversations });
  },

  async updateDailyStats(date: string, chatId: string, totalTokens: number): Promise<void> {
    const data = await chrome.storage.local.get('stats');
    const stats = (data.stats as Record<string, DailyStats>) || {};
    if (!stats[date]) {
      stats[date] = { date, inputTokens: 0, outputTokens: 0, conversationsCount: 0, chatMaxTokens: {} };
    }
    if (!stats[date].chatMaxTokens) {
      stats[date].chatMaxTokens = {};
    }
    
    const prevTokens = stats[date].chatMaxTokens[chatId] || 0;
    if (totalTokens > prevTokens) {
      const delta = totalTokens - prevTokens;
      // We attribute the delta to inputTokens for simplicity of overall usage graph
      stats[date].inputTokens += delta;
      stats[date].chatMaxTokens[chatId] = totalTokens;
      await chrome.storage.local.set({ stats });
    }
  }
};
