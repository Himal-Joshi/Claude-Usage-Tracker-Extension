import type { ExtensionState, UserSettings, DailyStats, Conversation } from '../types';

const DEFAULT_SETTINGS: UserSettings = {
  anthropicApiKey: '',
  autoBackup: false,
};

export const StorageManager = {
  async getState(): Promise<ExtensionState> {
    const data = await chrome.storage.local.get(null);
    return {
      settings: (data.settings as UserSettings) || DEFAULT_SETTINGS,
      stats: (data.stats as Record<string, DailyStats>) || {},
      conversations: (data.conversations as Record<string, Conversation>) || {},
    };
  },

  async getSettings(): Promise<UserSettings> {
    const { settings } = await chrome.storage.local.get('settings');
    return (settings as UserSettings) || DEFAULT_SETTINGS;
  },

  async updateSettings(settings: Partial<UserSettings>): Promise<void> {
    const current = await this.getSettings();
    await chrome.storage.local.set({ settings: { ...current, ...settings } });
  },

  async saveConversation(conv: Conversation): Promise<void> {
    const data = await chrome.storage.local.get('conversations');
    const conversations = (data.conversations as Record<string, Conversation>) || {};
    conversations[conv.id] = conv;
    await chrome.storage.local.set({ conversations });
  },

  async updateDailyStats(date: string, inputTokens: number, outputTokens: number): Promise<void> {
    const data = await chrome.storage.local.get('stats');
    const stats = (data.stats as Record<string, DailyStats>) || {};
    if (!stats[date]) {
      stats[date] = { date, inputTokens: 0, outputTokens: 0, conversationsCount: 0 };
    }
    stats[date].inputTokens += inputTokens;
    stats[date].outputTokens += outputTokens;
    await chrome.storage.local.set({ stats });
  }
};
