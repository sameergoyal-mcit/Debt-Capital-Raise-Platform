import React, { useState, useMemo } from "react";
import { useRoute, useLocation } from "wouter";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
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
import { Calculator, Upload, Download, TrendingDown, DollarSign, Percent, RefreshCw, Save } from "lucide-react";
import { mockDeals } from "@/data/deals";

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

export default function FinancialModel() {
  const [, params] = useRoute("/sandbox/financial-model/:dealId?");
  const dealId = params?.dealId;
  const deal = dealId ? mockDeals.find((d) => d.id === dealId) : null;
  const { toast } = useToast();
  const [, navigate] = useLocation();

  const [assumptions, setAssumptions] = useState<ModelAssumptions>({
    revenue: 100_000_000,
    growthPercent: 5,
    ebitdaMargin: 25,
    leverageMultiple: 4.0,
    interestRate: 10,
    taxRate: 25,
    capexPercent: 3,
    amortizationPercent: 5,
    cashSweepPercent: 50,
  });

  const projections = useMemo(() => runCreditModel(assumptions), [assumptions]);

  const chartData = projections.map((p) => ({
    name: `Year ${p.year}`,
    Debt: p.endingDebt / 1_000_000,
    EBITDA: p.ebitda / 1_000_000,
    FCF: p.fcf / 1_000_000,
    Leverage: p.leverageRatio,
  }));

  const handleInputChange = (field: keyof ModelAssumptions, value: number) => {
    setAssumptions((prev) => ({ ...prev, [field]: value }));
  };

  const handlePublish = async () => {
    if (!dealId) {
      toast({
        title: "No Deal Selected",
        description: "Please select or create a deal first to publish this model.",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await fetch("/api/deal-models", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dealId,
          assumptions,
          isPublished: true,
        }),
      });

      if (!response.ok) throw new Error("Failed to publish model");

      toast({
        title: "Model Published",
        description: "Financial model has been published to the Data Room.",
      });
    } catch (error) {
      toast({
        title: "Publishing Failed",
        description: "Could not publish the model. Please try again.",
        variant: "destructive",
      });
    }
  };

  const entryLeverage = assumptions.leverageMultiple;
  const exitLeverage = projections[4]?.leverageRatio || 0;
  const totalPaydown = projections.reduce((sum, p) => sum + p.totalPaydown, 0);
  const initialDebt = (assumptions.revenue * assumptions.ebitdaMargin / 100) * assumptions.leverageMultiple;
  const paydownPercent = (totalPaydown / initialDebt) * 100;

  return (
    <Layout>
      <div className="space-y-6 animate-in fade-in duration-500">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-primary tracking-tight">Financial Model Sandbox</h1>
            <p className="text-muted-foreground">
              {deal ? `Modeling ${deal.dealName}` : "Build and test 5-year debt paydown scenarios"}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={() => setAssumptions({
              revenue: 100_000_000,
              growthPercent: 5,
              ebitdaMargin: 25,
              leverageMultiple: 4.0,
              interestRate: 10,
              taxRate: 25,
              capexPercent: 3,
              amortizationPercent: 5,
              cashSweepPercent: 50,
            })} data-testid="button-reset-model">
              <RefreshCw className="mr-2 h-4 w-4" /> Reset
            </Button>
            <Button onClick={handlePublish} data-testid="button-publish-model">
              <Upload className="mr-2 h-4 w-4" /> Publish to Data Room
            </Button>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-5">
          <Card className="lg:col-span-2 border-border/60 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5" /> Model Inputs
              </CardTitle>
              <CardDescription>Adjust assumptions to model different scenarios</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-foreground">Revenue & Margins</h4>
                
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label>Revenue Base ($M)</Label>
                    <span className="text-sm font-medium tabular-nums">${(assumptions.revenue / 1_000_000).toFixed(0)}M</span>
                  </div>
                  <Slider
                    value={[assumptions.revenue / 1_000_000]}
                    min={10}
                    max={500}
                    step={10}
                    onValueChange={([v]) => handleInputChange("revenue", v * 1_000_000)}
                    data-testid="slider-revenue"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label>Revenue Growth (%)</Label>
                    <span className="text-sm font-medium tabular-nums">{assumptions.growthPercent}%</span>
                  </div>
                  <Slider
                    value={[assumptions.growthPercent]}
                    min={-10}
                    max={30}
                    step={1}
                    onValueChange={([v]) => handleInputChange("growthPercent", v)}
                    data-testid="slider-growth"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label>EBITDA Margin (%)</Label>
                    <span className="text-sm font-medium tabular-nums">{assumptions.ebitdaMargin}%</span>
                  </div>
                  <Slider
                    value={[assumptions.ebitdaMargin]}
                    min={5}
                    max={50}
                    step={1}
                    onValueChange={([v]) => handleInputChange("ebitdaMargin", v)}
                    data-testid="slider-margin"
                  />
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-foreground">Capital Structure</h4>
                
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label>Entry Leverage (x EBITDA)</Label>
                    <span className="text-sm font-medium tabular-nums">{assumptions.leverageMultiple.toFixed(1)}x</span>
                  </div>
                  <Slider
                    value={[assumptions.leverageMultiple]}
                    min={1}
                    max={8}
                    step={0.25}
                    onValueChange={([v]) => handleInputChange("leverageMultiple", v)}
                    data-testid="slider-leverage"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label>Interest Rate (%)</Label>
                    <span className="text-sm font-medium tabular-nums">{assumptions.interestRate}%</span>
                  </div>
                  <Slider
                    value={[assumptions.interestRate]}
                    min={4}
                    max={15}
                    step={0.25}
                    onValueChange={([v]) => handleInputChange("interestRate", v)}
                    data-testid="slider-interest"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label>Mandatory Amort (%)</Label>
                    <span className="text-sm font-medium tabular-nums">{assumptions.amortizationPercent}%</span>
                  </div>
                  <Slider
                    value={[assumptions.amortizationPercent]}
                    min={0}
                    max={15}
                    step={1}
                    onValueChange={([v]) => handleInputChange("amortizationPercent", v)}
                    data-testid="slider-amort"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label>Cash Sweep (%)</Label>
                    <span className="text-sm font-medium tabular-nums">{assumptions.cashSweepPercent}%</span>
                  </div>
                  <Slider
                    value={[assumptions.cashSweepPercent]}
                    min={0}
                    max={100}
                    step={5}
                    onValueChange={([v]) => handleInputChange("cashSweepPercent", v)}
                    data-testid="slider-sweep"
                  />
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-foreground">Other Assumptions</h4>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Tax Rate (%)</Label>
                    <Input
                      type="number"
                      value={assumptions.taxRate}
                      onChange={(e) => handleInputChange("taxRate", Number(e.target.value))}
                      data-testid="input-tax-rate"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>CapEx (% Rev)</Label>
                    <Input
                      type="number"
                      value={assumptions.capexPercent}
                      onChange={(e) => handleInputChange("capexPercent", Number(e.target.value))}
                      data-testid="input-capex"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="lg:col-span-3 space-y-6">
            <div className="grid grid-cols-4 gap-4">
              <Card className="border-border/60 shadow-sm">
                <CardContent className="pt-4">
                  <div className="text-xs text-muted-foreground uppercase mb-1">Entry Leverage</div>
                  <div className="text-2xl font-bold tabular-nums">{entryLeverage.toFixed(1)}x</div>
                </CardContent>
              </Card>
              <Card className="border-border/60 shadow-sm">
                <CardContent className="pt-4">
                  <div className="text-xs text-muted-foreground uppercase mb-1">Exit Leverage</div>
                  <div className="text-2xl font-bold tabular-nums text-green-600">{exitLeverage.toFixed(1)}x</div>
                </CardContent>
              </Card>
              <Card className="border-border/60 shadow-sm">
                <CardContent className="pt-4">
                  <div className="text-xs text-muted-foreground uppercase mb-1">Total Paydown</div>
                  <div className="text-2xl font-bold tabular-nums">${(totalPaydown / 1_000_000).toFixed(0)}M</div>
                </CardContent>
              </Card>
              <Card className="border-border/60 shadow-sm">
                <CardContent className="pt-4">
                  <div className="text-xs text-muted-foreground uppercase mb-1">Paydown %</div>
                  <div className="text-2xl font-bold tabular-nums">{paydownPercent.toFixed(0)}%</div>
                </CardContent>
              </Card>
            </div>

            <Card className="border-border/60 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle>Debt Paydown Over Time</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorDebt" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                      <YAxis tickFormatter={(v) => `$${v}M`} tick={{ fontSize: 12 }} />
                      <Tooltip
                        formatter={(value: number) => [`$${value.toFixed(1)}M`, "Debt Balance"]}
                        contentStyle={{ borderRadius: "8px", border: "1px solid #e5e7eb" }}
                      />
                      <Area type="monotone" dataKey="Debt" stroke="#3b82f6" fill="url(#colorDebt)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/60 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle>Leverage Trajectory</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[220px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                      <YAxis domain={[0, 6]} tickFormatter={(v) => `${v}x`} tick={{ fontSize: 12 }} />
                      <Tooltip
                        formatter={(value: number) => [`${value.toFixed(2)}x`, "Leverage"]}
                        contentStyle={{ borderRadius: "8px", border: "1px solid #e5e7eb" }}
                      />
                      <Line type="monotone" dataKey="Leverage" stroke="#10b981" strokeWidth={2} dot={{ fill: "#10b981" }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
}
