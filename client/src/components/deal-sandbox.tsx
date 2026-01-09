import React, { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Save, Upload, RefreshCw } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { useToast } from "@/hooks/use-toast";

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

function runGranularModel(assumptions: GranularAssumptions): GranularYearProjection[] {
  const projections: GranularYearProjection[] = [];
  let currentDebt = assumptions.debtStructure.seniorAmount;
  let prevRevenue = assumptions.ltmRevenue;

  const ltmDa = assumptions.ltmRevenue * (assumptions.daPercent / 100);
  projections.push({
    year: 0,
    label: "LTM",
    revenue: assumptions.ltmRevenue,
    revenueGrowth: 0,
    grossEbitda: assumptions.ltmEbitda,
    ebitdaMargin: assumptions.ltmRevenue > 0 ? (assumptions.ltmEbitda / assumptions.ltmRevenue) * 100 : 0,
    adjustments: 0,
    adjEbitda: assumptions.ltmEbitda,
    da: ltmDa,
    ebit: assumptions.ltmEbitda - ltmDa,
    interest: assumptions.debtStructure.seniorAmount * (assumptions.debtStructure.interestRate / 100),
    taxes: 0,
    netIncome: 0,
    daAddback: ltmDa,
    capex: 0,
    mandatoryAmort: 0,
    fcf: 0,
    beginningDebt: assumptions.debtStructure.seniorAmount,
    cashSweep: 0,
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
    const daAddback = da;
    const capexAmount = revenue * (capex / 100);
    const mandatoryAmort = Math.min(assumptions.debtStructure.seniorAmount * (assumptions.debtStructure.amortRate / 100), beginningDebt);
    const fcfBeforeSweep = netIncome + daAddback - capexAmount - mandatoryAmort;
    const availableForSweep = Math.max(0, fcfBeforeSweep);
    const cashSweep = availableForSweep * (assumptions.cashSweepPercent / 100);
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

  return projections;
}

const formatCurrency = (value: number) => {
  if (Math.abs(value) >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`;
  }
  return `$${(value / 1000).toFixed(0)}K`;
};

const formatPercent = (value: number) => `${value.toFixed(1)}%`;
const formatMultiple = (value: number) => `${value.toFixed(2)}x`;

interface DealSandboxProps {
  dealId: string;
  dealName: string;
  initialAssumptions?: GranularAssumptions;
  readOnly?: boolean;
  onPublish?: (assumptions: GranularAssumptions) => void;
}

export function DealSandbox({ dealId, dealName, initialAssumptions, readOnly = false, onPublish }: DealSandboxProps) {
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);

  const defaultAssumptions: GranularAssumptions = {
    ltmRevenue: 500000000,
    ltmEbitda: 125000000,
    revenueGrowth: [5, 6, 7, 5, 4],
    ebitdaMargins: [25, 26, 27, 27, 28],
    capexPercent: [3, 3, 3, 2.5, 2.5],
    adjustments: [5000000, 3000000, 2000000, 1000000, 0],
    taxRate: 25,
    daPercent: 4,
    debtStructure: {
      seniorAmount: 400000000,
      interestRate: 9.5,
      amortRate: 1,
    },
    cashSweepPercent: 50,
  };

  const [assumptions, setAssumptions] = useState<GranularAssumptions>(initialAssumptions || defaultAssumptions);

  useEffect(() => {
    if (initialAssumptions) {
      setAssumptions(initialAssumptions);
    }
  }, [initialAssumptions]);

  const projections = useMemo(() => runGranularModel(assumptions), [assumptions]);

  const updateArrayValue = (field: keyof GranularAssumptions, index: number, value: string) => {
    if (readOnly) return;
    const numValue = parseFloat(value) || 0;
    const arr = [...(assumptions[field] as number[])];
    arr[index] = numValue;
    setAssumptions({ ...assumptions, [field]: arr });
  };

  const updateDebtStructure = (field: keyof DebtStructure, value: string) => {
    if (readOnly) return;
    const numValue = parseFloat(value) || 0;
    setAssumptions({
      ...assumptions,
      debtStructure: { ...assumptions.debtStructure, [field]: numValue },
    });
  };

  const updateScalar = (field: keyof GranularAssumptions, value: string) => {
    if (readOnly) return;
    const numValue = parseFloat(value) || 0;
    setAssumptions({ ...assumptions, [field]: numValue });
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await fetch("/api/deal-models", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dealId,
          name: `${dealName} - Financial Model`,
          assumptions,
          isPublished: false,
        }),
      });
      if (res.ok) {
        toast({ title: "Model Saved", description: "Your financial model has been saved as a draft." });
      } else {
        throw new Error("Failed to save");
      }
    } catch {
      toast({ title: "Error", description: "Failed to save model.", variant: "destructive" });
    }
    setIsSaving(false);
  };

  const handlePublish = async () => {
    setIsPublishing(true);
    try {
      const res = await fetch("/api/deal-models", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dealId,
          name: `${dealName} - Financial Model`,
          assumptions,
          isPublished: true,
        }),
      });
      if (res.ok) {
        toast({ title: "Model Published", description: "Financial model is now available in the Data Room." });
        onPublish?.(assumptions);
      } else {
        throw new Error("Failed to publish");
      }
    } catch {
      toast({ title: "Error", description: "Failed to publish model.", variant: "destructive" });
    }
    setIsPublishing(false);
  };

  const leverageData = projections.map(p => ({
    name: p.label,
    leverage: p.leverageRatio,
    dscr: p.dscr,
  }));

  return (
    <div className="space-y-6">
      {!readOnly && (
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">5-Year Debt Paydown Model</h3>
            <p className="text-sm text-muted-foreground">Build and publish your financial projections</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleSave} disabled={isSaving} data-testid="button-save-model">
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? "Saving..." : "Save Draft"}
            </Button>
            <Button size="sm" onClick={handlePublish} disabled={isPublishing} data-testid="button-publish-model">
              <Upload className="h-4 w-4 mr-2" />
              {isPublishing ? "Publishing..." : "Publish to Data Room"}
            </Button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Model Inputs</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <Label className="text-xs font-semibold text-muted-foreground uppercase">Base Case (LTM)</Label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">LTM Revenue</Label>
                  <Input
                    type="number"
                    value={assumptions.ltmRevenue}
                    onChange={(e) => updateScalar("ltmRevenue", e.target.value)}
                    disabled={readOnly}
                    className="h-8 text-xs"
                    data-testid="input-ltm-revenue"
                  />
                </div>
                <div>
                  <Label className="text-xs">LTM EBITDA</Label>
                  <Input
                    type="number"
                    value={assumptions.ltmEbitda}
                    onChange={(e) => updateScalar("ltmEbitda", e.target.value)}
                    disabled={readOnly}
                    className="h-8 text-xs"
                    data-testid="input-ltm-ebitda"
                  />
                </div>
              </div>
            </div>

            <Separator />

            <div className="space-y-3">
              <Label className="text-xs font-semibold text-muted-foreground uppercase">Debt Structure</Label>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <Label className="text-xs">Senior Debt</Label>
                  <Input
                    type="number"
                    value={assumptions.debtStructure.seniorAmount}
                    onChange={(e) => updateDebtStructure("seniorAmount", e.target.value)}
                    disabled={readOnly}
                    className="h-8 text-xs"
                    data-testid="input-senior-debt"
                  />
                </div>
                <div>
                  <Label className="text-xs">Rate (%)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={assumptions.debtStructure.interestRate}
                    onChange={(e) => updateDebtStructure("interestRate", e.target.value)}
                    disabled={readOnly}
                    className="h-8 text-xs"
                    data-testid="input-interest-rate"
                  />
                </div>
                <div>
                  <Label className="text-xs">Amort (%)</Label>
                  <Input
                    type="number"
                    step="0.5"
                    value={assumptions.debtStructure.amortRate}
                    onChange={(e) => updateDebtStructure("amortRate", e.target.value)}
                    disabled={readOnly}
                    className="h-8 text-xs"
                    data-testid="input-amort-rate"
                  />
                </div>
              </div>
            </div>

            <Separator />

            <div className="space-y-3">
              <Label className="text-xs font-semibold text-muted-foreground uppercase">Year-by-Year Assumptions</Label>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-1 font-medium">Metric</th>
                      {[1, 2, 3, 4, 5].map(y => (
                        <th key={y} className="text-center py-1 font-medium w-14">Y{y}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b">
                      <td className="py-1">Growth %</td>
                      {[0, 1, 2, 3, 4].map(i => (
                        <td key={i} className="p-0.5">
                          <Input
                            type="number"
                            step="0.5"
                            value={assumptions.revenueGrowth[i]}
                            onChange={(e) => updateArrayValue("revenueGrowth", i, e.target.value)}
                            disabled={readOnly}
                            className="h-7 text-xs text-center p-1"
                            data-testid={`input-growth-y${i + 1}`}
                          />
                        </td>
                      ))}
                    </tr>
                    <tr className="border-b">
                      <td className="py-1">Margin %</td>
                      {[0, 1, 2, 3, 4].map(i => (
                        <td key={i} className="p-0.5">
                          <Input
                            type="number"
                            step="0.5"
                            value={assumptions.ebitdaMargins[i]}
                            onChange={(e) => updateArrayValue("ebitdaMargins", i, e.target.value)}
                            disabled={readOnly}
                            className="h-7 text-xs text-center p-1"
                            data-testid={`input-margin-y${i + 1}`}
                          />
                        </td>
                      ))}
                    </tr>
                    <tr className="border-b">
                      <td className="py-1">CapEx %</td>
                      {[0, 1, 2, 3, 4].map(i => (
                        <td key={i} className="p-0.5">
                          <Input
                            type="number"
                            step="0.5"
                            value={assumptions.capexPercent[i]}
                            onChange={(e) => updateArrayValue("capexPercent", i, e.target.value)}
                            disabled={readOnly}
                            className="h-7 text-xs text-center p-1"
                            data-testid={`input-capex-y${i + 1}`}
                          />
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td className="py-1">Adj ($M)</td>
                      {[0, 1, 2, 3, 4].map(i => (
                        <td key={i} className="p-0.5">
                          <Input
                            type="number"
                            value={assumptions.adjustments[i] / 1000000}
                            onChange={(e) => updateArrayValue("adjustments", i, String(parseFloat(e.target.value || "0") * 1000000))}
                            disabled={readOnly}
                            className="h-7 text-xs text-center p-1"
                            data-testid={`input-adj-y${i + 1}`}
                          />
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <Separator />

            <div className="grid grid-cols-3 gap-2">
              <div>
                <Label className="text-xs">Tax Rate %</Label>
                <Input
                  type="number"
                  value={assumptions.taxRate}
                  onChange={(e) => updateScalar("taxRate", e.target.value)}
                  disabled={readOnly}
                  className="h-8 text-xs"
                  data-testid="input-tax-rate"
                />
              </div>
              <div>
                <Label className="text-xs">D&A %</Label>
                <Input
                  type="number"
                  value={assumptions.daPercent}
                  onChange={(e) => updateScalar("daPercent", e.target.value)}
                  disabled={readOnly}
                  className="h-8 text-xs"
                  data-testid="input-da-percent"
                />
              </div>
              <div>
                <Label className="text-xs">Sweep %</Label>
                <Input
                  type="number"
                  value={assumptions.cashSweepPercent}
                  onChange={(e) => updateScalar("cashSweepPercent", e.target.value)}
                  disabled={readOnly}
                  className="h-8 text-xs"
                  data-testid="input-sweep-percent"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Financial Statement (10-K View)</CardTitle>
              <Badge variant="outline" className="text-xs">$ in thousands</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-xs font-mono" data-testid="table-10k-view">
                <thead>
                  <tr className="border-b-2 border-primary">
                    <th className="text-left py-2 pr-4 font-semibold min-w-[180px]">Line Item</th>
                    {projections.map(p => (
                      <th key={p.label} className="text-right py-2 px-2 font-semibold min-w-[80px]">
                        {p.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b font-semibold bg-muted/30">
                    <td className="py-1.5 pr-4">Revenue</td>
                    {projections.map(p => (
                      <td key={p.label} className="text-right py-1.5 px-2">{(p.revenue / 1000).toLocaleString()}</td>
                    ))}
                  </tr>
                  <tr className="border-b text-muted-foreground italic">
                    <td className="py-1 pr-4 pl-4">% Growth</td>
                    {projections.map(p => (
                      <td key={p.label} className="text-right py-1 px-2">
                        {p.year === 0 ? "—" : `${p.revenueGrowth.toFixed(1)}%`}
                      </td>
                    ))}
                  </tr>
                  <tr className="border-b font-semibold">
                    <td className="py-1.5 pr-4">Gross EBITDA</td>
                    {projections.map(p => (
                      <td key={p.label} className="text-right py-1.5 px-2">{(p.grossEbitda / 1000).toLocaleString()}</td>
                    ))}
                  </tr>
                  <tr className="border-b text-muted-foreground italic">
                    <td className="py-1 pr-4 pl-4">% Margin</td>
                    {projections.map(p => (
                      <td key={p.label} className="text-right py-1 px-2">{p.ebitdaMargin.toFixed(1)}%</td>
                    ))}
                  </tr>
                  <tr className="border-b">
                    <td className="py-1 pr-4 pl-4">(+) Adjustments</td>
                    {projections.map(p => (
                      <td key={p.label} className="text-right py-1 px-2">
                        {p.adjustments > 0 ? (p.adjustments / 1000).toLocaleString() : "—"}
                      </td>
                    ))}
                  </tr>
                  <tr className="border-b font-bold bg-primary/5">
                    <td className="py-1.5 pr-4">Adjusted EBITDA</td>
                    {projections.map(p => (
                      <td key={p.label} className="text-right py-1.5 px-2">{(p.adjEbitda / 1000).toLocaleString()}</td>
                    ))}
                  </tr>
                  <tr className="border-b">
                    <td className="py-1 pr-4 pl-4">(-) D&A</td>
                    {projections.map(p => (
                      <td key={p.label} className="text-right py-1 px-2">({(p.da / 1000).toLocaleString()})</td>
                    ))}
                  </tr>
                  <tr className="border-b font-semibold">
                    <td className="py-1.5 pr-4">EBIT</td>
                    {projections.map(p => (
                      <td key={p.label} className="text-right py-1.5 px-2">{(p.ebit / 1000).toLocaleString()}</td>
                    ))}
                  </tr>
                  <tr className="border-b">
                    <td className="py-1 pr-4 pl-4">(-) Interest Expense</td>
                    {projections.map(p => (
                      <td key={p.label} className="text-right py-1 px-2">({(p.interest / 1000).toLocaleString()})</td>
                    ))}
                  </tr>
                  <tr className="border-b">
                    <td className="py-1 pr-4 pl-4">(-) Taxes</td>
                    {projections.map(p => (
                      <td key={p.label} className="text-right py-1 px-2">
                        {p.taxes > 0 ? `(${(p.taxes / 1000).toLocaleString()})` : "—"}
                      </td>
                    ))}
                  </tr>
                  <tr className="border-b font-semibold">
                    <td className="py-1.5 pr-4">Net Income</td>
                    {projections.map(p => (
                      <td key={p.label} className="text-right py-1.5 px-2">{(p.netIncome / 1000).toLocaleString()}</td>
                    ))}
                  </tr>
                  <tr className="border-b">
                    <td className="py-1 pr-4 pl-4">(+) D&A Add-back</td>
                    {projections.map(p => (
                      <td key={p.label} className="text-right py-1 px-2">{(p.daAddback / 1000).toLocaleString()}</td>
                    ))}
                  </tr>
                  <tr className="border-b">
                    <td className="py-1 pr-4 pl-4">(-) CapEx</td>
                    {projections.map(p => (
                      <td key={p.label} className="text-right py-1 px-2">
                        {p.capex > 0 ? `(${(p.capex / 1000).toLocaleString()})` : "—"}
                      </td>
                    ))}
                  </tr>
                  <tr className="border-b">
                    <td className="py-1 pr-4 pl-4">(-) Mandatory Amort</td>
                    {projections.map(p => (
                      <td key={p.label} className="text-right py-1 px-2">
                        {p.mandatoryAmort > 0 ? `(${(p.mandatoryAmort / 1000).toLocaleString()})` : "—"}
                      </td>
                    ))}
                  </tr>
                  <tr className="border-b-2 border-primary font-bold bg-green-50 dark:bg-green-950/20">
                    <td className="py-2 pr-4">Free Cash Flow</td>
                    {projections.map(p => (
                      <td key={p.label} className={`text-right py-2 px-2 ${p.fcf < 0 ? "text-red-600" : ""}`}>
                        {p.year === 0 ? "—" : (p.fcf / 1000).toLocaleString()}
                      </td>
                    ))}
                  </tr>
                  <tr className="h-4" />
                  <tr className="border-b bg-muted/50">
                    <td className="py-1.5 pr-4 font-semibold">Beginning Debt</td>
                    {projections.map(p => (
                      <td key={p.label} className="text-right py-1.5 px-2">{(p.beginningDebt / 1000).toLocaleString()}</td>
                    ))}
                  </tr>
                  <tr className="border-b">
                    <td className="py-1 pr-4 pl-4">(-) Amort + Sweep</td>
                    {projections.map(p => (
                      <td key={p.label} className="text-right py-1 px-2">
                        {p.year === 0 ? "—" : `(${((p.mandatoryAmort + p.cashSweep) / 1000).toLocaleString()})`}
                      </td>
                    ))}
                  </tr>
                  <tr className="border-b font-semibold bg-muted/50">
                    <td className="py-1.5 pr-4">Ending Debt</td>
                    {projections.map(p => (
                      <td key={p.label} className="text-right py-1.5 px-2">{(p.endingDebt / 1000).toLocaleString()}</td>
                    ))}
                  </tr>
                  <tr className="h-4" />
                  <tr className="border-b">
                    <td className="py-1.5 pr-4 font-semibold">Leverage (Debt / EBITDA)</td>
                    {projections.map(p => (
                      <td key={p.label} className={`text-right py-1.5 px-2 font-semibold ${p.leverageRatio > 5 ? "text-amber-600" : p.leverageRatio > 6 ? "text-red-600" : "text-green-600"}`}>
                        {p.leverageRatio.toFixed(2)}x
                      </td>
                    ))}
                  </tr>
                  <tr className="border-b">
                    <td className="py-1.5 pr-4 font-semibold">DSCR</td>
                    {projections.map(p => (
                      <td key={p.label} className={`text-right py-1.5 px-2 font-semibold ${p.dscr < 1.25 ? "text-red-600" : p.dscr < 1.5 ? "text-amber-600" : "text-green-600"}`}>
                        {p.year === 0 ? "—" : `${p.dscr.toFixed(2)}x`}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Leverage Evolution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={leverageData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="name" className="text-xs" />
                <YAxis domain={[0, "auto"]} className="text-xs" tickFormatter={(v) => `${v}x`} />
                <Tooltip
                  formatter={(value: number, name: string) => [
                    `${value.toFixed(2)}x`,
                    name === "leverage" ? "Leverage" : "DSCR"
                  ]}
                />
                <ReferenceLine y={5.5} stroke="#f59e0b" strokeDasharray="5 5" label={{ value: "Covenant", position: "right", className: "text-xs fill-amber-500" }} />
                <Line type="monotone" dataKey="leverage" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4 }} name="Leverage" />
                <Line type="monotone" dataKey="dscr" stroke="hsl(var(--chart-2))" strokeWidth={2} dot={{ r: 4 }} name="DSCR" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
