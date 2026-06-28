import React from 'react';
import { createRoot } from 'react-dom/client';
import ContentApp from './ContentApp';
import SidebarApp from './SidebarApp';
import HeaderStatsApp from './HeaderStatsApp';
import { detectModel } from '../utils/constants';
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

function getCleanChatTitle(): string {
  let title = document.title || '';
  if (title.endsWith(' - Claude')) {
    title = title.substring(0, title.length - 9);
  }
  return title.trim();
}

function findChatTitleElement(): HTMLElement | null {
  if (!window.location.pathname.includes('/chat/')) {
    return null;
  }

  // 1. Try stable data-testid first
  const testIdTitle = document.querySelector('[data-testid="chat-title-button"]');
  if (testIdTitle && !testIdTitle.closest('nav') && !testIdTitle.closest('[class*="sidebar"]')) {
    return testIdTitle as HTMLElement;
  }

  // 2. Try finding the element containing the clean title at the top of the viewport
  const cleanTitle = getCleanChatTitle();
  if (cleanTitle && cleanTitle !== 'Claude') {
    const elements = document.querySelectorAll('button, div[role="button"], h1, h2, [class*="title"], [class*="ConversationHeader"]');
    for (const el of elements) {
      if (!el.closest('nav') && !el.closest('[class*="sidebar"]')) {
        const text = el.textContent?.trim() || '';
        if (text === cleanTitle || text === cleanTitle + ' v' || text.startsWith(cleanTitle)) {
          const rect = el.getBoundingClientRect();
          if (rect.top >= 0 && rect.top < 120) {
            return el as HTMLElement;
          }
        }
      }
    }
  }

  // 3. Fallback: look for a header ancestor of the Share button
  const buttons = document.querySelectorAll('button');
  for (const btn of buttons) {
    if (btn.textContent?.trim() === 'Share') {
      let parent = btn.parentElement;
      while (parent && parent.tagName !== 'BODY') {
        const titleBtn = parent.querySelector('button, [role="button"], h1, h2');
        if (titleBtn && titleBtn !== btn) {
          const text = titleBtn.textContent?.trim() || '';
          if (text && (text === cleanTitle || text.startsWith(cleanTitle.substring(0, 10)))) {
            const rect = titleBtn.getBoundingClientRect();
            if (rect.top >= 0 && rect.top < 120) {
              return titleBtn as HTMLElement;
            }
          }
        }
        parent = parent.parentElement;
      }
    }
  }

  // 4. Double fallback: look for headings only within the header or top bar container
  const header = document.querySelector('header') || document.querySelector('[class*="header"]') || document.querySelector('[class*="topbar"]');
  if (header && !header.closest('nav') && !header.closest('[class*="sidebar"]')) {
    const headings = header.querySelectorAll('h1, h2, [class*="font-title"], [class*="conversation-title"]');
    if (headings.length > 0) {
      return headings[0] as HTMLElement;
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

function injectHeaderStats() {
  if (!window.location.pathname.includes('/chat/')) {
    const wrapper = document.getElementById('claude-usage-tracker-title-wrapper');
    if (wrapper) {
      const children = Array.from(wrapper.childNodes);
      for (const child of children) {
        if (child.nodeType === Node.ELEMENT_NODE) {
          const el = child as HTMLElement;
          if (el.id !== 'claude-usage-tracker-header-root') {
            wrapper.parentNode?.insertBefore(el, wrapper);
          }
        }
      }
      wrapper.remove();
    }
    const existingRoot = document.getElementById('claude-usage-tracker-header-root');
    if (existingRoot) {
      existingRoot.remove();
    }
    return;
  }

  const titleEl = findChatTitleElement();
  if (!titleEl) return;

  const existingRoot = document.getElementById('claude-usage-tracker-header-root');

  let wrapper = document.getElementById('claude-usage-tracker-title-wrapper');
  if (wrapper) {
    if (titleEl.parentNode === wrapper) {
      if (existingRoot && existingRoot.parentNode === wrapper) {
        // Wrapper and root already exist. Keep padding updated to align stats text with title text!
        const wrapperRect = wrapper.getBoundingClientRect();
        const titleRect = titleEl.getBoundingClientRect();
        const computedStyle = window.getComputedStyle(titleEl);
        const paddingLeft = parseFloat(computedStyle.paddingLeft) || 0;
        const borderLeft = parseFloat(computedStyle.borderLeftWidth) || 0;
        const textLeft = titleRect.left + paddingLeft + borderLeft;
        const leftOffset = Math.max(0, textLeft - wrapperRect.left);
        existingRoot.style.paddingLeft = `${leftOffset}px`;
        return;
      }
    } else {
      const children = Array.from(wrapper.childNodes);
      for (const child of children) {
        if (child.nodeType === Node.ELEMENT_NODE) {
          const el = child as HTMLElement;
          if (el.id !== 'claude-usage-tracker-header-root') {
            wrapper.parentNode?.insertBefore(el, wrapper);
          }
        }
      }
      wrapper.remove();
      wrapper = null;
      if (existingRoot) {
        existingRoot.remove();
      }
    }
  }

  if (!wrapper) {
    wrapper = document.createElement('div');
    wrapper.id = 'claude-usage-tracker-title-wrapper';
    wrapper.className = 'flex flex-col items-start min-w-0';
    titleEl.parentNode?.insertBefore(wrapper, titleEl);
    wrapper.appendChild(titleEl);
  }

  const rootElement = document.createElement('div');
  rootElement.id = 'claude-usage-tracker-header-root';
  rootElement.className = 'w-full pointer-events-auto';

  // Align stats text with the chat title text on creation
  const wrapperRect = wrapper.getBoundingClientRect();
  const titleRect = titleEl.getBoundingClientRect();
  const computedStyle = window.getComputedStyle(titleEl);
  const paddingLeft = parseFloat(computedStyle.paddingLeft) || 0;
  const borderLeft = parseFloat(computedStyle.borderLeftWidth) || 0;
  const textLeft = titleRect.left + paddingLeft + borderLeft;
  const leftOffset = Math.max(0, textLeft - wrapperRect.left);
  rootElement.style.paddingLeft = `${leftOffset}px`;

  wrapper.appendChild(rootElement);

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

// Listen for message requests from the popup/options page
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'get_chat_context') {
    try {
      const title = (document.title || 'Claude Chat').replace(' - Claude', '').trim();
      
      const userSelectors = [
        '.font-user-message',
        '[data-is-user="true"]',
        '[data-testid*="user-message"]',
        '[data-message-author="user"]',
        '.user-message',
        '[class*="user-message"]',
        '[class*="UserMessage"]'
      ];

      const assistantSelectors = [
        '.font-claude-message',
        '[data-testid="assistant-message"]',
        '[data-message-author="assistant"]',
        '.assistant-message',
        '[class*="assistant-message"]',
        '[class*="AssistantMessage"]'
      ];

      const rawUserEls = Array.from(document.querySelectorAll(userSelectors.join(', ')));
      const userEls = rawUserEls.filter(el => !rawUserEls.some(parent => parent !== el && parent.contains(el)));

      const rawAssistantEls = Array.from(document.querySelectorAll(assistantSelectors.join(', ')));
      const assistantEls = rawAssistantEls.filter(el => !rawAssistantEls.some(parent => parent !== el && parent.contains(el)));

      const allMessages: { role: 'user' | 'claude'; el: HTMLElement }[] = [];
      userEls.forEach(el => allMessages.push({ role: 'user', el: el as HTMLElement }));
      assistantEls.forEach(el => allMessages.push({ role: 'claude', el: el as HTMLElement }));

      allMessages.sort((a, b) => {
        const position = a.el.compareDocumentPosition(b.el);
        if (position & Node.DOCUMENT_POSITION_FOLLOWING) return -1;
        if (position & Node.DOCUMENT_POSITION_PRECEDING) return 1;
        return 0;
      });

      let markdown = `# ${title}\n\n`;
      let plainText = ``;

      allMessages.forEach((msg) => {
        const speaker = msg.role === 'user' ? 'User' : 'Claude';
        const textContent = msg.el.innerText || msg.el.textContent || '';
        
        markdown += `## ${speaker}\n\n${textContent.trim()}\n\n---\n\n`;
        plainText += `${speaker}:\n${textContent.trim()}\n\n`;
      });

      const turns = userEls.length;

      sendResponse({
        success: true,
        title,
        turns,
        markdown: markdown.trim(),
        plainText: plainText.trim(),
        model: detectModel()
      });
    } catch (e: any) {
      sendResponse({ success: false, error: e.message });
    }
    return true; // keep message channel open
  }
  return false;
});

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
