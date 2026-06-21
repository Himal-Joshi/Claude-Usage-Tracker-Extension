import type { UserSettings } from '../types';

export function calculateUsageStats(messageTimes: number[], settings: UserSettings) {
  const now = Date.now();
  const fiveHoursAgo = now - 5 * 60 * 60 * 1000;
  const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;

  const sessionTimes = messageTimes.filter(t => t > fiveHoursAgo);
  const weeklyTimes = messageTimes.filter(t => t > sevenDaysAgo);

  const sessionLimit = settings.sessionMessageLimit || (settings.claudePlan === 'Pro' ? 45 : settings.claudePlan === 'Team' ? 100 : 40);
  const weeklyLimit = settings.weeklyMessageLimit || (settings.claudePlan === 'Pro' ? 300 : settings.claudePlan === 'Team' ? 1000 : 50);

  const sessionCount = sessionTimes.length;
  const weeklyCount = weeklyTimes.length;

  const sessionPercentage = Math.min(100, Math.round((sessionCount / sessionLimit) * 100));
  const weeklyPercentage = Math.min(100, Math.round((weeklyCount / weeklyLimit) * 100));
  const messagesLeft = Math.max(0, sessionLimit - sessionCount);

  // Calculate reset time (time until oldest message in 5h window falls out)
  let resetTime = 'Not set';
  if (sessionTimes.length > 0) {
    const oldestTime = Math.min(...sessionTimes);
    const msRemaining = (oldestTime + 5 * 60 * 60 * 1000) - now;
    if (msRemaining > 0) {
      const hours = Math.floor(msRemaining / (60 * 60 * 1000));
      const mins = Math.floor((msRemaining % (60 * 60 * 1000)) / (60 * 1000));
      if (hours > 0) {
        resetTime = `${hours}h ${mins}m`;
      } else {
        resetTime = `${mins}m`;
      }
    }
  }

  return {
    sessionCount,
    sessionLimit,
    sessionPercentage,
    weeklyCount,
    weeklyLimit,
    weeklyPercentage,
    messagesLeft,
    resetTime
  };
}
