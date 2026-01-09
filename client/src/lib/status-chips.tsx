import React from "react";
import { cn } from "@/lib/utils";

export const NDAStatus = {
  NOT_SENT: "not_sent",
  SENT: "sent",
  SIGNED: "signed"
} as const;

export const DocsStatus = {
  NEW: "new",
  UPDATED: "updated",
  VIEWED: "viewed"
} as const;

export const CommitmentStatus = {
  NOT_SUBMITTED: "not_submitted",
  SUBMITTED: "submitted",
  FIRM: "firm",
  WITHDRAWN: "withdrawn"
} as const;

export const QAStatus = {
  OPEN: "open",
  DRAFT: "draft",
  ANSWERED: "answered",
  CLOSED: "closed"
} as const;

export const DealStage = {
  PRE_LAUNCH: "pre_launch",
  NDA: "nda",
  LP: "lp",
  DUE_DILIGENCE: "due_diligence",
  IOI: "ioi",
  SIGNING: "signing",
  ALLOCATION: "allocation",
  CLOSING: "closing"
} as const;

export type NDAStatusType = typeof NDAStatus[keyof typeof NDAStatus];
export type DocsStatusType = typeof DocsStatus[keyof typeof DocsStatus];
export type CommitmentStatusType = typeof CommitmentStatus[keyof typeof CommitmentStatus];
export type QAStatusType = typeof QAStatus[keyof typeof QAStatus];
export type DealStageType = typeof DealStage[keyof typeof DealStage];

// Ordered array of deal stages for progress display
export const dealStageOrder: DealStageType[] = [
  DealStage.PRE_LAUNCH,
  DealStage.NDA,
  DealStage.LP,
  DealStage.DUE_DILIGENCE,
  DealStage.IOI,
  DealStage.SIGNING,
  DealStage.ALLOCATION,
  DealStage.CLOSING
];

// Human-readable labels for deal stages
export const dealStageLabels: Record<DealStageType, string> = {
  [DealStage.PRE_LAUNCH]: "Pre-Launch",
  [DealStage.NDA]: "NDA",
  [DealStage.LP]: "Lender Presentation",
  [DealStage.DUE_DILIGENCE]: "Due Diligence",
  [DealStage.IOI]: "Indication of Interest",
  [DealStage.SIGNING]: "Signing",
  [DealStage.ALLOCATION]: "Allocation",
  [DealStage.CLOSING]: "Closing"
};

interface ChipConfig {
  label: string;
  className: string;
  icon?: string;
}

export function getNDAChip(status: NDAStatusType): ChipConfig {
  const configs: Record<NDAStatusType, ChipConfig> = {
    [NDAStatus.NOT_SENT]: {
      label: "NDA Not Sent",
      className: "bg-gray-100 text-gray-700 border-gray-200"
    },
    [NDAStatus.SENT]: {
      label: "NDA Pending",
      className: "bg-amber-100 text-amber-700 border-amber-200"
    },
    [NDAStatus.SIGNED]: {
      label: "NDA Signed",
      className: "bg-green-100 text-green-700 border-green-200"
    }
  };
  return configs[status] || configs[NDAStatus.NOT_SENT];
}

export function getDocsChip(status: DocsStatusType): ChipConfig {
  const configs: Record<DocsStatusType, ChipConfig> = {
    [DocsStatus.NEW]: {
      label: "New",
      className: "bg-blue-100 text-blue-700 border-blue-200"
    },
    [DocsStatus.UPDATED]: {
      label: "Updated",
      className: "bg-purple-100 text-purple-700 border-purple-200"
    },
    [DocsStatus.VIEWED]: {
      label: "Viewed",
      className: "bg-gray-100 text-gray-600 border-gray-200"
    }
  };
  return configs[status] || configs[DocsStatus.NEW];
}

export function getCommitmentChip(status: CommitmentStatusType): ChipConfig {
  const configs: Record<CommitmentStatusType, ChipConfig> = {
    [CommitmentStatus.NOT_SUBMITTED]: {
      label: "Not Submitted",
      className: "bg-gray-100 text-gray-600 border-gray-200"
    },
    [CommitmentStatus.SUBMITTED]: {
      label: "Submitted",
      className: "bg-blue-100 text-blue-700 border-blue-200"
    },
    [CommitmentStatus.FIRM]: {
      label: "Firm",
      className: "bg-green-100 text-green-700 border-green-200"
    },
    [CommitmentStatus.WITHDRAWN]: {
      label: "Withdrawn",
      className: "bg-red-100 text-red-700 border-red-200"
    }
  };
  return configs[status] || configs[CommitmentStatus.NOT_SUBMITTED];
}

export function getQAChip(status: QAStatusType): ChipConfig {
  const configs: Record<QAStatusType, ChipConfig> = {
    [QAStatus.OPEN]: {
      label: "Open",
      className: "bg-red-100 text-red-700 border-red-200"
    },
    [QAStatus.DRAFT]: {
      label: "Draft",
      className: "bg-amber-100 text-amber-700 border-amber-200"
    },
    [QAStatus.ANSWERED]: {
      label: "Answered",
      className: "bg-green-100 text-green-700 border-green-200"
    },
    [QAStatus.CLOSED]: {
      label: "Closed",
      className: "bg-gray-100 text-gray-600 border-gray-200"
    }
  };
  return configs[status] || configs[QAStatus.OPEN];
}

export function getDealStageChip(stage: DealStageType): ChipConfig {
  const stageLabels: Record<DealStageType, string> = {
    [DealStage.PRE_LAUNCH]: "Pre-Launch",
    [DealStage.NDA]: "NDA",
    [DealStage.LP]: "Lender Presentation",
    [DealStage.DUE_DILIGENCE]: "Due Diligence",
    [DealStage.IOI]: "Indication of Interest",
    [DealStage.SIGNING]: "Signing",
    [DealStage.ALLOCATION]: "Allocation",
    [DealStage.CLOSING]: "Closing"
  };

  const stageColors: Record<DealStageType, string> = {
    [DealStage.PRE_LAUNCH]: "bg-slate-100 text-slate-700 border-slate-200",
    [DealStage.NDA]: "bg-amber-100 text-amber-700 border-amber-200",
    [DealStage.LP]: "bg-blue-100 text-blue-700 border-blue-200",
    [DealStage.DUE_DILIGENCE]: "bg-indigo-100 text-indigo-700 border-indigo-200",
    [DealStage.IOI]: "bg-purple-100 text-purple-700 border-purple-200",
    [DealStage.SIGNING]: "bg-rose-100 text-rose-700 border-rose-200",
    [DealStage.ALLOCATION]: "bg-fuchsia-100 text-fuchsia-700 border-fuchsia-200",
    [DealStage.CLOSING]: "bg-green-100 text-green-700 border-green-200"
  };

  return {
    label: stageLabels[stage] || stage,
    className: stageColors[stage] || stageColors[DealStage.PRE_LAUNCH]
  };
}

export function StatusChip({ config, size = "default" }: { config: ChipConfig; size?: "sm" | "default" }) {
  return (
    <span className={cn(
      "inline-flex items-center gap-1 rounded-full border font-medium",
      size === "sm" ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs",
      config.className
    )}>
      {config.label}
    </span>
  );
}
