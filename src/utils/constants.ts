export const RATES = {
  opus: { input: 15, output: 75 },
  sonnet: { input: 3, output: 15 },
  haiku: { input: 0.80, output: 4.0 }
};

export type ModelType = 'opus' | 'sonnet' | 'haiku';

/**
 * Detects the active Claude model from the UI DOM.
 * Tries several selectors in order (testid containing model, aria-label, model selector text)
 * and falls back to 'sonnet'.
 */
export function detectModel(): ModelType {
  // 1. Check data-testid attribute containing "model"
  const testIdEl = document.querySelector('[data-testid*="model"]');
  if (testIdEl) {
    const text = (testIdEl.textContent || '').toLowerCase();
    if (text.includes('opus')) return 'opus';
    if (text.includes('haiku')) return 'haiku';
    if (text.includes('sonnet')) return 'sonnet';
  }

  // 2. Check aria-label on model picker / version buttons
  const modelButtons = document.querySelectorAll('button[aria-label*="model"], button[aria-label*="picker"], button[aria-label*="version"]');
  for (const btn of modelButtons) {
    const label = (btn.getAttribute('aria-label') || '').toLowerCase();
    if (label.includes('opus')) return 'opus';
    if (label.includes('haiku')) return 'haiku';
    if (label.includes('sonnet')) return 'sonnet';
  }

  // 3. Check text content of selector elements
  const selectorEls = document.querySelectorAll('[class*="model-selector"], [class*="ModelSelector"], [class*="model-picker"]');
  for (const el of selectorEls) {
    const text = (el.textContent || '').toLowerCase();
    if (text.includes('opus')) return 'opus';
    if (text.includes('haiku')) return 'haiku';
    if (text.includes('sonnet')) return 'sonnet';
  }

  // Fallback body indicator check
  const bodyText = (document.body.textContent || '').substring(0, 5000).toLowerCase();
  if (bodyText.includes('claude 3 opus') || bodyText.includes('claude 3.5 opus')) return 'opus';
  if (bodyText.includes('claude 3 haiku') || bodyText.includes('claude 3.5 haiku')) return 'haiku';

  return 'sonnet';
}
