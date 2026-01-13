/**
 * Deal Stage Engine
 * Computes current deal stage from data signals and evaluates requirements
 */

import { parseISO, isBefore, isAfter } from "date-fns";
import type { Deal, Document, Invitation, QAItem, Commitment } from "@shared/schema";

import {
  DealStageId,
  StageRequirement,
  RequirementContext,
  DEAL_STAGES,
  STAGE_ORDER,
  STAGE_REQUIREMENTS,
  getCumulativeRequirements,
  getStageRequirements,
} from "./deal-stages";

// =============================================================================
// TYPES
// =============================================================================

export interface StageResult {
  stage: DealStageId;
  stageLabel: string;
  stageProgressPct: number;
  satisfiedRequirements: StageRequirement[];
  missingRequirements: StageRequirement[];
  nextDeadline?: { label: string; date: string };
  recommendedActions: string[];
}

/**
 * Input type for building stage context from API data
 */
export interface StageContextInput {
  deal: Deal;
  documents: Document[];
  invitations: Invitation[];
  qaItems: QAItem[];
  commitments: Commitment[];
}

// =============================================================================
// CONTEXT BUILDING
// =============================================================================

/**
 * Build the requirement context from API data
 * This is the new preferred method that takes data directly instead of looking it up
 */
export function buildRequirementContextFromData(data: StageContextInput): RequirementContext {
  const { deal, documents, invitations, qaItems, commitments } = data;

  if (!deal) {
    // Return empty context for unknown deals
    return {
      deal: { id: "" },
      documents: [],
      invitations: [],
      qaItems: [],
      commitments: [],
    };
  }

  return {
    deal: {
      id: String(deal.id),
      launchDate: deal.launchDate || undefined,
      ioiDeadline: deal.ioiDeadline || undefined,
      commitmentDeadline: deal.commitmentDeadline || undefined,
      ndaDeadline: deal.ndaDeadline || undefined,
      expectedAllocationDate: deal.expectedAllocationDate || undefined,
      expectedCloseDate: deal.closeDate || undefined,
      allocationPlanReady: deal.allocationPlanReady || false,
      closingChecklistComplete: deal.closingChecklistComplete || false,
      status: deal.status || undefined,
      stageOverride: deal.stageOverride as DealStageId | undefined,
    },
    documents: documents.map(d => ({
      category: d.category || "",
      status: d.status || ""
    })),
    invitations: invitations.map(i => ({
      ndaRequired: i.ndaRequired || false,
      ndaSignedAt: i.ndaSignedAt ? String(i.ndaSignedAt) : undefined,
    })),
    qaItems: qaItems.map(q => ({
      status: q.status || "open",
      draftStatus: (q as any).draftStatus || "none",
      submittedAnswer: (q as any).submittedAnswer,
    })),
    commitments: commitments.map(c => ({
      status: c.status || "",
      amount: typeof c.amount === "string" ? parseFloat(c.amount) : (c.amount || 0),
    })),
  };
}

/**
 * Build empty context for when no data is available
 */
export function buildEmptyContext(dealId: string): RequirementContext {
  return {
    deal: { id: dealId },
    documents: [],
    invitations: [],
    qaItems: [],
    commitments: [],
  };
}

// =============================================================================
// STAGE COMPUTATION
// =============================================================================

/**
 * Compute the current deal stage from context signals
 */
export function computeDealStage(context: RequirementContext): DealStageId {
  const { deal, documents, invitations, commitments } = context;

  // 1. Check explicit status overrides
  if (deal.status === "Closed" || deal.status === "closed") {
    return "closed";
  }
  if (deal.status === "Paused" || deal.status === "paused") {
    return "on_hold";
  }

  // 2. Check manual stage override
  if (deal.stageOverride) {
    return deal.stageOverride;
  }

  // 3. Infer stage from signals

  // Closing stage: closing checklist started
  if (deal.closingChecklistComplete === true) {
    return "closed";
  }

  // Check if closing checklist exists (partially complete would indicate closing stage)
  // For now, we'll check if allocation is complete
  if (deal.allocationPlanReady === true) {
    return "closing";
  }

  // Allocation stage: ready to allocate
  const firmCommitments = commitments.filter(c =>
    c.status === "Firm" || c.status === "firm"
  );
  if (firmCommitments.length >= 1 && hasDocumentCategory(documents, "Legal")) {
    return "allocation";
  }

  // Documentation stage: legal docs uploaded
  if (hasDocumentCategory(documents, "Legal") && commitments.length > 0) {
    return "documentation";
  }

  // Bookbuilding stage: IOIs received, building book
  const totalCommitted = commitments
    .filter(c => c.status !== "Withdrawn" && c.status !== "withdrawn")
    .reduce((sum, c) => sum + (c.amount || 0), 0);

  if (commitments.length > 0 || totalCommitted > 0) {
    return "bookbuilding";
  }

  // IOI Collection: IOI deadline exists or approaching
  if (deal.ioiDeadline) {
    const now = new Date();
    const ioiDate = parseISO(deal.ioiDeadline);
    if (isBefore(now, ioiDate) || isAfter(now, ioiDate)) {
      // We're in or past IOI collection
      return "ioi_collection";
    }
  }

  // Diligence stage: docs complete, NDAs being signed
  const hasLenderPresentation = hasDocumentCategory(documents, "Lender Presentation");
  const signedNDAs = invitations.filter(i => i.ndaSignedAt).length;

  if (hasLenderPresentation && signedNDAs >= 1) {
    return "diligence";
  }

  // Launched stage: NDA invites sent
  if (invitations.length > 0 && deal.launchDate) {
    return "launched";
  }

  // Default: Setup stage
  return "setup";
}

/**
 * Helper to check if document category exists
 */
function hasDocumentCategory(documents: Array<{ category: string }>, category: string): boolean {
  return documents.some(d => d.category === category);
}

// =============================================================================
// REQUIREMENT EVALUATION
// =============================================================================

/**
 * Evaluate all requirements for the current stage
 */
function evaluateRequirements(
  stage: DealStageId,
  context: RequirementContext
): { satisfied: StageRequirement[]; missing: StageRequirement[] } {
  // Get cumulative requirements (current stage + all prior stages)
  const requirements = getCumulativeRequirements(stage);

  const satisfied: StageRequirement[] = [];
  const missing: StageRequirement[] = [];

  for (const req of requirements) {
    if (req.isSatisfied(context)) {
      satisfied.push(req);
    } else {
      missing.push(req);
    }
  }

  return { satisfied, missing };
}

/**
 * Calculate stage progress percentage
 */
function calculateProgress(satisfied: number, total: number): number {
  if (total === 0) return 100;
  return Math.round((satisfied / total) * 100);
}

/**
 * Find the next upcoming deadline
 */
function findNextDeadline(context: RequirementContext): { label: string; date: string } | undefined {
  const deadlines: { label: string; date: string }[] = [];
  const now = new Date();

  if (context.deal.ndaDeadline) {
    deadlines.push({ label: "NDA Deadline", date: context.deal.ndaDeadline });
  }
  if (context.deal.ioiDeadline) {
    deadlines.push({ label: "IOI Deadline", date: context.deal.ioiDeadline });
  }
  if (context.deal.commitmentDeadline) {
    deadlines.push({ label: "Commitment Deadline", date: context.deal.commitmentDeadline });
  }
  if (context.deal.expectedAllocationDate) {
    deadlines.push({ label: "Allocation Date", date: context.deal.expectedAllocationDate });
  }
  if (context.deal.expectedCloseDate) {
    deadlines.push({ label: "Close Date", date: context.deal.expectedCloseDate });
  }

  // Filter to future deadlines and sort by date
  const futureDeadlines = deadlines
    .filter(d => isAfter(parseISO(d.date), now))
    .sort((a, b) => parseISO(a.date).getTime() - parseISO(b.date).getTime());

  return futureDeadlines[0];
}

/**
 * Generate recommended actions based on missing requirements
 */
function generateRecommendedActions(missing: StageRequirement[]): string[] {
  // Sort by severity (critical first) and take top 3
  const sorted = [...missing].sort((a, b) => {
    if (a.severity === "critical" && b.severity !== "critical") return -1;
    if (a.severity !== "critical" && b.severity === "critical") return 1;
    return 0;
  });

  return sorted.slice(0, 3).map(r => r.description);
}

// =============================================================================
// MAIN API
// =============================================================================

/**
 * Get the full stage result from provided data
 * This is the new preferred method that takes data directly
 */
export function getDealStageResultFromData(data: StageContextInput): StageResult {
  const context = buildRequirementContextFromData(data);
  const stage = computeDealStage(context);
  const { satisfied, missing } = evaluateRequirements(stage, context);

  const totalRequirements = satisfied.length + missing.length;
  const progressPct = calculateProgress(satisfied.length, totalRequirements);

  return {
    stage,
    stageLabel: DEAL_STAGES[stage].label,
    stageProgressPct: progressPct,
    satisfiedRequirements: satisfied,
    missingRequirements: missing,
    nextDeadline: findNextDeadline(context),
    recommendedActions: generateRecommendedActions(missing),
  };
}

/**
 * Get stage result with role-based filtering from provided data
 * This is the new preferred method
 */
export function getDealStageResultFromDataForRole(
  data: StageContextInput,
  role: "Bookrunner" | "Issuer" | "Investor"
): StageResult {
  const result = getDealStageResultFromData(data);

  // Filter out internal-only requirements for investors
  if (role === "Investor") {
    result.satisfiedRequirements = result.satisfiedRequirements.filter(r => !r.internalOnly);
    result.missingRequirements = result.missingRequirements.filter(r => !r.internalOnly);

    // Recalculate progress with filtered requirements
    const total = result.satisfiedRequirements.length + result.missingRequirements.length;
    result.stageProgressPct = calculateProgress(result.satisfiedRequirements.length, total);

    // Regenerate actions
    result.recommendedActions = generateRecommendedActions(result.missingRequirements);
  }

  return result;
}

/**
 * @deprecated Use getDealStageResultFromData instead
 * Get stage result for a deal - returns empty result when deal not in context
 */
export function getDealStageResult(dealId: string): StageResult {
  // Return a basic result since we can't look up mock data anymore
  const context = buildEmptyContext(dealId);
  const stage = computeDealStage(context);
  const { satisfied, missing } = evaluateRequirements(stage, context);

  const totalRequirements = satisfied.length + missing.length;
  const progressPct = calculateProgress(satisfied.length, totalRequirements);

  return {
    stage,
    stageLabel: DEAL_STAGES[stage].label,
    stageProgressPct: progressPct,
    satisfiedRequirements: satisfied,
    missingRequirements: missing,
    nextDeadline: findNextDeadline(context),
    recommendedActions: generateRecommendedActions(missing),
  };
}

/**
 * @deprecated Use getDealStageResultFromDataForRole instead
 * Get stage result with role-based filtering
 */
export function getDealStageResultForRole(
  dealId: string,
  role: "Bookrunner" | "Issuer" | "Investor"
): StageResult {
  const result = getDealStageResult(dealId);

  // Filter out internal-only requirements for investors
  if (role === "Investor") {
    result.satisfiedRequirements = result.satisfiedRequirements.filter(r => !r.internalOnly);
    result.missingRequirements = result.missingRequirements.filter(r => !r.internalOnly);

    // Recalculate progress with filtered requirements
    const total = result.satisfiedRequirements.length + result.missingRequirements.length;
    result.stageProgressPct = calculateProgress(result.satisfiedRequirements.length, total);

    // Regenerate actions
    result.recommendedActions = generateRecommendedActions(result.missingRequirements);
  }

  return result;
}

// Re-export types and constants for convenience
export type { DealStageId, StageRequirement, RequirementContext };
export { DEAL_STAGES, STAGE_ORDER, getStageRequirements };
