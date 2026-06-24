import { useState, useEffect, useRef } from 'react';
import { StorageManager } from '../storage';
import { detectModel } from '../utils/constants';

const ESTIMATED_OUTPUT_RATIO = 0.6;

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

  const lastTurnsCountRef = useRef(0);
  const lastInputTokensRef = useRef(0);
  const lastOutputTokensRef = useRef(0);
  const lastTotalTokensRef = useRef(0);

  if (window.location.pathname !== currentChatId) {
    setCurrentChatId(window.location.pathname);
    isInitialRef.current = true;
    lastTurnsCountRef.current = 0;
    lastInputTokensRef.current = 0;
    lastOutputTokensRef.current = 0;
    lastTotalTokensRef.current = 0;
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
    
    const recordDailyUsage = (tokenCount: number, turnsCount: number) => {
      const today = new Date().toISOString().split('T')[0];
      const isInputFocused = document.activeElement?.getAttribute('contenteditable') === 'true' || 
                            document.activeElement?.tagName === 'TEXTAREA';

      if (isInitialRef.current) {
        lastTurnsCountRef.current = turnsCount;
        lastInputTokensRef.current = Math.floor(tokenCount * (1 - ESTIMATED_OUTPUT_RATIO));
        lastOutputTokensRef.current = Math.ceil(tokenCount * ESTIMATED_OUTPUT_RATIO);
        lastTotalTokensRef.current = tokenCount;
        isInitialRef.current = false;
        return;
      }

      if (turnsCount > lastTurnsCountRef.current) {
        const inputDelta = tokenCount;
        StorageManager.updateDailyStats(today, window.location.pathname, inputDelta, 0).catch(console.error);
        
        lastTurnsCountRef.current = turnsCount;
        lastInputTokensRef.current = tokenCount;
        lastOutputTokensRef.current = 0;
        lastTotalTokensRef.current = tokenCount;
      } else if (turnsCount === lastTurnsCountRef.current && lastInputTokensRef.current > 0 && !isInputFocused) {
        const currentOutput = Math.max(0, tokenCount - lastInputTokensRef.current);
        const outputDelta = currentOutput - lastOutputTokensRef.current;
        if (outputDelta !== 0) {
          StorageManager.updateDailyStats(today, window.location.pathname, 0, outputDelta).catch(console.error);
          lastOutputTokensRef.current = currentOutput;
          lastTotalTokensRef.current = tokenCount;
        }
      }
    };

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
        text = inputText;
      } else {
        const rawElements = Array.from(document.querySelectorAll('.font-user-message, .font-claude-message, .prose, [data-is-user], [data-message-author], [data-testid*="message"], .ReactMarkdown'));
        const messageElements = rawElements.filter(el => !rawElements.some(parent => parent !== el && parent.contains(el)));
        
        if (messageElements.length > 0) {
          let messagesText = '';
          messageElements.forEach(el => messagesText += el.textContent + '\n');
          text = messagesText + '\n' + inputText;
        } else {
          text = containerText;
        }
      }
      
      const rawUserMessages = Array.from(document.querySelectorAll('.font-user-message, [data-is-user="true"], [data-testid*="user-message"], [data-message-author="user"], .user-message, [class*="user-message"], [class*="UserMessage"]'));
      const userMessageElements = rawUserMessages.filter(el => !rawUserMessages.some(parent => parent !== el && parent.contains(el)));
      const turnsCount = userMessageElements.length;

      chrome.runtime.sendMessage({ action: 'get_public_settings' }, (response) => {
        if (!response || !response.success) return;
        
        const { hasApiKey, claudePlan } = response;
      
        if (claudePlan === 'Pro' || claudePlan === 'Team') {
          setContextLimit(200000); 
        } else {
          setContextLimit(100000);
        }
        
        let textToEstimate = text;
        const TRUNCATE_LIMIT = 800000; // 4 characters per token * 200,000 tokens limit = 800,000 characters
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
              input: Math.floor(response.tokenCount * (1 - ESTIMATED_OUTPUT_RATIO)),
              output: Math.ceil(response.tokenCount * ESTIMATED_OUTPUT_RATIO),
              total: response.tokenCount
            }));
            setIsExact(false);
            recordDailyUsage(response.tokenCount, turnsCount);
          }
        });
        
        if (hasApiKey) {
          clearTimeout(apiDebounceTimer);
          apiDebounceTimer = setTimeout(() => {
            const detected = detectModel();
            chrome.runtime.sendMessage({ action: 'count_tokens', text: text.substring(0, 50000), model: detected }, (response) => {
              if (response && response.success && typeof response.tokens === 'number') {
                if (currentReqId === requestIdRef.current) {
                  const exactTotal = response.tokens;
                  setTokens({
                     input: Math.floor(exactTotal * (1 - ESTIMATED_OUTPUT_RATIO)),
                     output: Math.ceil(exactTotal * ESTIMATED_OUTPUT_RATIO),
                     total: exactTotal
                  });
                  setIsExact(true);
                  recordDailyUsage(exactTotal, turnsCount);
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
