import { differenceInDays, parseISO } from "date-fns";

export type LenderType = "Direct Lender" | "CLO" | "Insurance" | "Bank" | "BDC" | "Credit Fund";

export type LenderStatus = "invited" | "interested" | "ioi_submitted" | "soft_circled" | "firm_committed" | "allocated" | "declined";

// Status display labels for UI
export const LenderStatusLabels: Record<LenderStatus, string> = {
  invited: "Invited",
  interested: "Interested",
  ioi_submitted: "IOI Submitted",
  soft_circled: "Soft Circled",
  firm_committed: "Firm Committed",
  allocated: "Allocated",
  declined: "Declined",
};

// Status progression order (for sorting and filtering)
export const LenderStatusOrder: LenderStatus[] = [
  "invited",
  "interested",
  "ioi_submitted",
  "soft_circled",
  "firm_committed",
  "allocated",
  "declined",
];

export interface Interaction {
  id: string;
  date: string;
  type: "Email" | "Call" | "Meeting" | "VDR Access";
  note: string;
  user: string;
}

export interface IOI {
  lenderId: string;
  submittedAt: string; // ISO date
  ticketMin: number;
  ticketMax: number;
  pricingBps: number;
  conditions: string;
  isFirm: boolean;
  firmAt?: string; // ISO date
}

export interface Lender {
  id: string;
  name: string;
  type: LenderType;
  status: LenderStatus;
  ticketMin: number;
  ticketMax: number;
  pricingBps?: number; // e.g., 650 for S+650
  lastContactAt: string; // ISO date
  owner: string;
  nextAction?: {
    type: "Follow-up" | "Send LP" | "Schedule Call" | "Closing Docs";
    dueDate: string; // ISO date
  };
  notes: string;
  interactions: Interaction[];
  seriousnessScore: number; // Computed 0-100
  ioi?: IOI;
}

export function computeSeriousnessScore(lender: Lender): number {
  let score = 0;

  // Base score from status
  switch (lender.status) {
    case "allocated":
      score += 40;
      break;
    case "firm_committed":
      score += 35;
      break;
    case "soft_circled":
      score += 25;
      break;
    case "ioi_submitted":
      score += 20;
      break;
    case "interested":
      score += 10;
      break;
    case "invited":
      score += 5;
      break;
    case "declined":
      return 0; // Immediate 0
  }

  // Recency penalty
  const daysSinceContact = differenceInDays(new Date(), parseISO(lender.lastContactAt));
  if (daysSinceContact > 7) {
    score -= 10;
  } else if (daysSinceContact <= 2) {
    score += 5;
  }

  // Activity bonus
  if (lender.interactions.length > 5) score += 5;
  if (lender.pricingBps) score += 10; // They gave pricing feedback

  return Math.max(0, Math.min(100, score));
}

export const mockLenders: Lender[] = [
  {
    id: "1",
    name: "BlackRock Credit",
    type: "Direct Lender" as LenderType,
    status: "allocated" as LenderStatus,
    ticketMin: 10000000,
    ticketMax: 25000000,
    pricingBps: 625,
    lastContactAt: new Date().toISOString(),
    owner: "Sarah Jenkins",
    notes: "Strong interest in the recurring revenue base. Confirmed $15M allocation.",
    interactions: [
      { id: "i1", date: new Date().toISOString(), type: "Call" as const, note: "Confirmed allocation and pricing.", user: "Sarah Jenkins" },
      { id: "i2", date: new Date(Date.now() - 86400000 * 3).toISOString(), type: "Email" as const, note: "Sent final term sheet.", user: "Michael Ross" }
    ],
    seriousnessScore: 0, // Calculated at runtime
    ioi: {
      lenderId: "1",
      submittedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
      ticketMin: 15000000,
      ticketMax: 15000000,
      pricingBps: 625,
      conditions: "Subject to final legal review.",
      isFirm: true,
      firmAt: new Date().toISOString()
    }
  },
  {
    id: "2",
    name: "Apollo Global",
    type: "Direct Lender" as LenderType,
    status: "soft_circled" as LenderStatus,
    ticketMin: 15000000,
    ticketMax: 30000000,
    pricingBps: 650,
    lastContactAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    owner: "Sarah Jenkins",
    nextAction: { type: "Schedule Call" as const, dueDate: new Date(Date.now() + 86400000).toISOString() },
    notes: "Reviewing legal structure. Questions on IP security.",
    interactions: [
      { id: "i3", date: new Date(Date.now() - 86400000 * 2).toISOString(), type: "Email" as const, note: "Received questions list.", user: "Sarah Jenkins" }
    ],
    seriousnessScore: 0,
    ioi: {
      lenderId: "2",
      submittedAt: new Date(Date.now() - 86400000 * 5).toISOString(),
      ticketMin: 15000000,
      ticketMax: 30000000,
      pricingBps: 650,
      conditions: "Need IP diligence call.",
      isFirm: false
    }
  },
  {
    id: "3",
    name: "Oak Hill Advisors",
    type: "Credit Fund" as LenderType,
    status: "interested" as LenderStatus,
    ticketMin: 5000000,
    ticketMax: 15000000,
    lastContactAt: new Date(Date.now() - 86400000 * 5).toISOString(),
    owner: "Michael Ross",
    notes: "Downloaded LP yesterday. Follow up tomorrow.",
    interactions: [
      { id: "i4", date: new Date(Date.now() - 86400000 * 5).toISOString(), type: "VDR Access" as const, note: "User accessed Lender Presentation.", user: "System" }
    ],
    seriousnessScore: 0,
  },
  {
    id: "4",
    name: "Barings",
    type: "Credit Fund" as LenderType,
    status: "interested" as LenderStatus,
    ticketMin: 5000000,
    ticketMax: 10000000,
    lastContactAt: new Date(Date.now() - 86400000 * 8).toISOString(),
    owner: "Michael Ross",
    notes: "Signed NDA, reviewing materials.",
    interactions: [
      { id: "i5", date: new Date(Date.now() - 86400000 * 8).toISOString(), type: "Email" as const, note: "NDA Signed returned.", user: "Michael Ross" }
    ],
    seriousnessScore: 0,
  },
  {
    id: "5",
    name: "Golub Capital",
    type: "BDC" as LenderType,
    status: "firm_committed" as LenderStatus,
    ticketMin: 10000000,
    ticketMax: 20000000,
    pricingBps: 625,
    lastContactAt: new Date(Date.now() - 86400000).toISOString(),
    owner: "Sarah Jenkins",
    notes: "Solid partner. Cleared IC.",
    interactions: [],
    seriousnessScore: 0,
  },
  {
    id: "6",
    name: "Ares Management",
    type: "Direct Lender" as LenderType,
    status: "ioi_submitted" as LenderStatus,
    ticketMin: 20000000,
    ticketMax: 50000000,
    pricingBps: 600,
    lastContactAt: new Date(Date.now() - 86400000 * 4).toISOString(),
    owner: "Sarah Jenkins",
    interactions: [],
    notes: "",
    seriousnessScore: 0,
  },
  {
    id: "7",
    name: "KKR Credit",
    type: "CLO" as LenderType,
    status: "declined" as LenderStatus,
    ticketMin: 0,
    ticketMax: 0,
    lastContactAt: new Date(Date.now() - 86400000 * 10).toISOString(),
    owner: "Michael Ross",
    notes: "Pass on sector.",
    interactions: [],
    seriousnessScore: 0,
  },
  {
    id: "8",
    name: "HPS Investment Partners",
    type: "Credit Fund" as LenderType,
    status: "ioi_submitted" as LenderStatus,
    ticketMin: 10000000,
    ticketMax: 20000000,
    lastContactAt: new Date(Date.now() - 86400000 * 1).toISOString(),
    owner: "Sarah Jenkins",
    notes: "",
    interactions: [],
    seriousnessScore: 0,
  },
  {
    id: "9",
    name: "Sixth Street",
    type: "Insurance" as LenderType,
    status: "invited" as LenderStatus,
    ticketMin: 15000000,
    ticketMax: 30000000,
    lastContactAt: new Date(Date.now() - 86400000 * 6).toISOString(),
    owner: "Michael Ross",
    notes: "",
    interactions: [],
    seriousnessScore: 0,
  },
  {
    id: "10",
    name: "JPMorgan",
    type: "Bank" as LenderType,
    status: "invited" as LenderStatus,
    ticketMin: 5000000,
    ticketMax: 15000000,
    lastContactAt: new Date(Date.now() - 86400000 * 15).toISOString(),
    owner: "Sarah Jenkins",
    notes: "",
    interactions: [],
    seriousnessScore: 0,
  }
].map(l => ({ ...l, seriousnessScore: computeSeriousnessScore(l as Lender) }));
