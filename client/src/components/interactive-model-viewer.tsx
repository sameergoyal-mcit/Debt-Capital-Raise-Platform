import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
  LineChart,
  Line,
} from "recharts";
import { Calculator, TrendingDown, DollarSign, Percent } from "lucide-react";

interface ModelAssumptions {
  revenue: number;
  growthPercent: number;
  ebitdaMargin: number;
  leverageMultiple: number;
  interestRate: number;
  taxRate: number;
  capexPercent: number;
  amortizationPercent: number;
  cashSweepPercent: number;
}

interface YearProjection {
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

function runCreditModel(assumptions: ModelAssumptions): YearProjection[] {
  const {
    revenue,
    ebitdaMargin,
    growthPercent,
    taxRate,
    capexPercent,
    interestRate,
    amortizationPercent,
    leverageMultiple,
    cashSweepPercent,
  } = assumptions;

  const ebitda = revenue * (ebitdaMargin / 100);
  const initialDebt = ebitda * leverageMultiple;
  const projections: YearProjection[] = [];
  let currentDebt = initialDebt;

  for (let year = 1; year <= 5; year++) {
    const beginningDebt = currentDebt;
    const yearRevenue = revenue * Math.pow(1 + growthPercent / 100, year - 1);
    const yearEbitda = yearRevenue * (ebitdaMargin / 100);
    const interest = beginningDebt * (interestRate / 100);
    const preTaxIncome = yearEbitda - interest;
    const taxes = Math.max(0, preTaxIncome * (taxRate / 100));
    const capex = yearRevenue * (capexPercent / 100);
    const fcf = yearEbitda - interest - taxes - capex;
    const mandatoryAmort = Math.min(initialDebt * (amortizationPercent / 100), beginningDebt);
    const availableForSweep = Math.max(0, fcf - mandatoryAmort);
    const cashSweep = availableForSweep * (cashSweepPercent / 100);
    const totalPaydown = mandatoryAmort + cashSweep;
    const endingDebt = Math.max(0, beginningDebt - totalPaydown);
    const leverageRatio = yearEbitda > 0 ? endingDebt / yearEbitda : 0;

    projections.push({
      year,
      revenue: Math.round(yearRevenue),
      ebitda: Math.round(yearEbitda),
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

  return projections;
}

function formatCurrency(value: number): string {
  if (value >= 1_000_000_000) {
    return `$${(value / 1_000_000_000).toFixed(1)}B`;
  }
  if (value >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(1)}M`;
  }
  if (value >= 1_000) {
    return `$${(value / 1_000).toFixed(1)}K`;
  }
  return `$${value.toFixed(0)}`;
}

interface InteractiveModelViewerProps {
  assumptions: ModelAssumptions;
  modelName?: string;
}

export function InteractiveModelViewer({ assumptions, modelName = "Financial Model" }: InteractiveModelViewerProps) {
  const projections = useMemo(() => runCreditModel(assumptions), [assumptions]);

  const ebitda = assumptions.revenue * (assumptions.ebitdaMargin / 100);
  const initialDebt = ebitda * assumptions.leverageMultiple;
  const entryLeverage = assumptions.leverageMultiple;
  const exitLeverage = projections[4]?.leverageRatio || 0;
  const totalPaydown = projections.reduce((sum, p) => sum + p.totalPaydown, 0);
  const paydownPercent = ((initialDebt - projections[4]?.endingDebt) / initialDebt) * 100;

  const debtChartData = projections.map((p) => ({
    year: `Y${p.year}`,
    debt: p.endingDebt / 1_000_000,
    paydown: p.totalPaydown / 1_000_000,
  }));

  const leverageChartData = projections.map((p) => ({
    year: `Y${p.year}`,
    leverage: p.leverageRatio,
  }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calculator className="h-5 w-5 text-primary" />
          <h3 className="font-semibold text-lg">{modelName}</h3>
        </div>
        <Badge variant="secondary">Read Only</Badge>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Card className="bg-muted/30">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
              <TrendingDown className="h-3 w-3" />
              Entry Leverage
            </div>
            <div className="text-xl font-bold">{entryLeverage.toFixed(1)}x</div>
          </CardContent>
        </Card>
        <Card className="bg-muted/30">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
              <TrendingDown className="h-3 w-3" />
              Exit Leverage
            </div>
            <div className="text-xl font-bold text-green-600">{exitLeverage.toFixed(1)}x</div>
          </CardContent>
        </Card>
        <Card className="bg-muted/30">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
              <DollarSign className="h-3 w-3" />
              Total Paydown
            </div>
            <div className="text-xl font-bold">{formatCurrency(totalPaydown)}</div>
          </CardContent>
        </Card>
        <Card className="bg-muted/30">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
              <Percent className="h-3 w-3" />
              Deleveraging
            </div>
            <div className="text-xl font-bold text-green-600">{paydownPercent.toFixed(0)}%</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-sm">Debt Paydown Over 5 Years</CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={debtChartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="year" className="text-xs" tick={{ fill: "currentColor" }} />
                <YAxis className="text-xs" tick={{ fill: "currentColor" }} tickFormatter={(v) => `$${v}M`} />
                <Tooltip
                  contentStyle={{ backgroundColor: "hsl(var(--background))", border: "1px solid hsl(var(--border))" }}
                  formatter={(value: number) => [`$${value.toFixed(1)}M`, ""]}
                />
                <Area type="monotone" dataKey="debt" name="Remaining Debt" stroke="hsl(var(--primary))" fill="hsl(var(--primary)/0.3)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-sm">Leverage Trajectory</CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <div className="h-32">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={leverageChartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="year" className="text-xs" tick={{ fill: "currentColor" }} />
                <YAxis className="text-xs" tick={{ fill: "currentColor" }} tickFormatter={(v) => `${v}x`} domain={[0, "auto"]} />
                <Tooltip
                  contentStyle={{ backgroundColor: "hsl(var(--background))", border: "1px solid hsl(var(--border))" }}
                  formatter={(value: number) => [`${value.toFixed(2)}x`, "Leverage"]}
                />
                <Line type="monotone" dataKey="leverage" stroke="hsl(var(--chart-2))" strokeWidth={2} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <div className="bg-muted/30 rounded-lg p-3 text-xs text-muted-foreground space-y-1">
        <div className="font-medium text-foreground">Model Assumptions</div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1">
          <div>Revenue: {formatCurrency(assumptions.revenue)}</div>
          <div>Growth: {assumptions.growthPercent}%</div>
          <div>EBITDA Margin: {assumptions.ebitdaMargin}%</div>
          <div>Interest Rate: {assumptions.interestRate}%</div>
          <div>Amortization: {assumptions.amortizationPercent}%</div>
          <div>Cash Sweep: {assumptions.cashSweepPercent}%</div>
        </div>
      </div>
    </div>
  );
}
