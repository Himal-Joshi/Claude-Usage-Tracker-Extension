import { useState, useEffect } from 'react';
import { Tokenizer } from '../tokenizer';
import { StorageManager } from '../storage';

export function useTokenTracker() {
  const [tokens, setTokens] = useState({ input: 0, output: 0, total: 0 });
  const [isExact, setIsExact] = useState(false);

  useEffect(() => {
    // 1. Observe the DOM for text content changes
    // Claude chat messages are usually in a container like .flex-1.overflow-hidden or similar.
    // For a robust extension, we'd watch the main node. Here we watch document.body as a fallback.
    
    let debounceTimer: ReturnType<typeof setTimeout>;
    
    const calculateTokens = async () => {
      // Find all user messages and claude messages
      // This selector is an approximation. Claude uses dynamic classes.
      // A common pattern is looking for divs that contain the text.
      // For now, we extract all text from the main conversation area.
      
      const chatContainer = document.querySelector('.flex-1.overflow-hidden') || document.body;
      const text = chatContainer.textContent || '';
      
      const settings = await StorageManager.getSettings();
      let totalTokens = 0;
      
      if (settings.anthropicApiKey) {
        totalTokens = await Tokenizer.getExactTokens(text, settings.anthropicApiKey);
        setIsExact(true);
      } else {
        totalTokens = Tokenizer.estimateTokens(text);
        setIsExact(false);
      }
      
      // Rough split: Assume 50/50 for input/output if we can't separate them easily by class yet.
      // In a full implementation, we'd iterate over specific message nodes.
      setTokens({
        input: Math.floor(totalTokens * 0.4),
        output: Math.ceil(totalTokens * 0.6),
        total: totalTokens
      });
    };

    const observer = new MutationObserver(() => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(calculateTokens, 1000); // Debounce DOM changes
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true
    });

    calculateTokens();

    return () => {
      observer.disconnect();
      clearTimeout(debounceTimer);
    };
  }, []);

  return { tokens, isExact };
}
