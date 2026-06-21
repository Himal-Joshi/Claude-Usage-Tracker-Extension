import React from 'react';
import { useTokenTracker } from '../hooks/useTokenTracker';

const HeaderStatsApp: React.FC = () => {
  const { tokens, isExact } = useTokenTracker();

  // Cost in credits (micro-dollars)
  const costCredits = Math.round(tokens.input * 3 + tokens.output * 15);

  return (
    <div className="inline-flex items-center gap-2.5 text-[11px] font-sans select-none px-1 text-gray-400">
      <span className="flex items-center gap-1.5">
        <span 
          className="cursor-help text-orange-300/80 hover:text-orange-200 transition-colors font-semibold uppercase text-[9px] tracking-wider"
          style={{ borderBottom: '1px dashed rgba(253,186,116,0.35)' }}
          title={isExact ? "Exact token count retrieved using API key." : "Estimated token count calculated using local GPT-tokenizer."}
        >
          Length{isExact ? "" : "*"}
        </span>
        <span className="font-mono text-orange-200 font-semibold tracking-tight">{tokens.total.toLocaleString()}</span>
        <span className="text-gray-500 text-[10px] uppercase font-medium">tokens</span>
      </span>

      <span className="text-white/10 font-light select-none">│</span>

      <span className="flex items-center gap-1.5">
        <span 
          className="cursor-help text-orange-300/80 hover:text-orange-200 transition-colors font-semibold uppercase text-[9px] tracking-wider"
          style={{ borderBottom: '1px dashed rgba(253,186,116,0.35)' }}
          title="Estimated cost in credits. 1 credit ≈ $0.000001. Rates based on Claude 3.5 Sonnet ($3/M input, $15/M output)."
        >
          Cost
        </span>
        <span className="font-mono text-orange-200 font-semibold tracking-tight">{costCredits.toLocaleString()}</span>
        <span className="text-gray-500 text-[10px] uppercase font-medium">credits</span>
      </span>
    </div>
  );
};

export default HeaderStatsApp;
