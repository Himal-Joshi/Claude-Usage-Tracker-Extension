/** Supported Claude subscription plans. */
export type ClaudePlan = 'Free' | 'Pro' | 'Team';

/** A single message within a conversation. */
export interface Message {
  id: string;
  role: 'user' | 'claude';
  content: string;
  tokens: number;
  timestamp: number;
  artifacts?: Artifact[];
}

/** An artifact attached to a Claude response (code, documents, etc.). */
export interface Artifact {
  id: string;
  name: string;
  type: string;
  content: string;
}

/** A complete conversation containing messages and token totals. */
export interface Conversation {
  id: string;
  url: string;
  title: string;
  messages: Message[];
  totalInputTokens: number;
  totalOutputTokens: number;
  lastUpdated: number;
}

/**
 * Aggregated token usage statistics for a single day.
 * @property date - ISO date string in YYYY-MM-DD format.
 * @property chatMaxTokens - Per-chat peak token counts, keyed by chat ID.
 */
export interface DailyStats {
  date: string;
  inputTokens: number;
  outputTokens: number;
  conversationsCount: number;
  chatMaxTokens?: Record<string, number>;
}

/** User-configurable extension settings. */
export interface UserSettings {
  anthropicApiKey?: string;
  rememberApiKey?: boolean;
  autoBackup?: boolean;
  claudePlan?: ClaudePlan;
  sessionMessageLimit?: number;
  weeklyMessageLimit?: number;
}

/** Top-level persisted extension state. */
export interface ExtensionState {
  settings: UserSettings;
  stats: Record<string, DailyStats>;
  conversations: Record<string, Conversation>;
}

/** Computed usage statistics for session and weekly windows. */
export interface UsageStats {
  sessionCount: number;
  sessionLimit: number;
  sessionPercentage: number;
  weeklyCount: number;
  weeklyLimit: number;
  weeklyPercentage: number;
  messagesLeft: number;
  resetTime: string;
}

/** Context extracted from an active Claude chat for cross-model transfer. */
export interface ActiveChatContext {
  title: string;
  turns: number;
  url: string;
  markdown: string;
  plainText: string;
  model?: string;
}
