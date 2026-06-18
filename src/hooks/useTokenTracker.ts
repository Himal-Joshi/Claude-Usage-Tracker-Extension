import { useState, useEffect, useRef } from 'react';

export function useTokenTracker() {
  const [tokens, setTokens] = useState({ input: 0, output: 0, total: 0 });
  const [isExact, setIsExact] = useState(false);
  const [isTruncated, setIsTruncated] = useState(false);
  const [contextLimit, setContextLimit] = useState(200000); // Default
  const requestIdRef = useRef(0);

  useEffect(() => {
    let debounceTimer: ReturnType<typeof setTimeout>;
    let apiDebounceTimer: ReturnType<typeof setTimeout>;
    
    const calculateTokens = async () => {
      // Find input box
      const inputElement = document.querySelector('div[contenteditable="true"]');
      let text = inputElement?.textContent || '';
      
      const messageElements = document.querySelectorAll('.font-user-message, .font-claude-message, .prose');
      if (messageElements.length > 0) {
        let messagesText = '';
        messageElements.forEach(el => messagesText += el.textContent + '\n');
        text = messagesText + '\n' + text;
      }
      
      chrome.runtime.sendMessage({ action: 'get_public_settings' }, (response) => {
        if (!response || !response.success) return;
        
        const { hasApiKey, claudePlan } = response;
      
        if (claudePlan === 'Pro' || claudePlan === 'Team') {
          setContextLimit(200000); 
        } else {
          setContextLimit(100000);
        }
        
        let textToEstimate = text;
        const TRUNCATE_LIMIT = 200000;
        if (textToEstimate.length > TRUNCATE_LIMIT) {
          textToEstimate = textToEstimate.substring(0, TRUNCATE_LIMIT);
          setIsTruncated(true);
        } else {
          setIsTruncated(false);
        }

        requestIdRef.current += 1;
        const currentReqId = requestIdRef.current;
        
        chrome.runtime.sendMessage({ action: 'estimate_tokens', text: textToEstimate, requestId: currentReqId }, (response) => {
          if (response && response.success && currentReqId === requestIdRef.current) {
            setTokens(prev => ({
              ...prev,
              input: Math.floor(response.tokenCount * 0.4),
              output: Math.ceil(response.tokenCount * 0.6),
              total: response.tokenCount
            }));
            setIsExact(false);
          }
        });
        
        if (hasApiKey) {
          clearTimeout(apiDebounceTimer);
          apiDebounceTimer = setTimeout(() => {
            chrome.runtime.sendMessage({ action: 'count_tokens', text: text.substring(0, 50000) }, (response) => {
              if (response && response.success && typeof response.tokens === 'number') {
                if (currentReqId === requestIdRef.current) {
                  setTokens({
                     input: response.tokens,
                     output: 0,
                     total: response.tokens
                  });
                  setIsExact(true);
                }
              } else if (response && response.error) {
                console.error('Failed to fetch exact tokens from background:', response.error);
              }
            });
          }, 2000); // Wait 2s of idle before hitting API
        }
      });
    };

    // Calculate immediately
    calculateTokens();

    const handleInteraction = () => {
      clearTimeout(debounceTimer);
      // Fast refresh for typing (increased to 500ms since it's off-thread but still BPE)
      debounceTimer = setTimeout(calculateTokens, 500);
    };

    const observer = new MutationObserver(handleInteraction);
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });

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

  return { tokens, isExact, contextLimit, isTruncated };
}
