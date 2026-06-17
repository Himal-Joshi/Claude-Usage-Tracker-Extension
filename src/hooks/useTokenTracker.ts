import { useState, useEffect } from 'react';
import { Tokenizer } from '../tokenizer';
import { StorageManager } from '../storage';

export function useTokenTracker() {
  const [tokens, setTokens] = useState({ input: 0, output: 0, total: 0 });
  const [isExact, setIsExact] = useState(false);
  const [contextLimit, setContextLimit] = useState(200000); // Default

  useEffect(() => {
    let debounceTimer: ReturnType<typeof setTimeout>;
    let apiDebounceTimer: ReturnType<typeof setTimeout>;
    
      const calculateTokens = async () => {
        // Find input box
        const inputElement = document.querySelector('div[contenteditable="true"]');
        let text = inputElement?.textContent || '';
        
        // Find messages. Claude uses .font-user-message and .font-claude-message, or .prose for content.
        // If we can't find specific message elements, we fallback to the main container, but we avoid the empty state.
        const messageElements = document.querySelectorAll('.font-user-message, .font-claude-message, .prose');
        if (messageElements.length > 0) {
          let messagesText = '';
          messageElements.forEach(el => messagesText += el.textContent + '\n');
          text = messagesText + '\n' + text;
        } else {
          // If no messages found, it's a new chat. We just use the input text.
          // This prevents counting the "Good evening" and UI buttons as tokens.
        }
        
        const settings = await StorageManager.getSettings();
      
      // Update context limit based on plan
      if (settings.claudePlan === 'Pro' || settings.claudePlan === 'Team') {
        setContextLimit(200000); 
      } else {
        setContextLimit(100000); // Assume free plan has lower limit for UI purposes
      }
      
      let estimatedTokens = Tokenizer.estimateTokens(text);
      
      if (settings.anthropicApiKey) {
        // Debounce API calls heavily, but locally estimate in the meantime
        setTokens(prev => ({
           ...prev,
           input: Math.floor(estimatedTokens * 0.4),
           output: Math.ceil(estimatedTokens * 0.6),
           total: estimatedTokens
        }));
        setIsExact(false);
        
        clearTimeout(apiDebounceTimer);
        apiDebounceTimer = setTimeout(() => {
          chrome.runtime.sendMessage({ action: 'count_tokens', text: text.substring(0, 50000) }, (response) => {
            if (response && response.success && typeof response.tokens === 'number') {
              setTokens({
                 input: response.tokens,
                 output: 0,
                 total: response.tokens
              });
              setIsExact(true);
            } else if (response && response.error) {
              console.error('Failed to fetch exact tokens from background:', response.error);
            }
          });
        }, 2000); // Wait 2s of idle before hitting API
      } else {
        setTokens({
          input: Math.floor(estimatedTokens * 0.4),
          output: Math.ceil(estimatedTokens * 0.6),
          total: estimatedTokens
        });
        setIsExact(false);
      }
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
      clearTimeout(apiDebounceTimer);
    };
  }, []);

  return { tokens, isExact, contextLimit };
}
