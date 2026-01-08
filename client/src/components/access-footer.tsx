import React from "react";
import { Shield, Lock, Eye } from "lucide-react";

interface AccessFooterProps {
  role: "Investor" | "Issuer" | "Bookrunner";
}

export function AccessFooter({ role }: AccessFooterProps) {
  return (
    <div className="mt-8 pt-4 border-t border-border/40" data-testid="access-footer">
      <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <Shield className="h-3 w-3" />
          <span>Access logged</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Lock className="h-3 w-3" />
          <span>NDA enforced</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Eye className="h-3 w-3" />
          <span>Role-based permissions active</span>
        </div>
      </div>
      {role === "Investor" && (
        <p className="text-center text-[10px] text-muted-foreground mt-2">
          You only see your own submissions and questions.
        </p>
      )}
    </div>
  );
}
