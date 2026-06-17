/// <reference types="chrome" />

console.log("Claude Usage Tracker Background Service Worker Started.");

chrome.runtime.onInstalled.addListener(() => {
  console.log("Extension installed.");
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'open_options') {
    // Open the options page in a new tab or focus if it's already open
    chrome.runtime.openOptionsPage();
    // We can use storage to remember which tab to open
    chrome.storage.local.set({ activeTab: message.tab });
  } else if (message.action === 'count_tokens') {
    (async () => {
      try {
        const result = await chrome.storage.local.get(['settings']);
        const apiKey = (result.settings as any)?.anthropicApiKey;
        
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
  }
});
