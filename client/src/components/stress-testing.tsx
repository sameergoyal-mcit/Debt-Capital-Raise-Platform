import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { AlertTriangle, CheckCircle2, XCircle, AlertCircle, ShieldAlert } from "lucide-react";

interface DebtStructure {
  seniorAmount: number;
  interestRate: number;
  amortRate: number;
}

interface GranularAssumptions {
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

interface CovenantThresholds {
  maxLeverage: number;
  minDscr: number;
  minInterestCoverage: number;
}

interface StressScenario {
  name: string;
  description: string;
  revenueGrowth: number[];
  ebitdaMargins: number[];
  interestRateAdjust: number;
}

interface CovenantBreach {
  year: number;
  covenant: string;
  threshold: number;
  actual: number;
}

interface StressTestResult {
  scenario: StressScenario;
  projections: Array<{
    year: number;
    label: string;
    leverageRatio: number;
    dscr: number;
    interestCoverage: number;
  }>;
  summary: {
    exitLeverage: number;
    avgDscr: number;
    paydownPercent: number;
  };
  breaches: CovenantBreach[];
  worstLeverage: { year: number; value: number };
  worstDscr: { year: number; value: number };
  survives: boolean;
  riskLevel: "low" | "medium" | "high" | "critical";
}

const STRESS_SCENARIOS: StressScenario[] = [
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

function runStressTest(
  baseAssumptions: GranularAssumptions,
  scenario: StressScenario,
  covenants: CovenantThresholds
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

  const projections: StressTestResult["projections"] = [];
  let currentDebt = stressedAssumptions.debtStructure.seniorAmount;
  let prevRevenue = stressedAssumptions.ltmRevenue;
  const breaches: CovenantBreach[] = [];
  let worstLeverage = { year: 0, value: 0 };
  let worstDscr = { year: 0, value: 999 };

  // LTM
  const ltmLeverage = stressedAssumptions.ltmEbitda > 0 ? stressedAssumptions.debtStructure.seniorAmount / stressedAssumptions.ltmEbitda : 0;
  projections.push({
    year: 0,
    label: "LTM",
    leverageRatio: Math.round(ltmLeverage * 100) / 100,
    dscr: 0,
    interestCoverage: 0,
  });

  for (let i = 0; i < 5; i++) {
    const year = i + 1;
    const beginningDebt = currentDebt;
    const growth = stressedAssumptions.revenueGrowth[i] || 0;
    const margin = stressedAssumptions.ebitdaMargins[i] || 25;
    const capex = stressedAssumptions.capexPercent[i] || 3;
    const adj = stressedAssumptions.adjustments[i] || 0;

    const revenue = prevRevenue * (1 + growth / 100);
    const grossEbitda = revenue * (margin / 100);
    const adjEbitda = grossEbitda + adj;
    const da = revenue * (stressedAssumptions.daPercent / 100);
    const ebit = adjEbitda - da;
    const interest = beginningDebt * (stressedAssumptions.debtStructure.interestRate / 100);
    const preTaxIncome = ebit - interest;
    const taxes = Math.max(0, preTaxIncome * (stressedAssumptions.taxRate / 100));
    const netIncome = preTaxIncome - taxes;
    const capexAmount = revenue * (capex / 100);
    const mandatoryAmort = Math.min(stressedAssumptions.debtStructure.seniorAmount * (stressedAssumptions.debtStructure.amortRate / 100), beginningDebt);
    const fcf = netIncome + da - capexAmount - mandatoryAmort;
    const cashSweep = Math.max(0, fcf) * (stressedAssumptions.cashSweepPercent / 100);
    const endingDebt = Math.max(0, beginningDebt - mandatoryAmort - cashSweep);
    const leverageRatio = adjEbitda > 0 ? endingDebt / adjEbitda : 0;
    const debtService = interest + mandatoryAmort;
    const dscr = debtService > 0 ? adjEbitda / debtService : 0;
    const interestCoverage = interest > 0 ? adjEbitda / interest : 999;

    projections.push({
      year,
      label: `Year ${year}`,
      leverageRatio: Math.round(leverageRatio * 100) / 100,
      dscr: Math.round(dscr * 100) / 100,
      interestCoverage: Math.round(interestCoverage * 100) / 100,
    });

    // Check covenants
    if (leverageRatio > covenants.maxLeverage) {
      breaches.push({
        year,
        covenant: "Max Leverage",
        threshold: covenants.maxLeverage,
        actual: Math.round(leverageRatio * 100) / 100,
      });
    }
    if (dscr < covenants.minDscr) {
      breaches.push({
        year,
        covenant: "Min DSCR",
        threshold: covenants.minDscr,
        actual: Math.round(dscr * 100) / 100,
      });
    }
    if (interestCoverage < covenants.minInterestCoverage) {
      breaches.push({
        year,
        covenant: "Min Interest Coverage",
        threshold: covenants.minInterestCoverage,
        actual: Math.round(interestCoverage * 100) / 100,
      });
    }

    // Track worst metrics
    if (leverageRatio > worstLeverage.value) {
      worstLeverage = { year, value: leverageRatio };
    }
    if (dscr < worstDscr.value) {
      worstDscr = { year, value: dscr };
    }

    currentDebt = endingDebt;
    prevRevenue = revenue;
  }

  const totalPaydown = stressedAssumptions.debtStructure.seniorAmount - currentDebt;
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
    projections,
    summary: {
      exitLeverage: projections[5]?.leverageRatio || 0,
      avgDscr: Math.round((projections.slice(1).reduce((sum, p) => sum + p.dscr, 0) / 5) * 100) / 100,
      paydownPercent: Math.round((totalPaydown / stressedAssumptions.debtStructure.seniorAmount) * 1000) / 10,
    },
    breaches,
    worstLeverage: { year: worstLeverage.year, value: Math.round(worstLeverage.value * 100) / 100 },
    worstDscr: { year: worstDscr.year, value: Math.round(worstDscr.value * 100) / 100 },
    survives,
    riskLevel,
  };
}

interface StressTestingProps {
  assumptions: GranularAssumptions;
  covenants?: CovenantThresholds;
}

export function StressTesting({
  assumptions,
  covenants = { maxLeverage: 5.0, minDscr: 1.25, minInterestCoverage: 2.0 },
}: StressTestingProps) {
  const stressResults = useMemo(
    () => STRESS_SCENARIOS.map((scenario) => runStressTest(assumptions, scenario, covenants)),
    [assumptions, covenants]
  );

  const getRiskIcon = (riskLevel: string) => {
    switch (riskLevel) {
      case "low":
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case "medium":
        return <AlertCircle className="h-5 w-5 text-yellow-500" />;
      case "high":
        return <AlertTriangle className="h-5 w-5 text-orange-500" />;
      case "critical":
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return null;
    }
  };

  const getRiskBadge = (riskLevel: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      low: "secondary",
      medium: "outline",
      high: "default",
      critical: "destructive",
    };
    return (
      <Badge variant={variants[riskLevel] || "outline"} className="capitalize">
        {riskLevel} Risk
      </Badge>
    );
  };

  const getRiskColor = (riskLevel: string) => {
    switch (riskLevel) {
      case "low":
        return "bg-green-50 border-green-200 dark:bg-green-950/30";
      case "medium":
        return "bg-yellow-50 border-yellow-200 dark:bg-yellow-950/30";
      case "high":
        return "bg-orange-50 border-orange-200 dark:bg-orange-950/30";
      case "critical":
        return "bg-red-50 border-red-200 dark:bg-red-950/30";
      default:
        return "";
    }
  };

  // Prepare combined chart data
  const chartData = stressResults[0]?.projections.map((p, i) => ({
    name: p.label,
    ...Object.fromEntries(
      stressResults.map((r) => [r.scenario.name, r.projections[i]?.leverageRatio || 0])
    ),
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <ShieldAlert className="h-5 w-5" />
            Stress Testing
          </h3>
          <p className="text-sm text-muted-foreground">
            Covenant breach analysis under adverse scenarios
          </p>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <span className="text-muted-foreground">Covenants:</span>
          <Badge variant="outline">Max Leverage: {covenants.maxLeverage}x</Badge>
          <Badge variant="outline">Min DSCR: {covenants.minDscr}x</Badge>
          <Badge variant="outline">Min ICR: {covenants.minInterestCoverage}x</Badge>
        </div>
      </div>

      {/* Scenario Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        {stressResults.map((result) => (
          <Card key={result.scenario.name} className={`border ${getRiskColor(result.riskLevel)}`}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                {getRiskIcon(result.riskLevel)}
                {getRiskBadge(result.riskLevel)}
              </div>
              <CardTitle className="text-base">{result.scenario.name}</CardTitle>
              <CardDescription className="text-xs">{result.scenario.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Survives:</span>
                <span className={result.survives ? "text-green-600 font-semibold" : "text-red-600 font-semibold"}>
                  {result.survives ? "Yes" : "No"}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Exit Leverage:</span>
                <span className={result.summary.exitLeverage > covenants.maxLeverage ? "text-red-600 font-semibold" : "font-semibold"}>
                  {result.summary.exitLeverage.toFixed(2)}x
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Avg DSCR:</span>
                <span className={result.summary.avgDscr < covenants.minDscr ? "text-red-600 font-semibold" : "font-semibold"}>
                  {result.summary.avgDscr.toFixed(2)}x
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Breaches:</span>
                <Badge variant={result.breaches.length > 0 ? "destructive" : "secondary"}>
                  {result.breaches.length}
                </Badge>
              </div>
              {result.breaches.length > 0 && (
                <div className="pt-2 border-t">
                  <div className="text-xs text-muted-foreground mb-1">Worst metrics:</div>
                  <div className="text-xs">
                    Leverage: {result.worstLeverage.value.toFixed(2)}x (Y{result.worstLeverage.year})
                  </div>
                  <div className="text-xs">
                    DSCR: {result.worstDscr.value.toFixed(2)}x (Y{result.worstDscr.year})
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Combined Leverage Chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Leverage Trajectory Under Stress</CardTitle>
          <CardDescription>Comparison across all stress scenarios</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis domain={[0, 8]} tickFormatter={(v) => `${v}x`} tick={{ fontSize: 12 }} />
                <Tooltip
                  formatter={(value: number, name: string) => [`${value.toFixed(2)}x`, name]}
                  contentStyle={{ borderRadius: "8px", border: "1px solid #e5e7eb" }}
                />
                <ReferenceLine
                  y={covenants.maxLeverage}
                  stroke="#ef4444"
                  strokeDasharray="5 5"
                  label={{ value: "Covenant", position: "right", className: "text-xs fill-red-500" }}
                />
                <Line type="monotone" dataKey="Revenue Shock" stroke="#f59e0b" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="Margin Compression" stroke="#8b5cf6" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="Rate Spike" stroke="#06b6d4" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="Perfect Storm" stroke="#ef4444" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-6 mt-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-[#f59e0b]" />
              <span className="text-xs">Revenue Shock</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-[#8b5cf6]" />
              <span className="text-xs">Margin Compression</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-[#06b6d4]" />
              <span className="text-xs">Rate Spike</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-[#ef4444]" />
              <span className="text-xs">Perfect Storm</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Breach Details */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Covenant Breach Timeline</CardTitle>
          <CardDescription>Detailed breach analysis by scenario and year</CardDescription>
        </CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2">Scenario</th>
                <th className="text-center py-2">Y1</th>
                <th className="text-center py-2">Y2</th>
                <th className="text-center py-2">Y3</th>
                <th className="text-center py-2">Y4</th>
                <th className="text-center py-2">Y5</th>
                <th className="text-center py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {stressResults.map((result) => {
                const breachYears = new Set(result.breaches.map((b) => b.year));
                return (
                  <tr key={result.scenario.name} className="border-b">
                    <td className="py-2 font-medium">{result.scenario.name}</td>
                    {[1, 2, 3, 4, 5].map((year) => {
                      const hasBreach = breachYears.has(year);
                      const yearBreaches = result.breaches.filter((b) => b.year === year);
                      return (
                        <td key={year} className="text-center py-2">
                          {hasBreach ? (
                            <div className="flex flex-col items-center">
                              <XCircle className="h-4 w-4 text-red-500" />
                              <span className="text-xs text-red-500 mt-0.5">
                                {yearBreaches.length} breach{yearBreaches.length > 1 ? "es" : ""}
                              </span>
                            </div>
                          ) : (
                            <CheckCircle2 className="h-4 w-4 text-green-500 mx-auto" />
                          )}
                        </td>
                      );
                    })}
                    <td className="text-center py-2">
                      {getRiskBadge(result.riskLevel)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
