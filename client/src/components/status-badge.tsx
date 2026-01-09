import React from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  NDAStatus,
  DocsStatus,
  CommitmentStatus,
  QAStatus,
  NDAStatusType,
  DocsStatusType,
  CommitmentStatusType,
  QAStatusType,
  getNDAChip,
  getDocsChip,
  getCommitmentChip,
  getQAChip,
} from "@/lib/status-chips";

export function NdaStatusBadge({ status, className }: { status: NDAStatusType; className?: string }) {
  const chip = getNDAChip(status);
  return (
    <Badge variant="outline" className={cn("text-[10px] font-medium px-2 py-0.5", chip.className, className)}>
      {chip.label}
    </Badge>
  );
}

export function DocStatusBadge({ status, className }: { status: DocsStatusType; className?: string }) {
  const chip = getDocsChip(status);
  return (
    <Badge variant="outline" className={cn("text-[10px] font-medium px-2 py-0.5", chip.className, className)}>
      {chip.label}
    </Badge>
  );
}

export function CommitmentStatusBadge({ status, className }: { status: CommitmentStatusType; className?: string }) {
  const chip = getCommitmentChip(status);
  return (
    <Badge variant="outline" className={cn("text-[10px] font-medium px-2 py-0.5", chip.className, className)}>
      {chip.label}
    </Badge>
  );
}

export function QaStatusBadge({ status, className }: { status: QAStatusType; className?: string }) {
  const chip = getQAChip(status);
  return (
    <Badge variant="outline" className={cn("text-[10px] font-medium px-2 py-0.5", chip.className, className)}>
      {chip.label}
    </Badge>
  );
}

// Re-export the status enums for convenience
export { NDAStatus, DocsStatus, CommitmentStatus, QAStatus };
export type { NDAStatusType, DocsStatusType, CommitmentStatusType, QAStatusType };
