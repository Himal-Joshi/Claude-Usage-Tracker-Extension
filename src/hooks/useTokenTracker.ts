import { useState, useEffect, useRef } from 'react';
import { StorageManager } from '../storage';

function isContextValid(): boolean {
  return typeof chrome !== 'undefined' && !!chrome.runtime && !!chrome.runtime.id;
}

export function useTokenTracker() {
  const [tokens, setTokens] = useState({ input: 0, output: 0, total: 0 });
  const [isExact, setIsExact] = useState(false);
  const [isTruncated, setIsTruncated] = useState(false);
  const [contextLimit, setContextLimit] = useState(200000); // Default
  const [todayTotal, setTodayTotal] = useState(0);
  const requestIdRef = useRef(0);
  
  const [currentChatId, setCurrentChatId] = useState(window.location.pathname);
  const isInitialRef = useRef(true);

  if (window.location.pathname !== currentChatId) {
    setCurrentChatId(window.location.pathname);
    isInitialRef.current = true;
  }

  useEffect(() => {
    const fetchTodayTotal = async () => {
      if (!isContextValid()) return;
      try {
        const today = new Date().toISOString().split('T')[0];
        const data = await chrome.storage.local.get('stats');
        const stats = (data.stats as Record<string, any>) || {};
        if (stats[today]) {
          setTodayTotal(stats[today].inputTokens);
        }
      } catch (e) {}
    };
    fetchTodayTotal();
    
    const listener = (changes: { [key: string]: chrome.storage.StorageChange }, areaName: string) => {
      if (!isContextValid()) return;
      if (areaName === 'local' && changes.stats) {
        const today = new Date().toISOString().split('T')[0];
        const newStats = (changes.stats.newValue as Record<string, any>) || {};
        if (newStats[today]) {
          setTodayTotal(newStats[today].inputTokens);
        }
      }
    };
    
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.onChanged) {
      chrome.storage.onChanged.addListener(listener);
    }
    
    return () => {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.onChanged) {
        try {
          chrome.storage.onChanged.removeListener(listener);
        } catch (e) {}
      }
    };
  }, []);

  useEffect(() => {
    let debounceTimer: ReturnType<typeof setTimeout>;
    let apiDebounceTimer: ReturnType<typeof setTimeout>;
    let lastExecuted = 0;
    const THROTTLE_INTERVAL = 1000; // Recalculate at most once per second during active updates
    
    const calculateTokens = async () => {
      if (!isContextValid()) return;
      // Find input box
      const inputElement = document.querySelector('div[contenteditable="true"]');
      const inputText = inputElement?.textContent || '';
      
      let text = '';
      
      // Determine if it's a new empty chat by checking URL or common empty-state text
      const isNewChatUrl = window.location.pathname === '/' || window.location.pathname === '/new';
      const chatContainer = document.querySelector('.flex-1.overflow-hidden') || document.body;
      const containerText = chatContainer.textContent || '';
      const hasEmptyStateBoilerplate = containerText.includes('to get started') || containerText.includes("Claude's choice");
      
      if (isNewChatUrl || hasEmptyStateBoilerplate) {
        // It's a new chat, so ignore all the background "Good evening" boilerplate
        // Only count what the user is currently typing
        text = inputText;
      } else {
        // It's an active chat! We can safely use the entire chat container's text.
        // This makes us immune to Claude changing their message CSS classes.
        // We'll try to find specific messages first to be clean, but fallback to the whole container.
        const messageElements = document.querySelectorAll('.font-user-message, .font-claude-message, .prose, [data-is-user], [data-message-author], [data-testid*="message"], .ReactMarkdown');
        
        if (messageElements.length > 0) {
          let messagesText = '';
          messageElements.forEach(el => messagesText += el.textContent + '\n');
          text = messagesText + '\n' + inputText;
        } else {
          // Bulletproof fallback: just grab the whole chat area's text
          text = containerText;
        }
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
            
            // Record usage in daily analytics
            const today = new Date().toISOString().split('T')[0];
            StorageManager.updateDailyStats(today, window.location.pathname, response.tokenCount, isInitialRef.current).catch(console.error);
            isInitialRef.current = false;
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
                  
                  // Record exact usage in daily analytics
                  const today = new Date().toISOString().split('T')[0];
                  StorageManager.updateDailyStats(today, window.location.pathname, response.tokens, isInitialRef.current).catch(console.error);
                  isInitialRef.current = false;
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
      const now = Date.now();
      clearTimeout(debounceTimer);
      
      if (now - lastExecuted >= THROTTLE_INTERVAL) {
        lastExecuted = now;
        calculateTokens();
      } else {
        debounceTimer = setTimeout(() => {
          lastExecuted = Date.now();
          calculateTokens();
        }, 500);
      }
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

  return { tokens, isExact, contextLimit, isTruncated, todayTotal };
}
