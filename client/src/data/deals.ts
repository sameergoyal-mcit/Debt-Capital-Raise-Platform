import { differenceInDays, parseISO } from "date-fns";

export type DealStage = "Structuring" | "NDA" | "CIM" | "Marketing" | "IOI" | "Bookbuilding" | "Allocation" | "Docs" | "Signing" | "Funding" | "Closed" | "Paused";
export type DealStatus = "Active" | "Diligence" | "Closing" | "Closed" | "Paused" | "At Risk";
export type DealOutcome = "Funded" | "Pulled" | "Refinanced" | "Replaced" | "Other";

export interface Covenant {
  id: string;
  name: string;
  type: "Maintenance" | "Incurrence";
  threshold: number;
  unit: "x" | "%" | "$";
  proForma: number;
  notes: string;
}

export interface Deal {
  id: string;
  dealName: string;
  borrowerName: string;
  sector: string;
  instrument: string;
  facilityType: string;
  facilitySize: number;
  currency: "USD" | "EUR" | "GBP";
  stage: DealStage;
  status: DealStatus;
  targetSize: number;
  committed: number;
  committedPct: number;
  coverageRatio: number; // committed / target
  pricing: {
    benchmark: "SOFR" | "EURIBOR" | "SONIA";
    spreadLowBps: number;
    spreadHighBps: number;
    oid: number;
    feesPct: number;
  };
  covenants?: Covenant[];
  closeDate: string; // ISO date
  hardCloseDate?: string; // ISO date
  stageDueDates?: Partial<Record<DealStage, string>>;
  blockersCount?: number;
  updatedAt: string; // ISO date
  
  // Additional fields for Closed / On Hold
  closedDate?: string;
  holdReason?: string;
  holdSince?: string;
  reopenedCount?: number;
  lastStageBeforeHold?: DealStage;
  outcome?: DealOutcome;
}

export const mockDeals: Deal[] = [
  // Active / In-Process Deals (10)
  {
    id: "101",
    dealName: "Project Titan",
    borrowerName: "Titan Software Inc.",
    sector: "Enterprise SaaS",
    instrument: "Senior Secured Term Loan",
    facilityType: "First Lien",
    facilitySize: 45000000,
    currency: "USD",
    stage: "Docs",
    status: "Closing",
    targetSize: 45000000,
    committed: 45000000,
    committedPct: 100,
    coverageRatio: 1.0,
    pricing: { benchmark: "SOFR", spreadLowBps: 625, spreadHighBps: 650, oid: 98, feesPct: 2 },
    covenants: [
      { id: "c1", name: "Max Total Net Leverage", type: "Maintenance", threshold: 4.50, unit: "x", proForma: 4.25, notes: "Step down to 4.00x after 24 months" },
      { id: "c2", name: "Min Interest Coverage", type: "Maintenance", threshold: 2.50, unit: "x", proForma: 3.10, notes: "EBITDA / Cash Interest" },
      { id: "c3", name: "Max Capex", type: "Incurrence", threshold: 5000000, unit: "$", proForma: 2500000, notes: "Annual limit, carry forward 50%" },
      { id: "c4", name: "Min Liquidity", type: "Maintenance", threshold: 2000000, unit: "$", proForma: 4500000, notes: "Tested quarterly" }
    ],
    closeDate: "2025-06-30",
    hardCloseDate: "2025-07-15",
    blockersCount: 1,
    updatedAt: "2025-06-12",
  },
  {
    id: "102",
    dealName: "Helios Energy",
    borrowerName: "Helios Renewable Corp",
    sector: "Infrastructure",
    instrument: "Project Finance",
    facilityType: "Unitranche",
    facilitySize: 120000000,
    currency: "USD",
    stage: "Bookbuilding",
    status: "Active",
    targetSize: 120000000,
    committed: 85000000,
    committedPct: 70.8,
    coverageRatio: 0.71,
    pricing: { benchmark: "SOFR", spreadLowBps: 550, spreadHighBps: 575, oid: 99, feesPct: 1.5 },
    closeDate: "2025-07-15",
    hardCloseDate: "2025-07-30",
    blockersCount: 0,
    updatedAt: "2025-06-10",
  },
  {
    id: "103",
    dealName: "Apex Logistics",
    borrowerName: "Apex Global Transport",
    sector: "Transport",
    instrument: "Term Loan B",
    facilityType: "First Lien",
    facilitySize: 35000000,
    currency: "GBP",
    stage: "Marketing",
    status: "Active",
    targetSize: 35000000,
    committed: 10000000,
    committedPct: 28.5,
    coverageRatio: 0.29,
    pricing: { benchmark: "SONIA", spreadLowBps: 600, spreadHighBps: 650, oid: 98.5, feesPct: 2 },
    closeDate: "2025-08-01",
    hardCloseDate: "2025-08-15",
    blockersCount: 0,
    updatedAt: "2025-06-08",
  },
  {
    id: "104",
    dealName: "Quantum Health",
    borrowerName: "Quantum Care Systems",
    sector: "Healthcare",
    instrument: "Senior Secured",
    facilityType: "Unitranche",
    facilitySize: 60000000,
    currency: "USD",
    stage: "Allocation",
    status: "Diligence",
    targetSize: 60000000,
    committed: 60000000,
    committedPct: 100,
    coverageRatio: 1.0,
    pricing: { benchmark: "SOFR", spreadLowBps: 575, spreadHighBps: 600, oid: 99, feesPct: 1.75 },
    closeDate: "2025-07-05",
    hardCloseDate: "2025-07-20",
    blockersCount: 2,
    updatedAt: "2025-06-11",
  },
  {
    id: "105",
    dealName: "BlueSky Retail",
    borrowerName: "BlueSky Brands",
    sector: "Consumer",
    instrument: "ABL",
    facilityType: "Revolver",
    facilitySize: 28000000,
    currency: "USD",
    stage: "Structuring",
    status: "Active",
    targetSize: 28000000,
    committed: 0,
    committedPct: 0,
    coverageRatio: 0,
    pricing: { benchmark: "SOFR", spreadLowBps: 450, spreadHighBps: 500, oid: 100, feesPct: 1.0 },
    closeDate: "2025-09-15",
    hardCloseDate: "2025-10-01",
    blockersCount: 0,
    updatedAt: "2025-06-05",
  },
  {
    id: "106",
    dealName: "CyberGuard",
    borrowerName: "CyberGuard Security",
    sector: "TMT",
    instrument: "Recurring Revenue Loan",
    facilityType: "First Lien",
    facilitySize: 55000000,
    currency: "USD",
    stage: "IOI",
    status: "Active",
    targetSize: 55000000,
    committed: 15000000,
    committedPct: 27.2,
    coverageRatio: 0.27,
    pricing: { benchmark: "SOFR", spreadLowBps: 700, spreadHighBps: 750, oid: 98, feesPct: 2.5 },
    closeDate: "2025-08-20",
    hardCloseDate: "2025-09-01",
    blockersCount: 1,
    updatedAt: "2025-06-09",
  },
  {
    id: "107",
    dealName: "Nordic Wind",
    borrowerName: "Nordic Power Group",
    sector: "Infrastructure",
    instrument: "Green Bond",
    facilityType: "Senior Unsecured",
    facilitySize: 200000000,
    currency: "EUR",
    stage: "Marketing",
    status: "Active",
    targetSize: 200000000,
    committed: 45000000,
    committedPct: 22.5,
    coverageRatio: 0.23,
    pricing: { benchmark: "EURIBOR", spreadLowBps: 350, spreadHighBps: 400, oid: 99.5, feesPct: 1.25 },
    closeDate: "2025-10-01",
    hardCloseDate: "2025-10-15",
    blockersCount: 0,
    updatedAt: "2025-06-01",
  },
  {
    id: "108",
    dealName: "BioTech Innovations",
    borrowerName: "BTI Pharma",
    sector: "Healthcare",
    instrument: "Venture Debt",
    facilityType: "First Lien",
    facilitySize: 15000000,
    currency: "USD",
    stage: "Bookbuilding",
    status: "At Risk",
    targetSize: 15000000,
    committed: 4000000,
    committedPct: 26.6,
    coverageRatio: 0.27,
    pricing: { benchmark: "SOFR", spreadLowBps: 800, spreadHighBps: 850, oid: 98, feesPct: 3.0 },
    closeDate: "2025-07-25",
    hardCloseDate: "2025-06-25", // Intentionally close for risk calc
    blockersCount: 0,
    updatedAt: "2025-06-11",
  },
  {
    id: "109",
    dealName: "EduTech Solutions",
    borrowerName: "LearnFast Inc.",
    sector: "Education",
    instrument: "Mezzanine",
    facilityType: "Junior Capital",
    facilitySize: 25000000,
    currency: "USD",
    stage: "Docs",
    status: "At Risk",
    targetSize: 25000000,
    committed: 22000000,
    committedPct: 88,
    coverageRatio: 0.88,
    pricing: { benchmark: "SOFR", spreadLowBps: 1000, spreadHighBps: 1100, oid: 98, feesPct: 2.0 },
    closeDate: "2025-07-10",
    hardCloseDate: "2025-07-20",
    blockersCount: 4, // High blockers for risk calc
    updatedAt: "2025-06-12",
  },

  // Closed Deals (4)
  {
    id: "201",
    dealName: "Metro Fiber",
    borrowerName: "Metro Connect LLC",
    sector: "TMT",
    instrument: "Senior Secured",
    facilityType: "Unitranche",
    facilitySize: 80000000,
    currency: "USD",
    stage: "Closed",
    status: "Closed",
    targetSize: 80000000,
    committed: 80000000,
    committedPct: 100,
    coverageRatio: 1.0,
    pricing: { benchmark: "SOFR", spreadLowBps: 575, spreadHighBps: 575, oid: 99, feesPct: 2.0 },
    closeDate: "2025-04-15",
    closedDate: "2025-04-15",
    outcome: "Funded",
    updatedAt: "2025-04-15",
  },
  {
    id: "202",
    dealName: "AgriCorp",
    borrowerName: "National Agriculture Holdings",
    sector: "Industrials",
    instrument: "ABL",
    facilityType: "Revolver",
    facilitySize: 50000000,
    currency: "USD",
    stage: "Closed",
    status: "Closed",
    targetSize: 50000000,
    committed: 50000000,
    committedPct: 100,
    coverageRatio: 1.0,
    pricing: { benchmark: "SOFR", spreadLowBps: 400, spreadHighBps: 400, oid: 100, feesPct: 1.5 },
    closeDate: "2025-03-20",
    closedDate: "2025-03-20",
    outcome: "Funded",
    updatedAt: "2025-03-20",
  },
  {
    id: "203",
    dealName: "FinServe",
    borrowerName: "Financial Services Group",
    sector: "Financial Services",
    instrument: "Term Loan",
    facilityType: "Second Lien",
    facilitySize: 30000000,
    currency: "USD",
    stage: "Closed",
    status: "Closed",
    targetSize: 30000000,
    committed: 30000000,
    committedPct: 100,
    coverageRatio: 1.0,
    pricing: { benchmark: "SOFR", spreadLowBps: 900, spreadHighBps: 900, oid: 98, feesPct: 2.5 },
    closeDate: "2025-02-10",
    closedDate: "2025-02-10",
    outcome: "Refinanced",
    updatedAt: "2025-02-10",
  },
  {
    id: "204",
    dealName: "BuildRight",
    borrowerName: "Construction Partners",
    sector: "Industrials",
    instrument: "Equipment Finance",
    facilityType: "Lease",
    facilitySize: 10000000,
    currency: "USD",
    stage: "Closed",
    status: "Closed",
    targetSize: 10000000,
    committed: 10000000,
    committedPct: 100,
    coverageRatio: 1.0,
    pricing: { benchmark: "SOFR", spreadLowBps: 600, spreadHighBps: 600, oid: 100, feesPct: 1.0 },
    closeDate: "2025-01-30",
    closedDate: "2025-01-30",
    outcome: "Funded",
    updatedAt: "2025-01-30",
  },

  // On Hold / Paused Deals (3)
  {
    id: "301",
    dealName: "StreamLine Media",
    borrowerName: "StreamLine Entertainment",
    sector: "TMT",
    instrument: "Term Loan B",
    facilityType: "First Lien",
    facilitySize: 150000000,
    currency: "USD",
    stage: "Paused",
    status: "Paused",
    targetSize: 150000000,
    committed: 60000000,
    committedPct: 40,
    coverageRatio: 0.4,
    pricing: { benchmark: "SOFR", spreadLowBps: 500, spreadHighBps: 525, oid: 99, feesPct: 1.75 },
    closeDate: "2025-09-30",
    updatedAt: "2025-05-15",
    holdReason: "Pricing too wide",
    holdSince: "2025-05-20",
    lastStageBeforeHold: "Bookbuilding",
  },
  {
    id: "302",
    dealName: "GreenGro",
    borrowerName: "Organic Foods Co.",
    sector: "Consumer",
    instrument: "Senior Secured",
    facilityType: "Unitranche",
    facilitySize: 40000000,
    currency: "USD",
    stage: "Paused",
    status: "Paused",
    targetSize: 40000000,
    committed: 0,
    committedPct: 0,
    coverageRatio: 0,
    pricing: { benchmark: "SOFR", spreadLowBps: 650, spreadHighBps: 700, oid: 98, feesPct: 2.0 },
    closeDate: "2025-08-15",
    updatedAt: "2025-05-10",
    holdReason: "Company financials restatement",
    holdSince: "2025-05-12",
    lastStageBeforeHold: "Allocation",
  },
  {
    id: "303",
    dealName: "AutoParts Inc",
    borrowerName: "API Holdings",
    sector: "Automotive",
    instrument: "ABL",
    facilityType: "Revolver",
    facilitySize: 75000000,
    currency: "USD",
    stage: "Paused",
    status: "Paused",
    targetSize: 75000000,
    committed: 0,
    committedPct: 0,
    coverageRatio: 0,
    pricing: { benchmark: "SOFR", spreadLowBps: 475, spreadHighBps: 525, oid: 99, feesPct: 1.5 },
    closeDate: "2025-10-15",
    updatedAt: "2025-04-20",
    holdReason: "Sponsor paused process",
    holdSince: "2025-04-25",
    lastStageBeforeHold: "Marketing",
  },
];

export function computeDealRisk(deal: Deal): { label: string; color: string } {
  // Default to Normal
  let label = "Normal";
  let color = "bg-emerald-100 text-emerald-700 border-emerald-200";

  // Check hard close date
  const daysToHardClose = deal.hardCloseDate 
    ? differenceInDays(parseISO(deal.hardCloseDate), new Date()) 
    : 30;

  // Rule 1: At Risk if coverageRatio < 0.6 AND daysToHardClose <= 14
  if (deal.coverageRatio < 0.6 && daysToHardClose <= 14) {
    label = "At Risk";
    color = "bg-red-100 text-red-700 border-red-200";
    return { label, color };
  }

  // Rule 2: At Risk if blockersCount >= 3 AND stage in Docs/Signing
  if ((deal.blockersCount || 0) >= 3 && ["Docs", "Signing"].includes(deal.stage)) {
    label = "At Risk";
    color = "bg-red-100 text-red-700 border-red-200";
    return { label, color };
  }
  
  // Warning state (intermediate)
  if (daysToHardClose <= 7 && deal.coverageRatio < 0.9) {
    label = "Warning";
    color = "bg-amber-100 text-amber-700 border-amber-200";
  }

  return { label, color };
}
