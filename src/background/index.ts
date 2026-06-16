/// <reference types="chrome" />

// This is the background service worker
console.log("Claude Usage Tracker Background Service Worker Started.");

chrome.runtime.onInstalled.addListener(() => {
  console.log("Extension installed.");
});
