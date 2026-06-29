import type { UserSettings, ClaudePlan, UsageStats } from '../types';
import { SESSION_WINDOW_MS, WEEKLY_WINDOW_MS } from './constants';

// ---------------------------------------------------------------------------
// Plan-specific default limits
// ---------------------------------------------------------------------------

/** Default message limits per plan when not overridden by user settings. */
const PLAN_DEFAULTS: Record<ClaudePlan, { session: number; weekly: number }> = {
  Free: { session: 40,  weekly: 50   },
  Pro:  { session: 45,  weekly: 300  },
  Team: { session: 100, weekly: 1000 },
};

/**
 * Computes session (5-hour rolling) and weekly (7-day rolling) usage
 * statistics from recorded message timestamps and user settings.
 *
 * @param messageTimes - Unix timestamps of all recorded message sends.
 * @param settings - Current user settings (plan, custom limits).
 * @returns Computed usage percentages, counts, limits, and reset timer.
 */
export function calculateUsageStats(messageTimes: number[], settings: UserSettings): UsageStats {
  const now = Date.now();
  const plan = settings.claudePlan || 'Free';
  const defaults = PLAN_DEFAULTS[plan];

  const sessionTimes = messageTimes.filter(t => t > now - SESSION_WINDOW_MS);
  const weeklyTimes = messageTimes.filter(t => t > now - WEEKLY_WINDOW_MS);

  const sessionLimit = settings.sessionMessageLimit || defaults.session;
  const weeklyLimit = settings.weeklyMessageLimit || defaults.weekly;

  const sessionCount = sessionTimes.length;
  const weeklyCount = weeklyTimes.length;

  const sessionPercentage = Math.min(100, Math.round((sessionCount / sessionLimit) * 100));
  const weeklyPercentage = Math.min(100, Math.round((weeklyCount / weeklyLimit) * 100));
  const messagesLeft = Math.max(0, sessionLimit - sessionCount);

  const resetTime = computeResetTime(sessionTimes, now);

  return {
    sessionCount,
    sessionLimit,
    sessionPercentage,
    weeklyCount,
    weeklyLimit,
    weeklyPercentage,
    messagesLeft,
    resetTime,
  };
}

/**
 * Calculates time until the oldest message in the session window expires.
 * Returns a human-readable string like "2h 15m" or "Not set".
 */
function computeResetTime(sessionTimes: number[], now: number): string {
  if (sessionTimes.length === 0) return 'Not set';

  const oldestTime = Math.min(...sessionTimes);
  const msRemaining = (oldestTime + SESSION_WINDOW_MS) - now;

  if (msRemaining <= 0) return 'Not set';

  const hours = Math.floor(msRemaining / (60 * 60 * 1000));
  const mins = Math.floor((msRemaining % (60 * 60 * 1000)) / (60 * 1000));

  return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
}
