import React, { useState, useMemo } from "react";
import { useRoute, Link } from "wouter";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Save, Upload, Calculator, Calendar, ArrowLeft, Plus, Trash2, Download, ChevronDown, ChevronUp } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Legend } from "recharts";
import { useToast } from "@/hooks/use-toast";
import { mockDeals } from "@/data/deals";
import { ScenarioComparison } from "@/components/scenario-comparison";
import { SensitivityChart } from "@/components/sensitivity-chart";
import { StressTesting } from "@/components/stress-testing";
import { ReturnsCalculator } from "@/components/returns-calculator";
import { Switch } from "@/components/ui/switch";
import { downloadCsvFromRecords } from "@/lib/download";
import { format, addYears } from "date-fns";

interface DebtTranche {
  name: string;
  enabled: boolean;
  amount: number; // in MM
  interestRate: number;
  amortRate: number;
}

interface AdjustmentItem {
  id: string;
  name: string;
  values: number[]; // 7 years, in MM
}

interface GranularAssumptions {
  ltmRevenue: number; // in MM
  ltmEbitda: number; // in MM
  revenueGrowth: number[];
  ebitdaMargins: number[];
  capexPercent: number[];
  adjustmentItems: AdjustmentItem[];
  taxRate: number;
  daPercent: number;
  debtTranches: DebtTranche[];
  cashSweepPercent: number;
  signingDate: string;
  closingDate: string;
  nwcMode: "percent" | "manual";
  nwcPercent: number;
  nwcValues: number[]; // 7 years
}

// Helper to clamp values between min and max
const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

interface GranularYearProjection {
  year: number;
  label: string;
  calendarYear?: string;
  revenue: number;
  revenueGrowth: number;
  grossEbitda: number;
  ebitdaMargin: number;
  adjustments: number;
  adjEbitda: number;
  da: number;
  ebit: number;
  interestByTranche: { name: string; amount: number }[];
  totalInterest: number;
  taxes: number;
  netIncome: number;
  daAddback: number;
  nwcChange: number;
  capex: number;
  amortByTranche: { name: string; amount: number }[];
  totalAmort: number;
  fcf: number;
  debtByTranche: { name: string; beginning: number; ending: number }[];
  totalBeginningDebt: number;
  totalEndingDebt: number;
  cashSweep: number;
  leverageRatio: number;
  dscr: number;
}

function parseMonthYear(value: string): { month: number; year: number } | null {
  const match = value.match(/^(\d{1,2})\/(\d{4})$/);
  if (!match) return null;
  const month = parseInt(match[1], 10);
  const year = parseInt(match[2], 10);
  if (month < 1 || month > 12) return null;
  return { month, year };
}

function runGranularModel(assumptions: GranularAssumptions): GranularYearProjection[] {
  const projections: GranularYearProjection[] = [];

  // Initialize debt balances (in MM)
  const debtBalances = assumptions.debtTranches.map(t => t.enabled ? t.amount : 0);
  let prevRevenue = assumptions.ltmRevenue;
  let prevNwc = assumptions.ltmRevenue * (assumptions.nwcPercent / 100); // LTM NWC

  const closingParsed = assumptions.closingDate ? parseMonthYear(assumptions.closingDate) : null;
  const baseYear = closingParsed?.year || new Date().getFullYear();

  // Generate calendar labels based on closing date
  const generateCalendarLabel = (yearOffset: number): string | undefined => {
    if (!closingParsed) return undefined;
    if (yearOffset === 0) return `LTM (${String(closingParsed.month).padStart(2, '0')}/${closingParsed.year - 1})`;
    const targetYear = closingParsed.year + (yearOffset - 1);
    return `${String(closingParsed.month).padStart(2, '0')}/${targetYear}`;
  };

  // LTM row
  const ltmDa = assumptions.ltmRevenue * (assumptions.daPercent / 100);
  const ltmTotalDebt = debtBalances.reduce((sum, b) => sum + b, 0);
  const ltmInterestByTranche = assumptions.debtTranches.map((t, i) => ({
    name: t.name,
    amount: debtBalances[i] * (t.interestRate / 100)
  }));
  const ltmTotalInterest = ltmInterestByTranche.reduce((sum, i) => sum + i.amount, 0);

  projections.push({
    year: 0,
    label: "LTM",
    calendarYear: generateCalendarLabel(0),
    revenue: assumptions.ltmRevenue,
    revenueGrowth: 0,
    grossEbitda: assumptions.ltmEbitda,
    ebitdaMargin: assumptions.ltmRevenue > 0 ? (assumptions.ltmEbitda / assumptions.ltmRevenue) * 100 : 0,
    adjustments: 0,
    adjEbitda: assumptions.ltmEbitda,
    da: ltmDa,
    ebit: assumptions.ltmEbitda - ltmDa,
    interestByTranche: ltmInterestByTranche,
    totalInterest: ltmTotalInterest,
    taxes: 0,
    netIncome: 0,
    daAddback: ltmDa,
    nwcChange: 0,
    capex: 0,
    amortByTranche: assumptions.debtTranches.map(t => ({ name: t.name, amount: 0 })),
    totalAmort: 0,
    fcf: 0,
    debtByTranche: assumptions.debtTranches.map((t, i) => ({
      name: t.name,
      beginning: debtBalances[i],
      ending: debtBalances[i]
    })),
    totalBeginningDebt: ltmTotalDebt,
    totalEndingDebt: ltmTotalDebt,
    cashSweep: 0,
    leverageRatio: assumptions.ltmEbitda > 0 ? ltmTotalDebt / assumptions.ltmEbitda : 0,
    dscr: 0,
  });

  for (let i = 0; i < 7; i++) {
    const year = i + 1;
    const growth = assumptions.revenueGrowth[i] || 0;
    const margin = assumptions.ebitdaMargins[i] || 25;
    const capexPct = assumptions.capexPercent[i] || 3;

    // Sum all adjustment items for this year
    const adj = assumptions.adjustmentItems.reduce((sum, item) => sum + (item.values[i] || 0), 0);

    const revenue = prevRevenue * (1 + growth / 100);
    const grossEbitda = revenue * (margin / 100);
    const adjEbitda = grossEbitda + adj;
    const da = revenue * (assumptions.daPercent / 100);
    const ebit = adjEbitda - da;

    // Calculate interest by tranche
    const interestByTranche = assumptions.debtTranches.map((t, idx) => ({
      name: t.name,
      amount: debtBalances[idx] * (t.interestRate / 100)
    }));
    const totalInterest = interestByTranche.reduce((sum, int) => sum + int.amount, 0);

    const preTaxIncome = ebit - totalInterest;
    const taxes = Math.max(0, preTaxIncome * (assumptions.taxRate / 100));
    const netIncome = preTaxIncome - taxes;
    const daAddback = da;
    const capexAmount = revenue * (capexPct / 100);

    // Calculate NWC change
    let nwcChange = 0;
    if (assumptions.nwcMode === "percent") {
      const currentNwc = revenue * (assumptions.nwcPercent / 100);
      nwcChange = currentNwc - prevNwc;
      prevNwc = currentNwc;
    } else {
      nwcChange = assumptions.nwcValues[i] || 0;
    }

    // Calculate amortization by tranche
    const amortByTranche = assumptions.debtTranches.map((t, idx) => ({
      name: t.name,
      amount: t.enabled ? Math.min(t.amount * (t.amortRate / 100), debtBalances[idx]) : 0
    }));
    const totalAmort = amortByTranche.reduce((sum, a) => sum + a.amount, 0);

    // FCF now includes NWC change (increase in NWC is a use of cash)
    const fcfBeforeSweep = netIncome + daAddback - capexAmount - nwcChange - totalAmort;
    const availableForSweep = Math.max(0, fcfBeforeSweep);
    const cashSweep = availableForSweep * (assumptions.cashSweepPercent / 100);

    // Update debt balances (apply amort and sweep to senior first, then down the stack)
    let remainingSweep = cashSweep;
    const debtByTranche = assumptions.debtTranches.map((t, idx) => {
      const beginning = debtBalances[idx];
      const amort = amortByTranche[idx].amount;
      let sweepApplied = 0;
      if (remainingSweep > 0 && debtBalances[idx] - amort > 0) {
        sweepApplied = Math.min(remainingSweep, debtBalances[idx] - amort);
        remainingSweep -= sweepApplied;
      }
      const ending = Math.max(0, beginning - amort - sweepApplied);
      debtBalances[idx] = ending;
      return { name: t.name, beginning, ending };
    });

    const totalBeginningDebt = debtByTranche.reduce((sum, d) => sum + d.beginning, 0);
    const totalEndingDebt = debtByTranche.reduce((sum, d) => sum + d.ending, 0);
    const leverageRatio = adjEbitda > 0 ? totalEndingDebt / adjEbitda : 0;
    const debtService = totalInterest + totalAmort;
    const dscr = debtService > 0 ? adjEbitda / debtService : 0;

    projections.push({
      year,
      label: `Year ${year}`,
      calendarYear: generateCalendarLabel(year),
      revenue,
      revenueGrowth: growth,
      grossEbitda,
      ebitdaMargin: margin,
      adjustments: adj,
      adjEbitda,
      da,
      ebit,
      interestByTranche,
      totalInterest,
      taxes,
      netIncome,
      daAddback,
      nwcChange,
      capex: capexAmount,
      amortByTranche,
      totalAmort,
      fcf: fcfBeforeSweep,
      debtByTranche,
      totalBeginningDebt,
      totalEndingDebt,
      cashSweep,
      leverageRatio,
      dscr,
    });

    prevRevenue = revenue;
  }

  return projections;
}

// Format number to 1 decimal place in $MM
const fmt = (value: number): string => {
  if (value === 0) return "—";
  return value.toFixed(1);
};

const fmtPct = (value: number): string => `${value.toFixed(1)}%`;
const fmtMult = (value: number): string => `${value.toFixed(2)}x`;

// Input cell class - blue for inputs in output section
const inputClass = "text-blue-600 dark:text-blue-400";
// Computed cell class - black
const computedClass = "text-foreground";

export default function FinancialModelPage() {
  const [, params] = useRoute("/deal/:id/sandbox");
  const dealId = params?.id || "101";
  const deal = mockDeals.find(d => d.id === dealId) || mockDeals[0];
  const { toast } = useToast();

  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [activeTab, setActiveTab] = useState("model");

  const defaultDebtTranches: DebtTranche[] = [
    { name: "Senior Debt", enabled: true, amount: 400, interestRate: 9.5, amortRate: 1 },
    { name: "Second Lien", enabled: false, amount: 0, interestRate: 12, amortRate: 0 },
    { name: "Subordinated", enabled: false, amount: 0, interestRate: 14, amortRate: 0 },
    { name: "Incremental", enabled: false, amount: 0, interestRate: 10, amortRate: 0 },
  ];

  const defaultAdjustmentItems: AdjustmentItem[] = [
    { id: "adj-1", name: "Transaction Costs", values: [5, 3, 2, 1, 0, 0, 0] },
  ];

  const defaultAssumptions: GranularAssumptions = {
    ltmRevenue: 500, // $MM
    ltmEbitda: 125, // $MM
    revenueGrowth: [5, 6, 7, 5, 4, 4, 3],
    ebitdaMargins: [25, 26, 27, 27, 28, 28, 29],
    capexPercent: [3, 3, 3, 2.5, 2.5, 2.5, 2.5],
    adjustmentItems: defaultAdjustmentItems,
    taxRate: 25,
    daPercent: 4,
    debtTranches: defaultDebtTranches,
    cashSweepPercent: 50,
    signingDate: "",
    closingDate: "",
    nwcMode: "percent",
    nwcPercent: 5,
    nwcValues: [0, 0, 0, 0, 0, 0, 0],
  };

  const [assumptions, setAssumptions] = useState<GranularAssumptions>(defaultAssumptions);
  const [signingDateInput, setSigningDateInput] = useState("");
  const [closingDateInput, setClosingDateInput] = useState("");
  const [dateError, setDateError] = useState<string | null>(null);
  const [leverageExpanded, setLeverageExpanded] = useState(false);
  const [dscrExpanded, setDscrExpanded] = useState(false);

  const projections = useMemo(() => runGranularModel(assumptions), [assumptions]);

  // Export projections as CSV
  const handleExportProjections = () => {
    const exportData = projections.map(p => ({
      "Period": p.calendarYear || p.label,
      "Revenue ($M)": p.revenue.toFixed(1),
      "Revenue Growth %": `${p.revenueGrowth.toFixed(1)}%`,
      "Gross EBITDA ($M)": p.grossEbitda.toFixed(1),
      "EBITDA Margin %": `${p.ebitdaMargin.toFixed(1)}%`,
      "Adjustments ($M)": p.adjustments.toFixed(1),
      "Adj. EBITDA ($M)": p.adjEbitda.toFixed(1),
      "D&A ($M)": p.da.toFixed(1),
      "EBIT ($M)": p.ebit.toFixed(1),
      "Interest ($M)": p.totalInterest.toFixed(1),
      "Taxes ($M)": p.taxes.toFixed(1),
      "Net Income ($M)": p.netIncome.toFixed(1),
      "NWC Change ($M)": p.nwcChange.toFixed(1),
      "CapEx ($M)": p.capex.toFixed(1),
      "Amortization ($M)": p.totalAmort.toFixed(1),
      "Free Cash Flow ($M)": p.fcf.toFixed(1),
      "Beginning Debt ($M)": p.totalBeginningDebt.toFixed(1),
      "Ending Debt ($M)": p.totalEndingDebt.toFixed(1),
      "Leverage (x)": `${p.leverageRatio.toFixed(2)}x`,
      "DSCR (x)": p.year === 0 ? "—" : `${p.dscr.toFixed(2)}x`
    }));
    downloadCsvFromRecords(`financial_projections_${deal.dealName.replace(/\s+/g, '_')}_${format(new Date(), "yyyy-MM-dd")}.csv`, exportData);
  };

  // For compatibility with other components that expect the old format
  const legacyAssumptions = useMemo(() => {
    // Sum adjustments across all items for each year (only first 5 for legacy)
    const adjustmentSums = [0, 1, 2, 3, 4].map(i =>
      assumptions.adjustmentItems.reduce((sum, item) => sum + (item.values[i] || 0), 0) * 1000000
    );
    return {
      ltmRevenue: assumptions.ltmRevenue * 1000000,
      ltmEbitda: assumptions.ltmEbitda * 1000000,
      revenueGrowth: assumptions.revenueGrowth.slice(0, 5),
      ebitdaMargins: assumptions.ebitdaMargins.slice(0, 5),
      capexPercent: assumptions.capexPercent.slice(0, 5),
      adjustments: adjustmentSums,
      taxRate: assumptions.taxRate,
      daPercent: assumptions.daPercent,
      debtStructure: {
        seniorAmount: assumptions.debtTranches[0].amount * 1000000,
        interestRate: assumptions.debtTranches[0].interestRate,
        amortRate: assumptions.debtTranches[0].amortRate,
      },
      cashSweepPercent: assumptions.cashSweepPercent,
    };
  }, [assumptions]);

  const updateArrayValue = (field: keyof GranularAssumptions, index: number, value: string) => {
    const numValue = parseFloat(value) || 0;
    const arr = [...(assumptions[field] as number[])];
    arr[index] = numValue;
    setAssumptions({ ...assumptions, [field]: arr });
  };

  const updateDebtTranche = (index: number, field: keyof DebtTranche, value: string | boolean) => {
    const tranches = [...assumptions.debtTranches];
    if (field === "enabled") {
      tranches[index] = { ...tranches[index], enabled: value as boolean };
    } else if (field === "amortRate") {
      // Clamp amortization rate to 0-100%
      tranches[index] = { ...tranches[index], [field]: clamp(parseFloat(value as string) || 0, 0, 100) };
    } else {
      tranches[index] = { ...tranches[index], [field]: parseFloat(value as string) || 0 };
    }
    setAssumptions({ ...assumptions, debtTranches: tranches });
  };

  const updateScalar = (field: keyof GranularAssumptions, value: string) => {
    let numValue = parseFloat(value) || 0;
    // Clamp percentage fields to 0-100%
    if (field === "taxRate" || field === "daPercent" || field === "cashSweepPercent" || field === "nwcPercent") {
      numValue = clamp(numValue, 0, 100);
    }
    setAssumptions({ ...assumptions, [field]: numValue });
  };

  // Adjustment item handlers
  const addAdjustmentItem = () => {
    const newItem: AdjustmentItem = {
      id: `adj-${Date.now()}`,
      name: "New Adjustment",
      values: [0, 0, 0, 0, 0, 0, 0],
    };
    setAssumptions({
      ...assumptions,
      adjustmentItems: [...assumptions.adjustmentItems, newItem],
    });
  };

  const removeAdjustmentItem = (id: string) => {
    if (assumptions.adjustmentItems.length <= 1) return; // Keep at least one
    setAssumptions({
      ...assumptions,
      adjustmentItems: assumptions.adjustmentItems.filter(item => item.id !== id),
    });
  };

  const updateAdjustmentItem = (id: string, field: "name" | "values", value: string | number, yearIndex?: number) => {
    const items = [...assumptions.adjustmentItems];
    const idx = items.findIndex(item => item.id === id);
    if (idx === -1) return;

    if (field === "name") {
      items[idx] = { ...items[idx], name: value as string };
    } else if (field === "values" && yearIndex !== undefined) {
      const newValues = [...items[idx].values];
      newValues[yearIndex] = value as number;
      items[idx] = { ...items[idx], values: newValues };
    }
    setAssumptions({ ...assumptions, adjustmentItems: items });
  };

  const updateNwcValue = (index: number, value: string) => {
    const numValue = parseFloat(value) || 0;
    const newValues = [...assumptions.nwcValues];
    newValues[index] = numValue;
    setAssumptions({ ...assumptions, nwcValues: newValues });
  };

  const handleDateChange = (field: "signingDate" | "closingDate", value: string) => {
    if (field === "signingDate") {
      setSigningDateInput(value);
    } else {
      setClosingDateInput(value);
    }
  };

  const validateAndSetDate = (field: "signingDate" | "closingDate") => {
    const value = field === "signingDate" ? signingDateInput : closingDateInput;
    if (!value) {
      setAssumptions({ ...assumptions, [field]: "" });
      setDateError(null);
      return;
    }
    const parsed = parseMonthYear(value);
    if (!parsed) {
      setDateError(`Invalid format. Use MM/YYYY`);
      return;
    }
    setDateError(null);
    setAssumptions({ ...assumptions, [field]: value });
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await fetch("/api/deal-models", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dealId,
          name: `${deal.dealName} - Financial Model`,
          assumptions: legacyAssumptions,
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
          name: `${deal.dealName} - Financial Model`,
          assumptions: legacyAssumptions,
          isPublished: true,
        }),
      });
      if (res.ok) {
        toast({ title: "Model Published", description: "Financial model is now available in the Data Room." });
      } else {
        throw new Error("Failed to publish");
      }
    } catch {
      toast({ title: "Error", description: "Failed to publish model.", variant: "destructive" });
    }
    setIsPublishing(false);
  };

  const leverageData = projections.map(p => ({
    name: p.calendarYear || p.label,
    leverage: p.leverageRatio,
    dscr: p.dscr,
  }));

  return (
    <Layout>
      <div className="space-y-4 animate-in fade-in duration-500">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <Link href={`/deal/${dealId}/overview`} className="hover:text-primary flex items-center gap-1">
                <ArrowLeft className="h-3 w-3" />
                {deal.dealName}
              </Link>
              <span>/</span>
              <span>Financial Model</span>
            </div>
            <h1 className="text-xl font-semibold text-primary tracking-tight flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Debt Paydown Model
            </h1>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleSave} disabled={isSaving}>
              <Save className="h-4 w-4 mr-1" />
              {isSaving ? "Saving..." : "Save"}
            </Button>
            <Button size="sm" onClick={handlePublish} disabled={isPublishing}>
              <Upload className="h-4 w-4 mr-1" />
              {isPublishing ? "Publishing..." : "Publish"}
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="h-8">
            <TabsTrigger value="model" className="text-xs px-3 h-7">Model</TabsTrigger>
            <TabsTrigger value="scenarios" className="text-xs px-3 h-7">Scenarios</TabsTrigger>
            <TabsTrigger value="sensitivity" className="text-xs px-3 h-7">Sensitivity</TabsTrigger>
            <TabsTrigger value="stress" className="text-xs px-3 h-7">Stress Test</TabsTrigger>
            <TabsTrigger value="returns" className="text-xs px-3 h-7">Returns</TabsTrigger>
          </TabsList>

          <TabsContent value="model" className="space-y-4 mt-4">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              {/* Input Panel */}
              <Card className="lg:col-span-4">
                <CardHeader className="py-3 px-4">
                  <CardTitle className="text-sm">Model Inputs</CardTitle>
                  <p className="text-[10px] text-muted-foreground">All values in $MM</p>
                </CardHeader>
                <CardContent className="px-4 pb-4 space-y-4">
                  {/* Deal Timeline */}
                  <div className="space-y-2">
                    <Label className="text-[10px] font-semibold text-muted-foreground uppercase flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      Deal Timeline
                    </Label>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-[10px]">Signing Date</Label>
                        <Input
                          type="text"
                          placeholder="MM/YYYY"
                          value={signingDateInput}
                          onChange={(e) => handleDateChange("signingDate", e.target.value)}
                          onBlur={() => validateAndSetDate("signingDate")}
                          className="h-7 text-xs"
                        />
                      </div>
                      <div>
                        <Label className="text-[10px]">Closing Date</Label>
                        <Input
                          type="text"
                          placeholder="MM/YYYY"
                          value={closingDateInput}
                          onChange={(e) => handleDateChange("closingDate", e.target.value)}
                          onBlur={() => validateAndSetDate("closingDate")}
                          className="h-7 text-xs"
                        />
                      </div>
                    </div>
                    {dateError && <p className="text-[10px] text-destructive">{dateError}</p>}
                  </div>

                  <Separator />

                  {/* Base Case */}
                  <div className="space-y-2">
                    <Label className="text-[10px] font-semibold text-muted-foreground uppercase">Base Case (LTM)</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-[10px]">Revenue</Label>
                        <Input
                          type="number"
                          value={assumptions.ltmRevenue}
                          onChange={(e) => updateScalar("ltmRevenue", e.target.value)}
                          className="h-7 text-xs"
                        />
                      </div>
                      <div>
                        <Label className="text-[10px]">EBITDA</Label>
                        <Input
                          type="number"
                          value={assumptions.ltmEbitda}
                          onChange={(e) => updateScalar("ltmEbitda", e.target.value)}
                          className="h-7 text-xs"
                        />
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Debt Structure - Multi-tier */}
                  <div className="space-y-2">
                    <Label className="text-[10px] font-semibold text-muted-foreground uppercase">Debt Structure</Label>
                    <div className="space-y-3">
                      {assumptions.debtTranches.map((tranche, idx) => (
                        <div key={tranche.name} className={`p-2 rounded border ${tranche.enabled ? 'bg-background' : 'bg-muted/30'}`}>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] font-medium">{tranche.name}</span>
                            {idx > 0 && (
                              <Switch
                                checked={tranche.enabled}
                                onCheckedChange={(checked) => updateDebtTranche(idx, "enabled", checked)}
                                className="h-4 w-7"
                              />
                            )}
                          </div>
                          {(idx === 0 || tranche.enabled) && (
                            <div className="grid grid-cols-3 gap-1">
                              <div>
                                <Label className="text-[9px] text-muted-foreground">Amount</Label>
                                <Input
                                  type="number"
                                  value={tranche.amount}
                                  onChange={(e) => updateDebtTranche(idx, "amount", e.target.value)}
                                  className="h-6 text-[10px] px-1"
                                />
                              </div>
                              <div>
                                <Label className="text-[9px] text-muted-foreground">Rate %</Label>
                                <Input
                                  type="number"
                                  step="0.1"
                                  value={tranche.interestRate}
                                  onChange={(e) => updateDebtTranche(idx, "interestRate", e.target.value)}
                                  className="h-6 text-[10px] px-1"
                                />
                              </div>
                              <div>
                                <Label className="text-[9px] text-muted-foreground">Amort %</Label>
                                <Input
                                  type="number"
                                  step="0.5"
                                  value={tranche.amortRate}
                                  onChange={(e) => updateDebtTranche(idx, "amortRate", e.target.value)}
                                  className="h-6 text-[10px] px-1"
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <Separator />

                  {/* Year-by-Year */}
                  <div className="space-y-2">
                    <Label className="text-[10px] font-semibold text-muted-foreground uppercase">Year-by-Year Assumptions</Label>
                    <div className="overflow-x-auto">
                      <table className="w-full text-[10px]">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-1 font-medium w-16">Metric</th>
                            {[1, 2, 3, 4, 5, 6, 7].map(y => (
                              <th key={y} className="text-center py-1 font-medium w-8">Y{y}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          <tr className="border-b">
                            <td className="py-1">Growth %</td>
                            {[0, 1, 2, 3, 4, 5, 6].map(i => (
                              <td key={i} className="p-0.5">
                                <Input
                                  type="number"
                                  step="0.5"
                                  value={assumptions.revenueGrowth[i]}
                                  onChange={(e) => updateArrayValue("revenueGrowth", i, e.target.value)}
                                  className="h-6 text-[10px] text-center p-0"
                                />
                              </td>
                            ))}
                          </tr>
                          <tr className="border-b">
                            <td className="py-1">Margin %</td>
                            {[0, 1, 2, 3, 4, 5, 6].map(i => (
                              <td key={i} className="p-0.5">
                                <Input
                                  type="number"
                                  step="0.5"
                                  value={assumptions.ebitdaMargins[i]}
                                  onChange={(e) => updateArrayValue("ebitdaMargins", i, e.target.value)}
                                  className="h-6 text-[10px] text-center p-0"
                                />
                              </td>
                            ))}
                          </tr>
                          <tr className="border-b">
                            <td className="py-1">CapEx %</td>
                            {[0, 1, 2, 3, 4, 5, 6].map(i => (
                              <td key={i} className="p-0.5">
                                <Input
                                  type="number"
                                  step="0.5"
                                  value={assumptions.capexPercent[i]}
                                  onChange={(e) => updateArrayValue("capexPercent", i, e.target.value)}
                                  className="h-6 text-[10px] text-center p-0"
                                />
                              </td>
                            ))}
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <Separator />

                  {/* NWC Section */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-[10px] font-semibold text-muted-foreground uppercase">Net Working Capital</Label>
                      <div className="flex items-center gap-2 text-[10px]">
                        <span className={assumptions.nwcMode === "percent" ? "text-foreground" : "text-muted-foreground"}>% of Rev</span>
                        <Switch
                          checked={assumptions.nwcMode === "manual"}
                          onCheckedChange={(checked) => setAssumptions({ ...assumptions, nwcMode: checked ? "manual" : "percent" })}
                          className="h-4 w-7"
                        />
                        <span className={assumptions.nwcMode === "manual" ? "text-foreground" : "text-muted-foreground"}>Manual</span>
                      </div>
                    </div>
                    {assumptions.nwcMode === "percent" ? (
                      <div className="flex items-center gap-2">
                        <Label className="text-[10px] text-muted-foreground">NWC %</Label>
                        <Input
                          type="number"
                          step="0.5"
                          value={assumptions.nwcPercent}
                          onChange={(e) => updateScalar("nwcPercent", e.target.value)}
                          className="h-6 text-[10px] w-16"
                        />
                        <span className="text-[9px] text-muted-foreground">of Revenue</span>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-[10px]">
                          <thead>
                            <tr className="border-b">
                              <td className="text-left py-1 font-medium w-16">Δ NWC</td>
                              {[1, 2, 3, 4, 5, 6, 7].map(y => (
                                <th key={y} className="text-center py-1 font-medium w-8">Y{y}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            <tr>
                              <td></td>
                              {[0, 1, 2, 3, 4, 5, 6].map(i => (
                                <td key={i} className="p-0.5">
                                  <Input
                                    type="number"
                                    value={assumptions.nwcValues[i]}
                                    onChange={(e) => updateNwcValue(i, e.target.value)}
                                    className="h-6 text-[10px] text-center p-0"
                                  />
                                </td>
                              ))}
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  <Separator />

                  {/* Dynamic Adjustments */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-[10px] font-semibold text-muted-foreground uppercase">Adjustments</Label>
                      <Button variant="ghost" size="sm" onClick={addAdjustmentItem} className="h-5 px-2 text-[10px]">
                        <Plus className="h-3 w-3 mr-1" />
                        Add
                      </Button>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-[10px]">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-1 font-medium w-20">Item</th>
                            <th className="text-center py-1 font-medium w-8">LTM</th>
                            {[1, 2, 3, 4, 5, 6, 7].map(y => (
                              <th key={y} className="text-center py-1 font-medium w-8">Y{y}</th>
                            ))}
                            <th className="w-5"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {assumptions.adjustmentItems.map((item) => (
                            <tr key={item.id} className="border-b">
                              <td className="py-1 pr-1">
                                <Input
                                  type="text"
                                  value={item.name}
                                  onChange={(e) => updateAdjustmentItem(item.id, "name", e.target.value)}
                                  className="h-6 text-[10px]"
                                  placeholder="Name"
                                />
                              </td>
                              <td className="p-0.5 text-center text-muted-foreground">—</td>
                              {[0, 1, 2, 3, 4, 5, 6].map(i => (
                                <td key={i} className="p-0.5">
                                  <Input
                                    type="number"
                                    value={item.values[i]}
                                    onChange={(e) => updateAdjustmentItem(item.id, "values", parseFloat(e.target.value) || 0, i)}
                                    className="h-6 text-[10px] text-center p-0"
                                  />
                                </td>
                              ))}
                              <td className="p-0.5">
                                {assumptions.adjustmentItems.length > 1 && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => removeAdjustmentItem(item.id)}
                                    className="h-5 w-5"
                                  >
                                    <Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                                  </Button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <Separator />

                  {/* Other Parameters */}
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <Label className="text-[10px]">Tax %</Label>
                      <Input
                        type="number"
                        value={assumptions.taxRate}
                        onChange={(e) => updateScalar("taxRate", e.target.value)}
                        className="h-7 text-xs"
                      />
                    </div>
                    <div>
                      <Label className="text-[10px]">D&A %</Label>
                      <Input
                        type="number"
                        value={assumptions.daPercent}
                        onChange={(e) => updateScalar("daPercent", e.target.value)}
                        className="h-7 text-xs"
                      />
                    </div>
                    <div>
                      <Label className="text-[10px]">Sweep %</Label>
                      <Input
                        type="number"
                        value={assumptions.cashSweepPercent}
                        onChange={(e) => updateScalar("cashSweepPercent", e.target.value)}
                        className="h-7 text-xs"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Output Panel - Financial Projections */}
              <Card className="lg:col-span-8">
                <CardHeader className="py-3 px-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm">Financial Projections</CardTitle>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={handleExportProjections} className="h-6 text-[10px] px-2">
                        <Download className="h-3 w-3 mr-1" />
                        Export
                      </Button>
                      <Badge variant="outline" className="text-[10px]">$MM</Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <div className="overflow-x-auto">
                    <table className="w-full text-[10px] font-mono">
                      <thead>
                        <tr className="border-b-2 border-primary">
                          <th className="text-left py-1.5 pr-2 font-semibold min-w-[120px]">Line Item</th>
                          {projections.map(p => (
                            <th key={p.label} className="text-right py-1.5 px-1.5 font-semibold min-w-[55px]">
                              <div>{p.label}</div>
                              {p.calendarYear && (
                                <div className="text-muted-foreground font-normal text-[8px]">{p.calendarYear}</div>
                              )}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {/* Revenue */}
                        <tr className="border-b bg-muted/30">
                          <td className={`py-1 pr-2 font-semibold ${computedClass}`}>Revenue</td>
                          {projections.map(p => (
                            <td key={p.label} className={`text-right py-1 px-1.5 ${computedClass}`}>{fmt(p.revenue)}</td>
                          ))}
                        </tr>
                        <tr className="border-b">
                          <td className={`py-1 pr-2 pl-3 ${inputClass}`}>% Growth</td>
                          {projections.map(p => (
                            <td key={p.label} className={`text-right py-1 px-1.5 ${p.year === 0 ? "text-muted-foreground" : inputClass}`}>
                              {p.year === 0 ? "—" : fmtPct(p.revenueGrowth)}
                            </td>
                          ))}
                        </tr>
                        {/* EBITDA */}
                        <tr className="border-b">
                          <td className={`py-1 pr-2 font-semibold ${computedClass}`}>Gross EBITDA</td>
                          {projections.map(p => (
                            <td key={p.label} className={`text-right py-1 px-1.5 ${computedClass}`}>{fmt(p.grossEbitda)}</td>
                          ))}
                        </tr>
                        <tr className="border-b">
                          <td className={`py-1 pr-2 pl-3 ${inputClass}`}>% Margin</td>
                          {projections.map(p => (
                            <td key={p.label} className={`text-right py-1 px-1.5 ${inputClass}`}>{fmtPct(p.ebitdaMargin)}</td>
                          ))}
                        </tr>
                        <tr className="border-b">
                          <td className={`py-1 pr-2 pl-3 ${inputClass}`}>(+) Adjustments</td>
                          {projections.map(p => (
                            <td key={p.label} className={`text-right py-1 px-1.5 ${p.adjustments > 0 ? inputClass : "text-muted-foreground"}`}>
                              {p.adjustments > 0 ? fmt(p.adjustments) : "—"}
                            </td>
                          ))}
                        </tr>
                        <tr className="border-b bg-primary/5">
                          <td className={`py-1 pr-2 font-bold ${computedClass}`}>Adj. EBITDA</td>
                          {projections.map(p => (
                            <td key={p.label} className={`text-right py-1 px-1.5 font-bold ${computedClass}`}>{fmt(p.adjEbitda)}</td>
                          ))}
                        </tr>
                        <tr className="border-b">
                          <td className={`py-1 pr-2 pl-3 italic text-muted-foreground`}>% of Revenue</td>
                          {projections.map(p => (
                            <td key={p.label} className={`text-right py-1 px-1.5 italic text-muted-foreground`}>
                              {p.revenue > 0 ? fmtPct((p.adjEbitda / p.revenue) * 100) : "—"}
                            </td>
                          ))}
                        </tr>
                        <tr className="border-b">
                          <td className={`py-1 pr-2 pl-3 ${computedClass}`}>(-) D&A</td>
                          {projections.map(p => (
                            <td key={p.label} className={`text-right py-1 px-1.5 ${computedClass}`}>({fmt(p.da)})</td>
                          ))}
                        </tr>
                        <tr className="border-b">
                          <td className={`py-1 pr-2 font-semibold ${computedClass}`}>EBIT</td>
                          {projections.map(p => (
                            <td key={p.label} className={`text-right py-1 px-1.5 ${computedClass}`}>{fmt(p.ebit)}</td>
                          ))}
                        </tr>
                        <tr className="border-b">
                          <td className={`py-1 pr-2 pl-3 ${computedClass}`}>(-) Interest</td>
                          {projections.map(p => (
                            <td key={p.label} className={`text-right py-1 px-1.5 ${computedClass}`}>({fmt(p.totalInterest)})</td>
                          ))}
                        </tr>
                        <tr className="border-b">
                          <td className={`py-1 pr-2 pl-3 ${computedClass}`}>(-) Taxes</td>
                          {projections.map(p => (
                            <td key={p.label} className={`text-right py-1 px-1.5 ${computedClass}`}>
                              {p.taxes > 0 ? `(${fmt(p.taxes)})` : "—"}
                            </td>
                          ))}
                        </tr>
                        <tr className="border-b">
                          <td className={`py-1 pr-2 font-semibold ${computedClass}`}>Net Income</td>
                          {projections.map(p => (
                            <td key={p.label} className={`text-right py-1 px-1.5 ${computedClass}`}>{fmt(p.netIncome)}</td>
                          ))}
                        </tr>
                        <tr className="border-b">
                          <td className={`py-1 pr-2 pl-3 ${computedClass}`}>(+) D&A</td>
                          {projections.map(p => (
                            <td key={p.label} className={`text-right py-1 px-1.5 ${computedClass}`}>{fmt(p.daAddback)}</td>
                          ))}
                        </tr>
                        <tr className="border-b">
                          <td className={`py-1 pr-2 pl-3 ${assumptions.nwcMode === "percent" ? computedClass : inputClass}`}>(-) Δ NWC</td>
                          {projections.map(p => (
                            <td key={p.label} className={`text-right py-1 px-1.5 ${assumptions.nwcMode === "percent" ? computedClass : inputClass}`}>
                              {p.year === 0 ? "—" : p.nwcChange !== 0 ? `(${fmt(p.nwcChange)})` : "—"}
                            </td>
                          ))}
                        </tr>
                        <tr className="border-b">
                          <td className={`py-1 pr-2 pl-3 ${computedClass}`}>(-) CapEx</td>
                          {projections.map(p => (
                            <td key={p.label} className={`text-right py-1 px-1.5 ${computedClass}`}>
                              {p.capex > 0 ? `(${fmt(p.capex)})` : "—"}
                            </td>
                          ))}
                        </tr>
                        <tr className="border-b">
                          <td className={`py-1 pr-2 pl-3 ${computedClass}`}>(-) Amortization</td>
                          {projections.map(p => (
                            <td key={p.label} className={`text-right py-1 px-1.5 ${computedClass}`}>
                              {p.totalAmort > 0 ? `(${fmt(p.totalAmort)})` : "—"}
                            </td>
                          ))}
                        </tr>
                        <tr className="border-b-2 border-primary bg-green-50 dark:bg-green-950/20">
                          <td className={`py-1.5 pr-2 font-bold ${computedClass}`}>Free Cash Flow</td>
                          {projections.map(p => (
                            <td key={p.label} className={`text-right py-1.5 px-1.5 font-bold ${p.fcf < 0 ? "text-red-600" : computedClass}`}>
                              {p.year === 0 ? "—" : fmt(p.fcf)}
                            </td>
                          ))}
                        </tr>
                        <tr className="h-2" />
                        {/* Debt Schedule */}
                        <tr className="border-b bg-muted/50">
                          <td className={`py-1 pr-2 font-semibold ${computedClass}`}>Total Debt (Beg)</td>
                          {projections.map(p => (
                            <td key={p.label} className={`text-right py-1 px-1.5 ${computedClass}`}>{fmt(p.totalBeginningDebt)}</td>
                          ))}
                        </tr>
                        <tr className="border-b">
                          <td className={`py-1 pr-2 pl-3 ${computedClass}`}>(-) Paydown</td>
                          {projections.map(p => (
                            <td key={p.label} className={`text-right py-1 px-1.5 ${computedClass}`}>
                              {p.year === 0 ? "—" : `(${fmt(p.totalAmort + p.cashSweep)})`}
                            </td>
                          ))}
                        </tr>
                        <tr className="border-b bg-muted/50">
                          <td className={`py-1 pr-2 font-semibold ${computedClass}`}>Total Debt (End)</td>
                          {projections.map(p => (
                            <td key={p.label} className={`text-right py-1 px-1.5 ${computedClass}`}>{fmt(p.totalEndingDebt)}</td>
                          ))}
                        </tr>
                        <tr className="h-2" />
                        {/* Credit Metrics */}
                        <tr className="border-b cursor-pointer hover:bg-muted/30" onClick={() => setLeverageExpanded(!leverageExpanded)}>
                          <td className={`py-1 pr-2 font-semibold ${computedClass} flex items-center gap-1`}>
                            {leverageExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                            Total Leverage
                          </td>
                          {projections.map(p => (
                            <td key={p.label} className={`text-right py-1 px-1.5 font-semibold ${p.leverageRatio > 5 ? "text-amber-600" : p.leverageRatio > 6 ? "text-red-600" : "text-green-600"}`}>
                              {fmtMult(p.leverageRatio)}
                            </td>
                          ))}
                        </tr>
                        {leverageExpanded && assumptions.debtTranches.filter(t => t.enabled).map((tranche, idx) => (
                          <tr key={`lev-${tranche.name}`} className="border-b bg-muted/20">
                            <td className={`py-1 pr-2 pl-6 text-muted-foreground`}>{tranche.name}</td>
                            {projections.map(p => {
                              const trancheDebt = p.debtByTranche.find(d => d.name === tranche.name);
                              const trancheLeverage = p.adjEbitda > 0 && trancheDebt ? trancheDebt.ending / p.adjEbitda : 0;
                              return (
                                <td key={p.label} className={`text-right py-1 px-1.5 text-muted-foreground`}>
                                  {fmtMult(trancheLeverage)}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                        <tr className="border-b cursor-pointer hover:bg-muted/30" onClick={() => setDscrExpanded(!dscrExpanded)}>
                          <td className={`py-1 pr-2 font-semibold ${computedClass} flex items-center gap-1`}>
                            {dscrExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                            Total DSCR
                          </td>
                          {projections.map(p => (
                            <td key={p.label} className={`text-right py-1 px-1.5 font-semibold ${p.dscr < 1.25 ? "text-red-600" : p.dscr < 1.5 ? "text-amber-600" : "text-green-600"}`}>
                              {p.year === 0 ? "—" : fmtMult(p.dscr)}
                            </td>
                          ))}
                        </tr>
                        {dscrExpanded && assumptions.debtTranches.filter(t => t.enabled).map((tranche, idx) => (
                          <tr key={`dscr-${tranche.name}`} className="border-b bg-muted/20">
                            <td className={`py-1 pr-2 pl-6 text-muted-foreground`}>DSCR - {tranche.name}</td>
                            {projections.map(p => {
                              const trancheInterest = p.interestByTranche.find(i => i.name === tranche.name);
                              const trancheAmort = p.amortByTranche.find(a => a.name === tranche.name);
                              const trancheDebtService = (trancheInterest?.amount || 0) + (trancheAmort?.amount || 0);
                              const trancheDscr = trancheDebtService > 0 ? p.adjEbitda / trancheDebtService : 0;
                              return (
                                <td key={p.label} className={`text-right py-1 px-1.5 text-muted-foreground`}>
                                  {p.year === 0 ? "—" : fmtMult(trancheDscr)}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Leverage Chart */}
                  <div className="mt-4 pt-4 border-t">
                    <h4 className="text-xs font-medium mb-2">Leverage Evolution</h4>
                    <div className="h-36">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={leverageData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                          <XAxis dataKey="name" tick={{ fontSize: 9 }} />
                          <YAxis domain={[0, "auto"]} tick={{ fontSize: 9 }} tickFormatter={(v) => `${v}x`} />
                          <Tooltip
                            contentStyle={{ fontSize: 10 }}
                            formatter={(value: number, name: string) => [
                              fmtMult(value),
                              name === "leverage" ? "Leverage" : "DSCR"
                            ]}
                          />
                          <Legend wrapperStyle={{ fontSize: 10 }} />
                          <ReferenceLine y={5.5} stroke="#f59e0b" strokeDasharray="5 5" />
                          <Line type="monotone" dataKey="leverage" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} name="Leverage" />
                          <Line type="monotone" dataKey="dscr" stroke="hsl(var(--chart-2))" strokeWidth={2} dot={{ r: 3 }} name="DSCR" />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="scenarios" className="mt-4">
            <ScenarioComparison assumptions={legacyAssumptions} covenantThreshold={5.5} />
          </TabsContent>

          <TabsContent value="sensitivity" className="mt-4">
            <SensitivityChart assumptions={legacyAssumptions} />
          </TabsContent>

          <TabsContent value="stress" className="mt-4">
            <StressTesting
              assumptions={legacyAssumptions}
              covenants={{ maxLeverage: 5.5, minDscr: 1.25, minInterestCoverage: 2.0 }}
            />
          </TabsContent>

          <TabsContent value="returns" className="mt-4">
            <ReturnsCalculator
              defaultPrincipal={assumptions.debtTranches[0].amount * 1000000}
              defaultSpread={assumptions.debtTranches[0].interestRate * 100}
            />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
