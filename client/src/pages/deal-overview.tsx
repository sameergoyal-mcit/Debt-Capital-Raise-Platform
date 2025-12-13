import React from "react";
import { Link, useRoute } from "wouter";
import { 
  FileText, 
  Users, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  Download,
  Calendar,
  PieChart,
  ArrowRight,
  Printer,
  Share2,
  Activity,
  ShieldCheck,
  FileCheck,
  Layers,
  ChevronRight,
  DollarSign,
  TrendingDown,
  TrendingUp,
  Minus
} from "lucide-react";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, Cell, Legend } from "recharts";
import { mockDeals, computeDealRisk } from "@/data/deals";
import { differenceInDays, parseISO } from "date-fns";

export default function DealOverview() {
  const [, params] = useRoute("/deal/:id/overview");
  const dealId = params?.id || "101";
  const deal = mockDeals.find(d => d.id === dealId) || mockDeals[0];
  const risk = computeDealRisk(deal);
  const daysToClose = differenceInDays(parseISO(deal.hardCloseDate || deal.closeDate), new Date());

  return (
    <Layout>
      <div className="space-y-6 animate-in fade-in duration-500">
        {/* Deal Header */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                {deal.instrument}
              </Badge>
              <Badge variant="secondary" className="font-normal">
                {deal.stage}
              </Badge>
              {risk.label !== "Normal" && (
                <Badge variant="outline" className={`font-normal ${risk.color}`}>
                  {risk.label}
                </Badge>
              )}
              <span className="text-sm text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" /> {daysToClose} days to close
              </span>
              <span className="text-sm text-muted-foreground flex items-center gap-1 border-l pl-3 ml-1">
                Coverage: {(deal.coverageRatio * 100).toFixed(0)}%
              </span>
            </div>
            <h1 className="text-3xl font-serif font-bold text-primary tracking-tight">{deal.dealName}</h1>
            <p className="text-muted-foreground mt-1">{deal.sector} • ${(deal.facilitySize / 1000000).toFixed(1)}M {deal.instrument}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" className="gap-2">
              <Printer className="h-4 w-4" /> Print Engagement
            </Button>
            <Button variant="outline" size="sm" className="gap-2">
              <Download className="h-4 w-4" /> Download IOI Report
            </Button>
            <Button variant="default" size="sm" className="gap-2 bg-primary text-primary-foreground">
              <FileText className="h-4 w-4" /> Export Deal Summary
            </Button>
          </div>
        </div>

        {/* Deal Status Timeline */}
        <div className="relative py-6 overflow-x-auto">
          <div className="min-w-[800px]">
            <div className="absolute top-1/2 left-0 w-full h-1 bg-border -translate-y-1/2 z-0" />
            <div className="grid grid-cols-8 gap-2 relative z-10">
              <TimelineStep step="Structuring" status="completed" />
              <TimelineStep step="NDA" status="completed" />
              <TimelineStep step="CIM" status="completed" />
              <TimelineStep step="Marketing" status="completed" />
              <TimelineStep step="IOI" status="completed" />
              <TimelineStep step="Bookbuilding" status="active" />
              <TimelineStep step="Allocation" status="pending" />
              <TimelineStep step="Closing" status="pending" />
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
          
          {/* Left Column (2/3) */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Debt Economics Card */}
            <Card className="border-border/60 shadow-sm">
              <CardHeader className="pb-3 border-b border-border/40">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <DollarSignIcon className="h-5 w-5 text-primary" /> Debt Economics
                  </CardTitle>
                  <Badge variant="secondary">Senior Secured</Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Target Size</p>
                    <p className="text-2xl font-serif font-bold text-primary">$45.0M</p>
                  </div>
                   <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Committed</p>
                    <div className="flex items-end gap-2">
                      <p className="text-2xl font-serif font-bold text-green-700">$32.5M</p>
                      <span className="text-xs text-green-600 font-medium mb-1.5">(72%)</span>
                    </div>
                  </div>
                   <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Spread Guidance</p>
                    <p className="text-xl font-medium text-foreground">S + 625-650</p>
                    <p className="text-[10px] text-muted-foreground mt-1">Est. All-In Yield: 11.2% – 11.5%</p>
                  </div>
                   <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">OID / Fees</p>
                    <p className="text-xl font-medium text-foreground">98.0 / 2.0%</p>
                    <p className="text-[10px] text-muted-foreground mt-1">+25 bps = +$112k/yr Interest</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Real-Time Book Status */}
            <Card className="border-border/60 shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Layers className="h-5 w-5 text-primary" /> Live Book Status
                  </CardTitle>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5 bg-emerald-50 text-emerald-700 px-2 py-1 rounded border border-emerald-100">
                      <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-xs font-semibold">Pricing Pressure: Tightening</span>
                    </div>
                  </div>
                </div>
                <CardDescription>Real-time demand tracking and subscription levels.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-muted-foreground">Subscription Progress</span>
                      <span className="font-bold text-primary">$32.5M / $45M</span>
                    </div>
                    <Progress value={72} className="h-3 bg-secondary" />
                    <div className="flex justify-between text-xs text-muted-foreground mt-1">
                      <span>Soft Circle: $5.0M</span>
                      <span className="text-green-600 font-medium">To Close: $12.5M</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-3 bg-secondary/20 rounded-lg border border-border/50">
                      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Demand by Type</h4>
                      <div className="space-y-2">
                         <DemandRow label="Direct Lenders" value="60%" color="bg-blue-500" />
                         <DemandRow label="Banks" value="25%" color="bg-indigo-500" />
                         <DemandRow label="Family Offices" value="15%" color="bg-purple-500" />
                      </div>
                    </div>
                    <div className="p-3 bg-secondary/20 rounded-lg border border-border/50">
                       <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Pricing Bands Selected</h4>
                       <div className="space-y-2">
                         <DemandRow label="S+625 (Tight)" value="20%" color="bg-emerald-500" />
                         <DemandRow label="S+650 (Mid)" value="55%" color="bg-teal-500" />
                         <DemandRow label="S+675 (Wide)" value="25%" color="bg-cyan-500" />
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Investor Engagement */}
            <Card className="border-border/60 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-primary" /> Investor Engagement
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={engagementData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                      <XAxis type="number" hide />
                      <YAxis dataKey="name" type="category" width={100} tick={{fontSize: 12, fontWeight: 500}} />
                      <Tooltip 
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            return (
                              <div className="bg-popover border border-border rounded-lg p-3 shadow-md max-w-[300px]">
                                <div className="font-semibold mb-2">{data.name} ({data.value})</div>
                                <div className="text-xs text-muted-foreground flex flex-wrap gap-1">
                                  {data.companies.split(', ').map((company: string, i: number) => (
                                    <span key={i} className="bg-secondary px-1.5 py-0.5 rounded text-foreground">{company}</span>
                                  ))}
                                </div>
                              </div>
                            );
                          }
                          return null;
                        }}
                        cursor={{fill: 'transparent'}}
                      />
                      <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                        {engagementData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-4 grid grid-cols-1 gap-2">
                  {engagementData.map((item, index) => (
                    <div key={index} className="flex items-start text-xs border-b border-border/40 pb-2 last:border-0">
                      <div className="w-24 font-medium shrink-0">{item.name}</div>
                      <div className="text-muted-foreground">{item.companies}</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

import { Covenant } from "@/data/deals";

// ... [existing imports]

// Inside DealOverview function, before return:
  const handleExportCovenants = () => {
    // Mock export
    alert("Downloading Covenant Compliance Certificate...");
  };

// Replace the "Covenant Preview" Card with this:
            <Card className="border-border/60 shadow-sm">
              <CardHeader className="pb-3 border-b border-border/40">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5 text-primary" /> Covenant Headroom
                  </CardTitle>
                  <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={handleExportCovenants}>
                    <Download className="h-3 w-3" /> Export Summary
                  </Button>
                </div>
                <CardDescription>Key financial tests and baskets analysis.</CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium text-foreground border-b pb-1">Financial Covenants</h4>
                    {deal.covenants?.filter(c => c.type === "Maintenance").map(c => (
                      <CovenantRow key={c.id} covenant={c} />
                    ))}
                    {!deal.covenants && (
                      <div className="text-sm text-muted-foreground italic">No covenants defined.</div>
                    )}
                  </div>
                   <div className="space-y-3">
                    <h4 className="text-sm font-medium text-foreground border-b pb-1">Baskets & Incurrence</h4>
                    {deal.covenants?.filter(c => c.type === "Incurrence").map(c => (
                      <CovenantRow key={c.id} covenant={c} />
                    ))}
                     {!deal.covenants && (
                      <div className="text-sm text-muted-foreground italic">No baskets defined.</div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

// ... [rest of file]

function CovenantRow({ covenant }: { covenant: Covenant }) {
  const isMaxTest = covenant.name.includes("Max") || covenant.name.includes("Capex") || covenant.name.includes("Leverage");
  const headroom = isMaxTest 
    ? covenant.threshold - covenant.proForma 
    : covenant.proForma - covenant.threshold;
  
  // Risk logic
  let isTight = false;
  let isWarning = false;
  
  if (covenant.unit === "x") {
    if (headroom < 0.25) isTight = true;
    else if (headroom < 0.50) isWarning = true;
  } else if (covenant.unit === "%") {
    if (headroom < 5) isTight = true;
  } else if (covenant.unit === "$") {
    // e.g. Liquidity < 10% buffer
    if (headroom < covenant.threshold * 0.1) isTight = true; 
  }

  return (
    <div className="flex items-center justify-between text-sm py-1.5 border-b border-border/50 last:border-0">
      <div>
        <div className="flex items-center gap-2">
           <span className="text-muted-foreground">{covenant.name}</span>
           {isTight && <Badge variant="outline" className="text-[10px] h-4 px-1 bg-red-50 text-red-600 border-red-200">Tight</Badge>}
           {isWarning && <Badge variant="outline" className="text-[10px] h-4 px-1 bg-amber-50 text-amber-600 border-amber-200">Watch</Badge>}
        </div>
        <div className="text-[10px] text-muted-foreground mt-0.5">
           Headroom: {covenant.unit === "$" ? "$" + (headroom/1000000).toFixed(1) + "M" : headroom.toFixed(2) + covenant.unit}
        </div>
      </div>
      <div className="text-right">
        <div className="font-medium font-serif">
          {covenant.unit === "$" ? "$" + (covenant.proForma/1000000).toFixed(1) + "M" : covenant.proForma.toFixed(2) + covenant.unit}
        </div>
        <div className="text-[10px] text-muted-foreground">
          Limit: {covenant.unit === "$" ? "$" + (covenant.threshold/1000000).toFixed(1) + "M" : covenant.threshold.toFixed(2) + covenant.unit}
        </div>
      </div>
    </div>
  );
}

          </div>

          {/* Right Column (1/3) */}
          <div className="space-y-6">
            
            {/* Actionable Alerts / Task Panel */}
            <Card className="border-l-4 border-l-amber-500 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-amber-700">
                  <AlertCircle className="h-5 w-5" /> Action Required
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Pricing Decisions</h4>
                  <AlertItem 
                    title="Approve Final Pricing" 
                    desc="Lead investor requesting confirmation on OID flex."
                    impact="Delays closing by 2 days"
                    urgent 
                  />
                </div>
                
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Diligence</h4>
                  <AlertItem 
                    title="Respond to BlackRock" 
                    desc="Outstanding diligence question on FY24 churn." 
                    impact="Blocks credit committee approval"
                  />
                </div>

                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Legal</h4>
                  <AlertItem 
                    title="Finish Covenant Comps" 
                    desc="Legal counsel needs input for draft v2." 
                    impact="Delays CA distribution"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Deal Summary (Existing) */}
            <Card className="bg-primary text-primary-foreground border-none shadow-md">
              <CardHeader>
                <CardTitle className="text-white">Deal Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <DetailRow label="Borrower" value="Titan Software Inc." dark />
                <Separator className="bg-primary-foreground/20" />
                <DetailRow label="Instrument" value="Senior Secured" dark />
                <Separator className="bg-primary-foreground/20" />
                <DetailRow label="Facility Size" value="$45,000,000" dark />
                <Separator className="bg-primary-foreground/20" />
                <DetailRow label="Tenor" value="5 Years" dark />
              </CardContent>
            </Card>

             {/* Documents Widget (Enhanced) */}
             <Card className="border-border/60 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <FileCheck className="h-5 w-5 text-primary" /> Document Status
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-3 bg-red-50 border border-red-100 rounded-md">
                  <h4 className="text-xs font-bold text-red-800 uppercase tracking-wide mb-2">Requiring Review</h4>
                   <div className="space-y-2">
                    <DocActionRow name="Credit Agreement v3" action="Review Markup" />
                    <DocActionRow name="Intercreditor Agmt" action="Sign Off" />
                   </div>
                </div>

                <div className="space-y-2">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Recent Uploads</h4>
                  <div className="flex items-center justify-between text-sm p-2 hover:bg-secondary/50 rounded cursor-pointer">
                     <span className="flex items-center gap-2"><FileText className="h-3 w-3 text-muted-foreground"/> Security Docs</span>
                     <span className="text-xs text-muted-foreground">2h ago</span>
                  </div>
                  <div className="flex items-center justify-between text-sm p-2 hover:bg-secondary/50 rounded cursor-pointer">
                     <span className="flex items-center gap-2"><FileText className="h-3 w-3 text-muted-foreground"/> Compliance Cert</span>
                     <span className="text-xs text-muted-foreground">5h ago</span>
                  </div>
                </div>

                <Button variant="outline" className="w-full text-xs h-8">
                  Go to Data Room
                </Button>
              </CardContent>
            </Card>

            {/* Deal Team */}
            <Card className="border-border/60 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Deal Team</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <TeamMember name="Sarah Jenkins" role="Lead Banker" initials="SJ" />
                <TeamMember name="Michael Ross" role="Analyst" initials="MR" />
                <TeamMember name="David Chen" role="Legal Counsel" initials="DC" />
              </CardContent>
            </Card>

          </div>
        </div>
      </div>
    </Layout>
  );
}

// --- Sub-components ---

function TimelineStep({ step, status }: { step: string; status: 'completed' | 'active' | 'pending' }) {
  const statusColors = {
    completed: "bg-primary border-primary text-primary-foreground",
    active: "bg-white border-primary text-primary ring-2 ring-primary/20",
    pending: "bg-white border-border text-muted-foreground"
  };

  const textColors = {
    completed: "text-primary font-medium",
    active: "text-primary font-bold",
    pending: "text-muted-foreground"
  };

  return (
    <div className="flex flex-col items-center relative group cursor-default">
      <div className={`h-6 w-6 rounded-full border-2 flex items-center justify-center z-10 transition-all mb-2 ${statusColors[status]}`}>
        {status === 'completed' && <CheckCircle2 className="h-3 w-3" />}
        {status === 'active' && <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />}
      </div>
      <span className={`text-[10px] uppercase tracking-wide text-center ${textColors[status]}`}>{step}</span>
    </div>
  );
}

function DollarSignIcon({ className }: { className?: string }) {
    return (
        <svg 
            xmlns="http://www.w3.org/2000/svg" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            className={className}
        >
            <line x1="12" x2="12" y1="1" y2="23" />
            <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
        </svg>
    )
}

function DemandRow({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <div className={`h-2 w-2 rounded-full ${color}`} />
      <span className="flex-1 text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

function CovenantRowOld({ label, value, status }: { label: string; value: string; status?: string }) {
  return (
    <div className="flex items-center justify-between text-sm py-1">
      <span className="text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2">
        <span className="font-medium font-serif">{value}</span>
        {status && <Badge variant="outline" className="text-[10px] h-4 px-1">{status}</Badge>}
      </div>
    </div>
  );
}

function AlertItem({ title, desc, impact, urgent }: { title: string; desc: string; impact?: string, urgent?: boolean }) {
  return (
    <div className="flex items-start gap-3 p-2 rounded-lg hover:bg-secondary/50 transition-colors cursor-pointer">
      <div className={`mt-0.5 h-2 w-2 rounded-full shrink-0 ${urgent ? "bg-red-500 animate-pulse" : "bg-amber-400"}`} />
      <div className="flex-1">
        <p className="text-sm font-medium leading-none mb-1">{title}</p>
        <p className="text-xs text-muted-foreground leading-snug">{desc}</p>
        {impact && <p className="text-[10px] text-red-600 font-medium mt-1">Impact: {impact}</p>}
      </div>
      <ChevronRight className="h-4 w-4 text-muted-foreground ml-auto self-center" />
    </div>
  );
}

function DocActionRow({ name, action }: { name: string; action: string }) {
  return (
    <div className="flex items-center justify-between bg-white p-2 rounded border border-red-100">
      <span className="text-sm font-medium truncate max-w-[120px]" title={name}>{name}</span>
      <Button size="sm" variant="ghost" className="h-6 text-[10px] bg-red-50 text-red-700 hover:bg-red-100 hover:text-red-800 px-2">
        {action}
      </Button>
    </div>
  );
}

function DetailRow({ label, value, dark }: { label: string; value: string; dark?: boolean }) {
  return (
    <div className="flex justify-between items-center">
      <span className={dark ? "text-primary-foreground/70 text-sm" : "text-muted-foreground text-sm"}>{label}</span>
      <span className="font-medium font-serif">{value}</span>
    </div>
  );
}

function TeamMember({ name, role, initials }: { name: string; role: string; initials: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center text-xs font-bold text-primary">
        {initials}
      </div>
      <div>
        <div className="text-sm font-medium">{name}</div>
        <div className="text-xs text-muted-foreground">{role}</div>
      </div>
    </div>
  );
}

const engagementData = [
  { name: 'NDA Signed', value: 45, color: '#0f172a', companies: 'BlackRock, Apollo, Ares, Oaktree, KKR, Carlyle, Golub, HPS, Sixth Street, Barings, Bain Capital, Monroe, Churchill, Antares, Owl Rock, BlueOwl, Blackstone, Vista, Thoma Bravo, TPG' },
  { name: 'Lender Presentation Completed', value: 38, color: '#334155', companies: 'BlackRock, Apollo, Ares, Oaktree, KKR, Carlyle, Golub, HPS, Sixth Street, Barings, Bain Capital, Monroe, Churchill, Antares, Owl Rock' },
  { name: 'Due Diligence Questions', value: 24, color: '#475569', companies: 'BlackRock, Apollo, Ares, Oaktree, KKR, Carlyle, Golub, HPS, Sixth Street, Barings' },
  { name: 'Grid Submitted', value: 12, color: '#d97706', companies: 'BlackRock, Apollo, Ares, Oaktree, KKR, Carlyle' },
  { name: 'Closed', value: 8, color: '#16a34a', companies: 'BlackRock, Apollo, Ares, Oaktree' },
];
