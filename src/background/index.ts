/// <reference types="chrome" />
import { encode } from 'gpt-tokenizer';
import { getMergedSettings } from '../utils/chromeHelpers';
import {
  MODEL_API_IDENTIFIERS,
  DEFAULT_MODEL,
  UNICODE_TOKEN_MULTIPLIER,
  ASCII_CHARS_PER_TOKEN,
  WEEKLY_WINDOW_MS,
} from '../utils/constants';
import type { ModelType } from '../utils/constants';

// ---------------------------------------------------------------------------
// Token estimation
// ---------------------------------------------------------------------------

/** Regex to detect non-ASCII characters (Unicode, Devanagari, CJK, etc.). */
const UNICODE_REGEX = /[^\x00-\x7F]/;

/**
 * Estimates token count for a given text using a character-based heuristic.
 * Uses a higher multiplier for Unicode text where multi-byte characters
 * produce more BPE tokens.
 */
function estimateTokens(text: string): number {
  const safeText = text || '';
  if (UNICODE_REGEX.test(safeText)) {
    return Math.ceil(safeText.length * UNICODE_TOKEN_MULTIPLIER);
  }
  return Math.ceil(safeText.length / ASCII_CHARS_PER_TOKEN);
}

// ---------------------------------------------------------------------------
// Anthropic API helpers
// ---------------------------------------------------------------------------

/** Required HTTP headers for Anthropic API requests. */
function buildAnthropicHeaders(apiKey: string): Record<string, string> {
  return {
    'x-api-key': apiKey,
    'anthropic-version': '2023-06-01',
    'content-type': 'application/json',
    'anthropic-dangerous-direct-browser-access': 'true',
  };
}

/** Resolves a short model name to the corresponding Anthropic API model identifier. */
function resolveApiModel(model?: string): string {
  return MODEL_API_IDENTIFIERS[(model as ModelType) || DEFAULT_MODEL] || MODEL_API_IDENTIFIERS[DEFAULT_MODEL];
}

// ---------------------------------------------------------------------------
// Message handlers
// ---------------------------------------------------------------------------

/** Opens the extension popup or falls back to the options page. */
function handleOpenOptions(): void {
  if (typeof chrome.action !== 'undefined' && typeof chrome.action.openPopup === 'function') {
    chrome.action.openPopup().catch(() => {
      chrome.runtime.openOptionsPage();
    });
  } else {
    chrome.runtime.openOptionsPage();
  }
}

/** Returns public-safe settings (hasApiKey flag and plan) to content scripts. */
async function handleGetPublicSettings(sendResponse: (response: unknown) => void): Promise<void> {
  try {
    const settings = await getMergedSettings();
    sendResponse({
      success: true,
      hasApiKey: !!settings.anthropicApiKey,
      claudePlan: settings.claudePlan || 'Free',
    });
  } catch (e: unknown) {
    sendResponse({ error: (e as Error).message });
  }
}

/** Counts tokens via the Anthropic token counting API (requires API key). */
async function handleCountTokens(
  message: { text: string; model?: string },
  sendResponse: (response: unknown) => void,
): Promise<void> {
  try {
    const settings = await getMergedSettings();

    if (!settings.anthropicApiKey) {
      sendResponse({ error: 'No API key configured' });
      return;
    }

    const apiModel = resolveApiModel(message.model);
    const response = await fetch('https://api.anthropic.com/v1/messages/count_tokens', {
      method: 'POST',
      headers: buildAnthropicHeaders(settings.anthropicApiKey),
      body: JSON.stringify({
        model: apiModel,
        messages: [{ role: 'user', content: message.text }],
      }),
    });

    if (response.ok) {
      const data = await response.json();
      sendResponse({ success: true, tokens: data.input_tokens });
    } else {
      sendResponse({ error: `API returned ${response.status}` });
    }
  } catch (e: unknown) {
    sendResponse({ error: (e as Error).message });
  }
}

/** Optimizes a prompt via the Anthropic messages API. */
async function handleOptimizePrompt(
  message: { systemPrompt: string; userPrompt: string },
  sendResponse: (response: unknown) => void,
): Promise<void> {
  try {
    const settings = await getMergedSettings();

    if (!settings.anthropicApiKey) {
      sendResponse({ error: 'No API key configured. Please configure your Anthropic API Key in Settings.' });
      return;
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: buildAnthropicHeaders(settings.anthropicApiKey),
      body: JSON.stringify({
        model: MODEL_API_IDENTIFIERS.sonnet,
        max_tokens: 4000,
        system: message.systemPrompt,
        messages: [{ role: 'user', content: message.userPrompt }],
      }),
    });

    if (response.ok) {
      const data = await response.json();
      const optimizedText = data.content?.[0]?.text || '';
      sendResponse({ success: true, optimizedText });
    } else {
      const errData = await response.json().catch(() => ({}));
      const errMsg = (errData as { error?: { message?: string } })?.error?.message || `API returned status ${response.status}`;
      sendResponse({ error: errMsg });
    }
  } catch (e: unknown) {
    sendResponse({ error: (e as Error).message });
  }
}

/** Records a message send timestamp, pruning entries older than 7 days. */
async function handleRecordMessageSent(sendResponse: (response: unknown) => void): Promise<void> {
  try {
    const timesResult = await chrome.storage.local.get('messageTimes');
    const times = (timesResult.messageTimes as number[]) || [];
    times.push(Date.now());
    const cutoff = Date.now() - WEEKLY_WINDOW_MS;
    const filteredTimes = times.filter(t => t > cutoff);
    await chrome.storage.local.set({ messageTimes: filteredTimes });
    sendResponse({ success: true });
  } catch (e: unknown) {
    sendResponse({ error: (e as Error).message });
  }
}

/**
 * Estimates tokens using gpt-tokenizer (BPE), falling back to the
 * character-based heuristic if the encoder throws.
 */
function handleEstimateTokens(
  message: { text?: string },
  sendResponse: (response: unknown) => void,
): void {
  try {
    const tokenCount = encode(message.text || '').length;
    sendResponse({ success: true, tokenCount });
  } catch {
    const tokenCount = estimateTokens(message.text || '');
    sendResponse({ success: true, tokenCount });
  }
}

// ---------------------------------------------------------------------------
// Message router
// ---------------------------------------------------------------------------

chrome.runtime.onInstalled.addListener(() => {
  // Extension installed or updated
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  switch (message.action) {
    case 'open_options':
      handleOpenOptions();
      return false;

    case 'get_public_settings':
      handleGetPublicSettings(sendResponse);
      return true;

    case 'count_tokens':
      handleCountTokens(message, sendResponse);
      return true;

    case 'optimize_prompt':
      handleOptimizePrompt(message, sendResponse);
      return true;

    case 'record_message_sent':
      handleRecordMessageSent(sendResponse);
      return true;

    case 'estimate_tokens':
      handleEstimateTokens(message, sendResponse);
      return false;

    default:
      return false;
  }
});
