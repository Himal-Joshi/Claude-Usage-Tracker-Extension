import React from 'react';
import { createRoot } from 'react-dom/client';
import ContentApp from './ContentApp';
import './index.css';

function init() {
  const rootElement = document.createElement('div');
  rootElement.id = 'claude-usage-tracker-root';
  
  // Try to find the chat input container to append the bar near it
  // For Claude.ai, the input area usually has specific classes, we'll append to body and use fixed positioning for now,
  // or we can attach it to a specific parent once we observe the DOM.
  
  document.body.appendChild(rootElement);

  const root = createRoot(rootElement);
  root.render(<ContentApp />);
}

// Ensure the page is loaded
if (document.readyState === 'complete' || document.readyState === 'interactive') {
  init();
} else {
  document.addEventListener('DOMContentLoaded', init);
}
