import type { ModelType } from './constants';

/**
 * CSS selectors for identifying user message elements in Claude's DOM.
 * Used across content scripts and hooks for message counting and extraction.
 */
export const USER_MESSAGE_SELECTORS = [
  '.font-user-message',
  '[data-is-user="true"]',
  '[data-testid*="user-message"]',
  '[data-message-author="user"]',
  '.user-message',
  '[class*="user-message"]',
  '[class*="UserMessage"]',
];

/**
 * CSS selectors for identifying assistant (Claude) message elements.
 * Includes broad selectors that require deduplication via `dedupeByAncestor`.
 */
export const ASSISTANT_MESSAGE_SELECTORS = [
  '[data-testid="assistant-message"]',
  '[data-testid*="assistant-message"]',
  '[data-message-author="assistant"]',
  '[data-is-user="false"]',
  '[class*="assistant-message"]',
  '[class*="AssistantMessage"]',
  '[class*="font-claude-message"]'
];

/**
 * Combined selector string for querying all message elements at once.
 * Results must be filtered through `dedupeByAncestor` before counting.
 */
export const USER_MESSAGE_SELECTOR_STRING = USER_MESSAGE_SELECTORS.join(', ');

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
