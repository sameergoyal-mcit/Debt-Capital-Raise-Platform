import React from "react";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface DemoModeBannerProps {
  isEnabled: boolean;
}

export function DemoModeBanner({ isEnabled }: DemoModeBannerProps) {
  if (!isEnabled) return null;

  return (
    <div className="bg-gradient-to-r from-violet-500/10 via-purple-500/10 to-fuchsia-500/10 border-b border-violet-200 px-4 py-2" data-testid="demo-mode-banner">
      <div className="flex items-center justify-center gap-2 text-sm">
        <Sparkles className="h-4 w-4 text-violet-600" />
        <span className="font-medium text-violet-800">Demo Mode Active</span>
        <Badge variant="outline" className="text-[10px] bg-white/50 border-violet-200 text-violet-700">
          Sample Data
        </Badge>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>
              <Info className="h-3.5 w-3.5 text-violet-500 cursor-help" />
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <p className="text-xs">
                Demo mode shows realistic sample data including signed NDAs, document views, 
                Q&A items, and submitted commitments. Destructive actions are disabled.
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
}

interface DemoTooltipProps {
  content: string;
  children: React.ReactNode;
  isEnabled: boolean;
}

export function DemoTooltip({ content, children, isEnabled }: DemoTooltipProps) {
  if (!isEnabled) return <>{children}</>;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="relative">
            {children}
            <div className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-violet-500 animate-pulse" />
          </div>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs bg-violet-50 border-violet-200">
          <div className="flex items-start gap-2">
            <Sparkles className="h-3 w-3 text-violet-600 mt-0.5 shrink-0" />
            <p className="text-xs text-violet-800">{content}</p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
