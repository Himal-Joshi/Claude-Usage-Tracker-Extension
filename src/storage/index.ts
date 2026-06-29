import type { ExtensionState, UserSettings, DailyStats, Conversation } from '../types';
import { WEEKLY_WINDOW_MS } from '../utils/constants';

/** Default settings applied when no user configuration exists. */
const DEFAULT_SETTINGS: UserSettings = {
  anthropicApiKey: '',
  rememberApiKey: true,
  autoBackup: false,
  claudePlan: 'Free',
};

/**
 * Centralized storage manager for all extension state.
 * Wraps `chrome.storage.local` and `chrome.storage.session` with
 * a merge strategy where session values override local values.
 */
export const StorageManager = {
  /** Retrieves the complete extension state (settings + stats + conversations). */
  async getState(): Promise<ExtensionState> {
    const data = await chrome.storage.local.get(null);
    let sessionData: Record<string, unknown> = {};
    try {
      sessionData = (await chrome.storage.session?.get(null)) || {};
    } catch {
      // Session storage unavailable in some contexts
    }

    const localSettings = (data.settings as UserSettings) || DEFAULT_SETTINGS;
    const sessionSettings = (sessionData.settings as UserSettings) || {};

    return {
      settings: { ...localSettings, ...sessionSettings },
      stats: (data.stats as Record<string, DailyStats>) || {},
      conversations: (data.conversations as Record<string, Conversation>) || {},
    };
  },

  /** Retrieves merged settings from local and session storage. */
  async getSettings(): Promise<UserSettings> {
    const { settings: localSettings } = await chrome.storage.local.get('settings');
    let sessionSettings: UserSettings = {};
    try {
      const res = await chrome.storage.session?.get('settings');
      sessionSettings = (res?.settings as UserSettings) || {};
    } catch {
      // Session storage unavailable
    }

    return { ...DEFAULT_SETTINGS, ...(localSettings as UserSettings), ...sessionSettings };
  },

  /**
   * Persists updated settings, routing the API key to either local or
   * session storage based on the `rememberApiKey` flag.
   */
  async updateSettings(settings: Partial<UserSettings>): Promise<void> {
    const current = await this.getSettings();
    const merged = { ...current, ...settings };

    const localSettingsToSave = { ...merged };

    if (merged.rememberApiKey === false) {
      // Ephemeral key: store in session, remove from local
      const sessionPayload = { anthropicApiKey: merged.anthropicApiKey };
      delete localSettingsToSave.anthropicApiKey;
      await chrome.storage.local.set({ settings: localSettingsToSave });
      try {
        await chrome.storage.session?.set({ settings: sessionPayload });
      } catch {
        // Session storage unavailable
      }
    } else {
      // Persistent key: store in local, clear session
      await chrome.storage.local.set({ settings: localSettingsToSave });
      try {
        await chrome.storage.session?.remove('settings');
      } catch {
        // Session storage unavailable
      }
    }
  },

  /** Saves or updates a conversation record. */
  async saveConversation(conv: Conversation): Promise<void> {
    const data = await chrome.storage.local.get('conversations');
    const conversations = (data.conversations as Record<string, Conversation>) || {};
    conversations[conv.id] = conv;
    await chrome.storage.local.set({ conversations });
  },

  /** Increments daily token usage statistics for a specific date and chat. */
  async updateDailyStats(date: string, chatId: string, inputDelta: number, outputDelta: number): Promise<void> {
    const data = await chrome.storage.local.get(['stats']);
    const stats = (data.stats as Record<string, DailyStats>) || {};

    if (!stats[date]) {
      stats[date] = { date, inputTokens: 0, outputTokens: 0, conversationsCount: 0 };
    }

    stats[date].inputTokens += inputDelta;
    stats[date].outputTokens += outputDelta;

    await chrome.storage.local.set({ stats });
  },

  /** Retrieves all recorded message timestamps (for rate limit tracking). */
  async getMessageTimes(): Promise<number[]> {
    const data = await chrome.storage.local.get('messageTimes');
    return (data.messageTimes as number[]) || [];
  },

  /**
   * Records a message timestamp and prunes entries older than 7 days
   * to prevent unbounded storage growth.
   */
  async addMessageTime(timestamp: number): Promise<void> {
    const times = await this.getMessageTimes();
    times.push(timestamp);
    const cutoff = Date.now() - WEEKLY_WINDOW_MS;
    const filteredTimes = times.filter(t => t > cutoff);
    await chrome.storage.local.set({ messageTimes: filteredTimes });
  },
};
