import { useState, useEffect } from 'react';
import { StorageManager } from '../storage';
import { calculateUsageStats } from '../utils/usageUtils';

function isContextValid(): boolean {
  return typeof chrome !== 'undefined' && !!chrome.runtime && !!chrome.runtime.id;
}

export function useMessageTracker() {
  const [stats, setStats] = useState({
    sessionCount: 0,
    sessionLimit: 40,
    sessionPercentage: 0,
    weeklyCount: 0,
    weeklyLimit: 50,
    weeklyPercentage: 0,
    messagesLeft: 40,
    resetTime: 'Not set'
  });

  const updateStats = async () => {
    if (!isContextValid()) return;
    try {
      const state = await StorageManager.getState();
      const messageTimes = await StorageManager.getMessageTimes();
      const currentStats = calculateUsageStats(messageTimes, state.settings);
      setStats(currentStats);
    } catch (e: any) {
      if (e.message?.includes('context invalidated') || e.message?.includes('Extension context invalidated')) {
        return;
      }
      console.error('Failed to update stats in useMessageTracker', e);
    }
  };

  useEffect(() => {
    updateStats();

    // Set up a timer to update the countdown resetTime every minute
    const interval = setInterval(() => {
      if (isContextValid()) {
        updateStats();
      }
    }, 60000);

    const listener = (changes: { [key: string]: chrome.storage.StorageChange }, areaName: string) => {
      if (!isContextValid()) return;
      if (areaName === 'local' && (changes.messageTimes || changes.settings)) {
        updateStats();
      }
    };
    
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.onChanged) {
      chrome.storage.onChanged.addListener(listener);
    }

    return () => {
      clearInterval(interval);
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.onChanged) {
        try {
          chrome.storage.onChanged.removeListener(listener);
        } catch (e) {
          // Context might be invalidated, ignore
        }
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
