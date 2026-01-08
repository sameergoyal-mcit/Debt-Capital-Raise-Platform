import React from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { getChipClasses } from "@/lib/status-chips";
import type { StatusType } from "@/lib/status-colors";
import {
  ndaStatusConfig,
  docStatusConfig,
  commitmentStatusConfig,
  qaStatusConfig,
  heatLevelConfig,
  NdaStatus,
  DocStatus,
  CommitmentStatus,
  QaStatus,
  HeatLevel
} from "@/lib/status-chips";

interface StatusBadgeProps {
  status: StatusType;
  label: string;
  className?: string;
}

export function StatusBadge({ status, label, className }: StatusBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "text-[10px] font-medium px-2 py-0.5",
        getChipClasses(status),
        className
      )}
    >
      {label}
    </Badge>
  );
}

// Specialized badges
export function NdaStatusBadge({ status, className }: { status: NdaStatus; className?: string }) {
  const config = ndaStatusConfig[status];
  return <StatusBadge status={config.status} label={config.label} className={className} />;
}

export function DocStatusBadge({ status, className }: { status: DocStatus; className?: string }) {
  const config = docStatusConfig[status];
  return <StatusBadge status={config.status} label={config.label} className={className} />;
}

export function CommitmentStatusBadge({ status, className }: { status: CommitmentStatus; className?: string }) {
  const config = commitmentStatusConfig[status];
  return <StatusBadge status={config.status} label={config.label} className={className} />;
}

export function QaStatusBadge({ status, className }: { status: QaStatus; className?: string }) {
  const config = qaStatusConfig[status];
  return <StatusBadge status={config.status} label={config.label} className={className} />;
}

export function HeatLevelBadge({ level, className }: { level: HeatLevel; className?: string }) {
  const config = heatLevelConfig[level];
  return (
    <Badge
      variant="outline"
      className={cn(
        "text-[10px] font-medium px-2 py-0.5 border-0",
        config.bg,
        config.text,
        className
      )}
    >
      {config.label}
    </Badge>
  );
}
