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
  },

  /**
   * Fetch exact tokens from Anthropic API (Requires API Key)
   */
  async getExactTokens(text: string, apiKey: string): Promise<number> {
    try {
      const response = await fetch('https://api.anthropic.com/v1/messages/count_tokens', {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
          'anthropic-dangerous-direct-browser-access': 'true' // Necessary for browser extensions if making direct calls
        },
        body: JSON.stringify({
          model: "claude-3-opus-20240229", // Any valid model
          messages: [{ role: "user", content: text }]
        })
      });

      if (!response.ok) {
        throw new Error('API Error');
      }

      const data = await response.json();
      return data.input_tokens || 0;
    } catch (e) {
      console.error("Exact token counting failed, falling back to estimation", e);
      return this.estimateTokens(text);
    }
  }
};
