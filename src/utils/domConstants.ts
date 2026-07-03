import type { ModelType } from './constants';

/**
 * CSS selectors for identifying user message elements in Claude's DOM.
 * Used across content scripts and hooks for message counting and extraction.
 */
export const USER_MESSAGE_SELECTORS = [
  '[data-testid="user-message"]',
  '[data-testid="human-message"]',
  '[data-testid="message-human"]',
  '[class*="font-user-message"]',
  '[data-is-user="true"]',
  '[data-testid*="user-message"]',
  '[data-message-author="user"]',
  '.user-message',
  '[class*="user-message"]',
  '[class*="UserMessage"]',
];

/**
 * CSS selectors for identifying assistant (Claude) message elements.
 * `.font-claude-response` is the current primary selector (Claude UI, 2026).
 */
export const ASSISTANT_MESSAGE_SELECTORS = [
  '[class*="font-claude-response"]',
  '.font-claude-response-body',
  '[data-testid="ai-message"]',
  '[data-testid="message-assistant"]',
  '[data-testid="assistant-message"]',
  '[data-testid*="assistant-message"]',
  '[data-message-author="assistant"]',
  '[data-is-user="false"]',
  '[class*="font-claude-message"]',
  '[class*="assistant-message"]',
  '[class*="AssistantMessage"]',
];

/**
 * Selectors for the inner markdown/content body within a message turn.
 */
export const MESSAGE_CONTENT_SELECTORS = [
  '.standard-markdown',
  '.progressive-markdown',
  '.markdown',
  '.prose',
  '[class*="markdown"]',
].join(', ');

/**
 * Turn-level selectors used to enumerate one node per user or assistant message.
 */
export const CONVERSATION_TURN_SELECTORS = [
  ...USER_MESSAGE_SELECTORS,
  ...ASSISTANT_MESSAGE_SELECTORS,
].join(', ');

/**
 * Combined selector string for querying all message elements at once.
 * Results must be filtered through `dedupeByAncestor` before counting.
 */
export const USER_MESSAGE_SELECTOR_STRING = USER_MESSAGE_SELECTORS.join(', ');

export const ASSISTANT_MESSAGE_SELECTOR_STRING = ASSISTANT_MESSAGE_SELECTORS.join(', ');

/**
 * Broad selectors for all conversation messages (user + assistant).
 * Used by the token tracker for text gathering.
 */
export const ALL_MESSAGE_SELECTORS =
  `${CONVERSATION_TURN_SELECTORS}, .prose, .ReactMarkdown`;

/** Classifies a deduped turn element as user, assistant, or unknown. */
export function classifyMessageRole(el: Element): 'user' | 'claude' | null {
  const testId = el.getAttribute('data-testid') || '';
  if (testId === 'user-message' || testId === 'human-message' || testId === 'message-human') {
    return 'user';
  }
  if (
    testId === 'ai-message' ||
    testId === 'message-assistant' ||
    testId === 'assistant-message' ||
    testId.includes('assistant-message')
  ) {
    return 'claude';
  }

  const isUserAttr = el.getAttribute('data-is-user');
  if (isUserAttr === 'true') return 'user';
  if (isUserAttr === 'false') return 'claude';

  const author = el.getAttribute('data-message-author');
  if (author === 'user') return 'user';
  if (author === 'assistant') return 'claude';

  if (el.matches('[class*="font-user-message"], [class*="user-message"], [class*="UserMessage"]')) {
    return 'user';
  }
  if (
    el.matches(
      '[class*="font-claude-response"], [class*="font-claude-message"], [class*="assistant-message"], [class*="AssistantMessage"]',
    )
  ) {
    return 'claude';
  }

  return null;
}

/**
 * CSS selector for locating Claude's chat input element.
 */
export const CLAUDE_INPUT_SELECTOR =
  'form div[contenteditable="true"], fieldset div[contenteditable="true"], div[contenteditable="true"]';

/**
 * Returns the Tailwind gradient class for a usage progress bar
 * based on the current percentage, using consistent thresholds
 * across ContentApp and SidebarApp.
 *
 * - > 90% → red (critical)
 * - > 75% → amber (warning)
 * - ≤ 75% → orange (normal)
 */
export function getUsageBarColor(percentage: number): string {
  if (percentage > 90) return 'bg-gradient-to-r from-red-500 to-rose-400';
  if (percentage > 75) return 'bg-gradient-to-r from-amber-500 to-orange-400';
  return 'bg-gradient-to-r from-orange-500 to-amber-400';
}

/**
 * Extracts a model type from a text string by checking for known model names.
 * Returns `null` if no model name is found.
 */
export function extractModelFromText(text: string): ModelType | null {
  const lower = text.toLowerCase();
  if (lower.includes('opus')) return 'opus';
  if (lower.includes('haiku')) return 'haiku';
  if (lower.includes('sonnet')) return 'sonnet';
  return null;
}
