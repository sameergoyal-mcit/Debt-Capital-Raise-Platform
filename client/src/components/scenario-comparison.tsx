import React, { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  BarChart,
  Bar,
  ReferenceLine,
} from "recharts";
import { TrendingUp, TrendingDown, Minus, ArrowUpRight, ArrowDownRight } from "lucide-react";

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

interface GranularYearProjection {
  year: number;
  label: string;
  revenue: number;
  adjEbitda: number;
  fcf: number;
  endingDebt: number;
  leverageRatio: number;
  dscr: number;
}

interface GranularModelResult {
  projections: GranularYearProjection[];
  summary: {
    totalPaydown: number;
    paydownPercent: number;
    exitLeverage: number;
    avgDscr: number;
    entryLeverage: number;
  };
}

type ScenarioType = "base" | "upside" | "downside";

interface ScenarioAnalysisResult {
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

// Client-side scenario analysis function
function runScenarioAnalysis(baseAssumptions: GranularAssumptions): ScenarioAnalysisResult {
  const runModel = (assumptions: GranularAssumptions): GranularModelResult => {
    const projections: GranularYearProjection[] = [];
    let currentDebt = assumptions.debtStructure.seniorAmount;
    let prevRevenue = assumptions.ltmRevenue;

    projections.push({
      year: 0,
      label: "LTM",
      revenue: assumptions.ltmRevenue,
      adjEbitda: assumptions.ltmEbitda,
      fcf: 0,
      endingDebt: assumptions.debtStructure.seniorAmount,
      leverageRatio: assumptions.ltmEbitda > 0 ? assumptions.debtStructure.seniorAmount / assumptions.ltmEbitda : 0,
      dscr: 0,
    });

    for (let i = 0; i < 5; i++) {
      const year = i + 1;
      const beginningDebt = currentDebt;
      const growth = assumptions.revenueGrowth[i] || 0;
      const margin = assumptions.ebitdaMargins[i] || 25;
      const capex = assumptions.capexPercent[i] || 3;
      const adj = assumptions.adjustments[i] || 0;

      const revenue = prevRevenue * (1 + growth / 100);
      const grossEbitda = revenue * (margin / 100);
      const adjEbitda = grossEbitda + adj;
      const da = revenue * (assumptions.daPercent / 100);
      const ebit = adjEbitda - da;
      const interest = beginningDebt * (assumptions.debtStructure.interestRate / 100);
      const preTaxIncome = ebit - interest;
      const taxes = Math.max(0, preTaxIncome * (assumptions.taxRate / 100));
      const netIncome = preTaxIncome - taxes;
      const capexAmount = revenue * (capex / 100);
      const mandatoryAmort = Math.min(assumptions.debtStructure.seniorAmount * (assumptions.debtStructure.amortRate / 100), beginningDebt);
      const fcf = netIncome + da - capexAmount - mandatoryAmort;
      const cashSweep = Math.max(0, fcf) * (assumptions.cashSweepPercent / 100);
      const endingDebt = Math.max(0, beginningDebt - mandatoryAmort - cashSweep);
      const leverageRatio = adjEbitda > 0 ? endingDebt / adjEbitda : 0;
      const debtService = interest + mandatoryAmort;
      const dscr = debtService > 0 ? adjEbitda / debtService : 0;

      projections.push({
        year,
        label: `Year ${year}`,
        revenue: Math.round(revenue),
        adjEbitda: Math.round(adjEbitda),
        fcf: Math.round(fcf),
        endingDebt: Math.round(endingDebt),
        leverageRatio: Math.round(leverageRatio * 100) / 100,
        dscr: Math.round(dscr * 100) / 100,
      });

      currentDebt = endingDebt;
      prevRevenue = revenue;
    }

    const yearProjections = projections.filter(p => p.year > 0);
    const totalPaydown = assumptions.debtStructure.seniorAmount - (yearProjections[4]?.endingDebt || 0);

    return {
      projections,
      summary: {
        totalPaydown: Math.round(totalPaydown),
        paydownPercent: Math.round((totalPaydown / assumptions.debtStructure.seniorAmount) * 1000) / 10,
        exitLeverage: yearProjections[4]?.leverageRatio || 0,
        avgDscr: Math.round((yearProjections.reduce((sum, p) => sum + p.dscr, 0) / 5) * 100) / 100,
        entryLeverage: assumptions.ltmEbitda > 0 ? Math.round((assumptions.debtStructure.seniorAmount / assumptions.ltmEbitda) * 100) / 100 : 0,
      },
    };
  };

  const baseResult = runModel(baseAssumptions);

  const upsideAssumptions: GranularAssumptions = {
    ...baseAssumptions,
    revenueGrowth: baseAssumptions.revenueGrowth.map(g => g + 2),
    ebitdaMargins: baseAssumptions.ebitdaMargins.map(m => Math.min(60, m + 2)),
  };
  const upsideResult = runModel(upsideAssumptions);

  const downsideAssumptions: GranularAssumptions = {
    ...baseAssumptions,
    revenueGrowth: baseAssumptions.revenueGrowth.map(g => g - 3),
    ebitdaMargins: baseAssumptions.ebitdaMargins.map(m => Math.max(5, m - 3)),
  };
  const downsideResult = runModel(downsideAssumptions);

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

interface ScenarioComparisonProps {
  assumptions: GranularAssumptions;
  covenantThreshold?: number;
}

export function ScenarioComparison({ assumptions, covenantThreshold = 5.0 }: ScenarioComparisonProps) {
  const [activeScenario, setActiveScenario] = useState<ScenarioType>("base");

  const scenarioResults = useMemo(() => runScenarioAnalysis(assumptions), [assumptions]);

  const leverageChartData = useMemo(() => {
    const baseProj = scenarioResults.base.projections;
    const upsideProj = scenarioResults.upside.projections;
    const downsideProj = scenarioResults.downside.projections;

    return baseProj.map((p, i) => ({
      name: p.label,
      Base: p.leverageRatio,
      Upside: upsideProj[i]?.leverageRatio || 0,
      Downside: downsideProj[i]?.leverageRatio || 0,
    }));
  }, [scenarioResults]);

  const comparisonBarData = [
    {
      metric: "Exit Leverage",
      Base: scenarioResults.comparison.exitLeverage.base,
      Upside: scenarioResults.comparison.exitLeverage.upside,
      Downside: scenarioResults.comparison.exitLeverage.downside,
    },
    {
      metric: "Paydown %",
      Base: scenarioResults.comparison.paydownPercent.base,
      Upside: scenarioResults.comparison.paydownPercent.upside,
      Downside: scenarioResults.comparison.paydownPercent.downside,
    },
    {
      metric: "Avg DSCR",
      Base: scenarioResults.comparison.avgDscr.base,
      Upside: scenarioResults.comparison.avgDscr.upside,
      Downside: scenarioResults.comparison.avgDscr.downside,
    },
  ];

  const formatCurrency = (value: number) => {
    if (Math.abs(value) >= 1000000) return `$${(value / 1000000).toFixed(0)}M`;
    return `$${(value / 1000).toFixed(0)}K`;
  };

  const ScenarioIcon = ({ scenario }: { scenario: ScenarioType }) => {
    switch (scenario) {
      case "upside":
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case "downside":
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      default:
        return <Minus className="h-4 w-4 text-blue-500" />;
    }
  };

  const getScenarioColor = (scenario: ScenarioType) => {
    switch (scenario) {
      case "upside":
        return "bg-green-50 border-green-200 dark:bg-green-950/30";
      case "downside":
        return "bg-red-50 border-red-200 dark:bg-red-950/30";
      default:
        return "bg-blue-50 border-blue-200 dark:bg-blue-950/30";
    }
  };

  const activeResult = scenarioResults[activeScenario];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Scenario Analysis</h3>
          <p className="text-sm text-muted-foreground">Compare Base, Upside, and Downside projections</p>
        </div>
        <div className="flex gap-2">
          {(["base", "upside", "downside"] as ScenarioType[]).map((scenario) => (
            <Button
              key={scenario}
              variant={activeScenario === scenario ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveScenario(scenario)}
              className="capitalize"
            >
              <ScenarioIcon scenario={scenario} />
              <span className="ml-1">{scenario}</span>
            </Button>
          ))}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card className={`border ${getScenarioColor(activeScenario)}`}>
          <CardContent className="pt-4">
            <div className="text-xs text-muted-foreground uppercase mb-1">Entry Leverage</div>
            <div className="text-2xl font-bold tabular-nums">{activeResult.summary.entryLeverage.toFixed(1)}x</div>
          </CardContent>
        </Card>
        <Card className={`border ${getScenarioColor(activeScenario)}`}>
          <CardContent className="pt-4">
            <div className="text-xs text-muted-foreground uppercase mb-1">Exit Leverage</div>
            <div className={`text-2xl font-bold tabular-nums ${activeResult.summary.exitLeverage > covenantThreshold ? "text-red-600" : "text-green-600"}`}>
              {activeResult.summary.exitLeverage.toFixed(1)}x
            </div>
            {activeScenario !== "base" && (
              <div className="flex items-center text-xs mt-1">
                {activeResult.summary.exitLeverage < scenarioResults.base.summary.exitLeverage ? (
                  <ArrowDownRight className="h-3 w-3 text-green-500" />
                ) : (
                  <ArrowUpRight className="h-3 w-3 text-red-500" />
                )}
                <span className="text-muted-foreground ml-1">
                  vs Base: {(activeResult.summary.exitLeverage - scenarioResults.base.summary.exitLeverage).toFixed(2)}x
                </span>
              </div>
            )}
          </CardContent>
        </Card>
        <Card className={`border ${getScenarioColor(activeScenario)}`}>
          <CardContent className="pt-4">
            <div className="text-xs text-muted-foreground uppercase mb-1">Total Paydown</div>
            <div className="text-2xl font-bold tabular-nums">{formatCurrency(activeResult.summary.totalPaydown)}</div>
            <div className="text-xs text-muted-foreground">{activeResult.summary.paydownPercent}% of debt</div>
          </CardContent>
        </Card>
        <Card className={`border ${getScenarioColor(activeScenario)}`}>
          <CardContent className="pt-4">
            <div className="text-xs text-muted-foreground uppercase mb-1">Avg DSCR</div>
            <div className={`text-2xl font-bold tabular-nums ${activeResult.summary.avgDscr < 1.25 ? "text-red-600" : "text-green-600"}`}>
              {activeResult.summary.avgDscr.toFixed(2)}x
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Leverage Trajectory by Scenario</CardTitle>
            <CardDescription>All scenarios compared over 5-year horizon</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={leverageChartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis domain={[0, 6]} tickFormatter={(v) => `${v}x`} tick={{ fontSize: 12 }} />
                  <Tooltip
                    formatter={(value: number, name: string) => [`${value.toFixed(2)}x`, name]}
                    contentStyle={{ borderRadius: "8px", border: "1px solid #e5e7eb" }}
                  />
                  <Legend />
                  <ReferenceLine
                    y={covenantThreshold}
                    stroke="#f59e0b"
                    strokeDasharray="5 5"
                    label={{ value: "Covenant", position: "right", className: "text-xs fill-amber-500" }}
                  />
                  <Line
                    type="monotone"
                    dataKey="Base"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={{ fill: "#3b82f6" }}
                  />
                  <Line
                    type="monotone"
                    dataKey="Upside"
                    stroke="#22c55e"
                    strokeWidth={2}
                    dot={{ fill: "#22c55e" }}
                  />
                  <Line
                    type="monotone"
                    dataKey="Downside"
                    stroke="#ef4444"
                    strokeWidth={2}
                    dot={{ fill: "#ef4444" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Scenario Comparison</CardTitle>
            <CardDescription>Key metrics across all scenarios</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={comparisonBarData} layout="vertical" margin={{ top: 10, right: 30, left: 80, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis type="number" tick={{ fontSize: 12 }} />
                  <YAxis dataKey="metric" type="category" tick={{ fontSize: 12 }} />
                  <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid #e5e7eb" }} />
                  <Legend />
                  <Bar dataKey="Base" fill="#3b82f6" />
                  <Bar dataKey="Upside" fill="#22c55e" />
                  <Bar dataKey="Downside" fill="#ef4444" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Scenario Assumptions */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Scenario Assumptions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            {(["base", "upside", "downside"] as ScenarioType[]).map((scenario) => {
              const adjustedGrowth = scenario === "upside" ? 2 : scenario === "downside" ? -3 : 0;
              const adjustedMargin = scenario === "upside" ? 2 : scenario === "downside" ? -3 : 0;
              return (
                <div
                  key={scenario}
                  className={`p-4 rounded-lg border ${getScenarioColor(scenario)}`}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <ScenarioIcon scenario={scenario} />
                    <span className="font-semibold capitalize">{scenario} Case</span>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Revenue Growth Adj.</span>
                      <span className={adjustedGrowth > 0 ? "text-green-600" : adjustedGrowth < 0 ? "text-red-600" : ""}>
                        {adjustedGrowth > 0 ? "+" : ""}{adjustedGrowth}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Margin Adj.</span>
                      <span className={adjustedMargin > 0 ? "text-green-600" : adjustedMargin < 0 ? "text-red-600" : ""}>
                        {adjustedMargin > 0 ? "+" : ""}{adjustedMargin}%
                      </span>
                    </div>
                    <div className="border-t pt-2 mt-2">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Exit Leverage</span>
                        <Badge variant={scenarioResults[scenario].summary.exitLeverage > covenantThreshold ? "destructive" : "outline"}>
                          {scenarioResults[scenario].summary.exitLeverage.toFixed(2)}x
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
