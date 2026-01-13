/**
 * Utility functions for deal data transformation and computation.
 * Bridges the gap between server Deal schema and UI display needs.
 */

import { differenceInDays, parseISO } from "date-fns";
import type { Deal } from "@shared/schema";

// Status mapping from server to display
const STATUS_DISPLAY_MAP: Record<string, string> = {
  rfp_stage: "Pre-Launch",
  live_syndication: "Active",
  closed: "Closed",
  paused: "Paused",
};

// Stage display names
const STAGE_DISPLAY_MAP: Record<string, string> = {
  "Pre-Launch": "Pre-Launch",
  Structuring: "Structuring",
  Marketing: "Marketing",
  Documentation: "Documentation",
  Closing: "Closing",
};

export interface EnrichedDeal extends Deal {
  // Computed fields
  committedPct: number;
  coverageRatio: number;
  displayStatus: string;
  displayStage: string;
  pricing: {
    benchmark: string;
    spreadLowBps: number;
    spreadHighBps: number;
    oid: number;
    feesPct: number;
  };
  // Optional fields for on-hold/closed deals (these would come from server if implemented)
  holdReason?: string;
  holdSince?: string;
  lastStageBeforeHold?: string;
  closedDate?: string;
  outcome?: string;
}

/**
 * Enriches a server Deal with computed fields for display
 */
export function enrichDeal(deal: Deal): EnrichedDeal {
  const facilitySize = parseFloat(deal.facilitySize) || 0;
  const committed = parseFloat(deal.committed) || 0;
  const targetSize = parseFloat(deal.targetSize) || 0;

  const committedPct = targetSize > 0 ? (committed / targetSize) * 100 : 0;
  const coverageRatio = targetSize > 0 ? committed / targetSize : 0;

  // Map server status to display status
  let displayStatus = STATUS_DISPLAY_MAP[deal.status] || deal.status;

  // Override based on coverage or other conditions
  if (deal.status === "live_syndication") {
    if (committedPct >= 100) {
      displayStatus = "Closing";
    } else if (committedPct >= 50) {
      displayStatus = "Diligence";
    }
  }

  return {
    ...deal,
    committedPct,
    coverageRatio,
    displayStatus,
    displayStage: STAGE_DISPLAY_MAP[deal.stage] || deal.stage,
    pricing: {
      benchmark: deal.pricingBenchmark,
      spreadLowBps: deal.spreadLowBps,
      spreadHighBps: deal.spreadHighBps,
      oid: parseFloat(deal.oid),
      feesPct: parseFloat(deal.feesPct),
    },
  };
}

/**
 * Computes deal risk level based on coverage and timeline
 */
export function computeDealRisk(deal: EnrichedDeal): { label: string; color: string } {
  let label = "Normal";
  let color = "bg-emerald-100 text-emerald-700 border-emerald-200";

  const daysToHardClose = deal.hardCloseDate
    ? differenceInDays(parseISO(deal.hardCloseDate), new Date())
    : deal.closeDate
      ? differenceInDays(parseISO(deal.closeDate), new Date())
      : 30;

  // Rule 1: At Risk if coverageRatio < 0.6 AND daysToHardClose <= 14
  if (deal.coverageRatio < 0.6 && daysToHardClose <= 14) {
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

/**
 * Maps internal status values to user-facing display values
 */
export function getStatusDisplay(status: string): string {
  return STATUS_DISPLAY_MAP[status] || status;
}

/**
 * Formats facility size for display
 */
export function formatFacilitySize(facilitySize: string | number, currency = "USD"): string {
  const size = typeof facilitySize === "string" ? parseFloat(facilitySize) : facilitySize;
  if (isNaN(size)) return "N/A";

  if (size >= 1000000) {
    return `${(size / 1000000).toFixed(1)}M ${currency}`;
  } else if (size >= 1000) {
    return `${(size / 1000).toFixed(0)}K ${currency}`;
  }
  return `${size} ${currency}`;
}

/**
 * Gets unique sectors from a list of deals
 */
export function getUniqueSectors(deals: Deal[]): string[] {
  return Array.from(new Set(deals.map(d => d.sector))).sort();
}

/**
 * Filters and sorts deals based on criteria
 */
export function filterDeals(
  deals: EnrichedDeal[],
  options: {
    searchQuery?: string;
    statusFilter?: string;
    sectorFilter?: string;
    dealAccess?: string[];
    isInvestor?: boolean;
  }
): EnrichedDeal[] {
  const { searchQuery = "", statusFilter = "all", sectorFilter = "all", dealAccess, isInvestor } = options;

  return deals.filter(deal => {
    // Permission filter for investors
    if (isInvestor && dealAccess && !dealAccess.includes(deal.id)) {
      return false;
    }

    const matchesSearch =
      deal.dealName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      deal.borrowerName.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === "all" || deal.displayStatus === statusFilter || deal.status === statusFilter;
    const matchesSector = sectorFilter === "all" || deal.sector === sectorFilter;

    return matchesSearch && matchesStatus && matchesSector;
  });
}

/**
 * Sorts deals by various criteria
 */
export function sortDeals(deals: EnrichedDeal[], sortBy: string): EnrichedDeal[] {
  return [...deals].sort((a, b) => {
    switch (sortBy) {
      case "closeDate":
        return new Date(a.closeDate).getTime() - new Date(b.closeDate).getTime();
      case "committed":
        return b.committedPct - a.committedPct;
      case "size":
        return parseFloat(b.facilitySize) - parseFloat(a.facilitySize);
      case "closedDate":
        if (a.closedDate && b.closedDate) {
          return new Date(b.closedDate).getTime() - new Date(a.closedDate).getTime();
        }
        return 0;
      case "updated":
      default:
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    }
  });
}

/**
 * Categorizes deals into active, on-hold, and closed
 */
export function categorizeDeals(deals: EnrichedDeal[]) {
  const activeDeals = deals.filter(d =>
    ["Active", "Diligence", "Closing", "At Risk", "Pre-Launch"].includes(d.displayStatus) ||
    d.status === "live_syndication" || d.status === "rfp_stage"
  );
  const onHoldDeals = deals.filter(d =>
    d.displayStatus === "Paused" || d.status === "paused"
  );
  const closedDeals = deals.filter(d =>
    d.displayStatus === "Closed" || d.status === "closed"
  );

  return { activeDeals, onHoldDeals, closedDeals };
}
