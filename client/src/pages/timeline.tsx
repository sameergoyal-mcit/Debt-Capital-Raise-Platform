import React from "react";
import { useRoute, Link } from "wouter";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { 
  CheckCircle2, 
  Circle, 
  Clock, 
  Calendar, 
  AlertTriangle, 
  ChevronRight,
  ArrowRight
} from "lucide-react";
import { mockDeals } from "@/data/deals";
import { RoleSwitcher } from "@/components/role-switcher";
import { useAuth } from "@/context/auth-context";

export default function Timeline() {
  const [, params] = useRoute("/deal/:id/timeline");
  const dealId = params?.id;
  const deal = mockDeals.find(d => d.id === dealId) || mockDeals[0];
  const { user } = useAuth();
  const isInvestor = user?.role === "Investor";

  const allMilestones = [
    {
      phase: "Preparation",
      internalOnly: true,
      items: [
        { title: "Kick-off Meeting", date: "May 15, 2025", status: "completed" },
        { title: "Financial Model Freeze", date: "May 20, 2025", status: "completed" },
        { title: "Lender Presentation Drafting", date: "May 25, 2025", status: "completed" },
        { title: "Lender List Approval", date: "May 28, 2025", status: "completed" },
      ]
    },
    {
      phase: "Marketing",
      items: [
        { title: "NDA Execution", date: "Jun 01, 2025", status: "completed" },
        { title: "Lender Presentation Materials", date: "Jun 06, 2025", status: "completed" },
        { title: "Live Lender Presentation with Q&A", date: "Jun 15, 2025", status: "active" },
      ]
    },
    {
      phase: "Due Diligence",
      items: [
        { title: "Due Diligence Stage", date: "Jun 20, 2025", status: "pending" },
        { title: "Initial Indication (IOI)", date: "Jun 25, 2025", status: "pending" },
        { title: "Commitment Deadline", date: "Jul 10, 2025", status: "pending" },
      ]
    },
    {
      phase: "Closing",
      items: [
        { title: "Final Documentation", date: "Jul 12, 2025", status: "pending" },
        { title: "Funding & Closing", date: "Jul 15, 2025", status: "pending" },
      ]
    }
  ];

  const milestones = isInvestor 
    ? allMilestones.filter(m => !m.internalOnly) 
    : allMilestones;

  return (
    <Layout>
      <div className="space-y-6 animate-in fade-in duration-500">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-semibold text-primary tracking-tight">Timeline</h1>
              <Badge variant="outline" className="bg-primary/5 border-primary/20 text-primary">
                {deal.stage}
              </Badge>
            </div>
            <p className="text-muted-foreground">Key milestones and critical path for {deal.dealName}.</p>
          </div>
          <div className="flex items-center gap-3">
             <Button>
               <Calendar className="mr-2 h-4 w-4" /> Sync Calendar
             </Button>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {/* Main Timeline (2/3) */}
          <div className="md:col-span-2 space-y-8">
            <Card className="border-border/60 shadow-sm">
               <CardHeader>
                 <CardTitle>Execution Schedule</CardTitle>
                 <CardDescription>Target closing: {new Date(deal.closeDate).toLocaleDateString()}</CardDescription>
               </CardHeader>
               <CardContent>
                 <div className="relative border-l-2 border-border ml-3 space-y-8 pl-8 py-2">
                   {milestones.map((phase, idx) => (
                     <div key={idx} className="relative">
                       <span className="absolute -left-[41px] top-0 flex h-6 w-6 items-center justify-center rounded-full bg-secondary border border-border text-xs font-bold text-muted-foreground">
                         {idx + 1}
                       </span>
                       <h3 className="text-lg font-semibold text-primary mb-4">{phase.phase}</h3>
                       <div className="space-y-4">
                         {phase.items.map((item, itemIdx) => (
                           <div key={itemIdx} className="flex items-start group">
                             <div className="mt-1 mr-4">
                               {item.status === "completed" ? (
                                 <CheckCircle2 className="h-5 w-5 text-green-600" />
                               ) : item.status === "active" ? (
                                 <div className="h-5 w-5 rounded-full border-2 border-blue-600 bg-blue-100 flex items-center justify-center">
                                   <div className="h-2 w-2 rounded-full bg-blue-600 animate-pulse" />
                                 </div>
                               ) : (
                                 <Circle className="h-5 w-5 text-muted-foreground/40" />
                               )}
                             </div>
                             <div className={`flex-1 p-3 rounded-lg border ${item.status === 'active' ? 'bg-blue-50/50 border-blue-100' : 'bg-card border-border/50'}`}>
                               <div className="flex justify-between items-start">
                                 <div>
                                   <p className={`font-medium ${item.status === 'completed' ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
                                     {item.title}
                                   </p>
                                   <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                                     <Calendar className="h-3 w-3" /> {item.date}
                                   </p>
                                 </div>
                                 {item.status === 'active' && (
                                   <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 border-blue-200">Current</Badge>
                                 )}
                               </div>
                             </div>
                           </div>
                         ))}
                       </div>
                     </div>
                   ))}
                 </div>
               </CardContent>
            </Card>
          </div>

          {/* Sidebar (1/3) */}
          <div className="space-y-6">
            {!isInvestor && (
              <Card className="border-l-4 border-l-amber-500 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-amber-700 text-base">
                    <AlertTriangle className="h-5 w-5" /> Potential Blockers
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="p-3 bg-amber-50 rounded-md border border-amber-100">
                    <p className="text-sm font-medium text-amber-900">Quality of Earnings Report</p>
                    <p className="text-xs text-amber-700 mt-1">Delayed by 3 days. May impact diligence access date.</p>
                  </div>
                  <div className="p-3 bg-secondary rounded-md border border-border">
                    <p className="text-sm font-medium">Customer Calls</p>
                    <p className="text-xs text-muted-foreground mt-1">Pending scheduling with top 3 accounts.</p>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card className="shadow-sm border-border/60">
              <CardHeader>
                <CardTitle className="text-base">Next Key Date</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-4">
                  <p className="text-4xl font-serif font-bold text-primary">Jun 15</p>
                  <p className="text-sm text-muted-foreground font-medium mt-1">Live Lender Presentation</p>
                  <div className="mt-4 flex justify-center">
                    <Badge variant="outline" className="bg-primary/5 text-primary">
                      3 Days Remaining
                    </Badge>
                  </div>
                </div>
                <Separator className="my-4" />
                <Link href={`/deal/${dealId}/calendar`}>
                  <Button className="w-full" variant="outline" data-testid="button-view-calendar">
                    View Full Calendar
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
}
