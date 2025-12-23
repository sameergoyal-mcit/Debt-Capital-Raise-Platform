import React, { useState, useEffect } from "react";
import { Link, useRoute } from "wouter";
import { useAuth } from "@/context/auth-context";
import { getInvestorDeal, InvestorDealSummary } from "@/lib/investor-utils";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { NDAGate } from "@/components/nda-gate";
import { 
  ArrowRight, 
  Clock, 
  FileText, 
  MessageSquare, 
  AlertCircle,
  Briefcase,
  CheckCircle,
  Download,
  Lock,
  PenTool,
  HelpCircle,
  ExternalLink,
  Calendar
} from "lucide-react";
import { format, parseISO, differenceInDays } from "date-fns";
import { downloadICS, ICSEvent } from "@/lib/ics-generator";
import { dealDeadlines } from "@/lib/deal-deadlines";
import { useToast } from "@/hooks/use-toast";

export default function InvestorDealHome() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, params] = useRoute("/investor/deal/:id");
  const dealId = params?.id || "";
  
  const [data, setData] = useState<InvestorDealSummary | null>(null);

  useEffect(() => {
    if (user?.lenderId && dealId) {
      setData(getInvestorDeal(dealId, user.lenderId));
    }
  }, [dealId, user]);

  if (!user || user.role !== "Investor") return null; // Or redirect
  if (!data) return <Layout><div className="p-8">Loading deal data...</div></Layout>;

  const { deal, invitation, stats } = data;
  const isNdaSigned = !invitation.ndaRequired || !!invitation.ndaSignedAt;

  const handleDownloadCalendar = () => {
    const events: ICSEvent[] = [];
    const baseDesc = `Deal: ${deal.dealName}\\nIssuer: ${deal.sponsor}\\nPlatform: CapitalFlow`;

    const deadlines = dealDeadlines.getDeadlines(deal, invitation.ndaSignedAt);
    
    deadlines.forEach(d => {
         events.push({
           uid: `${deal.id}-${d.type.toLowerCase()}-deadline-${user.lenderId}@capitalflow.com`,
           summary: `${d.label} - ${deal.dealName}`,
           description: `${d.label}.\\n${baseDesc}`,
           startDate: d.date
         });
    });

    if (events.length === 0) {
      toast({
        title: "No upcoming deadlines",
        description: "There are no specific dates to add to your calendar.",
      });
      return;
    }

    const filename = `capitalflow-${deal.borrowerName.toLowerCase().replace(/\s+/g, '-')}-deadlines`;
    downloadICS(filename, events);
    
    toast({
      title: "Calendar Exported",
      description: `${events.length} deadlines downloaded to .ics file.`,
    });
  };

  return (
    <Layout>
      <div className="space-y-6 animate-in fade-in duration-500 max-w-6xl mx-auto">
         {/* Breadcrumb-ish */}
         <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
             <Link href="/investor" className="hover:text-primary">Dashboard</Link>
             <span>/</span>
             <span className="font-medium text-foreground">{deal.dealName}</span>
         </div>

         {/* Header */}
         <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
             <div>
                 <div className="flex items-center gap-3 mb-2">
                     <Badge variant="outline" className="text-primary border-primary/20 bg-primary/5">{deal.instrument}</Badge>
                     <Badge variant="secondary" className="font-normal">{deal.sector}</Badge>
                 </div>
                 <h1 className="text-4xl font-serif font-bold text-primary tracking-tight">{deal.dealName}</h1>
                 <p className="text-lg text-muted-foreground mt-1">{deal.sponsor} • ${(deal.facilitySize / 1e6).toFixed(0)}M Transaction</p>
             </div>
             
             {/* Primary Call to Action */}
             {!isNdaSigned ? (
                 <div className="flex items-center gap-4 bg-amber-50 border border-amber-200 p-4 rounded-lg shadow-sm">
                     <div className="flex items-center gap-3 text-amber-800">
                         <Lock className="h-5 w-5" />
                         <div className="text-sm font-medium">NDA Required to access Data Room</div>
                     </div>
                     {/* FIX: Link to Documents/NDA Gate instead of Overview */}
                     <Link href={`/deal/${dealId}/documents`}>
                         <Button className="bg-amber-600 hover:bg-amber-700 text-white">Sign NDA Now</Button>
                     </Link>
                 </div>
             ) : (
                 <div className="flex gap-3">
                     <Link href={`/deal/${dealId}/documents`}>
                        <Button variant="outline" className="gap-2 h-12">
                            <FileText className="h-4 w-4" /> Data Room
                        </Button>
                     </Link>
                     <Link href={`/deal/${dealId}/commitment`}>
                        <Button className="gap-2 h-12 shadow-md">
                            <PenTool className="h-4 w-4" /> Submit Commitment
                        </Button>
                     </Link>
                 </div>
             )}
         </div>

         <Separator className="my-6" />

         <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
             {/* Left Column: Timeline & Overview */}
             <div className="lg:col-span-2 space-y-8">
                 
                 {/* Timeline Module */}
                 <Card>
                     <CardHeader>
                         <CardTitle className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Clock className="h-5 w-5 text-muted-foreground" /> Deal Timeline
                            </div>
                            <Button variant="outline" size="sm" className="h-8 gap-2 text-xs" onClick={handleDownloadCalendar}>
                                <Calendar className="h-3 w-3" /> Add to Calendar
                            </Button>
                         </CardTitle>
                     </CardHeader>
                     <CardContent>
                         <div className="relative border-l-2 border-border ml-3 pl-8 py-2 space-y-8">
                             {[
                                 { label: "Launch", date: deal.launchDate, status: "completed" },
                                 { label: "NDA Deadline", date: parseISO(deal.launchDate) < new Date() ? "2024-03-15T00:00:00Z" : null, status: isNdaSigned ? "completed" : "current" }, // Mock date logic
                                 { label: "IOI Deadline", date: deal.ioiDate, status: "upcoming" },
                                 { label: "Commitment Deadline", date: deal.commitmentDate, status: "upcoming" },
                                 { label: "Closing", date: deal.closeDate, status: "upcoming" },
                             ].filter(item => item.date).map((item, i) => (
                                 <div key={i} className="relative">
                                     <div className={`absolute -left-[41px] top-0 h-6 w-6 rounded-full border-2 flex items-center justify-center bg-background
                                         ${item.status === 'completed' ? 'border-primary text-primary' : 
                                           item.status === 'current' ? 'border-amber-500 text-amber-600 animate-pulse' : 'border-border text-muted-foreground'}`}>
                                         {item.status === 'completed' && <CheckCircle className="h-3 w-3" />}
                                         {item.status === 'current' && <Clock className="h-3 w-3" />}
                                     </div>
                                     <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center">
                                         <span className={`font-medium ${item.status === 'current' ? 'text-foreground' : 'text-muted-foreground'}`}>{item.label}</span>
                                         <span className="text-sm font-mono bg-secondary/30 px-2 py-1 rounded">
                                             {item.date ? format(parseISO(item.date), "MMM d, yyyy") : "TBD"}
                                         </span>
                                     </div>
                                 </div>
                             ))}
                         </div>
                     </CardContent>
                 </Card>

                 {/* Deal Abstract */}
                 <Card>
                     <CardHeader>
                         <CardTitle className="flex items-center gap-2">
                             <Briefcase className="h-5 w-5 text-muted-foreground" /> Executive Summary
                         </CardTitle>
                     </CardHeader>
                     <CardContent className="space-y-4 text-sm leading-relaxed text-muted-foreground">
                         <p>
                             {deal.sponsor} is pleased to present the opportunity to finance the acquisition of {deal.dealName}. 
                             The Company is a leading provider in the {deal.sector} sector with strong recurring revenue and EBITDA margins.
                         </p>
                         <div className="grid grid-cols-2 gap-4 pt-4">
                             <div className="bg-secondary/10 p-4 rounded border border-border">
                                 <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Facility Size</div>
                                 <div className="text-lg font-semibold text-foreground">${(deal.facilitySize / 1e6).toFixed(1)} Million</div>
                             </div>
                             <div className="bg-secondary/10 p-4 rounded border border-border">
                                 <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Leverage</div>
                                 <div className="text-lg font-semibold text-foreground">4.5x Total Net</div>
                             </div>
                             <div className="bg-secondary/10 p-4 rounded border border-border">
                                 <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Sponsor Equity</div>
                                 <div className="text-lg font-semibold text-foreground">45% Contribution</div>
                             </div>
                             <div className="bg-secondary/10 p-4 rounded border border-border">
                                 <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Ratings</div>
                                 <div className="text-lg font-semibold text-foreground">B2 / B (Expected)</div>
                             </div>
                         </div>
                     </CardContent>
                 </Card>
             </div>

             {/* Right Column: Notifications & Quick Actions */}
             <div className="space-y-6">
                 
                 {/* Notifications Panel */}
                 <Card className="bg-slate-50 border-slate-200 shadow-sm">
                     <CardHeader className="pb-3 border-b border-slate-100">
                         <CardTitle className="text-base flex items-center gap-2">
                             <MessageSquare className="h-4 w-4 text-primary" /> Notifications
                             {stats.newDocsCount > 0 && <Badge className="ml-auto bg-primary text-[10px] h-5">{stats.newDocsCount} New</Badge>}
                         </CardTitle>
                     </CardHeader>
                     <CardContent className="pt-4 space-y-4">
                         {/* Dynamic Notifications */}
                         {stats.actionRequired === "Sign NDA" && (
                             <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-100 rounded-md text-sm">
                                 <Lock className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                                 <div>
                                     <p className="font-medium text-amber-900">NDA Pending</p>
                                     <p className="text-amber-700/80 text-xs mt-0.5">Please sign to access documents.</p>
                                     <Link href={`/deal/${dealId}/overview`} className="text-xs font-medium text-amber-700 hover:underline mt-1 block">Go to Sign &rarr;</Link>
                                 </div>
                             </div>
                         )}

                         {stats.newDocsCount > 0 && (
                             <div className="flex items-start gap-3 p-3 bg-white border border-slate-200 rounded-md text-sm">
                                 <FileText className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
                                 <div>
                                     <p className="font-medium text-slate-900">{stats.newDocsCount} New Documents</p>
                                     <p className="text-slate-500 text-xs mt-0.5">Uploaded to Data Room recently.</p>
                                     <Link href={`/deal/${dealId}/documents`} className="text-xs font-medium text-blue-600 hover:underline mt-1 block">View Files &rarr;</Link>
                                 </div>
                             </div>
                         )}

                         {stats.openQACount > 0 && (
                             <div className="flex items-start gap-3 p-3 bg-white border border-slate-200 rounded-md text-sm">
                                 <HelpCircle className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                                 <div>
                                     <p className="font-medium text-slate-900">{stats.openQACount} Q&A Responses</p>
                                     <p className="text-slate-500 text-xs mt-0.5">Answers available for your team.</p>
                                     <Link href={`/deal/${dealId}/qa`} className="text-xs font-medium text-green-600 hover:underline mt-1 block">View Q&A &rarr;</Link>
                                 </div>
                             </div>
                         )}
                         
                         {/* Static Stub */}
                         <div className="flex items-start gap-3 p-3 bg-white border border-slate-200 rounded-md text-sm opacity-70">
                             <AlertCircle className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />
                             <div>
                                 <p className="font-medium text-slate-700">Firm Up Request</p>
                                 <p className="text-slate-500 text-xs mt-0.5">Expected post-IOI submission.</p>
                             </div>
                         </div>
                     </CardContent>
                 </Card>

                 {/* Quick Actions List */}
                 <Card>
                     <CardHeader className="pb-3">
                         <CardTitle className="text-base">Quick Actions</CardTitle>
                     </CardHeader>
                     <CardContent className="space-y-2">
                         <Link href={`/deal/${dealId}/documents`}>
                             <Button variant="ghost" className="w-full justify-start gap-3 h-10 border border-transparent hover:border-border hover:bg-secondary/50">
                                 <FolderOpenIcon className="h-4 w-4 text-muted-foreground" />
                                 Browse Data Room
                             </Button>
                         </Link>
                         <Link href={`/deal/${dealId}/qa`}>
                             <Button variant="ghost" className="w-full justify-start gap-3 h-10 border border-transparent hover:border-border hover:bg-secondary/50">
                                 <HelpCircle className="h-4 w-4 text-muted-foreground" />
                                 Ask a Question
                             </Button>
                         </Link>
                         <Link href={`/deal/${dealId}/commitment`}>
                             <Button variant="ghost" className="w-full justify-start gap-3 h-10 border border-transparent hover:border-border hover:bg-secondary/50">
                                 <PenTool className="h-4 w-4 text-muted-foreground" />
                                 Commitment Form
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

function FolderOpenIcon(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z" />
        </svg>
    )
}
