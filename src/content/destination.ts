const DESTINATION_DOMAINS = ['chatgpt.com', 'gemini.google.com', 'grok.com'];

async function handleAutoPaste() {
  const currentHost = window.location.hostname;
  
  // Find matching domain
  const matchedDomain = DESTINATION_DOMAINS.find(domain => currentHost.includes(domain));
  if (!matchedDomain) return;

  try {
    const data = await chrome.storage.local.get('pendingPaste');
    if (!data || !data.pendingPaste) return;

    const pending = data.pendingPaste as { text: string; destination: string };
    const { text, destination } = pending;
    if (destination !== matchedDomain) return;

    // We found a pending paste for this site!
    // Wait for the input element to appear
    let attempts = 0;
    const maxAttempts = 30; // 15 seconds
    
    const tryPaste = () => {
      let inputEl: HTMLElement | null = null;

      if (matchedDomain === 'chatgpt.com') {
        inputEl = document.querySelector('#prompt-textarea') || document.querySelector('textarea');
      } else if (matchedDomain === 'gemini.google.com') {
        inputEl = document.querySelector('div[contenteditable="true"]') || document.querySelector('textarea');
      } else if (matchedDomain === 'grok.com') {
        inputEl = document.querySelector('textarea') || document.querySelector('div[contenteditable="true"]');
      }

      // General fallback
      if (!inputEl) {
        inputEl = document.querySelector('div[contenteditable="true"], textarea, [role="textbox"]') as HTMLElement;
      }

      if (inputEl) {
        // Clear storage first so we don't paste again on reload
        chrome.storage.local.remove('pendingPaste');

        // Focus and paste
        inputEl.focus();

        if (inputEl.tagName === 'TEXTAREA' || inputEl.tagName === 'INPUT') {
          const textEl = inputEl as HTMLTextAreaElement | HTMLInputElement;
          textEl.value = text;
          // Trigger events
          textEl.dispatchEvent(new Event('input', { bubbles: true }));
          textEl.dispatchEvent(new Event('change', { bubbles: true }));
        } else if (inputEl.isContentEditable) {
          // For rich text divs (like Gemini)
          inputEl.textContent = text;
          inputEl.dispatchEvent(new Event('input', { bubbles: true }));
          inputEl.dispatchEvent(new Event('change', { bubbles: true }));
          
          // Selection/focus fallback
          try {
            const range = document.createRange();
            const sel = window.getSelection();
            range.selectNodeContents(inputEl);
            range.collapse(false);
            sel?.removeAllRanges();
            sel?.addRange(range);
          } catch (e) {
            console.error('Failed to set cursor position:', e);
          }
        }
        console.log('Successfully pasted chat context automatically.');
      } else {
        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(tryPaste, 500);
        }
      }
    };

    tryPaste();
  } catch (err) {
    console.error('Error in auto paste script:', err);
  }
}

if (document.readyState === 'complete' || document.readyState === 'interactive') {
  handleAutoPaste();
} else {
  document.addEventListener('DOMContentLoaded', handleAutoPaste);
}
export {};
