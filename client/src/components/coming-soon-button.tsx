import { Button, ButtonProps } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface ComingSoonButtonProps extends Omit<ButtonProps, 'disabled'> {
  enabled?: boolean;
  tooltipText?: string;
  featureName?: string;
}

export function ComingSoonButton({
  enabled = false,
  tooltipText,
  featureName,
  children,
  className,
  onClick,
  ...props
}: ComingSoonButtonProps) {
  const tooltip = tooltipText || `Coming soon: ${featureName || 'This feature'}`;

  if (enabled) {
    return (
      <Button onClick={onClick} className={className} {...props}>
        {children}
      </Button>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-block">
            <Button
              disabled
              className={cn("pointer-events-none opacity-50", className)}
              {...props}
            >
              {children}
            </Button>
          </span>
        </TooltipTrigger>
        <TooltipContent>
          <p>{tooltip}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
