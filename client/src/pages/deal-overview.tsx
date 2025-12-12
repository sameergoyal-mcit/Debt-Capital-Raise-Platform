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
  ChevronRight
} from "lucide-react";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, Cell, Legend } from "recharts";

export default function DealOverview() {
  const [, params] = useRoute("/deal/:id/overview");
  const dealId = params?.id || "123";

  return (
    <Layout>
      <div className="space-y-6 animate-in fade-in duration-500">
        {/* Deal Header */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                Series B
              </Badge>
              <span className="text-sm text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" /> Closing in 14 days
              </span>
            </div>
            <h1 className="text-3xl font-serif font-bold text-primary tracking-tight">Project Titan</h1>
            <p className="text-muted-foreground mt-1">Enterprise SaaS • $45M Senior Secured Term Loan</p>
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
                  </div>
                   <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">OID / Fees</p>
                    <p className="text-xl font-medium text-foreground">98.0 / 2.0%</p>
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
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                    </span>
                    <span className="text-xs font-medium text-green-600">Live Updates</span>
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
                <div className="h-[250px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={engagementData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                      <XAxis type="number" hide />
                      <YAxis dataKey="name" type="category" width={100} tick={{fontSize: 12}} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: "hsl(var(--popover))", borderRadius: "8px", border: "1px solid hsl(var(--border))" }}
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
              </CardContent>
            </Card>

            {/* Covenant Preview */}
            <Card className="border-border/60 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-primary" /> Covenant Preview
                </CardTitle>
                <CardDescription>Key financial tests and baskets summary.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium text-foreground border-b pb-1">Financial Covenants</h4>
                    <CovenantRow label="Max Leverage (Total Net)" value="4.50x" status="Maintenance" />
                    <CovenantRow label="Min Interest Coverage" value="2.50x" status="Maintenance" />
                    <CovenantRow label="Max Capex" value="$5.0M" status="Incurrence" />
                  </div>
                   <div className="space-y-3">
                    <h4 className="text-sm font-medium text-foreground border-b pb-1">Baskets & Restricted Payments</h4>
                    <CovenantRow label="General Basket" value="$2.0M" />
                    <CovenantRow label="Unlimited RP" value="< 3.00x Lev" />
                    <CovenantRow label="Incremental Facility" value="Free + MFN" />
                  </div>
                </div>
              </CardContent>
            </Card>

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
              <CardContent className="space-y-3">
                <AlertItem 
                  title="Approve Final Pricing" 
                  desc="Lead investor requesting confirmation on OID flex."
                  urgent 
                />
                <AlertItem 
                  title="Respond to BlackRock" 
                  desc="Outstanding diligence question on FY24 churn." 
                />
                <AlertItem 
                  title="Finish Covenant Comps" 
                  desc="Legal counsel needs input for draft v2." 
                />
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

function CovenantRow({ label, value, status }: { label: string; value: string; status?: string }) {
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

function AlertItem({ title, desc, urgent }: { title: string; desc: string; urgent?: boolean }) {
  return (
    <div className="flex items-start gap-3 p-2 rounded-lg hover:bg-secondary/50 transition-colors cursor-pointer">
      <div className={`mt-0.5 h-2 w-2 rounded-full shrink-0 ${urgent ? "bg-red-500 animate-pulse" : "bg-amber-400"}`} />
      <div>
        <p className="text-sm font-medium leading-none mb-1">{title}</p>
        <p className="text-xs text-muted-foreground leading-snug">{desc}</p>
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
  { name: 'NDA Signed', value: 45, color: '#0f172a' }, // Primary
  { name: 'CIM Access', value: 38, color: '#334155' }, // Slate-700
  { name: 'Questions', value: 24, color: '#475569' }, // Slate-600
  { name: 'IOIs', value: 12, color: '#d97706' },      // Amber-600
  { name: 'Firm Bids', value: 8, color: '#16a34a' },   // Green-600
];
