// Standardized status chip configurations for debt capital markets
import { statusColors } from "./status-colors";
import type { StatusType } from "./status-colors";

// NDA Status
export type NdaStatus = "signed" | "pending" | "expired" | "not_required";

export const ndaStatusConfig: Record<NdaStatus, { label: string; status: StatusType }> = {
  signed: { label: "NDA Signed", status: "complete" },
  pending: { label: "NDA Pending", status: "pending" },
  expired: { label: "NDA Expired", status: "blocked" },
  not_required: { label: "No NDA Required", status: "info" }
};

// Document Status
export type DocStatus = "current" | "updated" | "draft" | "superseded";

export const docStatusConfig: Record<DocStatus, { label: string; status: StatusType }> = {
  current: { label: "Current", status: "complete" },
  updated: { label: "Updated", status: "pending" },
  draft: { label: "Draft", status: "info" },
  superseded: { label: "Superseded", status: "info" }
};

// Commitment Status
export type CommitmentStatus = "submitted" | "pending" | "withdrawn" | "accepted";

export const commitmentStatusConfig: Record<CommitmentStatus, { label: string; status: StatusType }> = {
  submitted: { label: "Submitted", status: "complete" },
  pending: { label: "Pending", status: "pending" },
  withdrawn: { label: "Withdrawn", status: "blocked" },
  accepted: { label: "Accepted", status: "complete" }
};

// Q&A Status
export type QaStatus = "answered" | "pending" | "escalated" | "closed";

export const qaStatusConfig: Record<QaStatus, { label: string; status: StatusType }> = {
  answered: { label: "Answered", status: "complete" },
  pending: { label: "Pending", status: "pending" },
  escalated: { label: "Escalated", status: "blocked" },
  closed: { label: "Closed", status: "info" }
};

// Deal Stage Status
export type DealStage = "nda" | "lender_presentation" | "ioi" | "bookbuilding" | "docs" | "signing" | "funding";

export const dealStageLabels: Record<DealStage, string> = {
  nda: "NDA",
  lender_presentation: "Lender Presentation",
  ioi: "IOI",
  bookbuilding: "Bookbuilding",
  docs: "Docs",
  signing: "Signing",
  funding: "Funding"
};

export const dealStageOrder: DealStage[] = [
  "nda",
  "lender_presentation",
  "ioi",
  "bookbuilding",
  "docs",
  "signing",
  "funding"
];

// Engagement Heat Level
export type HeatLevel = "hot" | "warm" | "cold" | "none";

export const heatLevelConfig: Record<HeatLevel, { label: string; bg: string; text: string }> = {
  hot: { label: "High", bg: "bg-green-800/20", text: "text-green-800" },
  warm: { label: "Medium", bg: "bg-amber-800/15", text: "text-amber-800" },
  cold: { label: "Low", bg: "bg-slate-200", text: "text-slate-600" },
  none: { label: "None", bg: "bg-slate-100", text: "text-slate-400" }
};

// Document folder naming (debt terminology)
export const documentFolders = [
  "Lender Presentation",
  "Supplemental Information",
  "KYC & Compliance",
  "Lender Paydown Model",
  "Legal"
] as const;

export type DocumentFolder = typeof documentFolders[number];

// Helper to get chip classes
export function getChipClasses(status: StatusType): string {
  const colors = statusColors[status];
  return `${colors.bg} ${colors.text} ${colors.border} border`;
}
