import { extractModelFromText } from './domConstants';

// ---------------------------------------------------------------------------
// Pricing & model configuration
// ---------------------------------------------------------------------------

/** Per-million-token pricing for each Claude model (USD). */
export const RATES: Record<ModelType, { input: number; output: number }> = {
  opus:   { input: 15,   output: 75  },
  sonnet: { input: 3,    output: 15  },
  haiku:  { input: 0.80, output: 4.0 },
};

/** Short model identifiers used internally throughout the extension. */
export type ModelType = 'opus' | 'sonnet' | 'haiku';

/** Mapping from internal model identifiers to Anthropic API model strings. */
export const MODEL_API_IDENTIFIERS: Record<ModelType, string> = {
  opus:   'claude-opus-4-5',
  sonnet: 'claude-sonnet-4-6',
  haiku:  'claude-haiku-4-5-20251001',
};

/** Default model used when detection fails. */
export const DEFAULT_MODEL: ModelType = 'sonnet';

// ---------------------------------------------------------------------------
// Token estimation constants
// ---------------------------------------------------------------------------

/** Multiplier for non-ASCII text where multi-byte characters split into multiple BPE tokens. */
export const UNICODE_TOKEN_MULTIPLIER = 1.5;

/** Approximate characters per token for standard ASCII text. */
export const ASCII_CHARS_PER_TOKEN = 4;

/** Ratio of total tokens assumed to be output (used to split into input/output estimates). */
export const ESTIMATED_OUTPUT_RATIO = 0.6;

/** Divisor for converting raw token × rate to dollar cost. */
export const TOKENS_PER_MILLION = 1_000_000;

// ---------------------------------------------------------------------------
// Context and rate limit constants
// ---------------------------------------------------------------------------

/** Context window size for Pro and Team plans (tokens). */
export const PRO_CONTEXT_LIMIT = 200_000;

/** Context window size for Free plan (tokens). */
export const FREE_CONTEXT_LIMIT = 100_000;

/** Maximum characters to process for token estimation (4 chars/token × 200k limit). */
export const TRUNCATE_CHAR_LIMIT = 800_000;

/** Maximum text length sent to the Anthropic count_tokens API. */
export const API_TEXT_LIMIT = 50_000;

// ---------------------------------------------------------------------------
// Timing constants
// ---------------------------------------------------------------------------

/** Rolling session window duration (5 hours in milliseconds). */
export const SESSION_WINDOW_MS = 5 * 60 * 60 * 1000;

/** Rolling weekly window duration (7 days in milliseconds). */
export const WEEKLY_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

/** Debounce delay before hitting the Anthropic API for exact token counts (ms). */
export const API_DEBOUNCE_MS = 2000;

/** Interval for polling pathname changes to detect chat navigation (ms). */
export const PATHNAME_POLL_MS = 500;

/** Minimum milliseconds between recording consecutive message sends (prevents double-counting). */
export const RECORD_DEBOUNCE_MS = 2000;

/** Time window for considering recent input as related to a message send (ms). */
export const RECENT_INPUT_THRESHOLD_MS = 4000;

/** Interval for refreshing usage stats display (ms). */
export const STATS_REFRESH_INTERVAL_MS = 60_000;

/** Duration to show copy/save confirmation feedback (ms). */
export const COPY_FEEDBACK_DURATION_MS = 2000;

// ---------------------------------------------------------------------------
// UI thresholds
// ---------------------------------------------------------------------------

/** Width threshold below which the sidebar is considered collapsed (px). */
export const COLLAPSED_SIDEBAR_THRESHOLD_PX = 120;

/** Minimum tokens per turn used when estimating remaining chat capacity. */
export const MIN_TOKENS_PER_TURN = 2500;

/** Minimum progress bar width percentage to ensure visibility. */
export const MIN_PROGRESS_BAR_PERCENT = 2;

/** Number of characters scanned from document body for fallback model detection. */
const BODY_SCAN_LIMIT = 5000;

// ---------------------------------------------------------------------------
// Model detection
// ---------------------------------------------------------------------------

/**
 * Detects the active Claude model from the UI DOM by scanning
 * data-testid attributes, aria-labels, model selector classes,
 * and a limited body text scan. Falls back to `'sonnet'`.
 */
export function detectModel(): ModelType {
  const testIdEl = document.querySelector('[data-testid*="model"]');
  if (testIdEl) {
    const match = extractModelFromText(testIdEl.textContent || '');
    if (match) return match;
  }

  const modelButtons = document.querySelectorAll(
    'button[aria-label*="model"], button[aria-label*="picker"], button[aria-label*="version"]'
  );
  for (const btn of modelButtons) {
    const match = extractModelFromText(btn.getAttribute('aria-label') || '');
    if (match) return match;
  }

  const selectorEls = document.querySelectorAll(
    '[class*="model-selector"], [class*="ModelSelector"], [class*="model-picker"]'
  );
  for (const el of selectorEls) {
    const match = extractModelFromText(el.textContent || '');
    if (match) return match;
  }

  const bodyText = (document.body.textContent || '').substring(0, BODY_SCAN_LIMIT).toLowerCase();
  if (bodyText.includes('claude 3 opus') || bodyText.includes('claude 3.5 opus')) return 'opus';
  if (bodyText.includes('claude 3 haiku') || bodyText.includes('claude 3.5 haiku')) return 'haiku';

  return DEFAULT_MODEL;
}
