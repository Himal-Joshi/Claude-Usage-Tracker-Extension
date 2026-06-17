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
      const chatContainer = document.querySelector('.flex-1.overflow-hidden') || document.body;
      const text = chatContainer.textContent || '';
      
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
        apiDebounceTimer = setTimeout(async () => {
          try {
            const response = await fetch('https://api.anthropic.com/v1/messages/count_tokens', {
              method: 'POST',
              headers: {
                'x-api-key': settings.anthropicApiKey || '',
                'anthropic-version': '2023-06-01',
                'content-type': 'application/json'
              },
              body: JSON.stringify({
                model: 'claude-3-opus-20240229',
                messages: [{ role: 'user', content: text.substring(0, 50000) }] // prevent payload too large
              })
            });
            
            if (response.ok) {
              const data = await response.json();
              if (data && typeof data.input_tokens === 'number') {
                 setTokens({
                    input: data.input_tokens,
                    output: 0, // Counting only input context
                    total: data.input_tokens
                 });
                 setIsExact(true);
              }
            }
          } catch (e) {
            console.error('Failed to fetch exact tokens', e);
          }
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
