import React, { useState, useEffect } from "react";
import { Link } from "wouter";
import { useAuth } from "@/context/auth-context";
import { getInvestorDeals, InvestorDealSummary } from "@/lib/investor-utils";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  ArrowRight, 
  Clock, 
  FileText, 
  MessageSquare, 
  AlertCircle,
  Briefcase,
  Calendar
} from "lucide-react";
import { format, parseISO, differenceInDays } from "date-fns";
import { downloadICS, ICSEvent } from "@/lib/ics-generator";
import { dealDeadlines } from "@/lib/deal-deadlines";
import { useToast } from "@/hooks/use-toast";
import { AccessNotice } from "@/components/access-notice";

export default function InvestorDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [deals, setDeals] = useState<InvestorDealSummary[]>([]);

  useEffect(() => {
    if (user?.lenderId) {
      setDeals(getInvestorDeals(user.lenderId));
    }
  }, [user]);

  const handleDownloadAllCalendar = () => {
    if (deals.length === 0) return;

    const events: ICSEvent[] = [];

    deals.forEach(({ deal, invitation }) => {
        const baseDesc = `Deal: ${deal.dealName}\\nIssuer: ${deal.sponsor}\\nPlatform: CapitalFlow`;
        
        // Use centralized deadline logic
        const deadlines = dealDeadlines.getDeadlines(deal, invitation.ndaSignedAt);
        
        deadlines.forEach(d => {
             events.push({
               uid: `${deal.id}-${d.type.toLowerCase()}-deadline-${user?.lenderId}@capitalflow.com`,
               summary: `${d.label} - ${deal.dealName}`,
               description: `${d.label} is due.\\n${baseDesc}`,
               startDate: d.date
             });
        });
    });

    if (events.length === 0) {
        toast({
            title: "No deadlines found",
            description: "No upcoming deadlines found across your active deals.",
        });
        return;
    }

    downloadICS("capitalflow-all-deadlines", events);
    toast({
        title: "Calendar Exported",
        description: `Exported ${events.length} deadlines for ${deals.length} deals.`,
    });
  };

  if (!user || user.role !== "Investor") {
    return (
        <Layout>
            <div className="flex items-center justify-center h-[80vh]">
                <Card className="max-w-md">
                    <CardHeader>
                        <CardTitle className="text-destructive">Access Restricted</CardTitle>
                        <CardDescription>This dashboard is for accredited investors only.</CardDescription>
                    </CardHeader>
                </Card>
            </div>
        </Layout>
    );
  }

  return (
    <Layout>
      <AccessNotice />
      <div className="space-y-8 animate-in fade-in duration-500">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-serif font-bold text-primary tracking-tight">Investor Dashboard</h1>
            <p className="text-muted-foreground mt-1">
              Welcome back, {user.name}. You have {deals.length} active opportunities.
            </p>
          </div>
          <Button variant="outline" className="gap-2" onClick={handleDownloadAllCalendar}>
            <Calendar className="h-4 w-4" /> View Calendar
          </Button>
        </div>

        {/* My Exposure Summary */}
        <Card className="bg-gradient-to-r from-primary/5 via-primary/3 to-transparent border-primary/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Briefcase className="h-5 w-5 text-primary" /> My Exposure Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="text-center p-4 bg-background/60 rounded-lg border border-border/50">
                <div className="text-3xl font-bold text-primary">{deals.length}</div>
                <p className="text-xs text-muted-foreground mt-1">Active Deals</p>
              </div>
              <div className="text-center p-4 bg-background/60 rounded-lg border border-border/50">
                <div className="text-3xl font-bold text-green-600">
                  {deals.filter(d => d.stats.commitmentSubmitted).length}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Commitments Submitted</p>
              </div>
              <div className="text-center p-4 bg-background/60 rounded-lg border border-border/50">
                <div className="text-3xl font-bold text-amber-600">
                  {deals.filter(d => d.stats.actionRequired).length}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Pending Actions</p>
              </div>
              <div className="text-center p-4 bg-background/60 rounded-lg border border-border/50">
                <div className="text-xl font-semibold text-foreground">
                  {deals.length > 0 && deals[0].stats.nextDeadlineDate 
                    ? format(parseISO(deals[0].stats.nextDeadlineDate), "MMM d") 
                    : "-"}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Next Deadline</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Priority Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
           <Card className="bg-primary/5 border-primary/20">
             <CardHeader className="pb-2">
               <CardTitle className="text-sm font-medium text-primary flex items-center gap-2">
                 <AlertCircle className="h-4 w-4" /> Action Required
               </CardTitle>
             </CardHeader>
             <CardContent>
               <div className="text-2xl font-bold" data-testid="text-action-count">{deals.filter(d => d.stats.actionRequired).length}</div>
               <p className="text-xs text-muted-foreground mt-1">Deals requiring attention</p>
             </CardContent>
           </Card>
           
           <Card>
             <CardHeader className="pb-2">
               <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                 <FileText className="h-4 w-4" /> New Documents
               </CardTitle>
             </CardHeader>
             <CardContent>
               <div className="text-2xl font-bold" data-testid="text-docs-count">{deals.reduce((acc, d) => acc + d.stats.newDocsCount, 0)}</div>
               <p className="text-xs text-muted-foreground mt-1">Uploaded in last 7 days</p>
             </CardContent>
           </Card>

           <Card>
             <CardHeader className="pb-2">
               <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                 <Clock className="h-4 w-4" /> Upcoming Deadlines
               </CardTitle>
             </CardHeader>
             <CardContent>
               <div className="text-2xl font-bold" data-testid="text-deadline-count">{deals.filter(d => d.stats.nextDeadlineLabel?.includes("Deadline")).length}</div>
               <p className="text-xs text-muted-foreground mt-1">Due within 14 days</p>
             </CardContent>
           </Card>
        </div>

        {/* Deals Table */}
        <Card>
            <CardHeader>
                <CardTitle>Active Opportunities</CardTitle>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Deal / Sponsor</TableHead>
                            <TableHead>Instrument</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Next Deadline</TableHead>
                            <TableHead>Docs</TableHead>
                            <TableHead>Action</TableHead>
                            <TableHead></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {deals.map(({ deal, invitation, stats }) => (
                            <TableRow key={deal.id} className="group hover:bg-secondary/20 transition-colors">
                                <TableCell>
                                    <div className="flex flex-col">
                                        <span className="font-medium text-base">{deal.dealName}</span>
                                        <span className="text-xs text-muted-foreground">{deal.sponsor}</span>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <Badge variant="outline" className="bg-secondary/50 font-normal">
                                        {deal.instrument}
                                    </Badge>
                                </TableCell>
                                <TableCell>
                                    {invitation.ndaRequired && !invitation.ndaSignedAt ? (
                                         <Badge variant="secondary" className="bg-amber-100 text-amber-800 border-amber-200">NDA Pending</Badge>
                                    ) : (
                                        <Badge variant="outline" className="border-green-200 text-green-700 bg-green-50">Active Access</Badge>
                                    )}
                                </TableCell>
                                <TableCell>
                                    <div className="flex flex-col text-sm">
                                        <span className="text-muted-foreground text-xs">{stats.nextDeadlineLabel}</span>
                                        <span className={`font-medium ${differenceInDays(parseISO(stats.nextDeadlineDate || ""), new Date()) < 5 ? "text-red-600" : ""}`}>
                                            {stats.nextDeadlineDate ? format(parseISO(stats.nextDeadlineDate), "MMM d") : "-"}
                                        </span>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    {stats.newDocsCount > 0 && (
                                        <Badge variant="secondary" className="text-xs gap-1">
                                            <FileText className="h-3 w-3" /> {stats.newDocsCount} New
                                        </Badge>
                                    )}
                                </TableCell>
                                <TableCell>
                                    {stats.actionRequired && (
                                        <Badge className="bg-primary text-primary-foreground shadow-sm animate-pulse">
                                            {stats.actionRequired}
                                        </Badge>
                                    )}
                                </TableCell>
                                <TableCell>
                                    <Link href={`/investor/deal/${deal.id}`}>
                                        <Button variant="ghost" size="sm" className="gap-2 group-hover:bg-background">
                                            View <ArrowRight className="h-4 w-4" />
                                        </Button>
                                    </Link>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
