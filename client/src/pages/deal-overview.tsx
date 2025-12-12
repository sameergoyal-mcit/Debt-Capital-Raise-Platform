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
  ArrowRight
} from "lucide-react";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";

export default function DealOverview() {
  const [, params] = useRoute("/deal/:id/overview");
  const dealId = params?.id || "123";

  return (
    <Layout>
      <div className="space-y-6 animate-in fade-in duration-500">
        {/* Deal Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
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
          <div className="flex gap-3">
            <Button variant="outline" className="gap-2">
              <Download className="h-4 w-4" /> Teaser
            </Button>
            <Button className="gap-2 bg-primary text-primary-foreground">
              Manage Deal <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Timeline Visual */}
        <div className="relative pt-6 pb-2">
          <div className="absolute top-1/2 left-0 w-full h-1 bg-border -translate-y-1/2 z-0 hidden md:block" />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 relative z-10">
            <TimelineStep step="Preparation" status="completed" date="Oct 12" />
            <TimelineStep step="Marketing" status="completed" date="Nov 01" />
            <TimelineStep step="Diligence" status="active" date="In Progress" />
            <TimelineStep step="Closing" status="pending" date="Dec 20 (Est)" />
          </div>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="bg-background border border-border/60 p-1">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="terms">Term Sheet</TabsTrigger>
            <TabsTrigger value="activity">Recent Activity</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-3">
              {/* Left Column: Key Stats & Progress */}
              <div className="md:col-span-2 space-y-6">
                <Card className="border-border/60 shadow-sm">
                  <CardHeader>
                    <CardTitle>Bookbuilding Progress</CardTitle>
                    <CardDescription>Current investor commitments vs target.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium text-muted-foreground">Total Committed</span>
                        <span className="font-bold text-primary">$32.5M / $45M</span>
                      </div>
                      <Progress value={72} className="h-3 bg-secondary" />
                      <p className="text-xs text-muted-foreground text-right">72% Filled</p>
                    </div>

                    <div className="grid grid-cols-3 gap-4 pt-4">
                      <div className="text-center p-3 bg-secondary/30 rounded-lg">
                        <div className="text-2xl font-bold font-serif text-primary">8</div>
                        <div className="text-xs text-muted-foreground uppercase tracking-wider mt-1">Investors</div>
                      </div>
                      <div className="text-center p-3 bg-secondary/30 rounded-lg">
                        <div className="text-2xl font-bold font-serif text-primary">$4.1M</div>
                        <div className="text-xs text-muted-foreground uppercase tracking-wider mt-1">Avg Ticket</div>
                      </div>
                      <div className="text-center p-3 bg-secondary/30 rounded-lg">
                        <div className="text-2xl font-bold font-serif text-primary">14d</div>
                        <div className="text-xs text-muted-foreground uppercase tracking-wider mt-1">To Close</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <div className="grid gap-6 md:grid-cols-2">
                  <Card className="border-border/60 shadow-sm">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <FileText className="h-4 w-4 text-primary" /> Key Documents
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <DocumentRow title="Confidential Information Memorandum" date="Nov 02" type="PDF" />
                      <DocumentRow title="Financial Model v3" date="Nov 15" type="XLSX" />
                      <DocumentRow title="Term Sheet - Signed" date="Nov 20" type="PDF" />
                      <Button variant="ghost" size="sm" className="w-full mt-2 text-muted-foreground">
                        View All Documents
                      </Button>
                    </CardContent>
                  </Card>

                  <Card className="border-border/60 shadow-sm">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-primary" /> Pending Items
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <TaskRow task="Upload Q3 Financials" status="Overdue" />
                      <TaskRow task="Approve Legal Counsel" status="Pending" />
                      <TaskRow task="KYC for Lead Investor" status="In Progress" />
                      <Button variant="ghost" size="sm" className="w-full mt-2 text-muted-foreground">
                        View Closing Checklist
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* Right Column: Deal Summary */}
              <div className="space-y-6">
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
                    <Separator className="bg-primary-foreground/20" />
                    <DetailRow label="Pricing" value="S+650 bps" dark />
                    <Separator className="bg-primary-foreground/20" />
                    <DetailRow label="Upfront Fee" value="2.00%" dark />
                  </CardContent>
                </Card>

                <Card className="border-border/60 shadow-sm">
                  <CardHeader>
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
          </TabsContent>

          <TabsContent value="terms">
            <Card>
              <CardContent className="p-8">
                <p className="text-muted-foreground text-center">Term sheet visualization would go here.</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}

function TimelineStep({ step, status, date }: { step: string; status: 'completed' | 'active' | 'pending'; date: string }) {
  const statusColors = {
    completed: "bg-primary border-primary text-primary-foreground",
    active: "bg-white border-primary text-primary ring-4 ring-primary/10",
    pending: "bg-white border-border text-muted-foreground"
  };

  const lineColors = {
    completed: "text-primary",
    active: "text-primary font-semibold",
    pending: "text-muted-foreground"
  };

  return (
    <div className="flex flex-col md:items-center relative">
      <div className={`h-8 w-8 rounded-full border-2 flex items-center justify-center z-10 transition-all ${statusColors[status]}`}>
        {status === 'completed' ? <CheckCircle2 className="h-4 w-4" /> : <div className="h-2 w-2 rounded-full bg-current" />}
      </div>
      <div className="ml-12 md:ml-0 md:mt-3 md:text-center">
        <div className={`text-sm ${lineColors[status]}`}>{step}</div>
        <div className="text-xs text-muted-foreground">{date}</div>
      </div>
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

function DocumentRow({ title, date, type }: { title: string; date: string; type: string }) {
  return (
    <div className="flex items-center justify-between p-2 hover:bg-secondary/50 rounded-md transition-colors cursor-pointer group">
      <div className="flex items-center gap-3">
        <div className="h-8 w-8 bg-secondary rounded flex items-center justify-center text-xs font-bold text-muted-foreground group-hover:bg-white transition-colors">
          {type}
        </div>
        <div>
          <div className="text-sm font-medium text-foreground">{title}</div>
          <div className="text-xs text-muted-foreground">{date}</div>
        </div>
      </div>
      <Download className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
    </div>
  );
}

function TaskRow({ task, status }: { task: string; status: string }) {
  const isOverdue = status === "Overdue";
  return (
    <div className="flex items-center justify-between p-2 border-b border-border/40 last:border-0">
      <div className="flex items-center gap-2">
        <div className={`h-2 w-2 rounded-full ${isOverdue ? "bg-destructive" : "bg-amber-400"}`} />
        <span className="text-sm font-medium">{task}</span>
      </div>
      <span className={`text-xs px-2 py-0.5 rounded-full ${isOverdue ? "bg-destructive/10 text-destructive" : "bg-secondary text-muted-foreground"}`}>
        {status}
      </span>
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
