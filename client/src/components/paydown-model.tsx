import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { TrendingUp, TrendingDown, DollarSign, Percent, Calculator } from "lucide-react";

interface DealAssumptions {
  baseRevenue: number;
  revenueGrowth: number;
  ebitdaMargin: number;
  interestRate: number;
  initialDebt: number;
  mandatoryAmort: number;
  cashSweepPercent: number;
}

interface YearProjection {
  year: number;
  revenue: number;
  ebitda: number;
  interest: number;
  fcf: number;
  mandatoryPaydown: number;
  cashSweep: number;
  totalPaydown: number;
  endingDebt: number;
  leverage: number;
}

function runCreditModel(assumptions: DealAssumptions): YearProjection[] {
  const projections: YearProjection[] = [];
  let currentDebt = assumptions.initialDebt;

  for (let year = 1; year <= 5; year++) {
    const revenue = assumptions.baseRevenue * Math.pow(1 + assumptions.revenueGrowth / 100, year - 1);
    const ebitda = revenue * (assumptions.ebitdaMargin / 100);
    const interest = currentDebt * (assumptions.interestRate / 100);
    const fcf = ebitda - interest - (ebitda * 0.25); // Simplified: 25% capex/taxes
    
    const mandatoryPaydown = Math.min(assumptions.mandatoryAmort, currentDebt);
    const availableForSweep = Math.max(0, fcf - mandatoryPaydown);
    const cashSweep = availableForSweep * (assumptions.cashSweepPercent / 100);
    const totalPaydown = mandatoryPaydown + cashSweep;
    
    const endingDebt = Math.max(0, currentDebt - totalPaydown);
    const leverage = ebitda > 0 ? endingDebt / ebitda : 0;

    projections.push({
      year,
      revenue: Math.round(revenue),
      ebitda: Math.round(ebitda),
      interest: Math.round(interest),
      fcf: Math.round(fcf),
      mandatoryPaydown: Math.round(mandatoryPaydown),
      cashSweep: Math.round(cashSweep),
      totalPaydown: Math.round(totalPaydown),
      endingDebt: Math.round(endingDebt),
      leverage: Math.round(leverage * 100) / 100,
    });

    currentDebt = endingDebt;
  }

  return projections;
}

function formatCurrency(value: number): string {
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`;
  }
  return `$${(value / 1000).toFixed(0)}K`;
}

interface PaydownModelProps {
  dealAmount?: number;
  dealName?: string;
}

export function PaydownModel({ dealAmount = 450000000, dealName = "Deal" }: PaydownModelProps) {
  const [assumptions, setAssumptions] = useState<DealAssumptions>({
    baseRevenue: dealAmount * 0.4, // Assume 2.5x revenue multiple
    revenueGrowth: 5,
    ebitdaMargin: 25,
    interestRate: 8,
    initialDebt: dealAmount,
    mandatoryAmort: dealAmount * 0.05, // 5% annual mandatory
    cashSweepPercent: 50,
  });

  const projections = useMemo(() => runCreditModel(assumptions), [assumptions]);

  const chartData = projections.map((p) => ({
    year: `Year ${p.year}`,
    "Ending Debt": p.endingDebt / 1000000,
    "Free Cash Flow": p.fcf / 1000000,
    "Total Paydown": p.totalPaydown / 1000000,
  }));

  const finalLeverage = projections[projections.length - 1]?.leverage || 0;
  const totalPaydown = projections.reduce((sum, p) => sum + p.totalPaydown, 0);
  const paydownPercent = (totalPaydown / assumptions.initialDebt) * 100;

  return (
    <div className="space-y-6" data-testid="paydown-model">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Calculator className="h-6 w-6" />
            Interactive Paydown Model
          </h2>
          <p className="text-muted-foreground">
            Adjust assumptions to see 5-year debt paydown projections
          </p>
        </div>
        <div className="flex gap-2">
          <Badge variant={finalLeverage < 3 ? "default" : finalLeverage < 5 ? "secondary" : "destructive"}>
            Exit Leverage: {finalLeverage.toFixed(1)}x
          </Badge>
          <Badge variant="outline">
            {paydownPercent.toFixed(0)}% Paydown
          </Badge>
        </div>
      </div>

      {/* Assumption Sliders */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-600" />
              Revenue Growth
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Annual Growth</span>
                <span className="font-semibold">{assumptions.revenueGrowth}%</span>
              </div>
              <Slider
                data-testid="slider-revenue-growth"
                value={[assumptions.revenueGrowth]}
                onValueChange={([v]) => setAssumptions({ ...assumptions, revenueGrowth: v })}
                min={-5}
                max={20}
                step={0.5}
                className="cursor-pointer"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Percent className="h-4 w-4 text-blue-600" />
              EBITDA Margin
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Margin %</span>
                <span className="font-semibold">{assumptions.ebitdaMargin}%</span>
              </div>
              <Slider
                data-testid="slider-ebitda-margin"
                value={[assumptions.ebitdaMargin]}
                onValueChange={([v]) => setAssumptions({ ...assumptions, ebitdaMargin: v })}
                min={10}
                max={50}
                step={1}
                className="cursor-pointer"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-orange-600" />
              Interest Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">All-in Rate</span>
                <span className="font-semibold">{assumptions.interestRate}%</span>
              </div>
              <Slider
                data-testid="slider-interest-rate"
                value={[assumptions.interestRate]}
                onValueChange={([v]) => setAssumptions({ ...assumptions, interestRate: v })}
                min={4}
                max={15}
                step={0.25}
                className="cursor-pointer"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-purple-600" />
              Cash Sweep %
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Excess CF Sweep</span>
                <span className="font-semibold">{assumptions.cashSweepPercent}%</span>
              </div>
              <Slider
                data-testid="slider-cash-sweep"
                value={[assumptions.cashSweepPercent]}
                onValueChange={([v]) => setAssumptions({ ...assumptions, cashSweepPercent: v })}
                min={0}
                max={100}
                step={5}
                className="cursor-pointer"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Debt Paydown Waterfall</CardTitle>
          <CardDescription>5-Year projection showing debt reduction vs free cash flow ($ millions)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="year" className="text-xs" />
                <YAxis tickFormatter={(v) => `$${v}M`} className="text-xs" />
                <Tooltip
                  formatter={(value: number) => [`$${value.toFixed(1)}M`]}
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--background))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
                <Legend />
                <Bar dataKey="Ending Debt" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Free Cash Flow" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Total Paydown" fill="hsl(var(--chart-3))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Table */}
      <Card>
        <CardHeader>
          <CardTitle>Detailed Projections</CardTitle>
          <CardDescription>Year-by-year breakdown of cash flows and debt service</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Year</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                  <TableHead className="text-right">EBITDA</TableHead>
                  <TableHead className="text-right">Interest</TableHead>
                  <TableHead className="text-right">FCF</TableHead>
                  <TableHead className="text-right">Mandatory</TableHead>
                  <TableHead className="text-right">Cash Sweep</TableHead>
                  <TableHead className="text-right">End Debt</TableHead>
                  <TableHead className="text-right">Leverage</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {projections.map((p) => (
                  <TableRow key={p.year} data-testid={`row-projection-${p.year}`}>
                    <TableCell className="font-medium">Year {p.year}</TableCell>
                    <TableCell className="text-right">{formatCurrency(p.revenue)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(p.ebitda)}</TableCell>
                    <TableCell className="text-right text-red-600">({formatCurrency(p.interest)})</TableCell>
                    <TableCell className="text-right text-green-600">{formatCurrency(p.fcf)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(p.mandatoryPaydown)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(p.cashSweep)}</TableCell>
                    <TableCell className="text-right font-semibold">{formatCurrency(p.endingDebt)}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant={p.leverage < 3 ? "default" : p.leverage < 5 ? "secondary" : "destructive"}>
                        {p.leverage.toFixed(1)}x
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900 border-green-200 dark:border-green-800">
          <CardContent className="pt-6">
            <div className="text-sm text-green-700 dark:text-green-300">Total Debt Paydown</div>
            <div className="text-2xl font-bold text-green-900 dark:text-green-100">
              {formatCurrency(totalPaydown)}
            </div>
            <div className="text-xs text-green-600 dark:text-green-400">
              {paydownPercent.toFixed(1)}% of initial debt
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 border-blue-200 dark:border-blue-800">
          <CardContent className="pt-6">
            <div className="text-sm text-blue-700 dark:text-blue-300">Exit Debt Balance</div>
            <div className="text-2xl font-bold text-blue-900 dark:text-blue-100">
              {formatCurrency(projections[4]?.endingDebt || 0)}
            </div>
            <div className="text-xs text-blue-600 dark:text-blue-400">
              After 5 years
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900 border-purple-200 dark:border-purple-800">
          <CardContent className="pt-6">
            <div className="text-sm text-purple-700 dark:text-purple-300">Exit Leverage</div>
            <div className="text-2xl font-bold text-purple-900 dark:text-purple-100">
              {finalLeverage.toFixed(2)}x
            </div>
            <div className="text-xs text-purple-600 dark:text-purple-400">
              Net Debt / EBITDA
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
