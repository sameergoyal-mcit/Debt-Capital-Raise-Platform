// Debt-focused timeline milestone data model

export type MilestoneStatus = "not_started" | "in_progress" | "completed" | "locked";

export type TimelinePhase = "Preparation" | "Marketing" | "Bookbuilding" | "Documentation & Closing";

export interface Milestone {
  id: string;
  label: string;
  phase: TimelinePhase;
  status: MilestoneStatus;
  completedAt: string | null;
  completedBy: string | null;
  locked: boolean;
  optional?: boolean;
}

export interface DealTimeline {
  dealId: string;
  milestones: Milestone[];
  updatedAt: string;
}

// Define the canonical list of debt-focused milestones
export const defaultMilestones: Omit<Milestone, "status" | "completedAt" | "completedBy" | "locked">[] = [
  // Preparation Phase
  { id: "financial_model_drafting", label: "Financial Model Drafting", phase: "Preparation" },
  { id: "financial_model_finalized", label: "Financial Model Finalized", phase: "Preparation" },
  { id: "lender_presentation_drafting", label: "Lender Presentation Drafting", phase: "Preparation" },
  { id: "lender_presentation_finalized", label: "Lender Presentation Finalized", phase: "Preparation" },

  // Marketing Phase
  { id: "deal_launch", label: "Deal Launch", phase: "Marketing" },
  { id: "nda_distribution", label: "NDA Distribution", phase: "Marketing" },
  { id: "initial_terms_requested", label: "Initial Terms Requested", phase: "Marketing" },
  { id: "initial_terms_received", label: "Initial Terms Received", phase: "Marketing" },

  // Bookbuilding Phase
  { id: "revised_terms_requested", label: "Revised Terms Requested", phase: "Bookbuilding", optional: true },
  { id: "commitments_requested", label: "Commitments Requested", phase: "Bookbuilding" },
  { id: "commitments_received", label: "Commitments Received", phase: "Bookbuilding" },
  { id: "allocation_set", label: "Allocation Set", phase: "Bookbuilding" },

  // Documentation & Closing Phase
  { id: "documentation_circulated", label: "Documentation Circulated", phase: "Documentation & Closing" },
  { id: "lender_markups_received", label: "Lender Markups Received", phase: "Documentation & Closing" },
  { id: "docs_agreed", label: "Docs Agreed", phase: "Documentation & Closing" },
  { id: "funding_closing", label: "Funding / Closing", phase: "Documentation & Closing" },
];

// Validation rules for milestones - returns error message or null if valid
export type ValidationResult = { valid: boolean; message: string | null };

export interface ValidationContext {
  hasFinancialModelInVDR: boolean;
  hasPublishedFinancialModel: boolean;
  hasLenderPresentationInVDR: boolean;
  hasLenderMarkupUploaded: boolean;
  getMilestoneStatus: (milestoneId: string) => MilestoneStatus;
  isMilestoneLocked: (milestoneId: string) => boolean;
}

export const milestoneValidationRules: Record<string, (ctx: ValidationContext) => ValidationResult> = {
  // Financial Model Finalized: Must have FM in VDR or published via app
  financial_model_finalized: (ctx) => {
    if (!ctx.hasFinancialModelInVDR && !ctx.hasPublishedFinancialModel) {
      return {
        valid: false,
        message: "You must upload or publish the Financial Model before finalizing this milestone."
      };
    }
    return { valid: true, message: null };
  },

  // Lender Presentation Finalized: Must have LP in VDR
  lender_presentation_finalized: (ctx) => {
    if (!ctx.hasLenderPresentationInVDR) {
      return {
        valid: false,
        message: "You must upload the Lender Presentation to the Data Room before finalizing this milestone."
      };
    }
    return { valid: true, message: null };
  },

  // Initial Terms Requested: Deal Launch must be completed
  initial_terms_requested: (ctx) => {
    const dealLaunchStatus = ctx.getMilestoneStatus("deal_launch");
    if (dealLaunchStatus !== "completed" && dealLaunchStatus !== "locked") {
      return {
        valid: false,
        message: "Deal Launch must be completed before requesting Initial Terms."
      };
    }
    return { valid: true, message: null };
  },

  // Commitments Requested: Initial Terms Received must be completed
  commitments_requested: (ctx) => {
    const initialTermsStatus = ctx.getMilestoneStatus("initial_terms_received");
    if (initialTermsStatus !== "completed" && initialTermsStatus !== "locked") {
      return {
        valid: false,
        message: "Initial Terms Received must be completed before requesting Commitments."
      };
    }
    return { valid: true, message: null };
  },

  // Docs Agreed: Must have at least one lender markup uploaded
  docs_agreed: (ctx) => {
    if (!ctx.hasLenderMarkupUploaded) {
      return {
        valid: false,
        message: "At least one lender markup must be uploaded before agreeing on docs."
      };
    }
    return { valid: true, message: null };
  },

  // Funding / Closing: Docs Agreed must be locked
  funding_closing: (ctx) => {
    if (!ctx.isMilestoneLocked("docs_agreed")) {
      return {
        valid: false,
        message: "Docs Agreed must be locked before completing Funding / Closing."
      };
    }
    return { valid: true, message: null };
  },
};

// Create initial timeline for a deal
export function createInitialTimeline(dealId: string): DealTimeline {
  return {
    dealId,
    milestones: defaultMilestones.map(m => ({
      ...m,
      status: "not_started" as MilestoneStatus,
      completedAt: null,
      completedBy: null,
      locked: false,
    })),
    updatedAt: new Date().toISOString(),
  };
}

// Storage for deal timelines (in-memory mock, in production would be DB)
const dealTimelineStore: Map<string, DealTimeline> = new Map();

// Initialize with sample data for existing deals
function initializeSampleTimelines() {
  // Deal 101 - Project Titan - in Signing stage
  const deal101Timeline = createInitialTimeline("101");
  deal101Timeline.milestones = deal101Timeline.milestones.map(m => {
    if (["financial_model_drafting", "financial_model_finalized", "lender_presentation_drafting",
         "lender_presentation_finalized", "deal_launch", "nda_distribution", "initial_terms_requested",
         "initial_terms_received", "commitments_requested", "commitments_received", "allocation_set"].includes(m.id)) {
      return { ...m, status: "locked" as MilestoneStatus, completedAt: "2025-06-10T10:00:00Z", completedBy: "issuer@example.com", locked: true };
    }
    if (m.id === "documentation_circulated") {
      return { ...m, status: "completed" as MilestoneStatus, completedAt: "2025-06-12T14:00:00Z", completedBy: "issuer@example.com", locked: false };
    }
    if (m.id === "lender_markups_received") {
      return { ...m, status: "in_progress" as MilestoneStatus };
    }
    return m;
  });
  dealTimelineStore.set("101", deal101Timeline);

  // Deal 102 - Helios Energy - in IOI stage
  const deal102Timeline = createInitialTimeline("102");
  deal102Timeline.milestones = deal102Timeline.milestones.map(m => {
    if (["financial_model_drafting", "financial_model_finalized", "lender_presentation_drafting",
         "lender_presentation_finalized", "deal_launch", "nda_distribution"].includes(m.id)) {
      return { ...m, status: "locked" as MilestoneStatus, completedAt: "2025-06-05T10:00:00Z", completedBy: "issuer@example.com", locked: true };
    }
    if (m.id === "initial_terms_requested") {
      return { ...m, status: "completed" as MilestoneStatus, completedAt: "2025-06-08T10:00:00Z", completedBy: "issuer@example.com", locked: false };
    }
    if (m.id === "initial_terms_received") {
      return { ...m, status: "in_progress" as MilestoneStatus };
    }
    return m;
  });
  dealTimelineStore.set("102", deal102Timeline);

  // Deal 103 - Apex Logistics - in Lender Presentation stage
  const deal103Timeline = createInitialTimeline("103");
  deal103Timeline.milestones = deal103Timeline.milestones.map(m => {
    if (["financial_model_drafting", "financial_model_finalized"].includes(m.id)) {
      return { ...m, status: "locked" as MilestoneStatus, completedAt: "2025-06-01T10:00:00Z", completedBy: "issuer@example.com", locked: true };
    }
    if (m.id === "lender_presentation_drafting") {
      return { ...m, status: "completed" as MilestoneStatus, completedAt: "2025-06-05T10:00:00Z", completedBy: "issuer@example.com", locked: false };
    }
    if (m.id === "lender_presentation_finalized") {
      return { ...m, status: "in_progress" as MilestoneStatus };
    }
    return m;
  });
  dealTimelineStore.set("103", deal103Timeline);
}

// Initialize sample data
initializeSampleTimelines();

// Get timeline for a deal
export function getDealTimeline(dealId: string): DealTimeline {
  const existing = dealTimelineStore.get(dealId);
  if (existing) return existing;

  // Create new timeline for unknown deals
  const newTimeline = createInitialTimeline(dealId);
  dealTimelineStore.set(dealId, newTimeline);
  return newTimeline;
}

// Update a single milestone
export function updateMilestone(
  dealId: string,
  milestoneId: string,
  updates: Partial<Pick<Milestone, "status" | "completedAt" | "completedBy" | "locked">>
): DealTimeline | null {
  const timeline = getDealTimeline(dealId);
  const milestoneIndex = timeline.milestones.findIndex(m => m.id === milestoneId);

  if (milestoneIndex === -1) return null;

  timeline.milestones[milestoneIndex] = {
    ...timeline.milestones[milestoneIndex],
    ...updates,
  };
  timeline.updatedAt = new Date().toISOString();

  dealTimelineStore.set(dealId, timeline);
  return timeline;
}

// Mark a milestone as complete
export function completeMilestone(dealId: string, milestoneId: string, userId: string): DealTimeline | null {
  return updateMilestone(dealId, milestoneId, {
    status: "completed",
    completedAt: new Date().toISOString(),
    completedBy: userId,
  });
}

// Lock a milestone
export function lockMilestone(dealId: string, milestoneId: string): DealTimeline | null {
  return updateMilestone(dealId, milestoneId, {
    status: "locked",
    locked: true,
  });
}

// Get milestone progress summary
export function getTimelineProgress(dealId: string): { completed: number; total: number; percentage: number } {
  const timeline = getDealTimeline(dealId);
  const nonOptionalMilestones = timeline.milestones.filter(m => !m.optional);
  const completedOrLocked = nonOptionalMilestones.filter(m => m.status === "completed" || m.status === "locked");

  return {
    completed: completedOrLocked.length,
    total: nonOptionalMilestones.length,
    percentage: Math.round((completedOrLocked.length / nonOptionalMilestones.length) * 100),
  };
}

// Auto-mark milestones based on actions
export function autoMarkMilestone(dealId: string, trigger: "financial_model_published" | "lender_presentation_uploaded"): DealTimeline | null {
  const timeline = getDealTimeline(dealId);

  if (trigger === "financial_model_published") {
    const milestone = timeline.milestones.find(m => m.id === "financial_model_drafting");
    if (milestone && milestone.status === "not_started") {
      return updateMilestone(dealId, "financial_model_drafting", {
        status: "completed",
        completedAt: new Date().toISOString(),
        completedBy: "system",
      });
    }
  }

  if (trigger === "lender_presentation_uploaded") {
    const milestone = timeline.milestones.find(m => m.id === "lender_presentation_drafting");
    if (milestone && milestone.status === "not_started") {
      return updateMilestone(dealId, "lender_presentation_drafting", {
        status: "completed",
        completedAt: new Date().toISOString(),
        completedBy: "system",
      });
    }
  }

  return timeline;
}

// Group milestones by phase
export function getMilestonesByPhase(timeline: DealTimeline): Record<TimelinePhase, Milestone[]> {
  const phases: TimelinePhase[] = ["Preparation", "Marketing", "Bookbuilding", "Documentation & Closing"];
  const result: Record<TimelinePhase, Milestone[]> = {
    "Preparation": [],
    "Marketing": [],
    "Bookbuilding": [],
    "Documentation & Closing": [],
  };

  for (const phase of phases) {
    result[phase] = timeline.milestones.filter(m => m.phase === phase);
  }

  return result;
}
