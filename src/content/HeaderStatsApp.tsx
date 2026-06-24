import React from 'react';
import { useTokenTracker } from '../hooks/useTokenTracker';
import { detectModel, RATES } from '../utils/constants';

const HeaderStatsApp: React.FC = () => {
  const { tokens, isExact } = useTokenTracker();

  const model = detectModel();
  const rates = RATES[model] || RATES.sonnet;

  // Cost in credits (micro-dollars)
  const costCredits = Math.round(tokens.input * rates.input + tokens.output * rates.output);

  const disclaimerText = "⚠ Estimate excludes: uploaded files, project knowledge, system prompts, and prompt cache. Actual usage may be higher.";

  return (
    <div className="flex items-center gap-1.5 text-[11px] font-sans text-gray-500 dark:text-gray-400 select-none mt-0.5">
      <span className="flex items-center gap-1">
        <span 
          className="cursor-help"
          title={isExact ? `Exact token count retrieved using API key.\n\n${disclaimerText}` : `Estimated token count calculated using local GPT-tokenizer.\n\n${disclaimerText}`}
        >
          Length{isExact ? "" : "*"}:
        </span>
        <span 
          className="font-semibold text-blue-600 dark:text-blue-400 cursor-help"
          title={disclaimerText}
        >
          {tokens.total.toLocaleString()}
        </span>
        <span>tokens</span>
      </span>

      <span className="text-gray-300 dark:text-gray-700 mx-0.5">|</span>

      <span className="flex items-center gap-1">
        <span 
          className="cursor-help"
          title={`Estimated cost in credits. 1 credit ≈ $0.000001. Rates based on detected model ${model} ($${rates.input}/M input, $${rates.output}/M output).`}
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
