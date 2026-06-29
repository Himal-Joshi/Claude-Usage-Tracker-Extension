import React from 'react';
import { createRoot } from 'react-dom/client';
import ContentApp from './ContentApp';
import SidebarApp from './SidebarApp';
import HeaderStatsApp from './HeaderStatsApp';
import { isContextValid, dedupeByAncestor } from '../utils/chromeHelpers';
import {
  USER_MESSAGE_SELECTORS,
  USER_MESSAGE_SELECTOR_STRING,
  ASSISTANT_MESSAGE_SELECTORS,
} from '../utils/domConstants';
import {
  RECORD_DEBOUNCE_MS,
  RECENT_INPUT_THRESHOLD_MS,
  detectModel,
} from '../utils/constants';
import { htmlToMarkdown, htmlToPlainText } from '../utils/domParser';
import {
  findSidebar,
  findRecentsHeader,
  getCleanChatTitle,
  findChatTitleElement,
  findChatBoxContainer,
  findToolbarElement,
} from '../utils/domFinders';
import './index.css';

// ---------------------------------------------------------------------------
// Injectors
// ---------------------------------------------------------------------------

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
        // Keep padding updated to align stats text with title text
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
      if (existingRoot) existingRoot.remove();
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

// ---------------------------------------------------------------------------
// Message Context Extraction (Fix: Parse entire container, rely on domParser for skipping chrome)
// ---------------------------------------------------------------------------

function buildChatContext() {
  const title = getCleanChatTitle() || 'Claude Chat';
  
  // 1. Gather all message elements by role
  const rawUserEls = Array.from(document.querySelectorAll(USER_MESSAGE_SELECTOR_STRING));
  const rawAssistantEls = Array.from(document.querySelectorAll(ASSISTANT_MESSAGE_SELECTORS.join(', ')));

  // 2. Deduplicate nodes to get the outermost wrappers
  let userEls = dedupeByAncestor(rawUserEls);
  let assistantEls = dedupeByAncestor(rawAssistantEls);

  // 3. Cross-role contamination filter
  // Remove user elements that contain or are contained by assistant elements (and vice versa)
  userEls = userEls.filter(uEl => !assistantEls.some(aEl => aEl.contains(uEl) || uEl.contains(aEl)));
  assistantEls = assistantEls.filter(aEl => !userEls.some(uEl => uEl.contains(aEl) || aEl.contains(uEl)));

  // 4. Parse content
  const allMessages: { role: 'user' | 'claude'; markdown: string; plainText: string; el: Element }[] = [];

  userEls.forEach((el) => {
    const markdown = htmlToMarkdown(el as HTMLElement).trim();
    const plainText = htmlToPlainText(el as HTMLElement).trim();
    if (markdown || plainText) {
      allMessages.push({ role: 'user', markdown, plainText, el });
    }
  });

  assistantEls.forEach((el) => {
    const markdown = htmlToMarkdown(el as HTMLElement).trim();
    const plainText = htmlToPlainText(el as HTMLElement).trim();
    if (markdown || plainText) {
      allMessages.push({ role: 'claude', markdown, plainText, el });
    }
  });

  // 5. Sort chronologically by DOM position
  allMessages.sort((a, b) => {
    const position = a.el.compareDocumentPosition(b.el);
    if (position & Node.DOCUMENT_POSITION_FOLLOWING) return -1;
    if (position & Node.DOCUMENT_POSITION_PRECEDING) return 1;
    return 0;
  });

  const turns = allMessages.filter((msg) => msg.role === 'user').length;
  
  // 6. Build the formatted Markdown
  const dateStr = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  
  let firstAsk = '';
  if (allMessages.length > 0 && allMessages[0].role === 'user') {
    const firstLines = allMessages[0].plainText.split('\n').filter(l => l.trim().length > 0);
    firstAsk = firstLines.slice(0, 3).join(' ').substring(0, 150);
    if (allMessages[0].plainText.length > 150) firstAsk += '...';
  }

  let lastAssistant = '';
  for (let i = allMessages.length - 1; i >= 0; i--) {
    if (allMessages[i].role === 'claude') {
      const lastLines = allMessages[i].plainText.split('\n').filter(l => l.trim().length > 0);
      lastAssistant = lastLines.slice(0, 3).join(' ').substring(0, 150);
      if (allMessages[i].plainText.length > 150) lastAssistant += '...';
      break;
    }
  }

  let markdown = `# Conversation handoff from Claude (claude.ai)\n\n`;
  markdown += `**Title:** ${title}  ·  **Started:** ${dateStr}  ·  **Turns:** ${turns}\n\n`;
  markdown += `## Briefing\n\n`;
  markdown += `You are continuing a working session that began in Claude. Read the briefing, the artefacts, and the recent turns below. Pick up where the previous assistant left off — don't re-introduce yourself, match the user's working style.\n\n`;
  
  if (firstAsk) {
    markdown += `**Original ask:**\n> ${firstAsk}\n\n`;
  }
  
  if (lastAssistant) {
    markdown += `**Where the previous assistant left off:**\n> ${lastAssistant}\n\n`;
  }
  
  markdown += `---\n\n## Conversation (${turns} turns)\n\n`;

  let plainText = `Title: ${title}\nTurns: ${turns}\n\n`;

  allMessages.forEach((msg) => {
    const speaker = msg.role === 'user' ? 'User' : 'Assistant';
    markdown += `**${speaker}:**\n${msg.markdown}\n\n`;
    plainText += `${speaker}:\n${msg.plainText}\n\n`;
  });

  const cleanMarkdown = markdown.trim().replace(/\n{3,}/g, '\n\n');
  const cleanPlainText = plainText.trim().replace(/\n{3,}/g, '\n\n');

  return { title, turns, markdown: cleanMarkdown, plainText: cleanPlainText, model: detectModel() };
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!isContextValid()) return false;
  
  if (message.action === 'get_chat_context') {
    try {
      const data = buildChatContext();
      sendResponse({ success: true, ...data });
    } catch (e: unknown) {
      sendResponse({ success: false, error: (e as Error).message });
    }
    return true; // keep channel open for async response
  }
  
  return false;
});

// ---------------------------------------------------------------------------
// Input Tracking (Message Sent)
// ---------------------------------------------------------------------------

function getInputValue(): string {
  const inputElement = document.querySelector('div[contenteditable="true"], textarea');
  if (!inputElement) return '';
  if (inputElement.tagName === 'TEXTAREA') {
    return (inputElement as HTMLTextAreaElement).value.trim();
  }
  return inputElement.textContent?.trim() || '';
}

function getUserMessageCount(): number {
  const raw = Array.from(document.querySelectorAll(USER_MESSAGE_SELECTOR_STRING));
  return dedupeByAncestor(raw).length;
}

let lastUserMessageCount = 0;
let lastPathname = window.location.pathname;
let lastInputTime = 0;
let lastInputValue = '';
let lastRecordedTime = 0;

function recordMessageSent() {
  if (!isContextValid()) return;
  const now = Date.now();
  if (now - lastRecordedTime > RECORD_DEBOUNCE_MS) {
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
    const hadRecentInput = Date.now() - lastInputTime < RECENT_INPUT_THRESHOLD_MS || lastInputValue.trim().length > 0;

    if (wasNewChat && hadRecentInput) {
      recordMessageSent();
    }

    lastInputTime = 0;
    lastInputValue = '';
    lastPathname = currentPathname;
    lastUserMessageCount = currentCount;
    return;
  }

  if (currentCount > lastUserMessageCount) {
    const hadRecentInput = Date.now() - lastInputTime < RECENT_INPUT_THRESHOLD_MS || lastInputValue.trim().length > 0;
    if (hadRecentInput) {
      recordMessageSent();
    }
    lastInputTime = 0;
    lastInputValue = '';
  }

  lastUserMessageCount = currentCount;
}

document.addEventListener(
  'keydown',
  (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      const target = e.target as HTMLElement;
      if (target.isContentEditable || target.tagName === 'TEXTAREA') {
        if (getInputValue().trim().length > 0) recordMessageSent();
      }
    }
  },
  true
);

document.addEventListener(
  'click',
  (e) => {
    const target = e.target as HTMLElement;
    const button = target.closest('button');
    if (button) {
      const label = (button.getAttribute('aria-label') || '').toLowerCase();
      const isUpload = label.includes('upload') || label.includes('add') || label.includes('attach') || button.querySelector('input[type="file"]');
      const isModel = label.includes('model') || label.includes('version') || label.includes('sonnet') || label.includes('opus') || label.includes('haiku');
      const isVoice = label.includes('mic') || label.includes('voice') || label.includes('audio') || label.includes('speech');
      const isExtension = button.closest('#claude-usage-tracker-root') || button.closest('#claude-usage-tracker-header-root');

      if (!isUpload && !isModel && !isVoice && !isExtension) {
        if (getInputValue().trim().length > 0) recordMessageSent();
      }
    }
  },
  true
);

const observer = new MutationObserver(() => {
  if (!document.getElementById('claude-usage-tracker-root')) injectApp();
  if (!document.getElementById('claude-usage-tracker-sidebar-root')) injectSidebar();
  if (!document.getElementById('claude-usage-tracker-header-root')) injectHeaderStats();
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
