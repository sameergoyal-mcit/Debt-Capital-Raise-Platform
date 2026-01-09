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

// ============================================================
// SCENARIO ANALYSIS
// ============================================================

export type ScenarioType = "base" | "upside" | "downside";

export interface ScenarioDefinition {
  name: ScenarioType;
  label: string;
  revenueGrowthAdjust: number;  // additive adjustment to each year's growth rate
  marginAdjust: number;          // additive adjustment to each year's margin
  description: string;
}

export const DEFAULT_SCENARIOS: Record<ScenarioType, ScenarioDefinition> = {
  base: {
    name: "base",
    label: "Base Case",
    revenueGrowthAdjust: 0,
    marginAdjust: 0,
    description: "Management case projections",
  },
  upside: {
    name: "upside",
    label: "Upside",
    revenueGrowthAdjust: 2,  // +2% growth each year
    marginAdjust: 2,          // +2% margin each year
    description: "Faster growth, margin expansion",
  },
  downside: {
    name: "downside",
    label: "Downside",
    revenueGrowthAdjust: -3,  // -3% growth each year
    marginAdjust: -3,          // -3% margin each year
    description: "Slower growth, margin pressure",
  },
};

export interface ScenarioAnalysisResult {
  base: GranularModelResult;
  upside: GranularModelResult;
  downside: GranularModelResult;
  comparison: {
    exitLeverage: { base: number; upside: number; downside: number };
    paydownPercent: { base: number; upside: number; downside: number };
    avgDscr: { base: number; upside: number; downside: number };
    totalPaydown: { base: number; upside: number; downside: number };
  };
}

export function runScenarioAnalysis(
  baseAssumptions: GranularAssumptions,
  scenarios: Record<ScenarioType, ScenarioDefinition> = DEFAULT_SCENARIOS
): ScenarioAnalysisResult {
  // Run base case
  const baseResult = runGranularCreditModel(baseAssumptions);

  // Run upside case with adjustments
  const upsideAssumptions: GranularAssumptions = {
    ...baseAssumptions,
    revenueGrowth: baseAssumptions.revenueGrowth.map(g => g + scenarios.upside.revenueGrowthAdjust),
    ebitdaMargins: baseAssumptions.ebitdaMargins.map(m => Math.min(60, m + scenarios.upside.marginAdjust)),
  };
  const upsideResult = runGranularCreditModel(upsideAssumptions);

  // Run downside case with adjustments
  const downsideAssumptions: GranularAssumptions = {
    ...baseAssumptions,
    revenueGrowth: baseAssumptions.revenueGrowth.map(g => g + scenarios.downside.revenueGrowthAdjust),
    ebitdaMargins: baseAssumptions.ebitdaMargins.map(m => Math.max(5, m + scenarios.downside.marginAdjust)),
  };
  const downsideResult = runGranularCreditModel(downsideAssumptions);

  return {
    base: baseResult,
    upside: upsideResult,
    downside: downsideResult,
    comparison: {
      exitLeverage: {
        base: baseResult.summary.exitLeverage,
        upside: upsideResult.summary.exitLeverage,
        downside: downsideResult.summary.exitLeverage,
      },
      paydownPercent: {
        base: baseResult.summary.paydownPercent,
        upside: upsideResult.summary.paydownPercent,
        downside: downsideResult.summary.paydownPercent,
      },
      avgDscr: {
        base: baseResult.summary.avgDscr,
        upside: upsideResult.summary.avgDscr,
        downside: downsideResult.summary.avgDscr,
      },
      totalPaydown: {
        base: baseResult.summary.totalPaydown,
        upside: upsideResult.summary.totalPaydown,
        downside: downsideResult.summary.totalPaydown,
      },
    },
  };
}

// ============================================================
// SENSITIVITY ANALYSIS
// ============================================================

export type SensitivityVariable =
  | "revenueGrowth"
  | "ebitdaMargin"
  | "interestRate"
  | "cashSweep";

export type SensitivityMetric = "exitLeverage" | "paydownPercent" | "avgDscr";

export interface SensitivityResult {
  variable: SensitivityVariable;
  variableLabel: string;
  baseValue: number;
  lowCase: { value: number; result: number; impact: number };
  highCase: { value: number; result: number; impact: number };
  baseResult: number;
}

export function runSensitivityAnalysis(
  baseAssumptions: GranularAssumptions,
  targetMetric: SensitivityMetric = "exitLeverage",
  variationPercent: number = 20
): SensitivityResult[] {
  const baseResult = runGranularCreditModel(baseAssumptions);
  const baseMetricValue = baseResult.summary[targetMetric];

  const variables: Array<{
    key: SensitivityVariable;
    label: string;
    getBase: () => number;
    applyLow: (assumptions: GranularAssumptions, delta: number) => GranularAssumptions;
    applyHigh: (assumptions: GranularAssumptions, delta: number) => GranularAssumptions;
  }> = [
    {
      key: "revenueGrowth",
      label: "Revenue Growth",
      getBase: () => baseAssumptions.revenueGrowth.reduce((a, b) => a + b, 0) / 5,
      applyLow: (a, delta) => ({
        ...a,
        revenueGrowth: a.revenueGrowth.map(g => g - delta),
      }),
      applyHigh: (a, delta) => ({
        ...a,
        revenueGrowth: a.revenueGrowth.map(g => g + delta),
      }),
    },
    {
      key: "ebitdaMargin",
      label: "EBITDA Margin",
      getBase: () => baseAssumptions.ebitdaMargins.reduce((a, b) => a + b, 0) / 5,
      applyLow: (a, delta) => ({
        ...a,
        ebitdaMargins: a.ebitdaMargins.map(m => Math.max(5, m - delta)),
      }),
      applyHigh: (a, delta) => ({
        ...a,
        ebitdaMargins: a.ebitdaMargins.map(m => Math.min(60, m + delta)),
      }),
    },
    {
      key: "interestRate",
      label: "Interest Rate",
      getBase: () => baseAssumptions.debtStructure.interestRate,
      applyLow: (a, delta) => ({
        ...a,
        debtStructure: {
          ...a.debtStructure,
          interestRate: Math.max(1, a.debtStructure.interestRate - delta),
        },
      }),
      applyHigh: (a, delta) => ({
        ...a,
        debtStructure: {
          ...a.debtStructure,
          interestRate: a.debtStructure.interestRate + delta,
        },
      }),
    },
    {
      key: "cashSweep",
      label: "Cash Sweep %",
      getBase: () => baseAssumptions.cashSweepPercent,
      applyLow: (a, delta) => ({
        ...a,
        cashSweepPercent: Math.max(0, a.cashSweepPercent - delta),
      }),
      applyHigh: (a, delta) => ({
        ...a,
        cashSweepPercent: Math.min(100, a.cashSweepPercent + delta),
      }),
    },
  ];

  return variables.map((v) => {
    const baseValue = v.getBase();
    const delta = baseValue * (variationPercent / 100);

    const lowAssumptions = v.applyLow(baseAssumptions, delta);
    const lowResult = runGranularCreditModel(lowAssumptions);
    const lowMetric = lowResult.summary[targetMetric];

    const highAssumptions = v.applyHigh(baseAssumptions, delta);
    const highResult = runGranularCreditModel(highAssumptions);
    const highMetric = highResult.summary[targetMetric];

    return {
      variable: v.key,
      variableLabel: v.label,
      baseValue,
      lowCase: {
        value: baseValue - delta,
        result: lowMetric,
        impact: lowMetric - baseMetricValue,
      },
      highCase: {
        value: baseValue + delta,
        result: highMetric,
        impact: highMetric - baseMetricValue,
      },
      baseResult: baseMetricValue,
    };
  });
}

// ============================================================
// STRESS TESTING
// ============================================================

export interface StressScenario {
  name: string;
  description: string;
  revenueGrowth: number[];   // 5-year growth rates
  ebitdaMargins: number[];   // 5-year margins
  interestRateAdjust: number; // additive to base rate
}

export const STRESS_SCENARIOS: StressScenario[] = [
  {
    name: "Revenue Shock",
    description: "Sharp revenue decline in Year 1, gradual recovery",
    revenueGrowth: [-10, -5, 2, 4, 5],
    ebitdaMargins: [22, 22, 23, 24, 25],
    interestRateAdjust: 0,
  },
  {
    name: "Margin Compression",
    description: "Sustained margin pressure from competition",
    revenueGrowth: [3, 3, 4, 4, 5],
    ebitdaMargins: [20, 18, 17, 17, 18],
    interestRateAdjust: 0,
  },
  {
    name: "Rate Spike",
    description: "Interest rates increase 200bps",
    revenueGrowth: [5, 5, 5, 5, 5],
    ebitdaMargins: [25, 25, 25, 25, 25],
    interestRateAdjust: 2,
  },
  {
    name: "Perfect Storm",
    description: "Revenue decline + margin pressure + rate spike",
    revenueGrowth: [-8, -3, 0, 2, 3],
    ebitdaMargins: [18, 16, 16, 17, 18],
    interestRateAdjust: 1.5,
  },
];

export interface CovenantThresholds {
  maxLeverage: number;
  minDscr: number;
  minInterestCoverage: number;
}

export interface CovenantBreach {
  year: number;
  covenant: string;
  threshold: number;
  actual: number;
  headroom: number;
}

export interface StressTestResult {
  scenario: StressScenario;
  projections: GranularYearProjection[];
  summary: GranularModelResult["summary"];
  breaches: CovenantBreach[];
  worstLeverage: { year: number; value: number };
  worstDscr: { year: number; value: number };
  survives: boolean;
  riskLevel: "low" | "medium" | "high" | "critical";
}

export function runStressTest(
  baseAssumptions: GranularAssumptions,
  scenario: StressScenario,
  covenants: CovenantThresholds = { maxLeverage: 5.0, minDscr: 1.25, minInterestCoverage: 2.0 }
): StressTestResult {
  const stressedAssumptions: GranularAssumptions = {
    ...baseAssumptions,
    revenueGrowth: scenario.revenueGrowth,
    ebitdaMargins: scenario.ebitdaMargins,
    debtStructure: {
      ...baseAssumptions.debtStructure,
      interestRate: baseAssumptions.debtStructure.interestRate + scenario.interestRateAdjust,
    },
  };

  const result = runGranularCreditModel(stressedAssumptions);
  const yearProjections = result.projections.filter(p => p.year > 0);

  // Check for covenant breaches
  const breaches: CovenantBreach[] = [];

  yearProjections.forEach(p => {
    // Leverage covenant
    if (p.leverageRatio > covenants.maxLeverage) {
      breaches.push({
        year: p.year,
        covenant: "Max Leverage",
        threshold: covenants.maxLeverage,
        actual: p.leverageRatio,
        headroom: p.leverageRatio - covenants.maxLeverage,
      });
    }

    // DSCR covenant
    if (p.dscr < covenants.minDscr) {
      breaches.push({
        year: p.year,
        covenant: "Min DSCR",
        threshold: covenants.minDscr,
        actual: p.dscr,
        headroom: covenants.minDscr - p.dscr,
      });
    }

    // Interest coverage (EBITDA / Interest)
    const interestCoverage = p.interest > 0 ? p.adjEbitda / p.interest : 999;
    if (interestCoverage < covenants.minInterestCoverage) {
      breaches.push({
        year: p.year,
        covenant: "Min Interest Coverage",
        threshold: covenants.minInterestCoverage,
        actual: Math.round(interestCoverage * 100) / 100,
        headroom: covenants.minInterestCoverage - interestCoverage,
      });
    }
  });

  // Find worst metrics
  const worstLeverage = yearProjections.reduce(
    (worst, p) => p.leverageRatio > worst.value ? { year: p.year, value: p.leverageRatio } : worst,
    { year: 1, value: 0 }
  );

  const worstDscr = yearProjections.reduce(
    (worst, p) => p.dscr < worst.value ? { year: p.year, value: p.dscr } : worst,
    { year: 1, value: 999 }
  );

  // Determine risk level
  const survives = breaches.length === 0;
  let riskLevel: "low" | "medium" | "high" | "critical";
  if (survives && worstLeverage.value < covenants.maxLeverage * 0.8) {
    riskLevel = "low";
  } else if (survives && worstLeverage.value < covenants.maxLeverage * 0.95) {
    riskLevel = "medium";
  } else if (breaches.length <= 2) {
    riskLevel = "high";
  } else {
    riskLevel = "critical";
  }

  return {
    scenario,
    projections: result.projections,
    summary: result.summary,
    breaches,
    worstLeverage,
    worstDscr,
    survives,
    riskLevel,
  };
}

export function runAllStressTests(
  baseAssumptions: GranularAssumptions,
  covenants?: CovenantThresholds
): StressTestResult[] {
  return STRESS_SCENARIOS.map(scenario => runStressTest(baseAssumptions, scenario, covenants));
}

// ============================================================
// LENDER RETURNS CALCULATOR (IRR, MOIC)
// ============================================================

export interface LenderReturnsInput {
  principalAmount: number;
  oid: number;                    // Original Issue Discount (e.g., 2 means 98% of par)
  upfrontFee: number;             // Upfront fee as percentage (e.g., 1 = 1%)
  spread: number;                 // Spread over base rate in bps (e.g., 500 = 5%)
  baseRate: number;               // Base rate (e.g., SOFR) as percentage
  holdPeriod: number;             // Years until exit (1-5)
  prepaymentPremiums: number[];   // Premium by year [102, 101, 100, 100, 100] = 2% Y1, 1% Y2, par thereafter
  mandatoryAmortPercent: number;  // Annual mandatory amort as % of original
}

export interface LenderCashFlow {
  year: number;
  beginningPrincipal: number;
  interest: number;
  amortization: number;
  prepayment: number;
  prepaymentPremium: number;
  totalCash: number;
  endingPrincipal: number;
}

export interface LenderReturnsResult {
  irr: number;
  moic: number;
  totalCashReceived: number;
  totalInterest: number;
  totalPrincipal: number;
  totalFees: number;
  averageYield: number;
  cashFlows: LenderCashFlow[];
  initialInvestment: number;
}

export function calculateLenderReturns(input: LenderReturnsInput): LenderReturnsResult {
  const {
    principalAmount,
    oid,
    upfrontFee,
    spread,
    baseRate,
    holdPeriod,
    prepaymentPremiums,
    mandatoryAmortPercent,
  } = input;

  // Initial investment (net of OID and fees)
  const oidAmount = principalAmount * (oid / 100);
  const upfrontFeeAmount = principalAmount * (upfrontFee / 100);
  const initialInvestment = principalAmount - oidAmount - upfrontFeeAmount;

  const allInRate = (baseRate + spread / 100);
  const cashFlows: LenderCashFlow[] = [];
  let currentPrincipal = principalAmount;

  for (let year = 1; year <= holdPeriod; year++) {
    const beginningPrincipal = currentPrincipal;
    const interest = beginningPrincipal * (allInRate / 100);
    const amortization = Math.min(principalAmount * (mandatoryAmortPercent / 100), currentPrincipal);

    // Prepayment in final year (remaining principal)
    const isExitYear = year === holdPeriod;
    const remainingAfterAmort = beginningPrincipal - amortization;
    const prepayment = isExitYear ? remainingAfterAmort : 0;

    // Prepayment premium (only on prepaid amount in exit year)
    const premiumRate = prepaymentPremiums[year - 1] || 100;
    const prepaymentPremium = isExitYear ? prepayment * ((premiumRate - 100) / 100) : 0;

    const endingPrincipal = beginningPrincipal - amortization - prepayment;
    const totalCash = interest + amortization + prepayment + prepaymentPremium;

    cashFlows.push({
      year,
      beginningPrincipal: Math.round(beginningPrincipal),
      interest: Math.round(interest),
      amortization: Math.round(amortization),
      prepayment: Math.round(prepayment),
      prepaymentPremium: Math.round(prepaymentPremium),
      totalCash: Math.round(totalCash),
      endingPrincipal: Math.round(endingPrincipal),
    });

    currentPrincipal = endingPrincipal;
  }

  const totalCashReceived = cashFlows.reduce((sum, cf) => sum + cf.totalCash, 0);
  const totalInterest = cashFlows.reduce((sum, cf) => sum + cf.interest, 0);
  const totalPrincipal = cashFlows.reduce((sum, cf) => sum + cf.amortization + cf.prepayment, 0);
  const totalFees = oidAmount + upfrontFeeAmount + cashFlows.reduce((sum, cf) => sum + cf.prepaymentPremium, 0);

  // MOIC (Multiple on Invested Capital)
  const moic = totalCashReceived / initialInvestment;

  // IRR calculation using Newton-Raphson method
  const irr = calculateIRR(initialInvestment, cashFlows.map(cf => cf.totalCash));

  // Average yield (simple approximation)
  const averageYield = (totalCashReceived - initialInvestment) / initialInvestment / holdPeriod * 100;

  return {
    irr: Math.round(irr * 100) / 100,
    moic: Math.round(moic * 100) / 100,
    totalCashReceived: Math.round(totalCashReceived),
    totalInterest: Math.round(totalInterest),
    totalPrincipal: Math.round(totalPrincipal),
    totalFees: Math.round(totalFees),
    averageYield: Math.round(averageYield * 100) / 100,
    cashFlows,
    initialInvestment: Math.round(initialInvestment),
  };
}

function calculateIRR(initialInvestment: number, cashFlows: number[], guess: number = 0.1): number {
  const maxIterations = 100;
  const tolerance = 0.0001;
  let rate = guess;

  for (let i = 0; i < maxIterations; i++) {
    let npv = -initialInvestment;
    let npvDerivative = 0;

    cashFlows.forEach((cf, year) => {
      const t = year + 1;
      npv += cf / Math.pow(1 + rate, t);
      npvDerivative -= t * cf / Math.pow(1 + rate, t + 1);
    });

    const newRate = rate - npv / npvDerivative;

    if (Math.abs(newRate - rate) < tolerance) {
      return newRate * 100; // Return as percentage
    }

    rate = newRate;
  }

  return rate * 100; // Return best estimate as percentage
}
