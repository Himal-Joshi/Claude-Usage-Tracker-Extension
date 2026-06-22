import React from 'react';
import { useTokenTracker } from '../hooks/useTokenTracker';

const HeaderStatsApp: React.FC = () => {
  const { tokens, isExact } = useTokenTracker();

  // Cost in credits (micro-dollars)
  const costCredits = Math.round(tokens.input * 3 + tokens.output * 15);

  return (
    <div className="flex items-center gap-1.5 text-[11px] font-sans text-gray-500 dark:text-gray-400 select-none mt-0.5">
      <span className="flex items-center gap-1">
        <span 
          className="cursor-help"
          title={isExact ? "Exact token count retrieved using API key." : "Estimated token count calculated using local GPT-tokenizer."}
        >
          Length{isExact ? "" : "*"}:
        </span>
        <span className="font-semibold text-blue-600 dark:text-blue-400">
          {tokens.total.toLocaleString()}
        </span>
        <span>tokens</span>
      </span>

      <span className="text-gray-300 dark:text-gray-700 mx-0.5">|</span>

      <span className="flex items-center gap-1">
        <span 
          className="cursor-help"
          title="Estimated cost in credits. 1 credit ≈ $0.000001. Rates based on Claude 3.5 Sonnet ($3/M input, $15/M output)."
        >
          Cost:
        </span>
        <span className="font-semibold text-blue-600 dark:text-blue-400">
          {costCredits.toLocaleString()}
        </span>
        <span>credits</span>
      </span>
    </div>
  );
};

export default HeaderStatsApp;
