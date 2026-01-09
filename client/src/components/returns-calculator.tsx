import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  LineChart,
  Line,
  AreaChart,
  Area,
} from "recharts";
import { Calculator, DollarSign, Percent, TrendingUp } from "lucide-react";

interface LenderReturnsInput {
  principalAmount: number;
  oid: number;
  upfrontFee: number;
  spread: number;
  baseRate: number;
  holdPeriod: number;
  prepaymentPremiums: number[];
  mandatoryAmortPercent: number;
}

interface LenderCashFlow {
  year: number;
  beginningPrincipal: number;
  interest: number;
  amortization: number;
  prepayment: number;
  prepaymentPremium: number;
  totalCash: number;
  endingPrincipal: number;
  cumulativeCash: number;
}

interface LenderReturnsResult {
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
      npvDerivative -= (t * cf) / Math.pow(1 + rate, t + 1);
    });

    if (Math.abs(npvDerivative) < 0.0001) break;
    const newRate = rate - npv / npvDerivative;

    if (Math.abs(newRate - rate) < tolerance) {
      return newRate * 100;
    }

    rate = newRate;
  }

  return rate * 100;
}

function calculateLenderReturns(input: LenderReturnsInput): LenderReturnsResult {
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

  const oidAmount = principalAmount * (oid / 100);
  const upfrontFeeAmount = principalAmount * (upfrontFee / 100);
  const initialInvestment = principalAmount - oidAmount - upfrontFeeAmount;

  const allInRate = baseRate + spread / 100;
  const cashFlows: LenderCashFlow[] = [];
  let currentPrincipal = principalAmount;
  let cumulativeCash = 0;

  for (let year = 1; year <= holdPeriod; year++) {
    const beginningPrincipal = currentPrincipal;
    const interest = beginningPrincipal * (allInRate / 100);
    const amortization = Math.min(
      principalAmount * (mandatoryAmortPercent / 100),
      currentPrincipal
    );

    const isExitYear = year === holdPeriod;
    const remainingAfterAmort = beginningPrincipal - amortization;
    const prepayment = isExitYear ? remainingAfterAmort : 0;

    const premiumRate = prepaymentPremiums[year - 1] || 100;
    const prepaymentPremium = isExitYear ? prepayment * ((premiumRate - 100) / 100) : 0;

    const endingPrincipal = beginningPrincipal - amortization - prepayment;
    const totalCash = interest + amortization + prepayment + prepaymentPremium;
    cumulativeCash += totalCash;

    cashFlows.push({
      year,
      beginningPrincipal: Math.round(beginningPrincipal),
      interest: Math.round(interest),
      amortization: Math.round(amortization),
      prepayment: Math.round(prepayment),
      prepaymentPremium: Math.round(prepaymentPremium),
      totalCash: Math.round(totalCash),
      endingPrincipal: Math.round(endingPrincipal),
      cumulativeCash: Math.round(cumulativeCash),
    });

    currentPrincipal = endingPrincipal;
  }

  const totalCashReceived = cashFlows.reduce((sum, cf) => sum + cf.totalCash, 0);
  const totalInterest = cashFlows.reduce((sum, cf) => sum + cf.interest, 0);
  const totalPrincipal = cashFlows.reduce((sum, cf) => sum + cf.amortization + cf.prepayment, 0);
  const totalFees = oidAmount + upfrontFeeAmount + cashFlows.reduce((sum, cf) => sum + cf.prepaymentPremium, 0);

  const moic = totalCashReceived / initialInvestment;
  const irr = calculateIRR(initialInvestment, cashFlows.map((cf) => cf.totalCash));
  const averageYield = ((totalCashReceived - initialInvestment) / initialInvestment / holdPeriod) * 100;

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

interface ReturnsCalculatorProps {
  defaultPrincipal?: number;
  defaultSpread?: number;
}

export function ReturnsCalculator({
  defaultPrincipal = 25000000,
  defaultSpread = 500,
}: ReturnsCalculatorProps) {
  const [input, setInput] = useState<LenderReturnsInput>({
    principalAmount: defaultPrincipal,
    oid: 2,
    upfrontFee: 1,
    spread: defaultSpread,
    baseRate: 5.25,
    holdPeriod: 3,
    prepaymentPremiums: [102, 101, 100, 100, 100],
    mandatoryAmortPercent: 5,
  });

  const result = useMemo(() => calculateLenderReturns(input), [input]);

  const updateInput = (field: keyof LenderReturnsInput, value: number) => {
    setInput((prev) => ({ ...prev, [field]: value }));
  };

  const formatCurrency = (value: number) => {
    if (Math.abs(value) >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
    if (Math.abs(value) >= 1000) return `$${(value / 1000).toFixed(0)}K`;
    return `$${value.toFixed(0)}`;
  };

  const cashFlowChartData = result.cashFlows.map((cf) => ({
    name: `Year ${cf.year}`,
    Interest: cf.interest / 1000000,
    Amortization: cf.amortization / 1000000,
    Prepayment: (cf.prepayment + cf.prepaymentPremium) / 1000000,
    Cumulative: cf.cumulativeCash / 1000000,
  }));

  const irrByYear = useMemo(() => {
    return [1, 2, 3, 4, 5].map((year) => {
      const yearResult = calculateLenderReturns({ ...input, holdPeriod: year });
      return {
        year: `Year ${year}`,
        irr: yearResult.irr,
        moic: yearResult.moic,
      };
    });
  }, [input]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Lender Returns Calculator
          </h3>
          <p className="text-sm text-muted-foreground">
            Calculate IRR, MOIC, and cash flow analysis
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Input Panel */}
        <Card className="col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Investment Parameters</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between">
                <Label className="text-sm">Principal Amount</Label>
                <span className="text-sm font-medium">{formatCurrency(input.principalAmount)}</span>
              </div>
              <Slider
                value={[input.principalAmount / 1000000]}
                min={1}
                max={100}
                step={1}
                onValueChange={([v]) => updateInput("principalAmount", v * 1000000)}
              />
            </div>

            <Separator />

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">OID (%)</Label>
                <Input
                  type="number"
                  step="0.25"
                  value={input.oid}
                  onChange={(e) => updateInput("oid", Number(e.target.value))}
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Upfront Fee (%)</Label>
                <Input
                  type="number"
                  step="0.25"
                  value={input.upfrontFee}
                  onChange={(e) => updateInput("upfrontFee", Number(e.target.value))}
                  className="h-8 text-sm"
                />
              </div>
            </div>

            <Separator />

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Base Rate (%)</Label>
                <Input
                  type="number"
                  step="0.25"
                  value={input.baseRate}
                  onChange={(e) => updateInput("baseRate", Number(e.target.value))}
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Spread (bps)</Label>
                <Input
                  type="number"
                  step="25"
                  value={input.spread}
                  onChange={(e) => updateInput("spread", Number(e.target.value))}
                  className="h-8 text-sm"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between">
                <Label className="text-sm">All-In Rate</Label>
                <Badge variant="secondary">{(input.baseRate + input.spread / 100).toFixed(2)}%</Badge>
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <div className="flex justify-between">
                <Label className="text-sm">Hold Period</Label>
                <span className="text-sm font-medium">{input.holdPeriod} years</span>
              </div>
              <Slider
                value={[input.holdPeriod]}
                min={1}
                max={5}
                step={1}
                onValueChange={([v]) => updateInput("holdPeriod", v)}
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Mandatory Amort (%/yr)</Label>
              <Input
                type="number"
                step="1"
                value={input.mandatoryAmortPercent}
                onChange={(e) => updateInput("mandatoryAmortPercent", Number(e.target.value))}
                className="h-8 text-sm"
              />
            </div>

            <Separator />

            <div className="space-y-2">
              <Label className="text-xs">Prepayment Premiums</Label>
              <div className="grid grid-cols-5 gap-1">
                {[0, 1, 2, 3, 4].map((i) => (
                  <div key={i} className="text-center">
                    <div className="text-xs text-muted-foreground mb-1">Y{i + 1}</div>
                    <Input
                      type="number"
                      value={input.prepaymentPremiums[i]}
                      onChange={(e) => {
                        const newPremiums = [...input.prepaymentPremiums];
                        newPremiums[i] = Number(e.target.value);
                        setInput((prev) => ({ ...prev, prepaymentPremiums: newPremiums }));
                      }}
                      className="h-7 text-xs text-center p-1"
                    />
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Results Panel */}
        <div className="col-span-2 space-y-4">
          {/* Key Metrics */}
          <div className="grid grid-cols-4 gap-4">
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  <span className="text-xs text-muted-foreground uppercase">IRR</span>
                </div>
                <div className="text-2xl font-bold text-primary">{result.irr.toFixed(1)}%</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 mb-1">
                  <Percent className="h-4 w-4" />
                  <span className="text-xs text-muted-foreground uppercase">MOIC</span>
                </div>
                <div className="text-2xl font-bold">{result.moic.toFixed(2)}x</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 mb-1">
                  <DollarSign className="h-4 w-4" />
                  <span className="text-xs text-muted-foreground uppercase">Total Cash</span>
                </div>
                <div className="text-2xl font-bold">{formatCurrency(result.totalCashReceived)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 mb-1">
                  <DollarSign className="h-4 w-4" />
                  <span className="text-xs text-muted-foreground uppercase">Investment</span>
                </div>
                <div className="text-2xl font-bold">{formatCurrency(result.initialInvestment)}</div>
              </CardContent>
            </Card>
          </div>

          {/* Cash Flow Chart */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Cash Flow Waterfall</CardTitle>
              <CardDescription>Annual cash flows by component</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={cashFlowChartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis tickFormatter={(v) => `$${v}M`} tick={{ fontSize: 12 }} />
                    <Tooltip
                      formatter={(value: number, name: string) => [`$${value.toFixed(2)}M`, name]}
                      contentStyle={{ borderRadius: "8px", border: "1px solid #e5e7eb" }}
                    />
                    <Legend />
                    <Bar dataKey="Interest" stackId="a" fill="#3b82f6" />
                    <Bar dataKey="Amortization" stackId="a" fill="#22c55e" />
                    <Bar dataKey="Prepayment" stackId="a" fill="#f59e0b" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* IRR by Exit Year */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Returns by Exit Year</CardTitle>
              <CardDescription>How returns change with hold period</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={irrByYear} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="year" tick={{ fontSize: 12 }} />
                    <YAxis yAxisId="left" tickFormatter={(v) => `${v}%`} tick={{ fontSize: 12 }} />
                    <YAxis yAxisId="right" orientation="right" tickFormatter={(v) => `${v}x`} tick={{ fontSize: 12 }} />
                    <Tooltip
                      formatter={(value: number, name: string) => [
                        name === "irr" ? `${value.toFixed(1)}%` : `${value.toFixed(2)}x`,
                        name === "irr" ? "IRR" : "MOIC",
                      ]}
                      contentStyle={{ borderRadius: "8px", border: "1px solid #e5e7eb" }}
                    />
                    <Legend />
                    <Line yAxisId="left" type="monotone" dataKey="irr" stroke="#3b82f6" strokeWidth={2} name="IRR" />
                    <Line yAxisId="right" type="monotone" dataKey="moic" stroke="#22c55e" strokeWidth={2} name="MOIC" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Cash Flow Table */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Detailed Cash Flows</CardTitle>
            </CardHeader>
            <CardContent>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2">Period</th>
                    <th className="text-right py-2">Beginning</th>
                    <th className="text-right py-2">Interest</th>
                    <th className="text-right py-2">Amort</th>
                    <th className="text-right py-2">Prepay</th>
                    <th className="text-right py-2">Premium</th>
                    <th className="text-right py-2 font-semibold">Total</th>
                    <th className="text-right py-2">Ending</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b bg-muted/30">
                    <td className="py-2">Initial</td>
                    <td className="text-right py-2">{formatCurrency(input.principalAmount)}</td>
                    <td className="text-right py-2 text-muted-foreground">—</td>
                    <td className="text-right py-2 text-muted-foreground">—</td>
                    <td className="text-right py-2 text-muted-foreground">—</td>
                    <td className="text-right py-2 text-muted-foreground">—</td>
                    <td className="text-right py-2 font-semibold text-red-600">
                      ({formatCurrency(result.initialInvestment)})
                    </td>
                    <td className="text-right py-2">{formatCurrency(input.principalAmount)}</td>
                  </tr>
                  {result.cashFlows.map((cf) => (
                    <tr key={cf.year} className="border-b">
                      <td className="py-2">Year {cf.year}</td>
                      <td className="text-right py-2 text-muted-foreground">{formatCurrency(cf.beginningPrincipal)}</td>
                      <td className="text-right py-2">{formatCurrency(cf.interest)}</td>
                      <td className="text-right py-2">{formatCurrency(cf.amortization)}</td>
                      <td className="text-right py-2">{cf.prepayment > 0 ? formatCurrency(cf.prepayment) : "—"}</td>
                      <td className="text-right py-2">{cf.prepaymentPremium > 0 ? formatCurrency(cf.prepaymentPremium) : "—"}</td>
                      <td className="text-right py-2 font-semibold text-green-600">{formatCurrency(cf.totalCash)}</td>
                      <td className="text-right py-2 text-muted-foreground">{formatCurrency(cf.endingPrincipal)}</td>
                    </tr>
                  ))}
                  <tr className="font-semibold bg-muted/30">
                    <td className="py-2">Total</td>
                    <td className="text-right py-2">—</td>
                    <td className="text-right py-2">{formatCurrency(result.totalInterest)}</td>
                    <td className="text-right py-2" colSpan={3}>
                      Principal: {formatCurrency(result.totalPrincipal)}
                    </td>
                    <td className="text-right py-2 text-green-600">{formatCurrency(result.totalCashReceived)}</td>
                    <td className="text-right py-2">—</td>
                  </tr>
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
