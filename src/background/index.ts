/// <reference types="chrome" />
import { encode } from 'gpt-tokenizer';

console.log("Claude Usage Tracker Background Service Worker Started.");

/**
 * Estimates token count for a given text.
 * For Unicode/Devanagari/mixed script, a multiplier of 1.5 is used because multi-byte UTF-8 
 * representations split characters into multiple BPE tokens. For standard ASCII text, 
 * the standard 4 characters per token heuristic is used.
 * @param text The input text to estimate tokens for.
 */
function estimateTokens(text: string): number {
  const containsUnicode = /[^\x00-\x7F]/.test(text || '');
  if (containsUnicode) {
    return Math.ceil((text || '').length * 1.5);
  }
  return Math.ceil((text || '').length / 4);
}

chrome.runtime.onInstalled.addListener(() => {
  console.log("Extension installed.");
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'open_options') {
    // Try to open the extension popup programmatically first
    if (typeof chrome.action !== 'undefined' && typeof chrome.action.openPopup === 'function') {
      chrome.action.openPopup().catch((err) => {
        console.warn("Failed to open popup programmatically, falling back to options page:", err);
        chrome.runtime.openOptionsPage();
      });
    } else {
      chrome.runtime.openOptionsPage();
    }
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

        let apiModel = 'claude-3-5-sonnet-latest';
        if (message.model === 'opus') {
          apiModel = 'claude-opus-4-5';
        } else if (message.model === 'haiku') {
          apiModel = 'claude-haiku-4-5-20251001';
        } else if (message.model === 'sonnet') {
          apiModel = 'claude-sonnet-4-5';
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
            model: apiModel,
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
  } else if (message.action === 'optimize_prompt') {
    (async () => {
      try {
        const result = await chrome.storage.local.get(['settings']);
        const sessionResult = await chrome.storage.session?.get(['settings']).catch(() => ({}));
        
        const localSettings = (result as any).settings || {};
        const sessionSettings = (sessionResult as any)?.settings || {};
        const settings = { ...localSettings, ...sessionSettings };
        
        const apiKey = settings.anthropicApiKey;
        
        if (!apiKey) {
          sendResponse({ error: 'No API key configured. Please configure your Anthropic API Key in Settings.' });
          return;
        }

        const systemPrompt = message.systemPrompt;
        const userPrompt = message.userPrompt;

        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
            'content-type': 'application/json',
            'anthropic-dangerous-direct-browser-access': 'true'
          },
          body: JSON.stringify({
            model: 'claude-3-5-sonnet-20240620',
            max_tokens: 4000,
            system: systemPrompt,
            messages: [{ role: 'user', content: userPrompt }]
          })
        });

        if (response.ok) {
          const data = await response.json();
          const optimizedText = data.content?.[0]?.text || '';
          sendResponse({ success: true, optimizedText });
        } else {
          const errData = await response.json().catch(() => ({}));
          const errMsg = errData?.error?.message || `API returned status ${response.status}`;
          sendResponse({ error: errMsg });
        }
      } catch (e: any) {
        sendResponse({ error: e.message });
      }
    })();
    return true; // Keep message channel open for async response
  } else if (message.action === 'record_message_sent') {
    (async () => {
      try {
        const timesResult = await chrome.storage.local.get('messageTimes');
        const times = (timesResult.messageTimes as number[]) || [];
        times.push(Date.now());
        const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
        const filteredTimes = times.filter(t => t > sevenDaysAgo);
        await chrome.storage.local.set({ messageTimes: filteredTimes });
        sendResponse({ success: true });
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
      const tokenCount = estimateTokens(message.text || '');
      sendResponse({ success: true, tokenCount });
    }
    return false; // synchronous response
  }
});
