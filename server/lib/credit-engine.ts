export interface DealAssumptions {
  initialDebt: number;
  ebitda: number;
  interestRate: number;
  mandatoryAmort: number;
  cashSweepPercent: number;
}

export interface CreditSummary {
  currentLeverage: number;
  projectedLeverage: number;
  covenantHeadroom: number;
  pricingPressure: "Tightening" | "Stable" | "Widening";
  debtServiceCoverage: number;
}

export function calculateLeverage(netDebt: number, ebitda: number): number {
  if (ebitda === 0) return 0;
  return netDebt / ebitda;
}

export function calculateCovenantHeadroom(
  currentLeverage: number,
  covenantThreshold: number
): number {
  return ((covenantThreshold - currentLeverage) / covenantThreshold) * 100;
}

export function calculateDebtServiceCoverage(
  ebitda: number,
  interestExpense: number
): number {
  if (interestExpense === 0) return 999;
  return ebitda / interestExpense;
}

export function determinePricingPressure(
  committed: number,
  target: number,
  spreadDistribution?: number[]
): "Tightening" | "Stable" | "Widening" {
  const coverageRatio = committed / target;
  
  if (coverageRatio >= 1.2) return "Tightening";
  if (coverageRatio >= 0.9) return "Stable";
  return "Widening";
}

export function runCreditAnalysis(assumptions: DealAssumptions, deal: {
  committed: number;
  targetSize: number;
  covenantThreshold?: number;
}): CreditSummary {
  const { initialDebt, ebitda, interestRate, mandatoryAmort, cashSweepPercent } = assumptions;
  
  // Current leverage
  const currentLeverage = calculateLeverage(initialDebt, ebitda);
  
  // Simple 1-year projection
  const interestExpense = initialDebt * (interestRate / 100);
  const freeCashFlow = ebitda - interestExpense;
  const cashSweep = Math.max(0, freeCashFlow - mandatoryAmort) * (cashSweepPercent / 100);
  const totalPaydown = mandatoryAmort + cashSweep;
  const projectedDebt = Math.max(0, initialDebt - totalPaydown);
  const projectedEbitda = ebitda * 1.05; // Assume 5% growth
  const projectedLeverage = calculateLeverage(projectedDebt, projectedEbitda);
  
  // Covenant headroom (assume 5.5x threshold if not provided)
  const covenantThreshold = deal.covenantThreshold || 5.5;
  const covenantHeadroom = calculateCovenantHeadroom(currentLeverage, covenantThreshold);
  
  // Pricing pressure
  const pricingPressure = determinePricingPressure(deal.committed, deal.targetSize);
  
  // Debt service coverage
  const debtServiceCoverage = calculateDebtServiceCoverage(ebitda, interestExpense);
  
  return {
    currentLeverage: Math.round(currentLeverage * 100) / 100,
    projectedLeverage: Math.round(projectedLeverage * 100) / 100,
    covenantHeadroom: Math.round(covenantHeadroom * 10) / 10,
    pricingPressure,
    debtServiceCoverage: Math.round(debtServiceCoverage * 100) / 100,
  };
}
