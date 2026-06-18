export interface Message {
  id: string;
  role: 'user' | 'claude';
  content: string;
  tokens: number;
  timestamp: number;
  artifacts?: Artifact[];
}

export interface Artifact {
  id: string;
  name: string;
  type: string;
  content: string;
}

export interface Conversation {
  id: string;
  url: string;
  title: string;
  messages: Message[];
  totalInputTokens: number;
  totalOutputTokens: number;
  lastUpdated: number;
}

export interface DailyStats {
  date: string; // YYYY-MM-DD
  inputTokens: number;
  outputTokens: number;
  conversationsCount: number;
  chatMaxTokens?: Record<string, number>;
}

export interface UserSettings {
  anthropicApiKey?: string;
  rememberApiKey?: boolean;
  autoBackup?: boolean;
  claudePlan?: 'Free' | 'Pro' | 'Team';
}

export interface ExtensionState {
  settings: UserSettings;
  stats: Record<string, DailyStats>;
  conversations: Record<string, Conversation>;
}
