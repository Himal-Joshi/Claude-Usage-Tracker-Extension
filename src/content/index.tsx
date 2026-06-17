import React from 'react';
import { createRoot } from 'react-dom/client';
import ContentApp from './ContentApp';
import './index.css';

function injectApp() {
  if (document.getElementById('claude-usage-tracker-root')) return;

  const rootElement = document.createElement('div');
  rootElement.id = 'claude-usage-tracker-root';
  
  // Try to find the chat input container to append the bar near it
  const formElement = document.querySelector('fieldset') || document.querySelector('form');
  
  if (formElement && formElement.parentElement) {
    // Inject just before the input area if possible
    formElement.parentElement.insertBefore(rootElement, formElement);
    rootElement.className = 'w-full flex justify-center mb-2 z-50';
  } else {
    // Fallback: fixed at bottom center
    document.body.appendChild(rootElement);
    rootElement.className = 'fixed bottom-24 left-1/2 -translate-x-1/2 z-[999999]';
  }

  const root = createRoot(rootElement);
  root.render(<ContentApp />);
}

// Observe the DOM to inject when the Claude UI is fully rendered
const observer = new MutationObserver(() => {
  if (document.querySelector('fieldset') || document.querySelector('form')) {
    if (!document.getElementById('claude-usage-tracker-root')) {
      injectApp();
    }
  }
});

observer.observe(document.body, { childList: true, subtree: true });

if (document.readyState === 'complete' || document.readyState === 'interactive') {
  injectApp();
} else {
  document.addEventListener('DOMContentLoaded', injectApp);
}
