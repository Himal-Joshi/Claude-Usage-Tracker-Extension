import { encode } from 'gpt-tokenizer';

export const Tokenizer = {
  /**
   * Estimate tokens using gpt-tokenizer (BPE)
   * This is a safe local estimation when API key is not provided.
   */
  estimateTokens(text: string): number {
    if (!text) return 0;
    try {
      // encode returns an array of token IDs, the length is the token count
      return encode(text).length;
    } catch (e) {
      console.error("Token estimation failed", e);
      // Fallback rough estimate: ~4 chars per token
      return Math.ceil(text.length / 4);
    }
  }
};
