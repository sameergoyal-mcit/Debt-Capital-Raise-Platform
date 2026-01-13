import React, { useState } from "react";
import { Link, useRoute, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  Search,
  FileText,
  Scale,
  MessageSquare,
  Clock,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Filter,
  ArrowUpRight,
  Users,
  UserPlus,
  FileCheck,
  HelpCircle,
} from "lucide-react";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { InviteLenderModal } from "@/components/invite-lender-modal";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface LenderProgress {
  lenderId: string;
  lenderName: string;
  contactName: string;
  email: string;
  ndaStatus: "signed" | "pending";
  ndaSignedAt: string | null;
  accessTier: "early" | "full" | "legal";
  kycStatus: "received" | "pending" | "not_received";
  ioiStatus: string;
  ioiAmount: string | null;
  markupStatus: Record<string, { status: string; count: number; pending: number }>;
  openQACount: number;
  lastActivity: string | null;
}

interface MasterDocInfo {
  docKey: string;
  title: string;
}

interface LenderProgressResponse {
  lenders: LenderProgress[];
  masterDocs: MasterDocInfo[];
}

export default function ExecutionLenders() {
  const [, params] = useRoute("/deal/:id/execution/lenders");
  const dealId = params?.id || "101";
  const [, navigate] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [tierFilter, setTierFilter] = useState("all");
  const [ndaFilter, setNdaFilter] = useState("all");
  const [inviteModalOpen, setInviteModalOpen] = useState(false);

  // Fetch lender progress data
  const { data, isLoading, refetch } = useQuery<LenderProgressResponse>({
    queryKey: ["lender-progress", dealId],
    queryFn: async () => {
      const res = await fetch(`/api/deals/${dealId}/lender-progress`, {
        credentials: "include",
      });
      if (!res.ok) {
        return getMockData();
      }
      return res.json();
    },
  });

  // Ensure master docs exist
  useQuery({
    queryKey: ["ensure-master-docs", dealId],
    queryFn: async () => {
      const res = await fetch(`/api/deals/${dealId}/master-docs/ensure`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) return null;
      return res.json();
    },
    staleTime: Infinity,
  });

  const lenders = data?.lenders || [];
  const masterDocs = data?.masterDocs || [
    { docKey: "financing_grid", title: "Financing Grid" },
    { docKey: "term_sheet", title: "Term Sheet" },
    { docKey: "credit_agreement", title: "Credit Agreement" },
  ];

  // Filter lenders
  const filteredLenders = lenders.filter((l) => {
    const matchesSearch =
      l.lenderName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.contactName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTier = tierFilter === "all" || l.accessTier === tierFilter;
    const matchesNda =
      ndaFilter === "all" ||
      (ndaFilter === "signed" && l.ndaStatus === "signed") ||
      (ndaFilter === "pending" && l.ndaStatus === "pending");
    return matchesSearch && matchesTier && matchesNda;
  });

  // Calculate stats
  const stats = {
    total: lenders.length,
    ndaSigned: lenders.filter((l) => l.ndaStatus === "signed").length,
    legalTier: lenders.filter((l) => l.accessTier === "legal").length,
    withMarkups: lenders.filter((l) =>
      Object.values(l.markupStatus).some((s) => s.count > 0)
    ).length,
  };

  const handleMarkupClick = (lenderId: string, docKey: string, hasMarkup: boolean) => {
    navigate(`/deal/${dealId}/legal/docs/${docKey}?lender=${lenderId}`);
  };

  const handleNdaClick = (lenderId: string, status: string) => {
    if (status === "pending") {
      navigate(`/deal/${dealId}/book?filter=nda_pending`);
    }
  };

  const handleKycClick = (lenderId: string) => {
    navigate(`/deal/${dealId}/documents?filter=kyc&lender=${lenderId}`);
  };

  const handleIoiClick = (lenderId: string, hasIoi: boolean) => {
    if (!hasIoi) {
      navigate(`/deal/${dealId}/syndicate-book?filter=no_ioi`);
    } else {
      navigate(`/deal/${dealId}/syndicate-book`);
    }
  };

  const handleQaClick = (lenderId: string) => {
    navigate(`/deal/${dealId}/qa?filter=open&lender=${lenderId}`);
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">Loading lender progress...</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6 animate-in fade-in duration-500">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <Link href={`/deal/${dealId}/overview`} className="hover:text-primary">
                Deal Overview
              </Link>
              <span>/</span>
              <span>Lender Progress</span>
            </div>
            <h1 className="text-2xl font-semibold text-primary tracking-tight">
              Lender Progress
            </h1>
            <p className="text-muted-foreground mt-1">
              Real-time view of each lender's diligence, documentation, and legal status.
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => navigate(`/deal/${dealId}/legal/negotiation`)}
            >
              <Scale className="h-4 w-4" /> Legal Workspace
            </Button>
            <Button className="gap-2" onClick={() => setInviteModalOpen(true)}>
              <UserPlus className="h-4 w-4" /> Invite Lenders
            </Button>
          </div>
        </div>

        {/* Empty State - No Lenders */}
        {lenders.length === 0 ? (
          <Card className="border-dashed border-2">
            <CardContent className="py-16 text-center">
              <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-secondary/50 flex items-center justify-center">
                <Users className="h-8 w-8 text-muted-foreground/50" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">
                No lenders added to this deal
              </h3>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                Invite lenders to begin diligence and document review.
              </p>
              <Button className="gap-2" onClick={() => setInviteModalOpen(true)}>
                <UserPlus className="h-4 w-4" /> Invite Lenders
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Total Lenders
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.total}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Invited to this deal
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    NDA Signed
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">
                    {stats.ndaSigned}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {stats.total > 0
                      ? `${Math.round((stats.ndaSigned / stats.total) * 100)}%`
                      : "0%"}{" "}
                    completion
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Legal Tier Access
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-primary">
                    {stats.legalTier}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Can submit markups
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    With Markups
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.withMarkups}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Submitted legal feedback
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Filters */}
            <Card className="border-border/60 shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search lenders..."
                      className="pl-9 bg-secondary/30"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Select value={tierFilter} onValueChange={setTierFilter}>
                      <SelectTrigger className="w-[150px]">
                        <SelectValue placeholder="All Tiers" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Tiers</SelectItem>
                        <SelectItem value="early">Early Look</SelectItem>
                        <SelectItem value="full">Full Access</SelectItem>
                        <SelectItem value="legal">Legal</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={ndaFilter} onValueChange={setNdaFilter}>
                      <SelectTrigger className="w-[150px]">
                        <SelectValue placeholder="NDA Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All NDA Status</SelectItem>
                        <SelectItem value="signed">Signed</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[180px]">Lender</TableHead>
                        <TableHead>NDA Status</TableHead>
                        <TableHead>Access Tier</TableHead>
                        {masterDocs.map((doc) => (
                          <TableHead key={doc.docKey} className="text-center">
                            <div className="text-xs">{doc.title}</div>
                          </TableHead>
                        ))}
                        <TableHead>KYC</TableHead>
                        <TableHead>Indication (IOI)</TableHead>
                        <TableHead className="text-center">Open Q&A</TableHead>
                        <TableHead>Last Activity</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredLenders.map((lender) => (
                        <TableRow key={lender.lenderId}>
                          <TableCell className="font-medium">
                            <div className="flex flex-col">
                              <span>{lender.lenderName}</span>
                              <span className="text-xs text-muted-foreground">
                                {lender.contactName}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <NdaStatusCell
                              status={lender.ndaStatus}
                              onClick={() => handleNdaClick(lender.lenderId, lender.ndaStatus)}
                            />
                          </TableCell>
                          <TableCell>
                            <TierBadge tier={lender.accessTier} />
                          </TableCell>
                          {masterDocs.map((doc) => {
                            const markupInfo = lender.markupStatus[doc.docKey];
                            return (
                              <TableCell key={doc.docKey} className="text-center">
                                <MarkupStatusCell
                                  markupInfo={markupInfo}
                                  canSubmit={lender.accessTier === "legal"}
                                  onClick={() =>
                                    handleMarkupClick(
                                      lender.lenderId,
                                      doc.docKey,
                                      markupInfo?.count > 0
                                    )
                                  }
                                />
                              </TableCell>
                            );
                          })}
                          <TableCell>
                            <KycStatusCell
                              status={lender.kycStatus}
                              onClick={() => handleKycClick(lender.lenderId)}
                            />
                          </TableCell>
                          <TableCell>
                            <IoiStatusCell
                              status={lender.ioiStatus}
                              amount={lender.ioiAmount}
                              onClick={() =>
                                handleIoiClick(
                                  lender.lenderId,
                                  lender.ioiStatus === "ioi_submitted" ||
                                    lender.ioiStatus === "soft_circled" ||
                                    lender.ioiStatus === "firm_committed"
                                )
                              }
                            />
                          </TableCell>
                          <TableCell className="text-center">
                            <QaCountCell
                              count={lender.openQACount}
                              onClick={() => handleQaClick(lender.lenderId)}
                            />
                          </TableCell>
                          <TableCell>
                            <LastActivityCell activity={lender.lastActivity} />
                          </TableCell>
                        </TableRow>
                      ))}
                      {filteredLenders.length === 0 && (
                        <TableRow>
                          <TableCell
                            colSpan={8 + masterDocs.length}
                            className="text-center py-8 text-muted-foreground"
                          >
                            No lenders found matching filters
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {/* Invite Lender Modal */}
        <InviteLenderModal
          isOpen={inviteModalOpen}
          onClose={() => setInviteModalOpen(false)}
          dealId={dealId}
          dealName="Deal"
          invitedBy="Deal Team"
          onInvitationCreated={() => {
            refetch();
            setInviteModalOpen(false);
          }}
        />
      </div>
    </Layout>
  );
}

// NDA Status Cell
function NdaStatusCell({
  status,
  onClick,
}: {
  status: "signed" | "pending";
  onClick: () => void;
}) {
  if (status === "signed") {
    return (
      <Badge
        variant="outline"
        className="bg-green-50 text-green-700 border-green-200 gap-1"
      >
        <CheckCircle2 className="h-3 w-3" />
        Signed
      </Badge>
    );
  }
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant="outline"
            className="bg-amber-50 text-amber-700 border-amber-200 gap-1 cursor-pointer hover:bg-amber-100"
            onClick={onClick}
          >
            <Clock className="h-3 w-3" />
            Not Signed
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          Lender must sign NDA to access confidential materials.
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// Tier Badge
function TierBadge({ tier }: { tier: "early" | "full" | "legal" }) {
  const styles: Record<string, string> = {
    early: "bg-slate-100 text-slate-700 border-slate-200",
    full: "bg-blue-50 text-blue-700 border-blue-200",
    legal: "bg-purple-50 text-purple-700 border-purple-200",
  };
  const labels: Record<string, string> = {
    early: "Early Look",
    full: "Full",
    legal: "Legal",
  };
  return (
    <Badge variant="outline" className={cn("font-normal", styles[tier])}>
      {labels[tier]}
    </Badge>
  );
}

// Markup Status Cell
function MarkupStatusCell({
  markupInfo,
  canSubmit,
  onClick,
}: {
  markupInfo?: { status: string; count: number; pending: number };
  canSubmit: boolean;
  onClick: () => void;
}) {
  if (!canSubmit) {
    return <span className="text-muted-foreground text-sm">-</span>;
  }

  if (!markupInfo || markupInfo.count === 0) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-muted-foreground hover:text-foreground"
              onClick={onClick}
            >
              <Badge variant="outline" className="bg-slate-50 text-slate-500 border-slate-200">
                No Markup
              </Badge>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            No markup received from this lender.
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Determine status label based on markup status
  const statusLabels: Record<string, { label: string; className: string }> = {
    uploaded: { label: "Markup Received", className: "bg-amber-50 text-amber-700 border-amber-200" },
    reviewing: { label: "Under Review", className: "bg-blue-50 text-blue-700 border-blue-200" },
    incorporated: { label: "Incorporated", className: "bg-green-50 text-green-700 border-green-200" },
    rejected: { label: "Not Incorporated", className: "bg-red-50 text-red-600 border-red-200" },
  };

  const statusInfo = statusLabels[markupInfo.status] || statusLabels.uploaded;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2"
            onClick={onClick}
          >
            <Badge variant="outline" className={cn("gap-1", statusInfo.className)}>
              {markupInfo.pending > 0 && <AlertCircle className="h-3 w-3" />}
              {statusInfo.label}
            </Badge>
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          {markupInfo.count} markup{markupInfo.count !== 1 ? "s" : ""}, {markupInfo.pending} pending review
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// KYC Status Cell
function KycStatusCell({
  status,
  onClick,
}: {
  status: "received" | "pending" | "not_received";
  onClick: () => void;
}) {
  if (status === "received") {
    return (
      <Badge
        variant="outline"
        className="bg-green-50 text-green-700 border-green-200 gap-1"
      >
        <CheckCircle2 className="h-3 w-3" />
        Received
      </Badge>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2"
            onClick={onClick}
          >
            <Badge
              variant="outline"
              className="bg-slate-50 text-slate-500 border-slate-200 gap-1"
            >
              Not Received
            </Badge>
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          Required closing documentation not yet uploaded.
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// IOI Status Cell
function IoiStatusCell({
  status,
  amount,
  onClick,
}: {
  status: string;
  amount: string | null;
  onClick: () => void;
}) {
  const hasSubmittedIoi =
    status === "ioi_submitted" ||
    status === "soft_circled" ||
    status === "firm_committed" ||
    status === "allocated";

  if (!hasSubmittedIoi) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2"
              onClick={onClick}
            >
              <Badge
                variant="outline"
                className="bg-slate-50 text-slate-500 border-slate-200 gap-1"
              >
                Not Submitted
              </Badge>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            No indication received from this lender.
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  const statusStyles: Record<string, { className: string; label: string }> = {
    ioi_submitted: { className: "bg-cyan-50 text-cyan-700 border-cyan-200", label: "IOI Submitted" },
    soft_circled: { className: "bg-blue-50 text-blue-700 border-blue-200", label: "Soft Circle" },
    firm_committed: { className: "bg-green-50 text-green-700 border-green-200", label: "Firm" },
    allocated: { className: "bg-emerald-50 text-emerald-700 border-emerald-200", label: "Allocated" },
  };

  const style = statusStyles[status] || statusStyles.ioi_submitted;
  const formattedAmount = amount
    ? `$${(parseFloat(amount) / 1000000).toFixed(0)}M`
    : null;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2"
            onClick={onClick}
          >
            <Badge variant="outline" className={cn("gap-1", style.className)}>
              <CheckCircle2 className="h-3 w-3" />
              {style.label}
            </Badge>
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          {formattedAmount ? `Indication amount: ${formattedAmount}` : "IOI submitted"}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// Q&A Count Cell
function QaCountCell({
  count,
  onClick,
}: {
  count: number;
  onClick: () => void;
}) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "h-7 px-2 gap-1",
              count > 0 ? "text-amber-600" : "text-muted-foreground"
            )}
            onClick={onClick}
          >
            <MessageSquare className="h-3.5 w-3.5" />
            {count} Open
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          {count > 0
            ? `${count} open diligence question${count !== 1 ? "s" : ""} from this lender.`
            : "No open questions from this lender."}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// Last Activity Cell
function LastActivityCell({ activity }: { activity: string | null }) {
  if (!activity) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="text-muted-foreground text-sm">—</span>
          </TooltipTrigger>
          <TooltipContent>
            No activity recorded yet.
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <span className="text-sm text-muted-foreground">
      {format(new Date(activity), "MMM d")}
    </span>
  );
}

function getMockData(): LenderProgressResponse {
  return {
    lenders: [
      {
        lenderId: "1",
        lenderName: "BlackRock Capital",
        contactName: "John Smith",
        email: "john@blackrock.com",
        ndaStatus: "signed",
        ndaSignedAt: "2024-01-15T10:00:00Z",
        accessTier: "legal",
        kycStatus: "received",
        ioiStatus: "ioi_submitted",
        ioiAmount: "50000000",
        markupStatus: {
          financing_grid: { status: "uploaded", count: 2, pending: 1 },
          term_sheet: { status: "incorporated", count: 1, pending: 0 },
          credit_agreement: { status: "uploaded", count: 0, pending: 0 },
        },
        openQACount: 3,
        lastActivity: "2024-01-20T14:30:00Z",
      },
      {
        lenderId: "2",
        lenderName: "Apollo Global",
        contactName: "Sarah Johnson",
        email: "sarah@apollo.com",
        ndaStatus: "signed",
        ndaSignedAt: "2024-01-14T09:00:00Z",
        accessTier: "legal",
        kycStatus: "pending",
        ioiStatus: "soft_circled",
        ioiAmount: "75000000",
        markupStatus: {
          financing_grid: { status: "reviewing", count: 1, pending: 1 },
          term_sheet: { status: "incorporated", count: 2, pending: 0 },
          credit_agreement: { status: "uploaded", count: 1, pending: 1 },
        },
        openQACount: 0,
        lastActivity: "2024-01-19T11:00:00Z",
      },
      {
        lenderId: "3",
        lenderName: "Ares Management",
        contactName: "Michael Chen",
        email: "mchen@ares.com",
        ndaStatus: "signed",
        ndaSignedAt: "2024-01-16T15:00:00Z",
        accessTier: "full",
        kycStatus: "not_received",
        ioiStatus: "interested",
        ioiAmount: null,
        markupStatus: {
          financing_grid: { status: "uploaded", count: 0, pending: 0 },
          term_sheet: { status: "uploaded", count: 0, pending: 0 },
          credit_agreement: { status: "uploaded", count: 0, pending: 0 },
        },
        openQACount: 5,
        lastActivity: "2024-01-18T09:30:00Z",
      },
      {
        lenderId: "4",
        lenderName: "Golub Capital",
        contactName: "Emily Davis",
        email: "emily@golub.com",
        ndaStatus: "pending",
        ndaSignedAt: null,
        accessTier: "early",
        kycStatus: "not_received",
        ioiStatus: "invited",
        ioiAmount: null,
        markupStatus: {
          financing_grid: { status: "uploaded", count: 0, pending: 0 },
          term_sheet: { status: "uploaded", count: 0, pending: 0 },
          credit_agreement: { status: "uploaded", count: 0, pending: 0 },
        },
        openQACount: 0,
        lastActivity: null,
      },
    ],
    masterDocs: [
      { docKey: "financing_grid", title: "Financing Grid" },
      { docKey: "term_sheet", title: "Term Sheet" },
      { docKey: "credit_agreement", title: "Credit Agreement" },
    ],
  };
}
