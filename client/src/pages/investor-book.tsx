import React, { useState, useMemo, useEffect } from "react";
import { Link, useRoute, useSearch, useLocation } from "wouter";
import { 
  Search, 
  Filter, 
  Download, 
  Plus,
  MoreHorizontal,
  Mail,
  Phone,
  ArrowUpRight,
  Clock,
  Calendar,
  CheckCircle2,
  XCircle,
  AlertCircle,
  MessageSquare,
  FileText,
  User,
  TrendingUp,
  Send,
  History
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter
} from "@/components/ui/sheet";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

import { useRole } from "@/context/role";
import { useInvitations, useSyndicateBook } from "@/hooks/api-hooks";
import type { Invitation, Lender } from "@shared/schema";
import { format, parseISO, formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

// Lender status and type definitions
type LenderStatus = "invited" | "interested" | "ioi_submitted" | "soft_circled" | "firm_committed" | "allocated" | "declined" | "pitching";
type LenderType = "CLO" | "Direct Lender" | "Bank" | "Insurance" | "Pension" | "Family Office" | "Asset Manager" | "Other";

// IOI object structure for UI
interface IOI {
  lenderId: string;
  submittedAt: string;
  ticketMin: number;
  ticketMax: number;
  pricingBps: number;
  conditions: string;
  isFirm: boolean;
}

// UI Lender interface with all properties needed for display
interface UILender {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  organization: string;
  fundType: string | null;
  name: string;
  owner: string;
  type: LenderType;
  status: LenderStatus;
  seriousnessScore: number;
  syndicateEntry: SyndicateBookEntry & { lender: Lender };
  // Mapped from syndicateEntry
  indicatedAmount: string | null;
  firmCommitmentAmount: string | null;
  allocatedAmount: string | null;
  spreadBps: number | null;
  notes: string | null;
  // UI compatibility - ioi as object for form handling
  ioi: IOI | null;
  ticketMin: number;
  ticketMax: number;
  pricingBps: number;
  lastContactAt: string | null;
  nextAction: { type: string; dueDate: string } | null;
  interactions: { type: string; date: string; note: string; id?: string; user?: string }[];
}

// Import the type for syndicate book entry
type SyndicateBookEntry = {
  id: string;
  createdAt: Date;
  status: string;
  dealId: string;
  lenderId: string;
  indicatedAmount: string | null;
  firmCommitmentAmount: string | null;
  allocatedAmount: string | null;
  spreadBps: number | null;
  internalNotes: string | null;
  lastUpdatedBy: string | null;
  lastUpdatedAt: Date;
};

// Compute seriousness score locally
function computeSeriousnessScore(entry: { status?: string; indicatedAmount?: string | null; firmCommitmentAmount?: string | null }): number {
  let score = 0;
  const status = entry.status || "invited";
  if (status === "firm_committed" || status === "allocated") score += 40;
  else if (status === "soft_circled") score += 30;
  else if (status === "ioi_submitted") score += 20;
  else if (status === "interested") score += 10;
  if (entry.indicatedAmount) score += 10;
  if (entry.firmCommitmentAmount) score += 20;
  return score;
}

import { useToast } from "@/hooks/use-toast";
import { Checkbox } from "@/components/ui/checkbox";
import { emailService } from "@/lib/email-service";
import { InviteLenderModal } from "@/components/invite-lender-modal";

export type LenderBookFilter = "all" | "nda_pending" | "nda_signed" | "engaged";

export default function InvestorBook() {
  const [, params] = useRoute("/deal/:id/book");
  const dealId = params?.id || "101";
  const searchString = useSearch();
  const [, navigate] = useLocation();
  const { role } = useRole();
  const { toast } = useToast();

  // Parse URL filter
  const getUrlFilter = (): LenderBookFilter => {
    const urlParams = new URLSearchParams(searchString);
    const filter = urlParams.get("filter");
    if (filter === "nda_pending" || filter === "nda_signed" || filter === "engaged") {
      return filter;
    }
    return "all";
  };

  const [urlFilter, setUrlFilter] = useState<LenderBookFilter>(getUrlFilter());

  // Sync with URL changes
  useEffect(() => {
    setUrlFilter(getUrlFilter());
  }, [searchString]);

  // Clear filter function
  const clearFilter = () => {
    navigate(`/deal/${dealId}/book`);
  };

  // Fetch invitations and syndicate book from API
  const { data: invitationsData = [], refetch: refetchInvitations } = useInvitations(dealId);
  const { data: syndicateBookData = [], refetch: refetchSyndicateBook } = useSyndicateBook(dealId);

  // Transform API data to component format
  const invitations = invitationsData;
  const lenders: UILender[] = useMemo(() => {
    return syndicateBookData.map(entry => {
      const seriousnessScore = computeSeriousnessScore(entry);
      const indicatedAmountNum = entry.indicatedAmount ? Number(entry.indicatedAmount) : 0;
      const spreadBpsNum = entry.spreadBps || 0;

      // Build IOI object if there's an indication
      const ioi: IOI | null = entry.indicatedAmount ? {
        lenderId: entry.lenderId,
        submittedAt: new Date(entry.lastUpdatedAt).toISOString(),
        ticketMin: indicatedAmountNum,
        ticketMax: indicatedAmountNum,
        pricingBps: spreadBpsNum,
        conditions: "",
        isFirm: entry.status === "firm_committed",
      } : null;

      return {
        id: entry.lender.id,
        firstName: entry.lender.firstName,
        lastName: entry.lender.lastName,
        email: entry.lender.email,
        organization: entry.lender.organization,
        fundType: entry.lender.fundType,
        name: `${entry.lender.firstName} ${entry.lender.lastName}`,
        owner: entry.lender.organization,
        type: (entry.lender.fundType || "Other") as LenderType,
        status: entry.status as LenderStatus,
        seriousnessScore,
        syndicateEntry: entry,
        indicatedAmount: entry.indicatedAmount,
        firmCommitmentAmount: entry.firmCommitmentAmount,
        allocatedAmount: entry.allocatedAmount,
        spreadBps: entry.spreadBps,
        notes: entry.internalNotes,
        // UI compatibility
        ioi,
        ticketMin: indicatedAmountNum,
        ticketMax: indicatedAmountNum,
        pricingBps: spreadBpsNum,
        lastContactAt: entry.lastUpdatedAt ? new Date(entry.lastUpdatedAt).toISOString() : null,
        nextAction: null,
        interactions: [],
      };
    });
  }, [syndicateBookData]);

  const [selectedLenderId, setSelectedLenderId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [isReminderModalOpen, setIsReminderModalOpen] = useState(false);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);

  // Refresh data
  const refreshLenders = () => {
    refetchInvitations();
    refetchSyndicateBook();
  };

  const selectedLender = useMemo(() => 
    lenders.find(l => l.id === selectedLenderId), 
  [lenders, selectedLenderId]);

  const filteredLenders = useMemo(() => {
    return lenders.filter(l => {
      const matchesSearch = l.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            l.owner.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === "all" || l.status === statusFilter;
      const matchesType = typeFilter === "all" || l.type === typeFilter;

      // Apply URL-based filter
      const invitation = invitations.find(inv => inv.lenderId === l.id);
      let matchesUrlFilter = true;
      if (urlFilter === "nda_pending") {
        matchesUrlFilter = invitation ? (invitation.ndaRequired && !invitation.ndaSignedAt) : false;
      } else if (urlFilter === "nda_signed") {
        matchesUrlFilter = invitation ? !!invitation.ndaSignedAt : false;
      } else if (urlFilter === "engaged") {
        // Engaged = beyond invited, showing interest or further
        matchesUrlFilter = l.status !== "invited" && l.status !== "declined";
      }

      return matchesSearch && matchesStatus && matchesType && matchesUrlFilter;
    }).sort((a, b) => b.seriousnessScore - a.seriousnessScore); // Default sort by score
  }, [lenders, searchQuery, statusFilter, typeFilter, urlFilter, invitations]);

  const handleUpdateLender = (_updatedLender: any) => {
    // Trigger a refetch to get updated data from server
    refreshLenders();
  };

  // View Switching based on Role
  if (role === "investor") {
    return <InvestorView lenders={lenders as any} onUpdateLender={handleUpdateLender} />;
  }

  return (
    <Layout>
      <div className="space-y-6 animate-in fade-in duration-500">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <Link href={`/deal/${dealId}/overview`} className="hover:text-primary">Project Titan</Link>
              <span>/</span>
              <span>Lender Book</span>
            </div>
            <h1 className="text-2xl font-semibold text-primary tracking-tight">Lender Book</h1>
            <p className="text-muted-foreground mt-1">
              {role === "bookrunner"
                ? "Manage lender interest, allocations, and commitments."
                : "Overview of current market demand and lender status."}
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" className="gap-2">
              <Download className="h-4 w-4" /> Export CSV
            </Button>
            {role === "bookrunner" && (
              <Button className="gap-2 bg-primary text-primary-foreground" onClick={() => setIsInviteModalOpen(true)}>
                <Plus className="h-4 w-4" /> Add Lender
              </Button>
            )}
            {(role === "issuer" || role === "bookrunner") && (
              <Button variant="secondary" className="gap-2" onClick={() => setIsReminderModalOpen(true)}>
                <Send className="h-4 w-4" /> Send Reminders
              </Button>
            )}
          </div>
        </div>

        {/* Filter Alert Banner */}
        {urlFilter !== "all" && (
          <Alert className={urlFilter === "nda_pending" ? "bg-amber-50 border-amber-200" : "bg-blue-50 border-blue-200"}>
            <AlertCircle className={`h-4 w-4 ${urlFilter === "nda_pending" ? "text-amber-600" : "text-blue-600"}`} />
            <AlertDescription className={`text-sm flex-1 ${urlFilter === "nda_pending" ? "text-amber-800" : "text-blue-800"}`}>
              {urlFilter === "nda_pending" && (
                <span className="font-medium">NDA Pending Lenders:</span>
              )}
              {urlFilter === "nda_signed" && (
                <span className="font-medium">Lenders with Signed NDA</span>
              )}
              {urlFilter === "engaged" && (
                <span className="font-medium">Actively Engaged Lenders</span>
              )}
              {" "}Showing {filteredLenders.length} lender{filteredLenders.length !== 1 ? "s" : ""}.
            </AlertDescription>
            <Button
              variant="outline"
              size="sm"
              onClick={clearFilter}
              className="ml-auto shrink-0"
            >
              Clear Filter
            </Button>
          </Alert>
        )}

        <BookStats lenders={lenders} />

        {/* Main Content Area */}
        <div className="grid grid-cols-1 gap-6">
          <Card className="border-border/60 shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search lenders, bankers..."
                    className="pl-9 bg-secondary/30"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <div className="flex gap-2">
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[150px]">
                      <SelectValue placeholder="All Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="allocated">Allocated</SelectItem>
                      <SelectItem value="firm_committed">Firm Committed</SelectItem>
                      <SelectItem value="soft_circled">Soft Circled</SelectItem>
                      <SelectItem value="ioi_submitted">IOI Submitted</SelectItem>
                      <SelectItem value="interested">Interested</SelectItem>
                      <SelectItem value="invited">Invited</SelectItem>
                      <SelectItem value="declined">Declined</SelectItem>
                    </SelectContent>
                  </Select>
                   <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger className="w-[150px]">
                      <SelectValue placeholder="All Types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="Direct Lender">Direct Lender</SelectItem>
                      <SelectItem value="Bank">Bank</SelectItem>
                      <SelectItem value="Credit Fund">Credit Fund</SelectItem>
                      <SelectItem value="CLO">CLO</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {role === "issuer" ? (
                <IssuerTable lenders={filteredLenders} />
              ) : (
                <BookrunnerTable 
                  lenders={filteredLenders} 
                  onSelectLender={setSelectedLenderId} 
                />
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Drawer for Bookrunner Details */}
        <Sheet open={!!selectedLenderId} onOpenChange={(open) => !open && setSelectedLenderId(null)}>
          <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto">
            {selectedLender && (
              <LenderDetailDrawer 
                lender={selectedLender} 
                onUpdateLender={handleUpdateLender} 
              />
            )}
          </SheetContent>
        </Sheet>

        <SendReminderModal
          isOpen={isReminderModalOpen}
          onClose={() => setIsReminderModalOpen(false)}
          lenders={lenders}
          dealName="Project Titan" // In real app, get from deal context
        />

        <InviteLenderModal
          dealId={dealId}
          dealName="Project Titan"
          invitedBy="Deal Team"
          isOpen={isInviteModalOpen}
          onClose={() => setIsInviteModalOpen(false)}
          onInvitationCreated={() => {
            refreshLenders();
            toast({
              title: "Lender Invited",
              description: "The lender has been added to the deal.",
            });
          }}
        />

      </div>
    </Layout>
  );
}

// --- Send Reminder Modal ---

function SendReminderModal({ 
  isOpen, 
  onClose, 
  lenders,
  dealName
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  lenders: UILender[]; 
  dealName: string; 
}) {
  const { toast } = useToast();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [isSending, setIsSending] = useState(false);
  
  // Auto-detect reminder context and select recipients
  useEffect(() => {
    if (isOpen) {
      // Logic to pre-select relevant lenders
      // For this mock, let's select those who are active but not declined or just invited
      const relevant = lenders.filter(l => l.status !== "declined" && l.status !== "invited");
      setSelectedIds(new Set(relevant.map(l => l.id)));
      
      // Default Draft
      setSubject(`Reminder: Process Update – ${dealName}`);
      setBody(`Hi {{LENDER_NAME}},

We are following up regarding the ${dealName} financing process.

Please note the upcoming deadline:
{{DEADLINE}}

You can access the deal materials and take action here:
{{LINK}}

Best regards,
CapitalFlow Team`);
    }
  }, [isOpen, lenders, dealName]);

  const toggleLender = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleSend = async () => {
    if (selectedIds.size === 0) return;
    setIsSending(true);

    try {
      const selectedLenders = lenders.filter(l => selectedIds.has(l.id));
      let sentCount = 0;

      for (const lender of selectedLenders) {
        // Replace variables
        const personalBody = body
          .replace(/{{LENDER_NAME}}/g, lender.owner.split(' ')[0]) // Use first name of owner as proxy
          .replace(/{{DEAL_NAME}}/g, dealName)
          .replace(/{{DEADLINE}}/g, "Friday, Nov 15th") // Mock deadline
          .replace(/{{LINK}}/g, `${window.location.origin}/investor/deal/123`);

        const personalSubject = subject.replace(/{{DEAL_NAME}}/g, dealName);

        // Send (Mock)
        // In real app we'd map lender to their email properly
        // Here we mock email generation
        const email = `investor.${lender.id}@fund.com`; 
        
        await emailService.send({
          to: email,
          subject: personalSubject,
          html: personalBody.replace(/\n/g, "<br/>") // Simple text to HTML
        });
        sentCount++;
      }

      toast({
        title: "Reminders Sent",
        description: `Successfully sent ${sentCount} reminder emails.`,
      });
      onClose();
    } catch (error) {
      console.error("Failed to send reminders", error);
      toast({
        title: "Error",
        description: "Failed to send some reminders. Check console.",
        variant: "destructive"
      });
    } finally {
      setIsSending(false);
    }
  };

  const selectedLendersList = lenders.filter(l => selectedIds.has(l.id));

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle>Send Reminders</DialogTitle>
          <DialogDescription>
            Send email updates or reminders to selected lenders.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Recipients Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Recipients ({selectedIds.size})</Label>
              <div className="flex gap-2">
                 <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => setSelectedIds(new Set(lenders.map(l => l.id)))}>Select All</Button>
                 <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => setSelectedIds(new Set())}>Select None</Button>
              </div>
            </div>
            <div className="border rounded-md max-h-[200px] overflow-y-auto bg-secondary/10">
              <Table>
                <TableBody>
                  {lenders.map(lender => (
                    <TableRow key={lender.id} className="hover:bg-background/50">
                      <TableCell className="w-[40px] p-2 pl-4">
                        <Checkbox 
                          checked={selectedIds.has(lender.id)} 
                          onCheckedChange={() => toggleLender(lender.id)} 
                        />
                      </TableCell>
                      <TableCell className="p-2 font-medium text-sm">{lender.name}</TableCell>
                      <TableCell className="p-2 text-sm text-muted-foreground">{lender.type}</TableCell>
                      <TableCell className="p-2">
                         <StatusBadge status={lender.status} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Email Draft Section */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Subject</Label>
              <Input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Email subject..." />
            </div>
            <div className="space-y-2">
              <Label>Message Body</Label>
              <Textarea 
                value={body} 
                onChange={e => setBody(e.target.value)} 
                className="min-h-[200px] font-mono text-sm" 
                placeholder="Type your message here..." 
              />
              <p className="text-xs text-muted-foreground">
                Available variables: <code className="bg-secondary px-1 rounded">{"{{LENDER_NAME}}"}</code>, <code className="bg-secondary px-1 rounded">{"{{DEAL_NAME}}"}</code>, <code className="bg-secondary px-1 rounded">{"{{DEADLINE}}"}</code>, <code className="bg-secondary px-1 rounded">{"{{LINK}}"}</code>
              </p>
            </div>
          </div>
        </div>

        <DialogFooter className="px-6 py-4 border-t bg-secondary/5">
           <Button variant="outline" onClick={onClose} disabled={isSending}>Cancel</Button>
           <Button onClick={handleSend} disabled={isSending || selectedIds.size === 0} className="gap-2">
             <Send className="h-4 w-4" /> 
             {isSending ? "Sending..." : "Send Reminders"}
           </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// --- Views & Components ---

function InvestorView({ lenders, onUpdateLender }: { lenders: UILender[], onUpdateLender: (l: UILender) => void }) {
  // Mocking the "current user" as BlackRock (ID 1)
  const myLender = lenders.find(l => l.id === "1");
  const [showIOIForm, setShowIOIForm] = useState(false);
  const [ioiTicketMin, setIoiTicketMin] = useState(myLender?.ticketMin || 0);
  const [ioiTicketMax, setIoiTicketMax] = useState(myLender?.ticketMax || 0);
  const [ioiPricing, setIoiPricing] = useState(myLender?.pricingBps || 0);
  const [ioiConditions, setIoiConditions] = useState(myLender?.ioi?.conditions || "");

  const handleSubmitIOI = () => {
    if (!myLender) return;
    
    const updatedLender = {
      ...myLender,
      status: "ioi_submitted" as LenderStatus,
      ticketMin: ioiTicketMin,
      ticketMax: ioiTicketMax,
      pricingBps: ioiPricing,
      ioi: {
        lenderId: myLender.id,
        submittedAt: new Date().toISOString(),
        ticketMin: ioiTicketMin,
        ticketMax: ioiTicketMax,
        pricingBps: ioiPricing,
        conditions: ioiConditions,
        isFirm: false
      }
    };
    onUpdateLender(updatedLender);
    setShowIOIForm(false);
  };

  return (
    <Layout>
      <div className="space-y-6 animate-in fade-in duration-500 max-w-4xl mx-auto">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-semibold text-primary tracking-tight">Project Titan</h1>
            <p className="text-muted-foreground mt-1">My Interest & Allocation Status</p>
          </div>
          <Dialog open={showIOIForm} onOpenChange={setShowIOIForm}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <FileText className="h-4 w-4" /> {myLender?.ioi ? "Update IOI" : "Submit IOI"}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Submit Indication of Interest</DialogTitle>
                <DialogDescription>
                  Provide your indicative ticket size and pricing feedback.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="ticket-min">Min Ticket ($)</Label>
                    <Input id="ticket-min" type="number" value={ioiTicketMin} onChange={(e) => setIoiTicketMin(Number(e.target.value))} />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="ticket-max">Max Ticket ($)</Label>
                    <Input id="ticket-max" type="number" value={ioiTicketMax} onChange={(e) => setIoiTicketMax(Number(e.target.value))} />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="pricing">Pricing (Spread bps)</Label>
                  <Input id="pricing" type="number" value={ioiPricing} onChange={(e) => setIoiPricing(Number(e.target.value))} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="conditions">Conditions / Feedback</Label>
                  <Textarea id="conditions" value={ioiConditions} onChange={(e) => setIoiConditions(e.target.value)} placeholder="e.g. Subject to final IC approval..." />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" onClick={handleSubmitIOI}>Submit IOI</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {myLender ? (
          <Card className="border-t-4 border-t-primary shadow-md">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-xl">Status: {myLender.status}</CardTitle>
                  <CardDescription className="mt-1">Last updated {myLender.lastContactAt ? formatDistanceToNow(parseISO(myLender.lastContactAt)) : "N/A"} ago</CardDescription>
                </div>
                <StatusBadge status={myLender.status} />
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {myLender.ioi && (
                 <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg mb-4">
                   <div className="flex items-center gap-2 mb-2 text-primary font-semibold">
                     <FileText className="h-4 w-4" /> Latest IOI Submission
                   </div>
                   <div className="grid grid-cols-3 gap-4 text-sm">
                     <div>
                       <span className="text-muted-foreground block text-xs">Ticket</span>
                       <span className="font-mono font-medium">${(myLender.ioi.ticketMin/1000000).toFixed(1)}M - ${(myLender.ioi.ticketMax/1000000).toFixed(1)}M</span>
                     </div>
                     <div>
                       <span className="text-muted-foreground block text-xs">Pricing</span>
                       <span className="font-mono font-medium">S+{myLender.ioi.pricingBps}</span>
                     </div>
                     <div>
                       <span className="text-muted-foreground block text-xs">Date</span>
                       <span className="font-medium">{format(parseISO(myLender.ioi.submittedAt), "MMM d")}</span>
                     </div>
                   </div>
                   {myLender.ioi.conditions && (
                     <div className="mt-2 pt-2 border-t border-primary/10">
                       <span className="text-muted-foreground text-xs block">Conditions</span>
                       <p className="text-sm italic text-foreground/80">{myLender.ioi.conditions}</p>
                     </div>
                   )}
                 </div>
              )}

              <div className="grid grid-cols-2 gap-4 p-4 bg-secondary/20 rounded-lg">
                 <div>
                   <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Indicative Ticket</p>
                   <p className="text-xl font-bold text-foreground">${(myLender.ticketMin/1000000).toFixed(1)}M - ${(myLender.ticketMax/1000000).toFixed(1)}M</p>
                 </div>
                 <div>
                   <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Pricing Indication</p>
                   <p className="text-xl font-bold text-foreground">S + {myLender.pricingBps || "TBD"}</p>
                 </div>
              </div>

              <div className="space-y-4">
                <h3 className="font-semibold text-sm border-b pb-2">Recent Interactions</h3>
                <div className="space-y-4">
                  {myLender.interactions.map((interaction) => (
                    <div key={interaction.id} className="flex gap-3 text-sm">
                      <div className="mt-0.5 h-8 w-8 rounded-full bg-secondary flex items-center justify-center shrink-0">
                        {interaction.type === "Email" ? <Mail className="h-4 w-4" /> : 
                         interaction.type === "Call" ? <Phone className="h-4 w-4" /> : 
                         <FileText className="h-4 w-4" />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{interaction.user}</span>
                          <span className="text-muted-foreground text-xs">• {format(parseISO(interaction.date), "MMM d, h:mm a")}</span>
                        </div>
                        <p className="text-muted-foreground mt-0.5">{interaction.note}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                 <Button className="flex-1 gap-2">
                   <Mail className="h-4 w-4" /> Contact Deal Team
                 </Button>
                 <Button variant="outline" className="flex-1 gap-2">
                   <FileText className="h-4 w-4" /> Review Term Sheet
                 </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="text-center p-12 text-muted-foreground">Lender record not found.</div>
        )}
      </div>
    </Layout>
  )
}

function BookrunnerTable({ lenders, onSelectLender }: { lenders: UILender[], onSelectLender: (id: string) => void }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[200px]">Lender Name</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Ticket Range</TableHead>
          <TableHead>Score</TableHead>
          <TableHead>Coverage</TableHead>
          <TableHead>Next Action</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {lenders.map((lender) => (
          <TableRow key={lender.id} className="cursor-pointer hover:bg-muted/50" onClick={() => onSelectLender(lender.id)}>
            <TableCell className="font-medium">
              <div className="flex flex-col">
                <span>{lender.name}</span>
                {lender.pricingBps && (
                  <span className="text-xs text-muted-foreground">Ind: S+{lender.pricingBps}</span>
                )}
              </div>
            </TableCell>
            <TableCell>
              <Badge variant="secondary" className="font-normal text-xs">{lender.type}</Badge>
            </TableCell>
            <TableCell>
              <StatusBadge status={lender.status} />
            </TableCell>
            <TableCell className="text-sm font-mono">
              {lender.ticketMin > 0 ? `$${(lender.ticketMin/1000000).toFixed(0)}M - $${(lender.ticketMax/1000000).toFixed(0)}M` : "-"}
            </TableCell>
            <TableCell>
              <div className="flex items-center gap-2">
                <div className={`h-2 w-16 rounded-full bg-secondary overflow-hidden`}>
                  <div 
                    className={cn("h-full", 
                      lender.seriousnessScore > 70 ? "bg-green-500" : 
                      lender.seriousnessScore > 40 ? "bg-amber-500" : "bg-slate-300"
                    )} 
                    style={{ width: `${lender.seriousnessScore}%` }} 
                  />
                </div>
                <span className="text-xs text-muted-foreground">{lender.seriousnessScore}</span>
              </div>
            </TableCell>
            <TableCell className="text-xs text-muted-foreground">
              {lender.owner}
            </TableCell>
            <TableCell className="text-xs">
              {lender.nextAction ? (
                <div className="flex items-center gap-1.5 text-amber-600 font-medium">
                  <AlertCircle className="h-3 w-3" />
                  {lender.nextAction.type}
                </div>
              ) : (
                <span className="text-muted-foreground">-</span>
              )}
            </TableCell>
            <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
               <div className="flex justify-end gap-1">
                 <Button variant="ghost" size="icon" className="h-7 w-7">
                   <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                 </Button>
                 <Button variant="ghost" size="icon" className="h-7 w-7">
                   <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                 </Button>
               </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

function IssuerTable({ lenders }: { lenders: UILender[] }) {
  // Simplified view for Issuer - Top interested lenders only
  const topLenders = lenders.filter(l => l.seriousnessScore > 20).slice(0, 8);

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Lender Name</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Ticket Indication</TableHead>
          <TableHead>Feedback</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {topLenders.map((lender) => (
          <TableRow key={lender.id}>
            <TableCell className="font-medium">{lender.name}</TableCell>
            <TableCell className="text-muted-foreground text-sm">{lender.type}</TableCell>
            <TableCell><StatusBadge status={lender.status} /></TableCell>
            <TableCell className="font-mono text-sm">
              {lender.ticketMin > 0 ? `$${(lender.ticketMin/1000000).toFixed(0)}M - $${(lender.ticketMax/1000000).toFixed(0)}M` : "TBD"}
            </TableCell>
            <TableCell className="text-sm text-muted-foreground max-w-[200px]">
              {lender.notes ? (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="block truncate cursor-help">{lender.notes}</span>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-[300px] whitespace-normal">
                      {lender.notes}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ) : "-"}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

function LenderDetailDrawer({ lender, onUpdateLender }: { lender: UILender, onUpdateLender: (l: UILender) => void }) {
  const [noteText, setNoteText] = useState("");

  const handleSaveNote = () => {
    if (!noteText.trim()) return;
    const updated = { ...lender, notes: noteText }; // Simple overwrite for mock
    onUpdateLender(updated);
    setNoteText("");
  };

  return (
    <div className="h-full flex flex-col">
      <SheetHeader className="mb-6">
        <div className="flex items-start justify-between">
          <div>
            <SheetTitle className="text-2xl font-serif">{lender.name}</SheetTitle>
            <SheetDescription className="text-base mt-1 flex items-center gap-2">
              <Badge variant="outline">{lender.type}</Badge>
              <span className="text-muted-foreground text-sm">• Covered by {lender.owner}</span>
            </SheetDescription>
          </div>
          <StatusBadge status={lender.status} />
        </div>
      </SheetHeader>
      
      <div className="flex-1 overflow-y-auto pr-6 -mr-6">
        <div className="space-y-6">
          {/* Quick Stats */}
          <div className="grid grid-cols-2 gap-4">
             <div className="p-4 rounded-lg bg-secondary/30 border border-border/50">
               <div className="text-xs text-muted-foreground uppercase font-semibold mb-1">Ticket Range</div>
               <div className="text-xl font-bold font-mono">
                 {lender.ticketMin > 0 ? `$${(lender.ticketMin/1000000).toFixed(0)}M - $${(lender.ticketMax/1000000).toFixed(0)}M` : "TBD"}
               </div>
             </div>
             <div className="p-4 rounded-lg bg-secondary/30 border border-border/50">
               <div className="text-xs text-muted-foreground uppercase font-semibold mb-1">Pricing Feedback</div>
               <div className="text-xl font-bold font-mono">
                 {lender.pricingBps ? `S + ${lender.pricingBps}` : "None"}
               </div>
             </div>
          </div>

          <div className="space-y-3">
             <div className="flex items-center justify-between">
               <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Engagement Score</h3>
               <span className="font-bold">{lender.seriousnessScore}/100</span>
             </div>
             <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                <div 
                  className={cn("h-full transition-all duration-500", 
                    lender.seriousnessScore > 70 ? "bg-green-500" : 
                    lender.seriousnessScore > 40 ? "bg-amber-500" : "bg-slate-300"
                  )} 
                  style={{ width: `${lender.seriousnessScore}%` }} 
                />
             </div>
             <p className="text-xs text-muted-foreground">
               Score based on interactions, status progress, and recency of contact.
             </p>
          </div>

          <Tabs defaultValue="activity" className="w-full">
            <TabsList className="w-full">
              <TabsTrigger value="activity" className="flex-1">Timeline</TabsTrigger>
              <TabsTrigger value="notes" className="flex-1">Notes</TabsTrigger>
              <TabsTrigger value="details" className="flex-1">Profile</TabsTrigger>
            </TabsList>
            
            <TabsContent value="activity" className="space-y-4 mt-4">
               {lender.nextAction && (
                 <div className="flex items-start gap-3 p-3 rounded-md bg-amber-50 border border-amber-100 text-amber-800">
                   <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
                   <div>
                     <p className="font-semibold text-sm">Next Action: {lender.nextAction.type}</p>
                     <p className="text-xs mt-1">Due {format(parseISO(lender.nextAction.dueDate), "MMM d, yyyy")}</p>
                   </div>
                   <Button size="sm" variant="outline" className="ml-auto h-7 text-xs bg-white border-amber-200 text-amber-700 hover:bg-amber-100">
                     Complete
                   </Button>
                 </div>
               )}

               <div className="relative border-l border-border ml-3 space-y-6 pl-6 py-2">
                 {lender.interactions.map((interaction) => (
                   <div key={interaction.id} className="relative">
                     <div className="absolute -left-[31px] top-0 h-6 w-6 rounded-full border bg-background flex items-center justify-center text-muted-foreground z-10">
                       {interaction.type === "Email" ? <Mail className="h-3 w-3" /> : 
                        interaction.type === "Call" ? <Phone className="h-3 w-3" /> : 
                        interaction.type === "VDR Access" ? <ArrowUpRight className="h-3 w-3" /> :
                        <MessageSquare className="h-3 w-3" />}
                     </div>
                     <div className="flex flex-col gap-1">
                       <div className="flex items-center justify-between">
                         <span className="font-medium text-sm">{interaction.type}</span>
                         <span className="text-xs text-muted-foreground">{formatDistanceToNow(parseISO(interaction.date))} ago</span>
                       </div>
                       <p className="text-sm text-foreground/80">{interaction.note}</p>
                       <span className="text-xs text-muted-foreground">Logged by {interaction.user}</span>
                     </div>
                   </div>
                 ))}
                 
                 <div className="relative">
                    <div className="absolute -left-[31px] top-0 h-6 w-6 rounded-full border bg-background flex items-center justify-center text-muted-foreground z-10">
                      <Clock className="h-3 w-3" />
                    </div>
                    <div className="text-xs text-muted-foreground pt-1">Process Started</div>
                 </div>
               </div>
            </TabsContent>
            
            <TabsContent value="notes" className="space-y-4 mt-4">
               <Textarea 
                 placeholder="Add a note..." 
                 className="min-h-[100px] resize-none" 
                 value={noteText}
                 onChange={(e) => setNoteText(e.target.value)}
               />
               <Button size="sm" className="w-full" onClick={handleSaveNote}>Save Note</Button>
               <Separator />
               <div className="space-y-4">
                 <div className="p-3 bg-secondary/20 rounded text-sm">
                   <p className="text-muted-foreground italic">"{lender.notes}"</p>
                   <p className="text-xs text-muted-foreground mt-2 text-right">- {lender.owner}</p>
                 </div>
               </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <SheetFooter className="mt-6 border-t pt-4">
        <div className="grid grid-cols-2 gap-3 w-full">
           <Button variant="outline" className="w-full gap-2">
             <History className="h-4 w-4" /> Log Interaction
           </Button>
           <Button className="w-full gap-2">
             <Send className="h-4 w-4" /> Send Follow-up
           </Button>
        </div>
      </SheetFooter>
    </div>
  )
}

function BookStats({ lenders }: { lenders: UILender[] }) {
  const totalCommitted = lenders.reduce((acc, l) => acc + (["firm_committed", "allocated"].includes(l.status) ? (l.ticketMin || 0) : 0), 0);
  const softCircle = lenders.reduce((acc, l) => acc + (["soft_circled", "ioi_submitted"].includes(l.status) ? (l.ticketMin || 0) : 0), 0);
  const activeCount = lenders.filter(l => ["interested", "ioi_submitted", "soft_circled"].includes(l.status)).length;
  const declinedCount = lenders.filter(l => l.status === "declined").length;

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <Card className="bg-primary text-primary-foreground border-none">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-primary-foreground/80">Firm Commitments</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold font-serif">${(totalCommitted / 1000000).toFixed(1)}M</div>
          <div className="text-xs text-primary-foreground/70 mt-1">From {lenders.filter(l => ["firm_committed", "allocated"].includes(l.status)).length} Lenders</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Soft Circle / IOI</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-foreground">${(softCircle / 1000000).toFixed(1)}M</div>
          <div className="text-xs text-muted-foreground mt-1">{lenders.filter(l => ["soft_circled", "ioi_submitted"].includes(l.status)).length} Lenders</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Active Pipeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-foreground">{activeCount}</div>
          <div className="text-xs text-muted-foreground mt-1">Lenders in Diligence</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Declined</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-foreground">{declinedCount}</div>
          <div className="text-xs text-muted-foreground mt-1">Pass rate: {((declinedCount / lenders.length) * 100).toFixed(0)}%</div>
        </CardContent>
      </Card>
    </div>
  )
}

function StatusBadge({ status }: { status: LenderStatus }) {
  let className = "";
  let icon = null;
  let label = "";

  switch (status) {
    case "allocated":
      className = "bg-emerald-100 text-emerald-700 border-emerald-200";
      icon = <CheckCircle2 className="h-3 w-3 mr-1" />;
      label = "Allocated";
      break;
    case "firm_committed":
      className = "bg-green-100 text-green-700 border-green-200";
      icon = <CheckCircle2 className="h-3 w-3 mr-1" />;
      label = "Firm Committed";
      break;
    case "soft_circled":
      className = "bg-blue-100 text-blue-700 border-blue-200";
      icon = <TrendingUp className="h-3 w-3 mr-1" />;
      label = "Soft Circled";
      break;
    case "ioi_submitted":
      className = "bg-cyan-100 text-cyan-700 border-cyan-200";
      icon = <TrendingUp className="h-3 w-3 mr-1" />;
      label = "IOI Submitted";
      break;
    case "interested":
      className = "bg-amber-100 text-amber-700 border-amber-200";
      icon = <Clock className="h-3 w-3 mr-1" />;
      label = "Interested";
      break;
    case "invited":
      className = "bg-slate-100 text-slate-700 border-slate-200";
      label = "Invited";
      break;
    case "declined":
      className = "bg-red-50 text-red-700 border-red-200";
      icon = <XCircle className="h-3 w-3 mr-1" />;
      label = "Declined";
      break;
    default:
      className = "bg-secondary text-muted-foreground border-border";
      label = status;
  }

  return (
    <Badge variant="outline" className={`font-normal ${className} flex items-center w-fit`}>
      {icon}
      {label}
    </Badge>
  );
}
