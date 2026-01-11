/**
 * Deal Stage Machine - Stage Definitions and Requirements
 * Single source of truth for deal lifecycle stages and required artifacts
 */

// Forward declaration for RequirementContext (defined in deal-stage-engine.ts)
export interface RequirementContext {
  deal: {
    id: string;
    launchDate?: string;
    ioiDeadline?: string;
    commitmentDeadline?: string;
    ndaDeadline?: string;
    expectedAllocationDate?: string;
    expectedCloseDate?: string;
    allocationPlanReady?: boolean;
    closingChecklistComplete?: boolean;
    status?: string;
    stageOverride?: DealStageId;
  };
  documents: Array<{ category: string; status?: string }>;
  invitations: Array<{ ndaRequired?: boolean; ndaSignedAt?: string }>;
  qaItems: Array<{ status: string; draftStatus?: string; submittedAnswer?: string }>;
  commitments: Array<{ status: string; amount?: number }>;
}

// =============================================================================
// STAGE DEFINITIONS
// =============================================================================

export type DealStageId =
  | "setup"
  | "launched"
  | "diligence"
  | "ioi_collection"
  | "bookbuilding"
  | "documentation"
  | "allocation"
  | "closing"
  | "closed"
  | "on_hold";

export interface StageMetadata {
  id: DealStageId;
  label: string;
  description: string;
  primaryOwner: "issuer" | "bookrunner";
  order: number;
  defaultDurationDays?: number;
}

export const DEAL_STAGES: Record<DealStageId, StageMetadata> = {
  setup: {
    id: "setup",
    label: "Setup",
    description: "Deal preparation and materials drafting",
    primaryOwner: "issuer",
    order: 0,
    defaultDurationDays: 14,
  },
  launched: {
    id: "launched",
    label: "Launched",
    description: "Deal launched, NDA distribution in progress",
    primaryOwner: "bookrunner",
    order: 1,
    defaultDurationDays: 7,
  },
  diligence: {
    id: "diligence",
    label: "Diligence",
    description: "Lender due diligence and Q&A period",
    primaryOwner: "issuer",
    order: 2,
    defaultDurationDays: 14,
  },
  ioi_collection: {
    id: "ioi_collection",
    label: "IOI Collection",
    description: "Collecting indications of interest from lenders",
    primaryOwner: "bookrunner",
    order: 3,
    defaultDurationDays: 7,
  },
  bookbuilding: {
    id: "bookbuilding",
    label: "Bookbuilding",
    description: "Building the book with soft circles and firm commitments",
    primaryOwner: "bookrunner",
    order: 4,
    defaultDurationDays: 7,
  },
  documentation: {
    id: "documentation",
    label: "Documentation",
    description: "Legal documentation and credit agreement negotiation",
    primaryOwner: "issuer",
    order: 5,
    defaultDurationDays: 14,
  },
  allocation: {
    id: "allocation",
    label: "Allocation",
    description: "Final allocation to lenders",
    primaryOwner: "bookrunner",
    order: 6,
    defaultDurationDays: 3,
  },
  closing: {
    id: "closing",
    label: "Closing",
    description: "Closing checklist and funding",
    primaryOwner: "issuer",
    order: 7,
    defaultDurationDays: 5,
  },
  closed: {
    id: "closed",
    label: "Closed",
    description: "Deal successfully closed and funded",
    primaryOwner: "issuer",
    order: 8,
  },
  on_hold: {
    id: "on_hold",
    label: "On Hold",
    description: "Deal temporarily paused",
    primaryOwner: "issuer",
    order: 99,
  },
};

export const STAGE_ORDER: DealStageId[] = [
  "setup",
  "launched",
  "diligence",
  "ioi_collection",
  "bookbuilding",
  "documentation",
  "allocation",
  "closing",
  "closed",
];

// =============================================================================
// REQUIREMENT DEFINITIONS
// =============================================================================

export type RequirementId =
  | "lender_presentation_uploaded"
  | "supplemental_uploaded"
  | "kyc_uploaded"
  | "paydown_model_uploaded"
  | "legal_docs_uploaded"
  | "nda_invites_sent"
  | "nda_minimum_signed"
  | "qna_responses_sla_met"
  | "ioi_deadline_set"
  | "commitments_deadline_set"
  | "ioi_received_minimum"
  | "soft_circles_recorded"
  | "firm_commitments_received"
  | "allocation_plan_ready"
  | "closing_checklist_complete";

export interface StageRequirement {
  id: RequirementId;
  label: string;
  description: string;
  stage: DealStageId;
  severity: "warning" | "critical";
  resolveHref: (dealId: string) => string;
  isSatisfied: (context: RequirementContext) => boolean;
  getDetails?: (context: RequirementContext) => string;
  internalOnly?: boolean;
}

// Helper to check if document category exists
function hasDocumentCategory(context: RequirementContext, category: string): boolean {
  return context.documents.some(d => d.category === category);
}

// Helper to count signed NDAs
function getSignedNDACount(context: RequirementContext): number {
  return context.invitations.filter(i => i.ndaSignedAt).length;
}

// Helper to count pending NDAs
function getPendingNDACount(context: RequirementContext): number {
  return context.invitations.filter(i => i.ndaRequired && !i.ndaSignedAt).length;
}

// Helper to count open Q&A
function getOpenQACount(context: RequirementContext): number {
  return context.qaItems.filter(q => q.status === "open").length;
}

// Helper to count IOIs received
function getIOICount(context: RequirementContext): number {
  return context.commitments.filter(c => c.status !== "Withdrawn").length;
}

// Helper to get total committed amount
function getTotalCommitted(context: RequirementContext): number {
  return context.commitments
    .filter(c => c.status !== "Withdrawn")
    .reduce((sum, c) => sum + (c.amount || 0), 0);
}

// Helper to count firm commitments
function getFirmCommitmentCount(context: RequirementContext): number {
  return context.commitments.filter(c => c.status === "Firm").length;
}

export const STAGE_REQUIREMENTS: StageRequirement[] = [
  // ==========================================================================
  // SETUP STAGE REQUIREMENTS
  // ==========================================================================
  {
    id: "lender_presentation_uploaded",
    label: "Lender Presentation Uploaded",
    description: "CIM / Lender deck uploaded to data room",
    stage: "setup",
    severity: "critical",
    resolveHref: (dealId) => `/deal/${dealId}/documents`,
    isSatisfied: (ctx) => hasDocumentCategory(ctx, "Lender Presentation"),
    getDetails: (ctx) => hasDocumentCategory(ctx, "Lender Presentation")
      ? "Lender presentation available"
      : "Upload lender presentation to proceed",
  },
  {
    id: "supplemental_uploaded",
    label: "Supplemental Materials Uploaded",
    description: "Supporting documentation uploaded",
    stage: "setup",
    severity: "warning",
    resolveHref: (dealId) => `/deal/${dealId}/documents`,
    isSatisfied: (ctx) => hasDocumentCategory(ctx, "Supplemental Information"),
  },
  {
    id: "kyc_uploaded",
    label: "KYC Documents Uploaded",
    description: "KYC and compliance documents uploaded",
    stage: "setup",
    severity: "warning",
    resolveHref: (dealId) => `/deal/${dealId}/documents`,
    isSatisfied: (ctx) => hasDocumentCategory(ctx, "KYC & Compliance"),
  },
  {
    id: "paydown_model_uploaded",
    label: "Paydown Model Uploaded",
    description: "Financial model / paydown schedule uploaded",
    stage: "setup",
    severity: "warning",
    resolveHref: (dealId) => `/deal/${dealId}/documents`,
    isSatisfied: (ctx) => hasDocumentCategory(ctx, "Lender Paydown Model"),
  },

  // ==========================================================================
  // LAUNCHED STAGE REQUIREMENTS
  // ==========================================================================
  {
    id: "nda_invites_sent",
    label: "NDA Invites Sent",
    description: "At least one lender invited with NDA",
    stage: "launched",
    severity: "critical",
    resolveHref: (dealId) => `/deal/${dealId}/overview`,
    isSatisfied: (ctx) => ctx.invitations.length > 0,
    getDetails: (ctx) => `${ctx.invitations.length} lenders invited`,
  },
  {
    id: "nda_minimum_signed",
    label: "NDAs Signed",
    description: "At least one NDA signed by lenders",
    stage: "launched",
    severity: "warning",
    resolveHref: (dealId) => `/deal/${dealId}/book?filter=nda_pending`,
    isSatisfied: (ctx) => getSignedNDACount(ctx) >= 1,
    getDetails: (ctx) => {
      const signed = getSignedNDACount(ctx);
      const pending = getPendingNDACount(ctx);
      return `${signed} signed, ${pending} pending`;
    },
  },

  // ==========================================================================
  // DILIGENCE STAGE REQUIREMENTS
  // ==========================================================================
  {
    id: "qna_responses_sla_met",
    label: "Q&A Responses Current",
    description: "All open lender questions addressed",
    stage: "diligence",
    severity: "warning",
    resolveHref: (dealId) => `/deal/${dealId}/qa?filter=open`,
    isSatisfied: (ctx) => getOpenQACount(ctx) === 0,
    getDetails: (ctx) => {
      const open = getOpenQACount(ctx);
      return open === 0 ? "All questions answered" : `${open} open questions`;
    },
  },

  // ==========================================================================
  // IOI COLLECTION STAGE REQUIREMENTS
  // ==========================================================================
  {
    id: "ioi_deadline_set",
    label: "IOI Deadline Set",
    description: "Indication of interest deadline configured",
    stage: "ioi_collection",
    severity: "critical",
    resolveHref: (dealId) => `/deal/${dealId}/timeline`,
    isSatisfied: (ctx) => !!ctx.deal.ioiDeadline,
    internalOnly: true,
  },
  {
    id: "ioi_received_minimum",
    label: "IOIs Received",
    description: "At least one indication of interest received",
    stage: "ioi_collection",
    severity: "critical",
    resolveHref: (dealId) => `/deal/${dealId}/syndicate-book`,
    isSatisfied: (ctx) => getIOICount(ctx) >= 1,
    getDetails: (ctx) => `${getIOICount(ctx)} IOIs received`,
  },

  // ==========================================================================
  // BOOKBUILDING STAGE REQUIREMENTS
  // ==========================================================================
  {
    id: "commitments_deadline_set",
    label: "Commitment Deadline Set",
    description: "Final commitment deadline configured",
    stage: "bookbuilding",
    severity: "warning",
    resolveHref: (dealId) => `/deal/${dealId}/timeline`,
    isSatisfied: (ctx) => !!ctx.deal.commitmentDeadline,
    internalOnly: true,
  },
  {
    id: "soft_circles_recorded",
    label: "Soft Circles Recorded",
    description: "Soft circle commitments tracked in book",
    stage: "bookbuilding",
    severity: "warning",
    resolveHref: (dealId) => `/deal/${dealId}/syndicate-book`,
    isSatisfied: (ctx) => getTotalCommitted(ctx) > 0,
    getDetails: (ctx) => {
      const total = getTotalCommitted(ctx);
      return total > 0 ? `$${(total / 1000000).toFixed(1)}M committed` : "No commitments recorded";
    },
  },
  {
    id: "firm_commitments_received",
    label: "Firm Commitments Received",
    description: "At least one firm commitment received",
    stage: "bookbuilding",
    severity: "warning",
    resolveHref: (dealId) => `/deal/${dealId}/syndicate-book`,
    isSatisfied: (ctx) => getFirmCommitmentCount(ctx) >= 1,
    getDetails: (ctx) => `${getFirmCommitmentCount(ctx)} firm commitments`,
  },

  // ==========================================================================
  // DOCUMENTATION STAGE REQUIREMENTS
  // ==========================================================================
  {
    id: "legal_docs_uploaded",
    label: "Legal Documents Uploaded",
    description: "Credit agreement and legal docs uploaded",
    stage: "documentation",
    severity: "critical",
    resolveHref: (dealId) => `/deal/${dealId}/documents`,
    isSatisfied: (ctx) => hasDocumentCategory(ctx, "Legal"),
  },

  // ==========================================================================
  // ALLOCATION STAGE REQUIREMENTS
  // ==========================================================================
  {
    id: "allocation_plan_ready",
    label: "Allocation Plan Ready",
    description: "Final allocation plan prepared",
    stage: "allocation",
    severity: "critical",
    resolveHref: (dealId) => `/deal/${dealId}/syndicate-book`,
    isSatisfied: (ctx) => ctx.deal.allocationPlanReady === true,
    internalOnly: true,
  },

  // ==========================================================================
  // CLOSING STAGE REQUIREMENTS
  // ==========================================================================
  {
    id: "closing_checklist_complete",
    label: "Closing Checklist Complete",
    description: "All closing items checked off",
    stage: "closing",
    severity: "critical",
    resolveHref: (dealId) => `/deal/${dealId}/closing`,
    isSatisfied: (ctx) => ctx.deal.closingChecklistComplete === true,
    internalOnly: true,
  },
];

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get all requirements for a specific stage
 */
export function getStageRequirements(stage: DealStageId): StageRequirement[] {
  return STAGE_REQUIREMENTS.filter(r => r.stage === stage);
}

/**
 * Get requirements for current stage and all prior stages
 */
export function getCumulativeRequirements(stage: DealStageId): StageRequirement[] {
  const stageOrder = DEAL_STAGES[stage].order;
  return STAGE_REQUIREMENTS.filter(r => {
    const reqStageOrder = DEAL_STAGES[r.stage].order;
    return reqStageOrder <= stageOrder;
  });
}

/**
 * Get the next stage in the workflow
 */
export function getNextStage(currentStage: DealStageId): DealStageId | null {
  const currentIndex = STAGE_ORDER.indexOf(currentStage);
  if (currentIndex === -1 || currentIndex >= STAGE_ORDER.length - 1) {
    return null;
  }
  return STAGE_ORDER[currentIndex + 1];
}

/**
 * Check if a stage is before another stage
 */
export function isStageBefore(stage: DealStageId, otherStage: DealStageId): boolean {
  return DEAL_STAGES[stage].order < DEAL_STAGES[otherStage].order;
}
