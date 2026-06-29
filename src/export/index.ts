import type { Conversation } from '../types';

/** Utilities for exporting Claude conversations to Markdown and ZIP formats. */
export const Exporter = {
  /**
   * Converts a conversation to a formatted Markdown string with
   * metadata header, message sections, and horizontal rules.
   */
  generateMarkdown(conv: Conversation): string {
    let md = `# Claude Conversation: ${conv.title || 'Untitled'}\n\n`;
    md += `*Date: ${new Date(conv.lastUpdated).toLocaleString()}*\n`;
    md += `*URL: ${conv.url}*\n`;
    md += `*Tokens: ${conv.totalInputTokens} Input, ${conv.totalOutputTokens} Output*\n\n---\n\n`;

    for (const msg of conv.messages) {
      md += `## ${msg.role === 'user' ? 'User' : 'Claude'}\n\n`;
      md += `${msg.content}\n\n---\n\n`;
    }

    return md;
  },

  /** Exports a conversation as a single downloadable Markdown file. */
  exportMarkdown(conv: Conversation): void {
    const { saveAs } = require('file-saver');
    const md = this.generateMarkdown(conv);
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    saveAs(blob, `claude-chat-${Date.now()}.md`);
  },

  /**
   * Exports a conversation and its artifacts as a ZIP archive.
   * The conversation Markdown is placed at root; artifacts are grouped
   * in an `artifacts/` subdirectory.
   */
  async exportZip(conv: Conversation): Promise<void> {
    const JSZip = (await import('jszip')).default;
    const { saveAs } = await import('file-saver');

    const zip = new JSZip();
    zip.file('conversation.md', this.generateMarkdown(conv));

    const artifactsFolder = zip.folder('artifacts');
    if (artifactsFolder) {
      for (const msg of conv.messages) {
        if (msg.artifacts && msg.artifacts.length > 0) {
          for (const art of msg.artifacts) {
            artifactsFolder.file(art.name, art.content);
          }
        }
      }
    }

    const content = await zip.generateAsync({ type: 'blob' });
    saveAs(content, `claude-export-${Date.now()}.zip`);
  },
};
