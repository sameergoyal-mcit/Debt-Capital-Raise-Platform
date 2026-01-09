export interface CreditModelAssumptions {
  revenue: number;
  ebitdaMargin: number;
  growthPercent: number;
  taxRate: number;
  capexPercent: number;
  interestRate: number;
  amortizationPercent: number;
  initialDebt: number;
  cashSweepPercent?: number;
}

export interface YearProjection {
  year: number;
  revenue: number;
  ebitda: number;
  interest: number;
  taxes: number;
  capex: number;
  fcf: number;
  mandatoryAmort: number;
  cashSweep: number;
  totalPaydown: number;
  beginningDebt: number;
  endingDebt: number;
  leverageRatio: number;
}

export interface CreditModelResult {
  projections: YearProjection[];
  summary: {
    totalPaydown: number;
    paydownPercent: number;
    exitLeverage: number;
    avgDscr: number;
  };
}

export function runCreditModel(assumptions: CreditModelAssumptions): CreditModelResult {
  const {
    revenue,
    ebitdaMargin,
    growthPercent,
    taxRate,
    capexPercent,
    interestRate,
    amortizationPercent,
    initialDebt,
    cashSweepPercent = 50,
  } = assumptions;

  const projections: YearProjection[] = [];
  let currentDebt = initialDebt;

  for (let year = 1; year <= 5; year++) {
    const beginningDebt = currentDebt;
    
    // Revenue with growth
    const yearRevenue = revenue * Math.pow(1 + growthPercent / 100, year - 1);
    
    // EBITDA
    const ebitda = yearRevenue * (ebitdaMargin / 100);
    
    // Interest expense
    const interest = beginningDebt * (interestRate / 100);
    
    // Pre-tax income (simplified)
    const preTaxIncome = ebitda - interest;
    
    // Taxes
    const taxes = Math.max(0, preTaxIncome * (taxRate / 100));
    
    // CapEx
    const capex = yearRevenue * (capexPercent / 100);
    
    // Free Cash Flow
    const fcf = ebitda - interest - taxes - capex;
    
    // Mandatory amortization
    const mandatoryAmort = Math.min(initialDebt * (amortizationPercent / 100), beginningDebt);
    
    // Cash available for sweep
    const availableForSweep = Math.max(0, fcf - mandatoryAmort);
    const cashSweep = availableForSweep * (cashSweepPercent / 100);
    
    // Total debt paydown
    const totalPaydown = mandatoryAmort + cashSweep;
    
    // Ending debt
    const endingDebt = Math.max(0, beginningDebt - totalPaydown);
    
    // Leverage ratio (Net Debt / EBITDA)
    const leverageRatio = ebitda > 0 ? endingDebt / ebitda : 0;

    projections.push({
      year,
      revenue: Math.round(yearRevenue),
      ebitda: Math.round(ebitda),
      interest: Math.round(interest),
      taxes: Math.round(taxes),
      capex: Math.round(capex),
      fcf: Math.round(fcf),
      mandatoryAmort: Math.round(mandatoryAmort),
      cashSweep: Math.round(cashSweep),
      totalPaydown: Math.round(totalPaydown),
      beginningDebt: Math.round(beginningDebt),
      endingDebt: Math.round(endingDebt),
      leverageRatio: Math.round(leverageRatio * 100) / 100,
    });

    currentDebt = endingDebt;
  }

  // Calculate summary metrics
  const totalPaydown = projections.reduce((sum, p) => sum + p.totalPaydown, 0);
  const paydownPercent = (totalPaydown / initialDebt) * 100;
  const exitLeverage = projections[4]?.leverageRatio || 0;
  const avgDscr = projections.reduce((sum, p) => sum + (p.ebitda / (p.interest + p.mandatoryAmort)), 0) / 5;

  return {
    projections,
    summary: {
      totalPaydown: Math.round(totalPaydown),
      paydownPercent: Math.round(paydownPercent * 10) / 10,
      exitLeverage: Math.round(exitLeverage * 100) / 100,
      avgDscr: Math.round(avgDscr * 100) / 100,
    },
  };
}

// Quick summary for dashboard badges
export interface CreditSummary {
  currentLeverage: number;
  projectedLeverage: number;
  covenantHeadroom: number;
  pricingPressure: "Tightening" | "Stable" | "Widening";
  debtServiceCoverage: number;
}

export function calculateQuickSummary(deal: {
  facilitySize: number;
  committed: number;
  targetSize: number;
  entryEbitda?: number;
  leverageMultiple?: number;
  interestRate?: number;
}): CreditSummary {
  const { facilitySize, committed, targetSize, entryEbitda, leverageMultiple, interestRate } = deal;
  
  // Use provided EBITDA or estimate from leverage
  const ebitda = entryEbitda || facilitySize / (leverageMultiple || 4);
  const rate = interestRate || 10; // Default 10% all-in
  
  const currentLeverage = facilitySize / ebitda;
  
  // Simple 1-year projection
  const interestExpense = facilitySize * (rate / 100);
  const fcf = ebitda - interestExpense;
  const paydown = Math.max(0, fcf * 0.3); // 30% of FCF for paydown
  const projectedDebt = facilitySize - paydown;
  const projectedEbitda = ebitda * 1.05;
  const projectedLeverage = projectedDebt / projectedEbitda;
  
  // Covenant headroom (assume 5.5x threshold)
  const covenantThreshold = 5.5;
  const covenantHeadroom = ((covenantThreshold - currentLeverage) / covenantThreshold) * 100;
  
  // Pricing pressure
  const coverageRatio = committed / targetSize;
  let pricingPressure: "Tightening" | "Stable" | "Widening";
  if (coverageRatio >= 1.2) pricingPressure = "Tightening";
  else if (coverageRatio >= 0.9) pricingPressure = "Stable";
  else pricingPressure = "Widening";
  
  // Debt service coverage
  const dscr = ebitda / (interestExpense + facilitySize * 0.05);

  return {
    currentLeverage: Math.round(currentLeverage * 100) / 100,
    projectedLeverage: Math.round(projectedLeverage * 100) / 100,
    covenantHeadroom: Math.round(covenantHeadroom * 10) / 10,
    pricingPressure,
    debtServiceCoverage: Math.round(dscr * 100) / 100,
  };
}
