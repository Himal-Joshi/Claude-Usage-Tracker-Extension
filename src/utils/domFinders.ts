import { dedupeByAncestor } from './chromeHelpers';
import {
  USER_MESSAGE_SELECTOR_STRING,
  ASSISTANT_MESSAGE_SELECTOR_STRING,
  classifyMessageRole,
} from './domConstants';
import { extractMessageContent } from './domParser';

/** Keywords that identify the main sidebar navigation element. */
const SIDEBAR_NAV_KEYWORDS = ['New chat', 'Chats', 'Recents', 'Usage'];

/** Maximum Y-coordinate (px) for an element to be considered "in the header". */
const HEADER_VIEWPORT_MAX_Y = 120;

/**
 * Locates Claude's sidebar navigation element by scanning `<nav>` elements
 * for known keywords, falling back to generic sidebar selectors.
 */
export function findSidebar(): HTMLElement | null {
  const navs = document.querySelectorAll('nav');
  for (const nav of navs) {
    if (SIDEBAR_NAV_KEYWORDS.some(keyword => nav.textContent?.includes(keyword))) {
      return nav as HTMLElement;
    }
  }

  return (
    document.querySelector('nav') ||
    document.querySelector('[class*="sidebar"]') ||
    document.querySelector('[class*="navigation"]')
  ) as HTMLElement | null;
}

/**
 * Finds the "Recents" text header inside the sidebar.
 * Used as an insertion anchor for the sidebar usage widget.
 */
export function findRecentsHeader(sidebar: HTMLElement): HTMLElement | null {
  const elements = sidebar.querySelectorAll('*');
  for (const el of elements) {
    if (el.children.length === 0 && el.textContent?.trim() === 'Recents') {
      return el as HTMLElement;
    }
  }
  return null;
}

/**
 * Returns the document title with the " - Claude" suffix stripped.
 */
export function getCleanChatTitle(): string {
  const suffix = ' - Claude';
  let title = document.title || '';
  if (title.endsWith(suffix)) {
    title = title.slice(0, -suffix.length);
  }
  return title.trim();
}

/**
 * Locates the chat title element in the header area using a cascade of strategies:
 * 1. Stable `data-testid="chat-title-button"`
 * 2. Text matching against the clean document title
 * 3. Ancestor traversal from the "Share" button
 * 4. Heading elements inside `<header>` containers
 *
 * Returns null if not on a chat page or no title element is found.
 */
export function findChatTitleElement(): HTMLElement | null {
  if (!window.location.pathname.includes('/chat/')) {
    return null;
  }

  const testIdTitle = document.querySelector('[data-testid="chat-title-button"]');
  if (testIdTitle && !testIdTitle.closest('nav') && !testIdTitle.closest('[class*="sidebar"]')) {
    return testIdTitle as HTMLElement;
  }

  const cleanTitle = getCleanChatTitle();
  if (cleanTitle && cleanTitle !== 'Claude') {
    const titleCandidate = findTitleByTextMatch(cleanTitle);
    if (titleCandidate) return titleCandidate;
  }

  const shareCandidate = findTitleNearShareButton(cleanTitle);
  if (shareCandidate) return shareCandidate;

  return findTitleInHeader();
}

/**
 * Locates the chat input container by walking up from the contenteditable
 * element until a form/fieldset boundary or a container with action buttons.
 */
/** Returns true when an element lives in sidebar/nav chrome, not the chat transcript. */
export function isOutsideConversation(el: Element): boolean {
  return !!(el.closest('nav') || el.closest('[class*="sidebar" i]'));
}

/**
 * Finds the scrollable container that holds the chat transcript.
 * Walks up from the input field looking for overflow scroll, with a fallback selector.
 */
export function findChatScrollContainer(): HTMLElement | null {
  const input = document.querySelector('div[contenteditable="true"], textarea');
  if (input) {
    let el = input.parentElement;
    while (el && el !== document.body) {
      const style = window.getComputedStyle(el);
      if (
        (style.overflowY === 'auto' || style.overflowY === 'scroll') &&
        el.scrollHeight > el.clientHeight
      ) {
        return el;
      }
      el = el.parentElement;
    }
  }

  return document.querySelector('[class*="overflow-y-auto"]') as HTMLElement | null;
}

export function findChatBoxContainer(): HTMLElement | null {
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

/**
 * Finds the toolbar element within the chat box (the row of action buttons
 * below the input area). Scans children in reverse order.
 */
export function findToolbarElement(chatBox: HTMLElement): HTMLElement | null {
  const children = Array.from(chatBox.children) as HTMLElement[];
  for (let i = children.length - 1; i >= 0; i--) {
    const child = children[i];
    const hasButtons = child.querySelector('button, [role="button"]');
    const hasInput = child.querySelector('div[contenteditable="true"], textarea');
    if (hasButtons && !hasInput) {
      return child;
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Private helpers for findChatTitleElement cascade
// ---------------------------------------------------------------------------

function findTitleByTextMatch(cleanTitle: string): HTMLElement | null {
  const candidates = document.querySelectorAll(
    'button, div[role="button"], h1, h2, [class*="title"], [class*="ConversationHeader"]'
  );
  for (const el of candidates) {
    if (el.closest('nav') || el.closest('[class*="sidebar"]')) continue;
    const text = el.textContent?.trim() || '';
    if (text === cleanTitle || text === cleanTitle + ' v' || text.startsWith(cleanTitle)) {
      const rect = el.getBoundingClientRect();
      if (rect.top >= 0 && rect.top < HEADER_VIEWPORT_MAX_Y) {
        return el as HTMLElement;
      }
    }
  }
  return null;
}

function findTitleNearShareButton(cleanTitle: string): HTMLElement | null {
  const buttons = document.querySelectorAll('button');
  for (const btn of buttons) {
    if (btn.textContent?.trim() !== 'Share') continue;

    let parent = btn.parentElement;
    while (parent && parent.tagName !== 'BODY') {
      const titleBtn = parent.querySelector('button, [role="button"], h1, h2');
      if (titleBtn && titleBtn !== btn) {
        const text = titleBtn.textContent?.trim() || '';
        const matchesTitle = text === cleanTitle || text.startsWith(cleanTitle.substring(0, 10));
        if (text && matchesTitle) {
          const rect = titleBtn.getBoundingClientRect();
          if (rect.top >= 0 && rect.top < HEADER_VIEWPORT_MAX_Y) {
            return titleBtn as HTMLElement;
          }
        }
      }
      parent = parent.parentElement;
    }
  }
  return null;
}

function findTitleInHeader(): HTMLElement | null {
  const header = (
    document.querySelector('header') ||
    document.querySelector('[class*="header"]') ||
    document.querySelector('[class*="topbar"]')
  );
  if (header && !header.closest('nav') && !header.closest('[class*="sidebar"]')) {
    const headings = header.querySelectorAll('h1, h2, [class*="font-title"], [class*="conversation-title"]');
    if (headings.length > 0) {
      return headings[0] as HTMLElement;
    }
  }
  return null;
}

export function collectChatMessages(): {
  role: 'user' | 'claude';
  markdown: string;
  plainText: string;
  el: Element;
}[] {
  const rawUserEls = dedupeByAncestor(
    Array.from(document.querySelectorAll(USER_MESSAGE_SELECTOR_STRING)).filter(
      (el) => !isOutsideConversation(el),
    )
  );

  const rawAssistantEls = dedupeByAncestor(
    Array.from(document.querySelectorAll(ASSISTANT_MESSAGE_SELECTOR_STRING)).filter(
      (el) => !isOutsideConversation(el),
    )
  );

  // drop anything that's nested inside an element of the opposite role
  const userEls = rawUserEls.filter(el => !rawAssistantEls.some(a => a.contains(el)));
  const assistantEls = rawAssistantEls.filter(el => !rawUserEls.some(u => u.contains(el)));
  
  const turnEls = [...userEls, ...assistantEls];

  const allMessages: { role: 'user' | 'claude'; markdown: string; plainText: string; el: Element }[] =
    [];

  for (const el of turnEls) {
    const role = classifyMessageRole(el);
    if (!role) continue;

    const { markdown, plainText } = extractMessageContent(el as HTMLElement);
    if (!plainText) continue;

    allMessages.push({ role, markdown, plainText, el });
  }

  allMessages.sort((a, b) => {
    const position = a.el.compareDocumentPosition(b.el);
    if (position & Node.DOCUMENT_POSITION_FOLLOWING) return -1;
    if (position & Node.DOCUMENT_POSITION_PRECEDING) return 1;
    return 0;
  });

  return allMessages;
}
