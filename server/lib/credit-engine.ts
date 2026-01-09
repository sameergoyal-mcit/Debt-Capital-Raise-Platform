export interface DebtStructure {
  seniorAmount: number;
  interestRate: number;
  amortRate: number;
}

export interface GranularAssumptions {
  ltmRevenue: number;
  ltmEbitda: number;
  revenueGrowth: number[];
  ebitdaMargins: number[];
  capexPercent: number[];
  adjustments: number[];
  taxRate: number;
  daPercent: number;
  debtStructure: DebtStructure;
  cashSweepPercent: number;
}

export interface GranularYearProjection {
  year: number;
  label: string;
  revenue: number;
  revenueGrowth: number;
  grossEbitda: number;
  ebitdaMargin: number;
  adjustments: number;
  adjEbitda: number;
  da: number;
  ebit: number;
  interest: number;
  taxes: number;
  netIncome: number;
  daAddback: number;
  capex: number;
  mandatoryAmort: number;
  fcf: number;
  beginningDebt: number;
  cashSweep: number;
  endingDebt: number;
  leverageRatio: number;
  dscr: number;
}

export interface GranularModelResult {
  projections: GranularYearProjection[];
  summary: {
    totalPaydown: number;
    paydownPercent: number;
    exitLeverage: number;
    avgDscr: number;
    entryLeverage: number;
  };
}

export function runGranularCreditModel(assumptions: GranularAssumptions): GranularModelResult {
  const {
    ltmRevenue,
    ltmEbitda,
    revenueGrowth,
    ebitdaMargins,
    capexPercent,
    adjustments,
    taxRate,
    daPercent,
    debtStructure,
    cashSweepPercent,
  } = assumptions;

  const projections: GranularYearProjection[] = [];
  let currentDebt = debtStructure.seniorAmount;
  let prevRevenue = ltmRevenue;

  const ltmProjection: GranularYearProjection = {
    year: 0,
    label: "LTM",
    revenue: ltmRevenue,
    revenueGrowth: 0,
    grossEbitda: ltmEbitda,
    ebitdaMargin: ltmRevenue > 0 ? (ltmEbitda / ltmRevenue) * 100 : 0,
    adjustments: 0,
    adjEbitda: ltmEbitda,
    da: ltmRevenue * (daPercent / 100),
    ebit: ltmEbitda - ltmRevenue * (daPercent / 100),
    interest: debtStructure.seniorAmount * (debtStructure.interestRate / 100),
    taxes: 0,
    netIncome: 0,
    daAddback: ltmRevenue * (daPercent / 100),
    capex: 0,
    mandatoryAmort: 0,
    fcf: 0,
    beginningDebt: debtStructure.seniorAmount,
    cashSweep: 0,
    endingDebt: debtStructure.seniorAmount,
    leverageRatio: ltmEbitda > 0 ? debtStructure.seniorAmount / ltmEbitda : 0,
    dscr: 0,
  };
  projections.push(ltmProjection);

  for (let i = 0; i < 5; i++) {
    const year = i + 1;
    const beginningDebt = currentDebt;
    const growth = revenueGrowth[i] || 0;
    const margin = ebitdaMargins[i] || 25;
    const capex = capexPercent[i] || 3;
    const adj = adjustments[i] || 0;

    const revenue = prevRevenue * (1 + growth / 100);
    const grossEbitda = revenue * (margin / 100);
    const adjEbitda = grossEbitda + adj;
    const da = revenue * (daPercent / 100);
    const ebit = adjEbitda - da;
    const interest = beginningDebt * (debtStructure.interestRate / 100);
    const preTaxIncome = ebit - interest;
    const taxes = Math.max(0, preTaxIncome * (taxRate / 100));
    const netIncome = preTaxIncome - taxes;
    const daAddback = da;
    const capexAmount = revenue * (capex / 100);
    const mandatoryAmort = Math.min(debtStructure.seniorAmount * (debtStructure.amortRate / 100), beginningDebt);
    const fcfBeforeSweep = netIncome + daAddback - capexAmount - mandatoryAmort;
    const availableForSweep = Math.max(0, fcfBeforeSweep);
    const cashSweep = availableForSweep * (cashSweepPercent / 100);
    const endingDebt = Math.max(0, beginningDebt - mandatoryAmort - cashSweep);
    const leverageRatio = adjEbitda > 0 ? endingDebt / adjEbitda : 0;
    const debtService = interest + mandatoryAmort;
    const dscr = debtService > 0 ? adjEbitda / debtService : 0;

    projections.push({
      year,
      label: `Year ${year}`,
      revenue: Math.round(revenue),
      revenueGrowth: growth,
      grossEbitda: Math.round(grossEbitda),
      ebitdaMargin: margin,
      adjustments: Math.round(adj),
      adjEbitda: Math.round(adjEbitda),
      da: Math.round(da),
      ebit: Math.round(ebit),
      interest: Math.round(interest),
      taxes: Math.round(taxes),
      netIncome: Math.round(netIncome),
      daAddback: Math.round(daAddback),
      capex: Math.round(capexAmount),
      mandatoryAmort: Math.round(mandatoryAmort),
      fcf: Math.round(fcfBeforeSweep),
      beginningDebt: Math.round(beginningDebt),
      cashSweep: Math.round(cashSweep),
      endingDebt: Math.round(endingDebt),
      leverageRatio: Math.round(leverageRatio * 100) / 100,
      dscr: Math.round(dscr * 100) / 100,
    });

    currentDebt = endingDebt;
    prevRevenue = revenue;
  }

  const yearProjections = projections.filter(p => p.year > 0);
  const totalPaydown = debtStructure.seniorAmount - (yearProjections[4]?.endingDebt || 0);
  const paydownPercent = (totalPaydown / debtStructure.seniorAmount) * 100;
  const exitLeverage = yearProjections[4]?.leverageRatio || 0;
  const avgDscr = yearProjections.reduce((sum, p) => sum + p.dscr, 0) / 5;
  const entryLeverage = ltmEbitda > 0 ? debtStructure.seniorAmount / ltmEbitda : 0;

  return {
    projections,
    summary: {
      totalPaydown: Math.round(totalPaydown),
      paydownPercent: Math.round(paydownPercent * 10) / 10,
      exitLeverage: Math.round(exitLeverage * 100) / 100,
      avgDscr: Math.round(avgDscr * 100) / 100,
      entryLeverage: Math.round(entryLeverage * 100) / 100,
    },
  };
}

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
    const yearRevenue = revenue * Math.pow(1 + growthPercent / 100, year - 1);
    const ebitda = yearRevenue * (ebitdaMargin / 100);
    const interest = beginningDebt * (interestRate / 100);
    const preTaxIncome = ebitda - interest;
    const taxes = Math.max(0, preTaxIncome * (taxRate / 100));
    const capex = yearRevenue * (capexPercent / 100);
    const fcf = ebitda - interest - taxes - capex;
    const mandatoryAmort = Math.min(initialDebt * (amortizationPercent / 100), beginningDebt);
    const availableForSweep = Math.max(0, fcf - mandatoryAmort);
    const cashSweep = availableForSweep * (cashSweepPercent / 100);
    const totalPaydown = mandatoryAmort + cashSweep;
    const endingDebt = Math.max(0, beginningDebt - totalPaydown);
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
  const ebitda = entryEbitda || facilitySize / (leverageMultiple || 4);
  const rate = interestRate || 10;
  const currentLeverage = facilitySize / ebitda;
  const interestExpense = facilitySize * (rate / 100);
  const fcf = ebitda - interestExpense;
  const paydown = Math.max(0, fcf * 0.3);
  const projectedDebt = facilitySize - paydown;
  const projectedEbitda = ebitda * 1.05;
  const projectedLeverage = projectedDebt / projectedEbitda;
  const covenantThreshold = 5.5;
  const covenantHeadroom = ((covenantThreshold - currentLeverage) / covenantThreshold) * 100;
  const coverageRatio = committed / targetSize;
  let pricingPressure: "Tightening" | "Stable" | "Widening";
  if (coverageRatio >= 1.2) pricingPressure = "Tightening";
  else if (coverageRatio >= 0.9) pricingPressure = "Stable";
  else pricingPressure = "Widening";
  const dscr = ebitda / (interestExpense + facilitySize * 0.05);

  return {
    currentLeverage: Math.round(currentLeverage * 100) / 100,
    projectedLeverage: Math.round(projectedLeverage * 100) / 100,
    covenantHeadroom: Math.round(covenantHeadroom * 10) / 10,
    pricingPressure,
    debtServiceCoverage: Math.round(dscr * 100) / 100,
  };
}
