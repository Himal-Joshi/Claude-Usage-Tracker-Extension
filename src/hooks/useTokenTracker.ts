import { useState, useEffect, useRef } from 'react';
import { StorageManager } from '../storage';
import { detectModel } from '../utils/constants';
import {
  ESTIMATED_OUTPUT_RATIO,
  TRUNCATE_CHAR_LIMIT,
  API_TEXT_LIMIT,
  API_DEBOUNCE_MS,
  PATHNAME_POLL_MS,
  PRO_CONTEXT_LIMIT,
  FREE_CONTEXT_LIMIT,
} from '../utils/constants';
import { isContextValid, dedupeByAncestor } from '../utils/chromeHelpers';
import { USER_MESSAGE_SELECTOR_STRING } from '../utils/domConstants';
import type { DailyStats } from '../types';

/** Minimum throttle interval between token recalculations (ms). */
const THROTTLE_INTERVAL_MS = 1000;

/** CSS selectors for gathering all message content from the DOM. */
const ALL_MESSAGE_SELECTORS = '.font-user-message, .font-claude-message, .prose, [data-is-user], [data-message-author], [data-testid*="message"], .ReactMarkdown';

/**
 * Tracks estimated token usage for the current chat session.
 * Combines local BPE estimation with optional Anthropic API exact counts.
 *
 * @returns Token counts, exactness flag, context limit, truncation status, and today's total.
 */
export function useTokenTracker() {
  const [tokens, setTokens] = useState({ input: 0, output: 0, total: 0 });
  const [isExact, setIsExact] = useState(false);
  const [isTruncated, setIsTruncated] = useState(false);
  const [contextLimit, setContextLimit] = useState(PRO_CONTEXT_LIMIT);
  const [todayTotal, setTodayTotal] = useState(0);
  const requestIdRef = useRef(0);

  const [currentChatId, setCurrentChatId] = useState(window.location.pathname);
  const isInitialRef = useRef(true);

  const lastTurnsCountRef = useRef(0);
  const lastInputTokensRef = useRef(0);
  const lastOutputTokensRef = useRef(0);
  const lastTotalTokensRef = useRef(0);

  // Detect chat navigation changes via polling
  useEffect(() => {
    const interval = setInterval(() => {
      const pathname = window.location.pathname;
      if (pathname !== currentChatId) {
        setCurrentChatId(pathname);
        isInitialRef.current = true;
        lastTurnsCountRef.current = 0;
        lastInputTokensRef.current = 0;
        lastOutputTokensRef.current = 0;
        lastTotalTokensRef.current = 0;
      }
    }, PATHNAME_POLL_MS);
    return () => clearInterval(interval);
  }, [currentChatId]);

  // Track today's total from storage
  useEffect(() => {
    const fetchTodayTotal = async () => {
      if (!isContextValid()) return;
      try {
        const today = new Date().toISOString().split('T')[0];
        const data = await chrome.storage.local.get('stats');
        const stats = (data.stats as Record<string, DailyStats>) || {};
        if (stats[today]) {
          setTodayTotal(stats[today].inputTokens);
        }
      } catch {
        // Storage unavailable
      }
    };
    fetchTodayTotal();

    const listener = (changes: Record<string, chrome.storage.StorageChange>, areaName: string) => {
      if (!isContextValid()) return;
      if (areaName === 'local' && changes.stats) {
        const today = new Date().toISOString().split('T')[0];
        const newStats = (changes.stats.newValue as Record<string, DailyStats>) || {};
        if (newStats[today]) {
          setTodayTotal(newStats[today].inputTokens);
        }
      }
    };

    if (typeof chrome !== 'undefined' && chrome.storage?.onChanged) {
      chrome.storage.onChanged.addListener(listener);
    }

    return () => {
      if (typeof chrome !== 'undefined' && chrome.storage?.onChanged) {
        try { chrome.storage.onChanged.removeListener(listener); } catch { /* context invalidated */ }
      }
    };
  }, []);

  // Main token calculation effect
  useEffect(() => {
    let debounceTimer: ReturnType<typeof setTimeout>;
    let apiDebounceTimer: ReturnType<typeof setTimeout>;
    let lastExecuted = 0;

    const recordDailyUsage = (tokenCount: number, turnsCount: number) => {
      const today = new Date().toISOString().split('T')[0];
      const isInputFocused =
        document.activeElement?.getAttribute('contenteditable') === 'true' ||
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
        StorageManager.updateDailyStats(today, window.location.pathname, tokenCount, 0).catch(() => {});
        lastTurnsCountRef.current = turnsCount;
        lastInputTokensRef.current = tokenCount;
        lastOutputTokensRef.current = 0;
        lastTotalTokensRef.current = tokenCount;
      } else if (turnsCount === lastTurnsCountRef.current && lastInputTokensRef.current > 0 && !isInputFocused) {
        const currentOutput = Math.max(0, tokenCount - lastInputTokensRef.current);
        const outputDelta = currentOutput - lastOutputTokensRef.current;
        if (outputDelta !== 0) {
          StorageManager.updateDailyStats(today, window.location.pathname, 0, outputDelta).catch(() => {});
          lastOutputTokensRef.current = currentOutput;
          lastTotalTokensRef.current = tokenCount;
        }
      }
    };

    const calculateTokens = async () => {
      if (!isContextValid()) return;

      const text = gatherConversationText();
      const turnsCount = countDedupedUserMessages();

      chrome.runtime.sendMessage({ action: 'get_public_settings' }, (response) => {
        if (!response || !response.success) return;

        const { hasApiKey, claudePlan } = response;
        setContextLimit(claudePlan === 'Pro' || claudePlan === 'Team' ? PRO_CONTEXT_LIMIT : FREE_CONTEXT_LIMIT);

        let textToEstimate = text;
        if (textToEstimate.length > TRUNCATE_CHAR_LIMIT) {
          textToEstimate = textToEstimate.substring(0, TRUNCATE_CHAR_LIMIT);
          setIsTruncated(true);
        } else {
          setIsTruncated(false);
        }

        requestIdRef.current += 1;
        const currentReqId = requestIdRef.current;

        chrome.runtime.sendMessage(
          { action: 'estimate_tokens', text: textToEstimate, requestId: currentReqId },
          (estimateResponse) => {
            if (estimateResponse?.success && currentReqId === requestIdRef.current) {
              setTokens({
                input: Math.floor(estimateResponse.tokenCount * (1 - ESTIMATED_OUTPUT_RATIO)),
                output: Math.ceil(estimateResponse.tokenCount * ESTIMATED_OUTPUT_RATIO),
                total: estimateResponse.tokenCount,
              });
              setIsExact(false);
              recordDailyUsage(estimateResponse.tokenCount, turnsCount);
            }
          },
        );

        if (hasApiKey) {
          clearTimeout(apiDebounceTimer);
          apiDebounceTimer = setTimeout(() => {
            const detected = detectModel();
            chrome.runtime.sendMessage(
              { action: 'count_tokens', text: text.substring(0, API_TEXT_LIMIT), model: detected },
              (exactResponse) => {
                if (exactResponse?.success && typeof exactResponse.tokens === 'number' && currentReqId === requestIdRef.current) {
                  const exactTotal = exactResponse.tokens;
                  setTokens({
                    input: Math.floor(exactTotal * (1 - ESTIMATED_OUTPUT_RATIO)),
                    output: Math.ceil(exactTotal * ESTIMATED_OUTPUT_RATIO),
                    total: exactTotal,
                  });
                  setIsExact(true);
                  recordDailyUsage(exactTotal, turnsCount);
                }
              },
            );
          }, API_DEBOUNCE_MS);
        }
      });
    };

    calculateTokens();

    const handleInteraction = () => {
      const now = Date.now();
      clearTimeout(debounceTimer);

      if (now - lastExecuted >= THROTTLE_INTERVAL_MS) {
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

// ---------------------------------------------------------------------------
// Private helpers
// ---------------------------------------------------------------------------

/**
 * Gathers all visible conversation text from the DOM, combining message
 * elements with the current input box content.
 */
function gatherConversationText(): string {
  const inputElement = document.querySelector('div[contenteditable="true"]');
  const inputText = inputElement?.textContent || '';

  const isNewChatUrl = window.location.pathname === '/' || window.location.pathname === '/new';
  const chatContainer = document.querySelector('.flex-1.overflow-hidden') || document.body;
  const containerText = chatContainer.textContent || '';
  const hasEmptyStateBoilerplate = containerText.includes('to get started') || containerText.includes("Claude's choice");

  if (isNewChatUrl || hasEmptyStateBoilerplate) {
    return inputText;
  }

  const rawElements = Array.from(document.querySelectorAll(ALL_MESSAGE_SELECTORS));
  const messageElements = dedupeByAncestor(rawElements);

  if (messageElements.length > 0) {
    const messagesText = messageElements.map(el => el.textContent).join('\n');
    return messagesText + '\n' + inputText;
  }

  return containerText;
}

/** Counts deduplicated user messages in the current chat. */
function countDedupedUserMessages(): number {
  const rawUserMessages = Array.from(document.querySelectorAll(USER_MESSAGE_SELECTOR_STRING));
  return dedupeByAncestor(rawUserMessages).length;
}
