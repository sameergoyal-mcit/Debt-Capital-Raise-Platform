import React, { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from "recharts";
import { ArrowDown, ArrowUp, Activity } from "lucide-react";

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

type SensitivityMetric = "exitLeverage" | "paydownPercent" | "avgDscr";

interface SensitivityResult {
  variable: string;
  variableLabel: string;
  baseValue: number;
  lowCase: { value: number; result: number; impact: number };
  highCase: { value: number; result: number; impact: number };
  baseResult: number;
}

// Client-side model runner for sensitivity analysis
function runModelForSensitivity(assumptions: GranularAssumptions): {
  exitLeverage: number;
  paydownPercent: number;
  avgDscr: number;
} {
  let currentDebt = assumptions.debtStructure.seniorAmount;
  let prevRevenue = assumptions.ltmRevenue;
  let totalDscr = 0;

  for (let i = 0; i < 5; i++) {
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
    currentDebt = Math.max(0, beginningDebt - mandatoryAmort - cashSweep);

    const debtService = interest + mandatoryAmort;
    const dscr = debtService > 0 ? adjEbitda / debtService : 0;
    totalDscr += dscr;

    prevRevenue = revenue;
  }

  const exitLeverage = prevRevenue > 0 ? currentDebt / (prevRevenue * (assumptions.ebitdaMargins[4] || 25) / 100) : 0;
  const totalPaydown = assumptions.debtStructure.seniorAmount - currentDebt;
  const paydownPercent = (totalPaydown / assumptions.debtStructure.seniorAmount) * 100;

  return {
    exitLeverage: Math.round(exitLeverage * 100) / 100,
    paydownPercent: Math.round(paydownPercent * 10) / 10,
    avgDscr: Math.round((totalDscr / 5) * 100) / 100,
  };
}

function runSensitivityAnalysis(
  baseAssumptions: GranularAssumptions,
  targetMetric: SensitivityMetric,
  variationPercent: number
): SensitivityResult[] {
  const baseResult = runModelForSensitivity(baseAssumptions);
  const baseMetricValue = baseResult[targetMetric];

  const variables: Array<{
    key: string;
    label: string;
    getBase: () => number;
    applyLow: (a: GranularAssumptions, delta: number) => GranularAssumptions;
    applyHigh: (a: GranularAssumptions, delta: number) => GranularAssumptions;
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
    const lowResult = runModelForSensitivity(lowAssumptions);
    const lowMetric = lowResult[targetMetric];

    const highAssumptions = v.applyHigh(baseAssumptions, delta);
    const highResult = runModelForSensitivity(highAssumptions);
    const highMetric = highResult[targetMetric];

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

interface SensitivityChartProps {
  assumptions: GranularAssumptions;
}

const metricLabels: Record<SensitivityMetric, string> = {
  exitLeverage: "Exit Leverage",
  paydownPercent: "Paydown %",
  avgDscr: "Avg DSCR",
};

const metricUnits: Record<SensitivityMetric, string> = {
  exitLeverage: "x",
  paydownPercent: "%",
  avgDscr: "x",
};

export function SensitivityChart({ assumptions }: SensitivityChartProps) {
  const [targetMetric, setTargetMetric] = useState<SensitivityMetric>("exitLeverage");
  const [variationPercent, setVariationPercent] = useState(20);

  const sensitivityData = useMemo(
    () => runSensitivityAnalysis(assumptions, targetMetric, variationPercent),
    [assumptions, targetMetric, variationPercent]
  );

  // Transform data for tornado chart
  const tornadoData = useMemo(() => {
    return sensitivityData
      .map((s) => ({
        variable: s.variableLabel,
        lowImpact: s.lowCase.impact,
        highImpact: s.highCase.impact,
        totalRange: Math.abs(s.highCase.impact - s.lowCase.impact),
        baseValue: s.baseValue,
        lowValue: s.lowCase.value,
        highValue: s.highCase.value,
        lowResult: s.lowCase.result,
        highResult: s.highCase.result,
      }))
      .sort((a, b) => b.totalRange - a.totalRange);
  }, [sensitivityData]);

  const baseResult = sensitivityData[0]?.baseResult || 0;

  // Find max absolute impact for symmetric axis
  const maxImpact = Math.max(
    ...tornadoData.flatMap((d) => [Math.abs(d.lowImpact), Math.abs(d.highImpact)])
  );

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-background border rounded-lg shadow-lg p-3 text-sm">
          <p className="font-semibold mb-2">{data.variable}</p>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <ArrowDown className="h-3 w-3 text-red-500" />
              <span className="text-muted-foreground">Low ({data.lowValue.toFixed(1)}):</span>
              <span className="font-medium">{data.lowResult.toFixed(2)}{metricUnits[targetMetric]}</span>
              <Badge variant={data.lowImpact > 0 ? "destructive" : "outline"} className="text-xs">
                {data.lowImpact > 0 ? "+" : ""}{data.lowImpact.toFixed(2)}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <ArrowUp className="h-3 w-3 text-green-500" />
              <span className="text-muted-foreground">High ({data.highValue.toFixed(1)}):</span>
              <span className="font-medium">{data.highResult.toFixed(2)}{metricUnits[targetMetric]}</span>
              <Badge variant={data.highImpact > 0 ? "destructive" : "outline"} className="text-xs">
                {data.highImpact > 0 ? "+" : ""}{data.highImpact.toFixed(2)}
              </Badge>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Sensitivity Analysis
          </h3>
          <p className="text-sm text-muted-foreground">
            Impact of variable changes on {metricLabels[targetMetric]}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Label className="text-sm">Target Metric:</Label>
            <Select value={targetMetric} onValueChange={(v) => setTargetMetric(v as SensitivityMetric)}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="exitLeverage">Exit Leverage</SelectItem>
                <SelectItem value="paydownPercent">Paydown %</SelectItem>
                <SelectItem value="avgDscr">Avg DSCR</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-sm">Variation:</Label>
            <div className="flex items-center gap-2">
              <Slider
                value={[variationPercent]}
                min={5}
                max={50}
                step={5}
                className="w-24"
                onValueChange={([v]) => setVariationPercent(v)}
              />
              <span className="text-sm font-medium w-12">{variationPercent}%</span>
            </div>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Tornado Chart</CardTitle>
          <CardDescription>
            Variables sorted by impact magnitude. Base {metricLabels[targetMetric]}: {baseResult.toFixed(2)}{metricUnits[targetMetric]}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={tornadoData}
                layout="vertical"
                margin={{ top: 10, right: 30, left: 100, bottom: 10 }}
              >
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  type="number"
                  domain={[-maxImpact * 1.1, maxImpact * 1.1]}
                  tickFormatter={(v) => v.toFixed(2)}
                  tick={{ fontSize: 12 }}
                />
                <YAxis dataKey="variable" type="category" tick={{ fontSize: 12 }} width={90} />
                <Tooltip content={<CustomTooltip />} />
                <ReferenceLine x={0} stroke="#888" strokeWidth={2} />
                <Bar dataKey="lowImpact" name="Low Case">
                  {tornadoData.map((entry, index) => (
                    <Cell
                      key={`low-${index}`}
                      fill={entry.lowImpact > 0 ? "#ef4444" : "#22c55e"}
                    />
                  ))}
                </Bar>
                <Bar dataKey="highImpact" name="High Case">
                  {tornadoData.map((entry, index) => (
                    <Cell
                      key={`high-${index}`}
                      fill={entry.highImpact > 0 ? "#ef4444" : "#22c55e"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Impact Summary Table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Impact Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2">Variable</th>
                <th className="text-center py-2">Base Value</th>
                <th className="text-center py-2">Low Case</th>
                <th className="text-center py-2">High Case</th>
                <th className="text-center py-2">Range</th>
              </tr>
            </thead>
            <tbody>
              {tornadoData.map((row, i) => (
                <tr key={i} className="border-b">
                  <td className="py-2 font-medium">{row.variable}</td>
                  <td className="text-center py-2 text-muted-foreground">{row.baseValue.toFixed(1)}</td>
                  <td className="text-center py-2">
                    <div className="flex flex-col items-center">
                      <span>{row.lowResult.toFixed(2)}{metricUnits[targetMetric]}</span>
                      <Badge variant={row.lowImpact > 0 ? "destructive" : "secondary"} className="text-xs mt-1">
                        {row.lowImpact > 0 ? "+" : ""}{row.lowImpact.toFixed(2)}
                      </Badge>
                    </div>
                  </td>
                  <td className="text-center py-2">
                    <div className="flex flex-col items-center">
                      <span>{row.highResult.toFixed(2)}{metricUnits[targetMetric]}</span>
                      <Badge variant={row.highImpact > 0 ? "destructive" : "secondary"} className="text-xs mt-1">
                        {row.highImpact > 0 ? "+" : ""}{row.highImpact.toFixed(2)}
                      </Badge>
                    </div>
                  </td>
                  <td className="text-center py-2">
                    <Badge variant="outline">{row.totalRange.toFixed(2)}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
