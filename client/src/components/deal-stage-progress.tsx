import React from "react";
import { Check } from "lucide-react";
import { dealStageLabels, dealStageOrder, DealStage } from "@/lib/status-chips";
import { cn } from "@/lib/utils";

interface DealStageProgressProps {
  currentStage: DealStage;
  className?: string;
}

export function DealStageProgress({ currentStage, className }: DealStageProgressProps) {
  const currentIndex = dealStageOrder.indexOf(currentStage);

  return (
    <div className={cn("w-full", className)} data-testid="deal-stage-progress">
      <div className="flex items-center justify-between">
        {dealStageOrder.map((stage, index) => {
          const isCompleted = index < currentIndex;
          const isCurrent = index === currentIndex;
          const isFuture = index > currentIndex;

          return (
            <React.Fragment key={stage}>
              {/* Stage node */}
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-colors",
                    isCompleted && "bg-green-800 text-white",
                    isCurrent && "bg-slate-700 text-white ring-2 ring-slate-400 ring-offset-2",
                    isFuture && "bg-slate-200 text-slate-500"
                  )}
                  data-testid={`stage-${stage}`}
                >
                  {isCompleted ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <span>{index + 1}</span>
                  )}
                </div>
                <span
                  className={cn(
                    "mt-2 text-[10px] font-medium text-center max-w-[60px] leading-tight",
                    isCompleted && "text-green-800",
                    isCurrent && "text-slate-800",
                    isFuture && "text-slate-400"
                  )}
                >
                  {dealStageLabels[stage]}
                </span>
              </div>

              {/* Connector line */}
              {index < dealStageOrder.length - 1 && (
                <div
                  className={cn(
                    "flex-1 h-0.5 mx-1 mt-[-20px]",
                    index < currentIndex ? "bg-green-800" : "bg-slate-200"
                  )}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}

// Compact version for headers
export function DealStageProgressCompact({ currentStage, className }: DealStageProgressProps) {
  const currentIndex = dealStageOrder.indexOf(currentStage);

  return (
    <div className={cn("flex items-center gap-1", className)} data-testid="deal-stage-progress-compact">
      {dealStageOrder.map((stage, index) => {
        const isCompleted = index < currentIndex;
        const isCurrent = index === currentIndex;

        return (
          <React.Fragment key={stage}>
            <div
              className={cn(
                "h-1.5 rounded-full transition-colors",
                index === 0 ? "w-6" : "w-4",
                isCompleted && "bg-green-800",
                isCurrent && "bg-slate-700",
                !isCompleted && !isCurrent && "bg-slate-200"
              )}
              title={dealStageLabels[stage]}
            />
          </React.Fragment>
        );
      })}
      <span className="ml-2 text-xs text-slate-600 font-medium">
        {dealStageLabels[currentStage]}
      </span>
    </div>
  );
}
