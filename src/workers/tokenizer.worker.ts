import { encode } from 'gpt-tokenizer';

self.onmessage = (e: MessageEvent<{ text: string; requestId: string }>) => {
  const { text, requestId } = e.data;
  
  if (!text) {
    self.postMessage({ requestId, tokenCount: 0 });
    return;
  }

  try {
    const tokenCount = encode(text).length;
    self.postMessage({ requestId, tokenCount });
  } catch (err) {
    console.error("Token estimation failed in worker", err);
    // Fallback rough estimate: ~4 chars per token
    const tokenCount = Math.ceil(text.length / 4);
    self.postMessage({ requestId, tokenCount });
  }
};
