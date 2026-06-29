/**
 * Pure DOM-to-text conversion utilities for extracting message content
 * from Claude.ai's rendered HTML into Markdown and plain text formats.
 *
 * These functions have no Chrome extension dependencies and operate
 * solely on DOM nodes.
 */

/** Tags that represent non-content UI elements to be excluded from extraction. */
const SKIP_TAGS = new Set(['BUTTON', 'STYLE', 'SCRIPT', 'TEXTAREA', 'INPUT', 'SVG', 'NAV', 'HEADER', 'FOOTER']);

/** Button labels that should be excluded from extracted text. */
const SKIP_BUTTON_LABELS = new Set(['Copy', 'Retry', 'Edit', 'Share']);

/** Semantic content tags that should NEVER be skipped, regardless of classes. */
const PROTECTED_TAGS = new Set([
  'PRE', 'CODE', 'P', 'UL', 'OL', 'LI', 'TABLE', 'TR', 'TD', 'TH', 
  'BLOCKQUOTE', 'STRONG', 'B', 'EM', 'I', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6'
]);

/**
 * Determines whether a DOM element is a UI control that should be
 * excluded from content extraction (buttons, scripts, feedback forms, etc.).
 */
export function shouldSkipElement(el: HTMLElement): boolean {
  const tagName = el.tagName.toUpperCase();

  if (SKIP_TAGS.has(tagName) || el.classList.contains('sr-only') || el.getAttribute('aria-hidden') === 'true') {
    return true;
  }

  // Protect semantic content from being accidentally skipped
  if (PROTECTED_TAGS.has(tagName)) {
    return false;
  }

  const text = el.innerText?.trim();
  if (text && SKIP_BUTTON_LABELS.has(text)) {
    return true;
  }

  return false;
}

/**
 * Recursively converts a DOM node tree into high-fidelity Markdown.
 * Handles headers, bold, italic, code blocks, lists, tables, and blockquotes.
 */
export function htmlToMarkdown(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) {
    return node.textContent || '';
  }
  if (node.nodeType !== Node.ELEMENT_NODE) {
    return '';
  }

  const el = node as HTMLElement;
  if (shouldSkipElement(el)) {
    return '';
  }

  const tagName = el.tagName.toUpperCase();

  if (/^H[1-6]$/.test(tagName)) {
    const prefix = '#'.repeat(parseInt(tagName[1]));
    return `\n\n${prefix} ${childrenToMarkdown(el).trim()}\n\n`;
  }

  if (tagName === 'STRONG' || tagName === 'B') {
    return `**${childrenToMarkdown(el)}**`;
  }

  if (tagName === 'EM' || tagName === 'I') {
    return `*${childrenToMarkdown(el)}*`;
  }

  if (tagName === 'PRE') {
    return convertPreBlock(el);
  }

  if (tagName === 'CODE') {
    return convertInlineCode(el);
  }

  if (tagName === 'P') {
    return `\n\n${childrenToMarkdown(el)}\n\n`;
  }

  if (tagName === 'UL' || tagName === 'OL') {
    return `\n${childrenToMarkdown(el)}\n`;
  }

  if (tagName === 'LI') {
    return convertListItem(el);
  }

  if (tagName === 'BR') {
    return '\n';
  }

  if (tagName === 'BLOCKQUOTE') {
    return `\n\n> ${childrenToMarkdown(el).replace(/\n/g, '\n> ')}\n\n`;
  }

  if (tagName === 'TABLE') {
    return convertTable(el);
  }

  return childrenToMarkdown(el);
}

/** Concatenates Markdown output from all child nodes of an element. */
export function childrenToMarkdown(el: HTMLElement): string {
  let result = '';
  el.childNodes.forEach(child => {
    result += htmlToMarkdown(child);
  });
  return result;
}

/**
 * Recursively converts a DOM node tree into clean plain text.
 * Preserves paragraph breaks and list formatting without Markdown syntax.
 */
export function htmlToPlainText(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) {
    return node.textContent || '';
  }
  if (node.nodeType !== Node.ELEMENT_NODE) {
    return '';
  }

  const el = node as HTMLElement;
  if (shouldSkipElement(el)) {
    return '';
  }

  const tagName = el.tagName.toUpperCase();

  if (tagName === 'BR') {
    return '\n';
  }
  if (tagName === 'P' || tagName === 'PRE' || /^H[1-6]$/.test(tagName)) {
    return `\n\n${childrenToPlainText(el)}\n\n`;
  }
  if (tagName === 'LI') {
    return `\n- ${childrenToPlainText(el)}`;
  }

  return childrenToPlainText(el);
}

/** Concatenates plain text output from all child nodes of an element. */
export function childrenToPlainText(el: HTMLElement): string {
  let result = '';
  el.childNodes.forEach(child => {
    result += htmlToPlainText(child);
  });
  return result;
}

// ---------------------------------------------------------------------------
// Private conversion helpers
// ---------------------------------------------------------------------------

/** Converts a `<pre>` element (with optional `<code>` child) to a fenced code block. */
function convertPreBlock(el: HTMLElement): string {
  const codeEl = el.querySelector('code');
  const content = codeEl ? codeEl.textContent : el.textContent;
  let lang = '';
  if (codeEl) {
    const langClass = Array.from(codeEl.classList).find(c => c.startsWith('language-'));
    if (langClass) {
      lang = langClass.replace('language-', '');
    }
  }
  return `\n\n\`\`\`${lang}\n${content?.trim()}\n\`\`\`\n\n`;
}

/** Converts a `<code>` element to inline code, unless it's inside a `<pre>`. */
function convertInlineCode(el: HTMLElement): string {
  let parent = el.parentElement;
  while (parent) {
    if (parent.tagName.toUpperCase() === 'PRE') {
      return childrenToMarkdown(el);
    }
    parent = parent.parentElement;
  }
  return `\`${el.textContent}\``;
}

/** Converts an `<li>` element to a numbered or bulleted list item. */
function convertListItem(el: HTMLElement): string {
  const parent = el.parentElement;
  if (parent && parent.tagName.toUpperCase() === 'OL') {
    const index = Array.from(parent.children).indexOf(el) + 1;
    return `${index}. ${childrenToMarkdown(el)}\n`;
  }
  return `- ${childrenToMarkdown(el)}\n`;
}

/** Converts a `<table>` element to a Markdown table with header separator. */
function convertTable(el: HTMLElement): string {
  const rows = Array.from(el.querySelectorAll('tr'));
  let tableMd = '\n\n';
  rows.forEach((row, rowIndex) => {
    const cells = Array.from(row.querySelectorAll('th, td'));
    const cellTexts = cells.map(cell =>
      childrenToMarkdown(cell as HTMLElement).trim().replace(/\n/g, ' ')
    );
    tableMd += `| ${cellTexts.join(' | ')} |\n`;
    if (rowIndex === 0) {
      tableMd += `| ${cellTexts.map(() => '---').join(' | ')} |\n`;
    }
  });
  tableMd += '\n';
  return tableMd;
}
