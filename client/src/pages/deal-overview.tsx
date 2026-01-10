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
  Minus,
  Mail,
  Lock,
  Unlock,
  MoreHorizontal,
  BarChart3
} from "lucide-react";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip as RechartsTooltip, Cell, Legend } from "recharts";
import { mockDeals, computeDealRisk, Covenant } from "@/data/deals";
import { differenceInDays, parseISO, format } from "date-fns";
import { getDealInvitations, Invitation, updateAccessTier } from "@/data/invitations";
import { mockLenders } from "@/data/lenders";
import { getNDATemplate, mockNDATemplates } from "@/data/nda-templates";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

import { emailService } from "@/lib/email-service";
import { emailTemplates } from "@/lib/email-templates";
import { InviteLenderModal } from "@/components/invite-lender-modal";
import { SendRemindersModal } from "@/components/send-reminders-modal";
import { EngagementAnalytics } from "@/components/engagement-analytics";
import { downloadCsvFromRecords } from "@/lib/download";
import { buildExportFilename } from "@/lib/export-names";
import { format as formatDate } from "date-fns";
import { getTimelineProgress, getDealTimeline } from "@/data/timeline";

export default function DealOverview() {
  const [, params] = useRoute("/deal/:id/overview");
  const dealId = params?.id || "101";
  const deal = mockDeals.find(d => d.id === dealId) || mockDeals[0];
  const risk = computeDealRisk(deal);
  const daysToClose = differenceInDays(parseISO(deal.hardCloseDate || deal.closeDate), new Date());
  
  const [invitations, setInvitations] = useState(getDealInvitations(dealId));
  const [activeNdaId, setActiveNdaId] = useState(deal.ndaTemplateId || "nda_std_v1");
  const [isNdaDialogOpen, setIsNdaDialogOpen] = useState(false);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isRemindersModalOpen, setIsRemindersModalOpen] = useState(false);
  
  const ndaTemplate = getNDATemplate(activeNdaId);
  const { toast } = useToast();

  const handleTierChange = (lenderId: string, newTier: "early" | "full" | "legal") => {
    const success = updateAccessTier(dealId, lenderId, newTier);
    if (success) {
      setInvitations(getDealInvitations(dealId)); // refresh
      toast({
        title: "Access Tier Updated",
        description: `Lender access upgraded to ${newTier.toUpperCase()}.`,
      });
    }
  };

  const handleNdaChange = (templateId: string) => {
    setActiveNdaId(templateId);
    // In a real app, we would update the deal object here
    deal.ndaTemplateId = templateId; 
    setIsNdaDialogOpen(false);
    toast({
      title: "NDA Template Updated",
      description: `New investors will sign the ${getNDATemplate(templateId)?.name}.`,
    });
  };

  const handleExportCovenants = () => {
    const covenantData = (deal as any).covenants || [];
    downloadCsvFromRecords(
      buildExportFilename(deal.dealName, "DealSummary", "csv"),
      covenantData.map((c: Covenant) => ({
        Covenant: c.name,
        Threshold: c.threshold,
        ProForma: c.proForma,
        Unit: c.unit
      }))
    );
  };
  
  const handleInvitationCreated = () => {
    setInvitations(getDealInvitations(dealId));
  };

  const handleExportDealSummary = () => {
    const signedCount = invitations.filter(i => i.ndaSignedAt).length;
    
    downloadCsvFromRecords(
      buildExportFilename(deal.dealName, "DealSummary", "csv"),
      [{
        DealName: deal.dealName,
        Borrower: deal.borrowerName,
        Sector: deal.sector,
        Instrument: deal.instrument,
        Stage: deal.stage,
        FacilitySizeMM: (deal.facilitySize / 1_000_000).toFixed(1),
        SpreadLowBps: deal.pricing.spreadLowBps,
        SpreadHighBps: deal.pricing.spreadHighBps,
        OID: deal.pricing.oid,
        CloseDate: deal.closeDate,
        HardCloseDate: deal.hardCloseDate || "",
        InvitedCount: invitations.length,
        NDASignedCount: signedCount,
        CommittedPct: `${(deal.committedPct * 100).toFixed(0)}%`,
        CoverageRatio: `${(deal.coverageRatio * 100).toFixed(0)}%`,
        ExportedAt: formatDate(new Date(), "yyyy-MM-dd HH:mm")
      }]
    );
    toast({ title: "Deal Summary Exported", description: "CSV downloaded successfully." });
  };

  const handleDownloadIOIReport = () => {
    const reportRows = invitations.map(inv => {
      const lender = mockLenders.find(l => l.id === inv.lenderId);
      const ndaStatus = inv.ndaSignedAt ? "signed" : (inv.ndaRequired ? "pending" : "not_required");
      return {
        Organization: lender?.name || inv.lenderId,
        NDAStatus: ndaStatus,
        AccessTier: inv.accessTier,
        NDASignedAt: inv.ndaSignedAt ? formatDate(new Date(inv.ndaSignedAt), "yyyy-MM-dd") : "",
        InvitedAt: formatDate(new Date(inv.invitedAt), "yyyy-MM-dd"),
        InvitedBy: inv.invitedBy
      };
    });
    
    downloadCsvFromRecords(buildExportFilename(deal.dealName, "TermsReport", "csv"), reportRows);
    toast({ title: "Terms Report Downloaded", description: "CSV with lender details exported." });
  };

  const handlePrintEngagement = () => {
    window.open(`/deal/${dealId}/print`, "_blank");
  };

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
            <h1 className="text-2xl font-semibold text-primary tracking-tight">{deal.dealName}</h1>
            <p className="text-muted-foreground mt-1">{deal.sector} • ${(deal.facilitySize / 1000000).toFixed(1)}M {deal.instrument}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" className="gap-2" onClick={handlePrintEngagement} data-testid="button-print-engagement">
              <Printer className="h-4 w-4" /> Print Engagement
            </Button>
            <Button variant="outline" size="sm" className="gap-2" onClick={handleDownloadIOIReport} data-testid="button-download-ioi">
              <Download className="h-4 w-4" /> Download Terms Report
            </Button>
            <Button variant="default" size="sm" className="gap-2 bg-primary text-primary-foreground" onClick={handleExportDealSummary} data-testid="button-export-deal-summary">
              <FileText className="h-4 w-4" /> Export Deal Summary
            </Button>
            <Button 
              variant="destructive" 
              size="sm" 
              className="gap-2" 
              onClick={() => setIsRemindersModalOpen(true)}
              data-testid="button-send-reminders"
            >
              <AlertCircle className="h-4 w-4" /> Send Reminders
            </Button>
          </div>
        </div>

        {/* Deal Status Timeline with Progress Summary */}
        <TimelineSummaryCard dealId={dealId} />

        {/* Main Content */}
        <div className="w-full">
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
                    <p className="section-label mb-1">Target Size</p>
                    <p className="text-xl font-semibold tabular-nums text-primary">$45.0M</p>
                  </div>
                   <div>
                    <p className="section-label mb-1">Committed</p>
                    <div className="flex items-end gap-2">
                      <p className="text-xl font-semibold tabular-nums text-green-700">$32.5M</p>
                      <span className="text-xs text-green-600 font-medium mb-1.5">(72%)</span>
                    </div>
                  </div>
                   <div>
                    <p className="section-label mb-1">Spread Guidance</p>
                    <p className="text-lg font-medium tabular-nums text-foreground">S + 625-650</p>
                    <p className="text-[10px] text-muted-foreground mt-1">Est. All-In Yield: 11.2% – 11.5%</p>
                  </div>
                   <div>
                    <p className="section-label mb-1">OID / Fees</p>
                    <p className="text-lg font-medium tabular-nums text-foreground">98.0 / 2.0%</p>
                    <p className="text-[10px] text-muted-foreground mt-1">+25 bps = +$112k/yr Interest</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Invitations & Access Card */}
            <Card className="border-border/60 shadow-sm">
              <CardHeader className="pb-3 border-b border-border/40">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Mail className="h-5 w-5 text-primary" /> Invitations & Access
                  </CardTitle>
                  <div className="flex gap-2">
                     <Dialog open={isNdaDialogOpen} onOpenChange={setIsNdaDialogOpen}>
                       <DialogTrigger asChild>
                         <Button variant="outline" size="sm" className="h-7 text-xs gap-1">
                            <FileText className="h-3 w-3" /> Edit NDA
                         </Button>
                       </DialogTrigger>
                       <DialogContent>
                         <DialogHeader>
                           <DialogTitle>Select NDA Template</DialogTitle>
                           <DialogDescription>
                             Choose the Confidentiality Agreement template for this deal.
                           </DialogDescription>
                         </DialogHeader>
                         <div className="py-4">
                            <RadioGroup value={activeNdaId} onValueChange={setActiveNdaId} className="gap-4">
                              {mockNDATemplates.map(t => (
                                <div key={t.id} className="flex items-start space-x-3 space-y-0 border p-3 rounded-md hover:bg-secondary/20 transition-colors">
                                  <RadioGroupItem value={t.id} id={t.id} className="mt-1" />
                                  <div className="grid gap-1.5 leading-none">
                                    <Label htmlFor={t.id} className="font-semibold cursor-pointer">
                                      {t.name} <span className="text-xs text-muted-foreground font-normal">(v{t.version})</span>
                                    </Label>
                                    <p className="text-xs text-muted-foreground">
                                      {t.id === "nda_std_v1" ? "Standard 2-year term, NY law, strict non-solicit." : "Sponsor-friendly form with 18-month term and lighter exclusions."}
                                    </p>
                                  </div>
                                </div>
                              ))}
                            </RadioGroup>
                         </div>
                         <DialogFooter>
                           <Button variant="outline" onClick={() => setIsNdaDialogOpen(false)}>Cancel</Button>
                           <Button onClick={() => handleNdaChange(activeNdaId)}>Save Changes</Button>
                         </DialogFooter>
                       </DialogContent>
                     </Dialog>
                     
                     <Button size="sm" className="h-7 text-xs gap-1" onClick={() => setIsInviteModalOpen(true)} data-testid="button-invite-lender">
                        <Users className="h-3 w-3" /> Invite Lender
                     </Button>
                  </div>
                </div>
                <CardDescription className="flex items-center justify-between">
                  <span>Manage investor access and NDA status.</span>
                  {ndaTemplate && (
                    <span className="text-xs bg-secondary px-2 py-0.5 rounded border">
                      Active Template: <strong>{ndaTemplate.name} (v{ndaTemplate.version})</strong>
                    </span>
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <Table>
                  <TableHeader>
                    <TableRow className="text-xs uppercase">
                      <TableHead>Lender</TableHead>
                      <TableHead>Invited</TableHead>
                      <TableHead>NDA Status</TableHead>
                      <TableHead>Access Tier</TableHead>
                      <TableHead>Access</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invitations.map(invite => {
                      const lender = mockLenders.find(l => l.id === invite.lenderId);
                      return (
                        <TableRow key={invite.lenderId} className="text-sm">
                          <TableCell className="font-medium">{lender?.name || "Unknown Lender"}</TableCell>
                          <TableCell className="text-muted-foreground">
                            {format(parseISO(invite.invitedAt), "MMM d")}
                          </TableCell>
                          <TableCell>
                            {invite.ndaRequired ? (
                              invite.ndaSignedAt ? (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <div className="flex flex-col items-start cursor-help">
                                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 gap-1 font-normal mb-0.5">
                                          <CheckCircle2 className="h-3 w-3" /> Signed v{invite.ndaVersion}
                                        </Badge>
                                        <span className="text-[10px] text-muted-foreground">
                                          {format(parseISO(invite.ndaSignedAt), "MMM d, h:mm a")}
                                        </span>
                                      </div>
                                    </TooltipTrigger>
                                    <TooltipContent className="text-xs">
                                      <p>Signed by: {invite.signerEmail || "N/A"}</p>
                                      <p>IP: {invite.signerIp || "N/A"}</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              ) : (
                                <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 gap-1 font-normal">
                                  <Clock className="h-3 w-3" /> Pending
                                </Badge>
                              )
                            ) : (
                              <span className="text-muted-foreground text-xs">Not Required</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Select 
                                defaultValue={invite.accessTier || "early"} 
                                onValueChange={(v) => handleTierChange(invite.lenderId, v as any)}
                              >
                                <SelectTrigger className="h-7 w-[100px] text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="early">Early</SelectItem>
                                  <SelectItem value="full">Full</SelectItem>
                                  <SelectItem value="legal">Legal</SelectItem>
                                </SelectContent>
                              </Select>

                              {invite.tierHistory && invite.tierHistory.length > 0 && (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <div className="cursor-help text-muted-foreground hover:text-primary">
                                        <Activity className="h-3 w-3" />
                                      </div>
                                    </TooltipTrigger>
                                    <TooltipContent className="w-64 p-0" align="start">
                                      <div className="p-2 border-b bg-secondary/10">
                                        <h4 className="font-semibold text-xs">Access History</h4>
                                      </div>
                                      <div className="p-2 space-y-2">
                                        {invite.tierHistory.slice().reverse().map((h, i) => (
                                          <div key={i} className="flex justify-between items-start text-xs">
                                            <div>
                                              <span className="font-medium uppercase text-[10px] bg-secondary px-1 py-0.5 rounded mr-2">{h.tier}</span>
                                              <span className="text-muted-foreground">by {h.changedBy}</span>
                                            </div>
                                            <div className="text-[10px] text-muted-foreground whitespace-nowrap">
                                              {format(parseISO(h.changedAt), "MMM d, h:mm a")}
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {invite.accessGranted ? (
                              <div className="flex items-center gap-1 text-green-600 text-xs">
                                <Unlock className="h-3 w-3" /> Granted
                              </div>
                            ) : (
                              <div className="flex items-center gap-1 text-muted-foreground text-xs">
                                <Lock className="h-3 w-3" /> Locked
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                              <MoreHorizontalIcon className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {invitations.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground py-6">
                          No invitations sent yet.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
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

            {/* Lender Engagement */}
            <Card className="border-border/60 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-primary" /> Lender Engagement
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={engagementData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                      <XAxis type="number" hide />
                      <YAxis dataKey="name" type="category" width={100} tick={{fontSize: 12, fontWeight: 500}} />
                      <RechartsTooltip 
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

            {/* Engagement Analytics */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                Engagement Analytics
              </h3>
              <EngagementAnalytics dealId={dealId} />
            </div>

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

                <Link href={`/deal/${dealId}/documents`}>
                  <Button variant="outline" className="w-full text-xs h-8">
                    Go to Data Room
                  </Button>
                </Link>
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
      </div>
      
      <InviteLenderModal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        dealId={dealId}
        dealName={deal.dealName}
        invitedBy="Sarah Jenkins"
        onInvitationCreated={handleInvitationCreated}
      />
      
      <SendRemindersModal
        isOpen={isRemindersModalOpen}
        onClose={() => setIsRemindersModalOpen(false)}
        dealId={dealId}
        dealName={deal.dealName}
      />
    </Layout>
  );
}

// --- Sub-components ---

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

// Timeline Summary Card Component
function TimelineSummaryCard({ dealId }: { dealId: string }) {
  const progress = getTimelineProgress(dealId);
  const timeline = getDealTimeline(dealId);

  // Find next in-progress milestone
  const nextMilestone = timeline.milestones.find(m => m.status === "in_progress") ||
                        timeline.milestones.find(m => m.status === "not_started");

  return (
    <Link href={`/deal/${dealId}/timeline`}>
      <Card className="border-border/60 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
        <CardContent className="py-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            {/* Progress Info */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-lg font-bold text-primary">{progress.percentage}%</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Execution Progress</p>
                  <p className="text-xs text-muted-foreground">
                    {progress.completed} of {progress.total} milestones completed
                  </p>
                </div>
              </div>

              {nextMilestone && (
                <div className="hidden md:flex items-center gap-2 pl-4 border-l border-border">
                  <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
                  <div>
                    <p className="text-xs text-muted-foreground">Next:</p>
                    <p className="text-sm font-medium text-foreground">{nextMilestone.label}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Visual Timeline - Debt-focused stages */}
            <div className="relative py-2 overflow-x-auto">
              <div className="min-w-[600px]">
                <div className="absolute top-1/2 left-0 w-full h-1 bg-border -translate-y-1/2 z-0" />
                <div className="grid grid-cols-8 gap-2 relative z-10">
                  <TimelineStep step="Preparation" status="completed" />
                  <TimelineStep step="NDA" status="completed" />
                  <TimelineStep step="LP" status="completed" />
                  <TimelineStep step="Marketing" status="completed" />
                  <TimelineStep step="Initial Terms" status="completed" />
                  <TimelineStep step="Bookbuilding" status="active" />
                  <TimelineStep step="Allocation" status="pending" />
                  <TimelineStep step="Closing" status="pending" />
                </div>
              </div>
            </div>

            {/* Arrow indicator */}
            <div className="hidden lg:flex items-center">
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
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

function MoreHorizontalIcon({ className }: { className?: string }) {
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
            <circle cx="12" cy="12" r="1" />
            <circle cx="19" cy="12" r="1" />
            <circle cx="5" cy="12" r="1" />
        </svg>
    )
}

function DemandRow({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="flex items-center justify-between text-xs">
      <div className="flex items-center gap-2">
        <div className={`h-2 w-2 rounded-full ${color}`} />
        <span className="text-muted-foreground">{label}</span>
      </div>
      <span className="font-medium">{value}</span>
    </div>
  )
}

function AlertItem({ title, desc, impact, urgent }: { title: string; desc: string; impact?: string, urgent?: boolean }) {
  return (
    <div className="flex items-start gap-3 p-2 rounded-lg hover:bg-secondary/50 transition-colors cursor-pointer">
      <div className={`mt-0.5 h-2 w-2 rounded-full shrink-0 ${urgent ? "bg-red-500 animate-pulse" : "bg-amber-400"}`} />
      <div className="flex-1">
        <p className="text-sm font-medium leading-none mb-1">{title}</p>
        <p className="text-xs text-muted-foreground mb-1">{desc}</p>
        {impact && <p className="text-[10px] font-semibold text-amber-600 uppercase tracking-wide">{impact}</p>}
      </div>
    </div>
  )
}

function DetailRow({ label, value, dark }: { label: string; value: string; dark?: boolean }) {
  return (
    <div className="flex justify-between items-center text-sm">
      <span className={dark ? "text-primary-foreground/70" : "text-muted-foreground"}>{label}</span>
      <span className="font-medium font-serif tracking-tight">{value}</span>
    </div>
  )
}

function DocActionRow({ name, action }: { name: string; action: string }) {
  return (
    <div className="flex items-center justify-between text-xs p-1.5 bg-white border border-red-100 rounded">
      <div className="flex items-center gap-2">
        <FileText className="h-3 w-3 text-red-400" />
        <span className="font-medium text-red-900 truncate max-w-[120px]">{name}</span>
      </div>
      <span className="text-red-600 font-bold text-[10px] uppercase">{action}</span>
    </div>
  )
}

function TeamMember({ name, role, initials }: { name: string; role: string; initials: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center text-xs font-bold text-primary">
        {initials}
      </div>
      <div>
        <p className="text-sm font-medium leading-none">{name}</p>
        <p className="text-xs text-muted-foreground">{role}</p>
      </div>
    </div>
  )
}

// Mock Data for Charts
const engagementData = [
  { name: 'NDA', value: 45, color: '#3b82f6', companies: 'Apollo, Ares, BlackRock' },
  { name: 'Lender Pres.', value: 38, color: '#6366f1', companies: 'Oaktree, Carlyle, KKR' },
  { name: 'Due Diligence', value: 24, color: '#8b5cf6', companies: 'HPS, Golub, Owl Rock' },
  { name: 'Initial Terms', value: 12, color: '#d946ef', companies: 'Barings, Antares' },
  { name: 'Commitment', value: 5, color: '#ec4899', companies: 'Sixth Street, Churchill' },
];
