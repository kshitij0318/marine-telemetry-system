import React from 'react';
import { Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './tooltip';

interface FeatureInfoHoverProps {
  title: string;
  description: string;
  features: { label: string; detail: string; color?: string }[];
}

export function FeatureInfoHover({ title, description, features }: FeatureInfoHoverProps) {
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button className="text-marine-text-secondary hover:text-white transition-colors cursor-help ml-1">
            <Info className="w-3.5 h-3.5" />
          </button>
        </TooltipTrigger>
        <TooltipContent 
          side="left" 
          align="start" 
          sideOffset={15} 
          className="w-72 bg-marine-dark/95 backdrop-blur-xl border border-marine-border p-4 shadow-2xl flex flex-col gap-3 rounded-xl z-[3000]"
        >
          <div className="flex flex-col gap-1 border-b border-white/10 pb-2">
            <span className="text-xs font-black text-marine-accent tracking-widest uppercase">{title}</span>
            <span className="text-[11px] text-white/70 leading-snug">{description}</span>
          </div>
          <div className="flex flex-col gap-2.5">
            {features.map((f, i) => (
              <div key={i} className="flex flex-col pl-2 border-l-2" style={{ borderColor: f.color || '#00d4ff' }}>
                <span className="text-[10px] font-bold text-white/90 uppercase">{f.label}</span>
                <span className="text-[10px] text-white/50 leading-tight">{f.detail}</span>
              </div>
            ))}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
