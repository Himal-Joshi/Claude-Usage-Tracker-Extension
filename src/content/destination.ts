import { isContextValid } from '../utils/chromeHelpers';
import type { ActiveChatContext } from '../types';

/** Maximum number of times to poll for the chat input box. */
const MAX_PASTE_ATTEMPTS = 30;

/** Delay between polling attempts (ms). */
const PASTE_RETRY_INTERVAL_MS = 500;

/** Target hostname patterns for cross-model transfer. */
const DESTINATIONS = {
  chatgpt: 'chatgpt.com',
  gemini: 'gemini.google.com',
  grok: 'x.com',
};

// ---------------------------------------------------------------------------
// Main Injector
// ---------------------------------------------------------------------------

function injectContext() {
  if (!isContextValid()) return;

  chrome.storage.local.get(['pendingChatContext'], (result) => {
    if (!result.pendingChatContext) return;

    const context = result.pendingChatContext as ActiveChatContext & { targetModel: string };
    const { targetModel, markdown, plainText } = context;
    const currentHost = window.location.hostname;
    
    let isTarget = false;
    if (targetModel === 'chatgpt' && currentHost.includes(DESTINATIONS.chatgpt)) isTarget = true;
    if (targetModel === 'gemini' && currentHost.includes(DESTINATIONS.gemini)) isTarget = true;
    if (targetModel === 'grok' && currentHost.includes(DESTINATIONS.grok)) isTarget = true;

    if (!isTarget) return;

    const textToPaste = targetModel === 'grok' ? plainText : markdown;
    let attempts = 0;

    const tryPaste = setInterval(() => {
      attempts++;
      
      const input = document.querySelector(
        'div[contenteditable="true"], textarea, #prompt-textarea, .ql-editor'
      ) as HTMLElement;

      if (input) {
        clearInterval(tryPaste);

        if (input.tagName === 'TEXTAREA') {
          pasteIntoTextInput(input as HTMLTextAreaElement, textToPaste);
        } else {
          pasteIntoContentEditable(input, textToPaste);
        }

        // Clear the pending context so it doesn't paste again on reload
        chrome.storage.local.remove('pendingChatContext');
      } else if (attempts >= MAX_PASTE_ATTEMPTS) {
        clearInterval(tryPaste);
      }
    }, PASTE_RETRY_INTERVAL_MS);
  });
}

// ---------------------------------------------------------------------------
// DOM Paste Helpers
// ---------------------------------------------------------------------------

/** Uses execCommand or textContent replacement to insert text into a contenteditable element. */
function pasteIntoContentEditable(el: HTMLElement, text: string): void {
  el.focus();
  const successful = document.execCommand('insertText', false, text);
  if (!successful) {
    el.textContent = text;
  }
  
  // Dispatch input events to trigger React/framework state updates
  el.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
  el.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
}

/** Inserts text into a standard textarea input. */
function pasteIntoTextInput(el: HTMLTextAreaElement, text: string): void {
  el.focus();
  el.value = text;
  
  // Dispatch input events to trigger React/framework state updates
  el.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
  el.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
}

// Run the injector when the DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', injectContext);
} else {
  injectContext();
}
