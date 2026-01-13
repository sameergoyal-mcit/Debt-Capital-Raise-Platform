/**
 * Deal Blockers Selector
 * Computes actionable blockers from deal stage requirements
 */

import {
  getDealStageResultForRole,
  getDealStageResultFromDataForRole,
  StageContextInput,
  StageResult,
} from "./deal-stage-engine";

export type BlockerSeverity = "warning" | "critical";

export interface DealBlocker {
  id: string;
  label: string;
  count: number;
  severity: BlockerSeverity;
  href: string;
}

export interface GetDealBlockersParams {
  dealId: string;
  role: "Bookrunner" | "Issuer" | "Investor";
  lenderId?: string;
  data?: StageContextInput;
}

/**
 * Compute all potential blockers for a deal based on stage requirements
 * Now accepts optional data parameter to avoid mock data lookups
 */
export function getDealBlockers({ dealId, role, lenderId, data }: GetDealBlockersParams): DealBlocker[] {
  // Get stage result - use data if provided, otherwise fall back to deprecated method
  let stageResult: StageResult;
  if (data) {
    stageResult = getDealStageResultFromDataForRole(data, role);
  } else {
    // Deprecated path - returns empty result since mock data is removed
    stageResult = getDealStageResultForRole(dealId, role);
  }

  // Convert missing requirements to blockers
  const blockers: DealBlocker[] = stageResult.missingRequirements.map(req => ({
    id: req.id,
    label: req.label,
    count: 1,
    severity: req.severity,
    href: req.resolveHref(dealId)
  }));

  // Sort by severity (critical first)
  return blockers.sort((a, b) => {
    if (a.severity === "critical" && b.severity === "warning") return -1;
    if (a.severity === "warning" && b.severity === "critical") return 1;
    return 0;
  });
}

/**
 * Get blockers directly from provided data
 * This is the new preferred method
 */
export function getDealBlockersFromData(
  data: StageContextInput,
  role: "Bookrunner" | "Issuer" | "Investor"
): DealBlocker[] {
  const dealId = String(data.deal.id);
  return getDealBlockers({ dealId, role, data });
}

/**
 * Get blocker counts by category for summary display
 */
export function getBlockerSummary(params: GetDealBlockersParams): {
  total: number;
  critical: number;
  warning: number;
} {
  const blockers = getDealBlockers(params);

  return {
    total: blockers.length,
    critical: blockers.filter(b => b.severity === "critical").length,
    warning: blockers.filter(b => b.severity === "warning").length
  };
}
