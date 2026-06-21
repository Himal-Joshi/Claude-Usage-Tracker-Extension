import React from 'react';
import { createRoot } from 'react-dom/client';
import ContentApp from './ContentApp';
import SidebarApp from './SidebarApp';
import HeaderStatsApp from './HeaderStatsApp';
import './index.css';

function findSidebar(): HTMLElement | null {
  const navs = document.querySelectorAll('nav');
  for (const nav of navs) {
    if (
      nav.textContent?.includes('New chat') ||
      nav.textContent?.includes('Chats') ||
      nav.textContent?.includes('Recents') ||
      nav.textContent?.includes('Usage')
    ) {
      return nav as HTMLElement;
    }
  }
  return (document.querySelector('nav') || document.querySelector('[class*="sidebar"]') || document.querySelector('[class*="navigation"]')) as HTMLElement | null;
}

function findRecentsHeader(sidebar: HTMLElement): HTMLElement | null {
  const elements = sidebar.querySelectorAll('*');
  for (const el of elements) {
    if (el.children.length === 0 && el.textContent?.trim() === 'Recents') {
      return el as HTMLElement;
    }
  }
  return null;
}

function findChatTitleElement(): HTMLElement | null {
  const headings = document.querySelectorAll('h1, h2, [class*="font-title"], [class*="conversation-title"]');
  for (const h of headings) {
    if (!h.closest('nav') && !h.closest('[class*="sidebar"]')) {
      return h as HTMLElement;
    }
  }
  return null;
}

function findChatBoxContainer(): HTMLElement | null {
  const input = document.querySelector('div[contenteditable="true"], textarea');
  if (!input) return null;

  let el = input.parentElement;
  while (el && el.tagName !== 'FIELDSET' && el.tagName !== 'FORM') {
    if (el.querySelector('button, [role="button"]')) {
      return el;
    }
    el = el.parentElement;
  }

  return input.parentElement;
}

function findToolbarElement(chatBox: HTMLElement): HTMLElement | null {
  const children = Array.from(chatBox.children) as HTMLElement[];
  for (let i = children.length - 1; i >= 0; i--) {
    const child = children[i];
    if (child.querySelector('button, [role="button"]') && !child.querySelector('div[contenteditable="true"], textarea')) {
      return child;
    }
  }
  return null;
}

function injectApp() {
  if (document.getElementById('claude-usage-tracker-root')) return;

  const chatBox = findChatBoxContainer();
  if (!chatBox) return;

  const rootElement = document.createElement('div');
  rootElement.id = 'claude-usage-tracker-root';
  rootElement.className = 'w-full pointer-events-auto';

  const toolbar = findToolbarElement(chatBox);
  if (toolbar) {
    chatBox.insertBefore(rootElement, toolbar);
  } else {
    chatBox.appendChild(rootElement);
  }

  const root = createRoot(rootElement);
  root.render(<ContentApp />);
}

function injectSidebar() {
  if (document.getElementById('claude-usage-tracker-sidebar-root')) return;

  const sidebar = findSidebar();
  if (!sidebar) return;

  const rootElement = document.createElement('div');
  rootElement.id = 'claude-usage-tracker-sidebar-root';
  rootElement.className = 'w-full px-1.5 mt-2';

  const recentsHeader = findRecentsHeader(sidebar);
  if (recentsHeader) {
    let target = recentsHeader;
    while (target.parentElement && target.parentElement !== sidebar) {
      target = target.parentElement;
    }
    sidebar.insertBefore(rootElement, target);
  } else {
    sidebar.appendChild(rootElement);
  }

  const root = createRoot(rootElement);
  root.render(<SidebarApp />);
}

function findPlusButton(chatBox: HTMLElement): HTMLElement | null {
  const buttons = Array.from(chatBox.querySelectorAll('button'));
  for (const btn of buttons) {
    const label = (btn.getAttribute('aria-label') || '').toLowerCase();
    if (label.includes('upload') || label.includes('add') || label.includes('attach') || btn.querySelector('input[type="file"]')) {
      return btn;
    }
  }
  return chatBox.querySelector('button');
}

function injectHeaderStats() {
  if (document.getElementById('claude-usage-tracker-header-root')) return;

  const chatBox = findChatBoxContainer();
  if (!chatBox) return;

  const plusButton = findPlusButton(chatBox);
  if (!plusButton) return;

  const rootElement = document.createElement('div');
  rootElement.id = 'claude-usage-tracker-header-root';
  rootElement.className = 'inline-flex items-center ml-2.5 my-auto pointer-events-auto';

  plusButton.parentNode?.insertBefore(rootElement, plusButton.nextSibling);

  const root = createRoot(rootElement);
  root.render(<HeaderStatsApp />);
}

function getInputValue(): string {
  const inputElement = document.querySelector('div[contenteditable="true"], textarea');
  if (!inputElement) return '';
  if (inputElement.tagName === 'TEXTAREA') {
    return (inputElement as HTMLTextAreaElement).value.trim();
  }
  return inputElement.textContent?.trim() || '';
}

function getUserMessageCount(): number {
  const selectors = [
    '.font-user-message',
    '[data-is-user="true"]',
    '[data-testid*="user-message"]',
    '[data-message-author="user"]',
    '.user-message',
    '[class*="user-message"]',
    '[class*="UserMessage"]'
  ];
  return document.querySelectorAll(selectors.join(', ')).length;
}

let lastUserMessageCount = 0;
let lastPathname = window.location.pathname;
let lastInputTime = 0;
let lastInputValue = '';
let lastRecordedTime = 0;

function isContextValid(): boolean {
  return typeof chrome !== 'undefined' && !!chrome.runtime && !!chrome.runtime.id;
}

function recordMessageSent() {
  if (!isContextValid()) return;
  const now = Date.now();
  if (now - lastRecordedTime > 2000) {
    lastRecordedTime = now;
    chrome.runtime.sendMessage({ action: 'record_message_sent' });
  }
}

function checkMessageSending() {
  const currentPathname = window.location.pathname;
  const currentCount = getUserMessageCount();
  const currentInputValue = getInputValue();

  if (currentInputValue.trim().length > 0) {
    lastInputTime = Date.now();
    lastInputValue = currentInputValue;
  }

  if (currentPathname !== lastPathname) {
    const wasNewChat = lastPathname === '/' || lastPathname === '/new' || lastPathname.includes('/new');
    const hadRecentInput = (Date.now() - lastInputTime < 4000) || lastInputValue.trim().length > 0;
    
    if (wasNewChat && hadRecentInput) {
      recordMessageSent();
    }
    
    // Reset inputs
    lastInputTime = 0;
    lastInputValue = '';
    lastPathname = currentPathname;
    lastUserMessageCount = currentCount;
    return;
  }

  if (currentCount > lastUserMessageCount) {
    const hadRecentInput = (Date.now() - lastInputTime < 4000) || lastInputValue.trim().length > 0;
    if (hadRecentInput) {
      recordMessageSent();
    }
    // Reset inputs
    lastInputTime = 0;
    lastInputValue = '';
  }

  lastUserMessageCount = currentCount;
}

// Keydown and click listeners to catch direct submissions in real-time
document.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    const target = e.target as HTMLElement;
    if (target.isContentEditable || target.tagName === 'TEXTAREA') {
      const val = getInputValue();
      if (val.trim().length > 0) {
        recordMessageSent();
      }
    }
  }
}, true);

document.addEventListener('click', (e) => {
  const target = e.target as HTMLElement;
  const button = target.closest('button');
  if (button) {
    const label = (button.getAttribute('aria-label') || '').toLowerCase();
    const isUpload = label.includes('upload') || label.includes('add') || label.includes('attach') || button.querySelector('input[type="file"]');
    const isModel = label.includes('model') || label.includes('version') || label.includes('sonnet') || label.includes('opus') || label.includes('haiku');
    const isVoice = label.includes('mic') || label.includes('voice') || label.includes('audio') || label.includes('speech');
    const isExtension = button.closest('#claude-usage-tracker-root') || button.closest('#claude-usage-tracker-header-root');
    
    if (!isUpload && !isModel && !isVoice && !isExtension) {
      const val = getInputValue();
      if (val.trim().length > 0) {
        recordMessageSent();
      }
    }
  }
}, true);

const observer = new MutationObserver(() => {
  if (!document.getElementById('claude-usage-tracker-root')) {
    injectApp();
  }
  if (!document.getElementById('claude-usage-tracker-sidebar-root')) {
    injectSidebar();
  }
  if (!document.getElementById('claude-usage-tracker-header-root')) {
    injectHeaderStats();
  }

  checkMessageSending();
});

observer.observe(document.body, { childList: true, subtree: true, characterData: true });

const init = () => {
  lastUserMessageCount = getUserMessageCount();
  lastPathname = window.location.pathname;
  injectApp();
  injectSidebar();
  injectHeaderStats();
};

if (document.readyState === 'complete' || document.readyState === 'interactive') {
  init();
} else {
  document.addEventListener('DOMContentLoaded', init);
}
