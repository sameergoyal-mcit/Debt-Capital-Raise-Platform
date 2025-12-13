import React, { useState, useMemo } from "react";
import { Link, useRoute } from "wouter";
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
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";

import { useRole } from "@/context/role";
import { mockLenders, Lender, LenderStatus, LenderType, computeSeriousnessScore } from "@/data/lenders";
import { format, parseISO, formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

export default function InvestorBook() {
  const [, params] = useRoute("/deal/:id/book");
  const dealId = params?.id || "123";
  const { role } = useRole();
  const [selectedLenderId, setSelectedLenderId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  const selectedLender = useMemo(() => 
    mockLenders.find(l => l.id === selectedLenderId), 
  [selectedLenderId]);

  const filteredLenders = useMemo(() => {
    return mockLenders.filter(l => {
      const matchesSearch = l.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            l.owner.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === "all" || l.status === statusFilter;
      const matchesType = typeFilter === "all" || l.type === typeFilter;
      return matchesSearch && matchesStatus && matchesType;
    }).sort((a, b) => b.seriousnessScore - a.seriousnessScore); // Default sort by score
  }, [searchQuery, statusFilter, typeFilter]);

  // View Switching based on Role
  if (role === "investor") {
    return <InvestorView />;
  }

  return (
    <Layout>
      <div className="space-y-6 animate-in fade-in duration-500">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <Link href={`/deal/${dealId}/overview`} className="hover:text-primary">Project Titan</Link>
              <span>/</span>
              <span>Debt Investor Book</span>
            </div>
            <h1 className="text-3xl font-serif font-bold text-primary tracking-tight">Debt Investor Book</h1>
            <p className="text-muted-foreground mt-1">
              {role === "bookrunner" 
                ? "Manage investor interest, allocations, and commitments." 
                : "Overview of current market demand and lender status."}
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" className="gap-2">
              <Download className="h-4 w-4" /> Export CSV
            </Button>
            {role === "bookrunner" && (
              <Button className="gap-2 bg-primary text-primary-foreground">
                <Plus className="h-4 w-4" /> Add Investor
              </Button>
            )}
          </div>
        </div>

        <BookStats lenders={mockLenders} />

        {/* Main Content Area */}
        <div className="grid grid-cols-1 gap-6">
          <Card className="border-border/60 shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input 
                    placeholder="Search investors, bankers..." 
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
                      <SelectItem value="Firm">Firm</SelectItem>
                      <SelectItem value="IOI">IOI</SelectItem>
                      <SelectItem value="CIM Viewed">CIM Viewed</SelectItem>
                      <SelectItem value="NDA Signed">NDA Signed</SelectItem>
                      <SelectItem value="Not Contacted">Not Contacted</SelectItem>
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
            {selectedLender && <LenderDetailDrawer lender={selectedLender} />}
          </SheetContent>
        </Sheet>

      </div>
    </Layout>
  );
}

// --- Views & Components ---

function InvestorView() {
  // Mocking the "current user" as BlackRock (ID 1)
  const myLender = mockLenders.find(l => l.id === "1");

  return (
    <Layout>
      <div className="space-y-6 animate-in fade-in duration-500 max-w-4xl mx-auto">
        <div>
           <h1 className="text-3xl font-serif font-bold text-primary tracking-tight">Project Titan</h1>
           <p className="text-muted-foreground mt-1">My Interest & Allocation Status</p>
        </div>

        {myLender ? (
          <Card className="border-t-4 border-t-primary shadow-md">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-xl">Status: {myLender.status}</CardTitle>
                  <CardDescription className="mt-1">Last updated {formatDistanceToNow(parseISO(myLender.lastContactAt))} ago</CardDescription>
                </div>
                <StatusBadge status={myLender.status} />
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
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

function BookrunnerTable({ lenders, onSelectLender }: { lenders: Lender[], onSelectLender: (id: string) => void }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[200px]">Investor Name</TableHead>
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

function IssuerTable({ lenders }: { lenders: Lender[] }) {
  // Simplified view for Issuer - Top interested lenders only
  const topLenders = lenders.filter(l => l.seriousnessScore > 20).slice(0, 8);

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Investor Name</TableHead>
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
            <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
              {lender.notes || "-"}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

function LenderDetailDrawer({ lender }: { lender: Lender }) {
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
               />
               <Button size="sm" className="w-full">Save Note</Button>
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

function BookStats({ lenders }: { lenders: Lender[] }) {
  const totalCommitted = lenders.reduce((acc, l) => acc + (l.status === "Firm" ? (l.ticketMin || 0) : 0), 0);
  const softCircle = lenders.reduce((acc, l) => acc + (l.status === "IOI" ? (l.ticketMin || 0) : 0), 0);
  const activeCount = lenders.filter(l => ["NDA Signed", "IOI", "CIM Viewed"].includes(l.status)).length;
  const declinedCount = lenders.filter(l => l.status === "Declined").length;

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <Card className="bg-primary text-primary-foreground border-none">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-primary-foreground/80">Firm Commitments</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold font-serif">${(totalCommitted / 1000000).toFixed(1)}M</div>
          <div className="text-xs text-primary-foreground/70 mt-1">From {lenders.filter(l => l.status === "Firm").length} Lenders</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Soft Circle / IOI</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-foreground">${(softCircle / 1000000).toFixed(1)}M</div>
          <div className="text-xs text-muted-foreground mt-1">{lenders.filter(l => l.status === "IOI").length} Lenders</div>
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
  
  switch (status) {
    case "Firm":
      className = "bg-green-100 text-green-700 border-green-200";
      icon = <CheckCircle2 className="h-3 w-3 mr-1" />;
      break;
    case "IOI":
      className = "bg-blue-100 text-blue-700 border-blue-200";
      icon = <TrendingUp className="h-3 w-3 mr-1" />;
      break;
    case "CIM Viewed":
      className = "bg-amber-100 text-amber-700 border-amber-200";
      icon = <Clock className="h-3 w-3 mr-1" />;
      break;
    case "NDA Signed":
      className = "bg-purple-100 text-purple-700 border-purple-200";
      break;
    case "NDA Sent":
      className = "bg-slate-100 text-slate-700 border-slate-200";
      break;
    case "Declined":
      className = "bg-red-50 text-red-700 border-red-200";
      icon = <XCircle className="h-3 w-3 mr-1" />;
      break;
    default:
      className = "bg-secondary text-muted-foreground border-border";
  }

  return (
    <Badge variant="outline" className={`font-normal ${className} flex items-center w-fit`}>
      {icon}
      {status}
    </Badge>
  );
}
