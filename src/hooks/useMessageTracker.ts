import { useState, useEffect } from 'react';
import { StorageManager } from '../storage';
import { calculateUsageStats } from '../utils/usageUtils';
import { isContextValid } from '../utils/chromeHelpers';
import { STATS_REFRESH_INTERVAL_MS } from '../utils/constants';
import type { UsageStats } from '../types';

/** Default usage stats displayed before data is loaded. */
const DEFAULT_STATS: UsageStats = {
  sessionCount: 0,
  sessionLimit: 40,
  sessionPercentage: 0,
  weeklyCount: 0,
  weeklyLimit: 50,
  weeklyPercentage: 0,
  messagesLeft: 40,
  resetTime: 'Not set',
};

/**
 * Tracks session and weekly message usage stats, refreshing automatically
 * on storage changes and at regular intervals for the reset countdown.
 *
 * @returns Current usage stats and a `recordMessage` function to log sends.
 */
export function useMessageTracker() {
  const [stats, setStats] = useState<UsageStats>(DEFAULT_STATS);

  const updateStats = async () => {
    if (!isContextValid()) return;
    try {
      const state = await StorageManager.getState();
      const messageTimes = await StorageManager.getMessageTimes();
      const currentStats = calculateUsageStats(messageTimes, state.settings);
      setStats(currentStats);
    } catch (e: unknown) {
      const message = (e as Error).message || '';
      if (message.includes('context invalidated') || message.includes('Extension context invalidated')) {
        return;
      }
    }
  };

  useEffect(() => {
    updateStats();

    const interval = setInterval(() => {
      if (isContextValid()) updateStats();
    }, STATS_REFRESH_INTERVAL_MS);

    const listener = (changes: Record<string, chrome.storage.StorageChange>, areaName: string) => {
      if (!isContextValid()) return;
      if (areaName === 'local' && (changes.messageTimes || changes.settings)) {
        updateStats();
      }
    };

    if (typeof chrome !== 'undefined' && chrome.storage?.onChanged) {
      chrome.storage.onChanged.addListener(listener);
    }

    return () => {
      clearInterval(interval);
      if (typeof chrome !== 'undefined' && chrome.storage?.onChanged) {
        try { chrome.storage.onChanged.removeListener(listener); } catch { /* context invalidated */ }
      }
    };
  }, []);

  const recordMessage = async () => {
    if (!isContextValid()) return;
    await StorageManager.addMessageTime(Date.now());
    await updateStats();
  };

  return { stats, recordMessage };
}
