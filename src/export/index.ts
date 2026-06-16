import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import type { Conversation, Message } from '../types';

export const Exporter = {
  /**
   * Convert conversation to markdown string
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

  /**
   * Export conversation as a single markdown file
   */
  exportMarkdown(conv: Conversation) {
    const md = this.generateMarkdown(conv);
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    saveAs(blob, `claude-chat-${Date.now()}.md`);
  },

  /**
   * Export conversation and any artifacts as a ZIP file
   */
  async exportZip(conv: Conversation) {
    const zip = new JSZip();
    
    // Add main conversation markdown
    zip.file('conversation.md', this.generateMarkdown(conv));

    // Create artifacts folder
    const artifactsFolder = zip.folder('artifacts');
    if (artifactsFolder) {
      conv.messages.forEach(msg => {
        if (msg.artifacts && msg.artifacts.length > 0) {
          msg.artifacts.forEach(art => {
            artifactsFolder.file(art.name, art.content);
          });
        }
      });
    }

    const content = await zip.generateAsync({ type: 'blob' });
    saveAs(content, `claude-export-${Date.now()}.zip`);
  }
};
