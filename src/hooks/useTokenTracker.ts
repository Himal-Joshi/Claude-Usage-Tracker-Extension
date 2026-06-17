import { useState, useEffect } from 'react';
import { Tokenizer } from '../tokenizer';
import { StorageManager } from '../storage';

export function useTokenTracker() {
  const [tokens, setTokens] = useState({ input: 0, output: 0, total: 0 });
  const [isExact, setIsExact] = useState(false);

  useEffect(() => {
    let debounceTimer: ReturnType<typeof setTimeout>;
    
    const calculateTokens = async () => {
      const chatContainer = document.querySelector('.flex-1.overflow-hidden') || document.body;
      const text = chatContainer.textContent || '';
      
      const settings = await StorageManager.getSettings();
      let totalTokens = 0;
      
      if (settings.anthropicApiKey) {
        // Debounce API calls heavily, but locally estimate in the meantime
        totalTokens = Tokenizer.estimateTokens(text);
        setIsExact(false);
      } else {
        totalTokens = Tokenizer.estimateTokens(text);
        setIsExact(false);
      }
      
      setTokens({
        input: Math.floor(totalTokens * 0.4),
        output: Math.ceil(totalTokens * 0.6),
        total: totalTokens
      });
    };

    // Calculate immediately
    calculateTokens();

    const handleInteraction = () => {
      clearTimeout(debounceTimer);
      // Fast refresh for typing
      debounceTimer = setTimeout(calculateTokens, 300);
    };

    const observer = new MutationObserver(handleInteraction);
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });

    // Catch active typing events for immediate feedback
    document.addEventListener('input', handleInteraction, true);
    document.addEventListener('keyup', handleInteraction, true);

    return () => {
      observer.disconnect();
      document.removeEventListener('input', handleInteraction, true);
      document.removeEventListener('keyup', handleInteraction, true);
      clearTimeout(debounceTimer);
    };
  }, []);

  return { tokens, isExact };
}
