/// <reference types="chrome" />
import { encode } from 'gpt-tokenizer';

console.log("Claude Usage Tracker Background Service Worker Started.");

chrome.runtime.onInstalled.addListener(() => {
  console.log("Extension installed.");
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'open_options') {
    // Open the options page in a new tab or focus if it's already open
    chrome.runtime.openOptionsPage();
  } else if (message.action === 'get_public_settings') {
    (async () => {
      try {
        const result = await chrome.storage.local.get(['settings']);
        const sessionResult = await chrome.storage.session?.get(['settings']).catch(() => ({}));
        
        const localSettings = (result as any).settings || {};
        const sessionSettings = (sessionResult as any)?.settings || {};
        const settings = { ...localSettings, ...sessionSettings };
        
        const hasApiKey = !!settings.anthropicApiKey;
        const claudePlan = settings.claudePlan || 'Free';
        
        sendResponse({ success: true, hasApiKey, claudePlan });
      } catch (e: any) {
        sendResponse({ error: e.message });
      }
    })();
    return true;
  } else if (message.action === 'count_tokens') {
    (async () => {
      try {
        const result = await chrome.storage.local.get(['settings']);
        const sessionResult = await chrome.storage.session?.get(['settings']).catch(() => ({}));
        
        const localSettings = (result as any).settings || {};
        const sessionSettings = (sessionResult as any)?.settings || {};
        const settings = { ...localSettings, ...sessionSettings };
        
        const apiKey = settings.anthropicApiKey;
        
        if (!apiKey) {
          sendResponse({ error: 'No API key configured' });
          return;
        }

        const response = await fetch('https://api.anthropic.com/v1/messages/count_tokens', {
          method: 'POST',
          headers: {
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
            'content-type': 'application/json',
            'anthropic-dangerous-direct-browser-access': 'true'
          },
          body: JSON.stringify({
            model: 'claude-3-opus-20240229',
            messages: [{ role: 'user', content: message.text }]
          })
        });

        if (response.ok) {
          const data = await response.json();
          sendResponse({ success: true, tokens: data.input_tokens });
        } else {
          sendResponse({ error: `API returned ${response.status}` });
        }
      } catch (e: any) {
        sendResponse({ error: e.message });
      }
    })();
    return true; // Keep message channel open for async response
  } else if (message.action === 'estimate_tokens') {
    try {
      const tokenCount = encode(message.text || '').length;
      sendResponse({ success: true, tokenCount });
    } catch (err) {
      console.error("Token estimation failed", err);
      // Fallback
      const tokenCount = Math.ceil((message.text || '').length / 4);
      sendResponse({ success: true, tokenCount });
    }
    return false; // synchronous response
  }
});
