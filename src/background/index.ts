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
  }
});
