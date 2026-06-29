import type { UserSettings } from '../types';

/**
 * Checks whether the Chrome extension context is still valid.
 * Must be called before any `chrome.runtime` or `chrome.storage` call
 * to avoid "Extension context invalidated" errors after mid-session unloads.
 */
export function isContextValid(): boolean {
  return typeof chrome !== 'undefined' && !!chrome.runtime && !!chrome.runtime.id;
}

/**
 * Retrieves settings merged from both `chrome.storage.local` and
 * `chrome.storage.session`, with session values taking precedence.
 * Session storage may not exist in all environments and is wrapped in try/catch.
 */
export async function getMergedSettings(): Promise<UserSettings> {
  const result = await chrome.storage.local.get(['settings']);
  const sessionResult = await chrome.storage.session?.get(['settings']).catch(() => ({}));

  const localSettings = (result as Record<string, unknown>).settings as UserSettings || {};
  const sessionSettings = (sessionResult as Record<string, unknown>)?.settings as UserSettings || {};

  return { ...localSettings, ...sessionSettings };
}

/**
 * Filters a list of DOM elements to retain only the topmost ancestors,
 * removing any element that is a descendant of another element in the list.
 *
 * Required because broad CSS selectors like `[class*="user-message"]` match
 * both wrapper elements and their children, causing double-counting.
 *
 * @param elements - Raw list of matched DOM elements.
 * @returns Deduplicated list containing only topmost ancestors.
 */
export function dedupeByAncestor<T extends Element>(elements: T[]): T[] {
  return elements.filter(el => !elements.some(other => other !== el && other.contains(el)));
}
