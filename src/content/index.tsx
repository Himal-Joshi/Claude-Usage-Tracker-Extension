import React from 'react';
import { createRoot } from 'react-dom/client';
import ContentApp from './ContentApp';
import './index.css';

function injectApp() {
  if (document.getElementById('claude-usage-tracker-root')) return;

  const rootElement = document.createElement('div');
  rootElement.id = 'claude-usage-tracker-root';
  
  // Try to find the chat input container (fieldset)
  const formElement = document.querySelector('fieldset');
  
  if (formElement) {
    // Inject inside the fieldset, absolutely positioned in the bottom toolbar area
    formElement.style.position = 'relative';
    formElement.appendChild(rootElement);
    // Position it between the '+' button (left-12) and the model selector (right-44)
    rootElement.className = 'absolute bottom-3 left-[52px] right-[180px] z-50 flex items-center';
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
