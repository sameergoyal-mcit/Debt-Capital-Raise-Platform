import React, { useState } from "react";
import { Link, useLocation } from "wouter";
import { 
  Briefcase, 
  Search, 
  Filter, 
  Plus, 
  Download, 
  MoreHorizontal, 
  ChevronDown, 
  Clock, 
  AlertTriangle, 
  PauseCircle, 
  CheckCircle2, 
  FileText, 
  Users, 
  HelpCircle, 
  CheckSquare, 
  ArrowRight,
  TrendingUp,
  History
} from "lucide-react";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { mockDeals, Deal, DealStatus, computeDealRisk } from "@/data/deals";
import { cn } from "@/lib/utils";
import { format, parseISO, differenceInDays } from "date-fns";
import { useAuth } from "@/context/auth-context";
import { AccessNotice } from "@/components/access-notice";
import { CreateDealDialog } from "@/components/create-deal-dialog";

export default function Deals() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sectorFilter, setSectorFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("updated");
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  // Redirect single deal logic
  // if (user?.role === "Investor" && user.dealAccess?.length === 1) {
  //   setLocation(`/deal/${user.dealAccess[0]}/overview`);
  //   return null; 
  // }
  // Commented out to prevent loops or bad UX during testing, usually good for prod.

  // Filter and sort logic
  const filteredDeals = mockDeals.filter(deal => {
    // Permission filter
    if (user?.role === "Investor") {
      if (!user.dealAccess?.includes(deal.id)) {
        return false;
      }
    }

    const matchesSearch = 
      deal.dealName.toLowerCase().includes(searchQuery.toLowerCase()) || 
      deal.borrowerName.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || deal.status === statusFilter;
    const matchesSector = sectorFilter === "all" || deal.sector === sectorFilter;

    return matchesSearch && matchesStatus && matchesSector;
  });

  const sortDeals = (deals: Deal[]) => {
    return [...deals].sort((a, b) => {
      switch (sortBy) {
        case "closeDate":
          return new Date(a.closeDate).getTime() - new Date(b.closeDate).getTime();
        case "committed":
          return b.committedPct - a.committedPct;
        case "size":
          return b.facilitySize - a.facilitySize;
        case "closedDate":
          if (a.closedDate && b.closedDate) {
            return new Date(b.closedDate).getTime() - new Date(a.closedDate).getTime();
          }
          return 0;
        case "updated":
        default:
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      }
    });
  };

  const activeDeals = sortDeals(filteredDeals.filter(d => ["Active", "Diligence", "Closing", "At Risk"].includes(d.status)));
  const onHoldDeals = sortDeals(filteredDeals.filter(d => d.status === "Paused"));
  const closedDeals = sortDeals(filteredDeals.filter(d => d.status === "Closed"));

  // Unique sectors for filter
  const sectors = Array.from(new Set(mockDeals.map(d => d.sector)));

  return (
    <Layout>
      <AccessNotice />
      <div className="space-y-6 animate-in fade-in duration-500">
        {/* Header Row */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-primary tracking-tight">
               {user?.role === "Investor" ? "My Deals" : "Deals"}
            </h1>
            <p className="text-muted-foreground mt-1">
              {user?.role === "Investor" 
                ? "Active deals you are invited to participate in." 
                : "Track portfolio company debt raises and execution status."}
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" className="gap-2">
              <Download className="h-4 w-4" /> Export
            </Button>
            {user?.role !== "Investor" && (
              <CreateDealDialog />
            )}
          </div>
        </div>

        {/* Filters Row */}
        <div className="flex flex-col md:flex-row gap-4 bg-background p-4 rounded-lg border border-border shadow-sm">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search deals, borrowers..." 
              className="pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="Active">Active</SelectItem>
                <SelectItem value="Diligence">Diligence</SelectItem>
                <SelectItem value="Closing">Closing</SelectItem>
                <SelectItem value="At Risk">At Risk</SelectItem>
                <SelectItem value="Paused">On Hold</SelectItem>
                <SelectItem value="Closed">Closed</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sectorFilter} onValueChange={setSectorFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Sector" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sectors</SelectItem>
                {sectors.map(s => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="updated">Last Updated</SelectItem>
                <SelectItem value="closeDate">Close Date</SelectItem>
                <SelectItem value="committed">Committed %</SelectItem>
                <SelectItem value="size">Facility Size</SelectItem>
                <SelectItem value="closedDate">Closed Date</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Sections */}
        <Accordion type="multiple" defaultValue={["active", "on-hold"]} className="space-y-4">
          
          {/* Active Deals Section */}
          <AccordionItem value="active" className="border border-border rounded-lg bg-card overflow-hidden">
            <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-3">
                <span className="font-semibold text-lg">Active Deals</span>
                <Badge variant="secondary" className="rounded-full px-2.5">{activeDeals.length}</Badge>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-0 pb-0 border-t border-border">
              {activeDeals.length > 0 ? (
                <DealsTable deals={activeDeals} type="active" />
              ) : (
                <EmptyState message={user?.role === "Investor" ? "No active deals found." : "No active deals. Create a new debt raise."} />
              )}
            </AccordionContent>
          </AccordionItem>

          {/* On Hold Section - Usually hidden for investors unless relevant */}
          {(user?.role !== "Investor" || onHoldDeals.length > 0) && (onHoldDeals.length > 0 || statusFilter === "Paused") && (
            <AccordionItem value="on-hold" className="border border-border rounded-lg bg-card overflow-hidden">
              <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-muted/50 transition-colors">
                <div className="flex flex-col md:flex-row md:items-center gap-3 w-full text-left">
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-lg">Processes on Hold</span>
                    <Badge variant="secondary" className="rounded-full px-2.5 bg-amber-100 text-amber-700 hover:bg-amber-200 border-amber-200">{onHoldDeals.length}</Badge>
                  </div>
                  {user?.role !== "Investor" && (
                    <span className="text-sm text-muted-foreground font-normal md:ml-auto md:mr-4">
                      Most common reason: Pricing too wide
                    </span>
                  )}
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-0 pb-0 border-t border-border">
                 {onHoldDeals.length > 0 ? (
                  <DealsTable deals={onHoldDeals} type="on-hold" />
                 ) : (
                  <EmptyState message="No processes on hold." />
                 )}
              </AccordionContent>
            </AccordionItem>
          )}

          {/* Closed Deals Section */}
          <AccordionItem value="closed" className="border border-border rounded-lg bg-card overflow-hidden">
            <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-3">
                <span className="font-semibold text-lg">Closed Deals</span>
                <Badge variant="secondary" className="rounded-full px-2.5">{closedDeals.length}</Badge>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-0 pb-0 border-t border-border">
               {closedDeals.length > 0 ? (
                  <DealsTable deals={closedDeals} type="closed" />
               ) : (
                  <EmptyState message="No closed deals yet." />
               )}
            </AccordionContent>
          </AccordionItem>

        </Accordion>
      </div>
    </Layout>
  );
}

function DealsTable({ deals, type }: { deals: Deal[], type: 'active' | 'on-hold' | 'closed' }) {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  
  // Decide where to send investor vs internal
  // Investors usually go straight to Documents or Overview (which might be their landing)
  // For now we send everyone to Overview, but Overview will be different for Investors
  const handleRowClick = (dealId: string) => {
    if (user?.role === "Investor") {
       setLocation(`/deal/${dealId}/documents`);
    } else {
       setLocation(`/deal/${dealId}/overview`);
    }
  };

  return (
    <Table>
      <TableHeader>
        <TableRow className="bg-muted/30 hover:bg-muted/30">
          <TableHead className="w-[30%]">Deal Name</TableHead>
          <TableHead>Sector</TableHead>
          <TableHead>Size</TableHead>
          <TableHead>Status</TableHead>
          
          {/* Dynamic Columns based on type */}
          {type === 'active' && (
            <>
              {user?.role !== "Investor" && <TableHead className="w-[20%]">Committed</TableHead>}
              <TableHead>Stage</TableHead>
              <TableHead className="text-right">Timeline</TableHead>
            </>
          )}
          
          {type === 'on-hold' && (
            <>
               <TableHead className="w-[20%]">Hold Reason</TableHead>
               <TableHead>Held Since</TableHead>
               <TableHead>Last Stage</TableHead>
            </>
          )}

          {type === 'closed' && (
            <>
               <TableHead>Closed Date</TableHead>
               <TableHead>Outcome</TableHead>
               <TableHead>Final Economics</TableHead>
            </>
          )}

          <TableHead className="w-[50px]"></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {deals.map((deal) => (
          <TableRow key={deal.id} className="cursor-pointer hover:bg-muted/30" onClick={() => handleRowClick(deal.id)}>
            <TableCell>
              <div className="flex flex-col">
                <span className="font-medium text-primary hover:underline hover:text-primary/80 transition-colors">
                  {deal.dealName}
                </span>
                <span className="text-xs text-muted-foreground">{deal.borrowerName}</span>
              </div>
            </TableCell>
            <TableCell>
              <Badge variant="outline" className="font-normal text-muted-foreground bg-secondary/50">
                {deal.sector}
              </Badge>
            </TableCell>
            <TableCell className="font-mono text-sm">
              {(deal.facilitySize / 1000000).toFixed(1)}M {deal.currency}
            </TableCell>
            <TableCell>
              <StatusBadge status={deal.status} />
            </TableCell>

            {/* Active Columns */}
            {type === 'active' && (
              <>
                {user?.role !== "Investor" && (
                  <TableCell>
                    <div className="space-y-1.5 w-full max-w-[140px]">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">
                          ${(deal.committed / 1000000).toFixed(1)}M
                        </span>
                        <span className={cn("font-medium", deal.committedPct >= 100 ? "text-green-600" : "text-foreground")}>
                          {(deal.coverageRatio * 100).toFixed(0)}%
                        </span>
                      </div>
                      <Progress value={deal.committedPct} className="h-1.5" />
                    </div>
                  </TableCell>
                )}
                <TableCell>
                  <div className="flex flex-col gap-1">
                    <Badge variant="secondary" className="font-normal text-xs w-fit">
                      {deal.stage}
                    </Badge>
                    {(() => {
                      const risk = computeDealRisk(deal);
                      if (risk.label !== "Normal" && user?.role !== "Investor") {
                        return (
                          <Badge variant="outline" className={`text-[10px] w-fit px-1.5 py-0 h-5 ${risk.color}`}>
                            {risk.label}
                          </Badge>
                        );
                      }
                      return null;
                    })()}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-xs font-medium whitespace-nowrap">
                      {format(parseISO(deal.hardCloseDate || deal.closeDate), "MMM d, yyyy")}
                    </span>
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1 justify-end">
                      <Clock className="h-3 w-3" />
                      {differenceInDays(parseISO(deal.hardCloseDate || deal.closeDate), new Date())}d to close
                    </span>
                  </div>
                </TableCell>
              </>
            )}

            {/* On Hold Columns */}
            {type === 'on-hold' && (
              <>
                 <TableCell>
                   <TooltipProvider>
                     <Tooltip>
                       <TooltipTrigger asChild>
                         <span className="truncate max-w-[150px] block text-sm">{deal.holdReason}</span>
                       </TooltipTrigger>
                       <TooltipContent>
                         <p>{deal.holdReason}</p>
                       </TooltipContent>
                     </Tooltip>
                   </TooltipProvider>
                 </TableCell>
                 <TableCell className="text-sm text-muted-foreground">
                   {deal.holdSince && (
                     <div className="flex flex-col">
                        <span>{format(parseISO(deal.holdSince), "MMM d, yyyy")}</span>
                        <span className="text-[10px]">
                          {differenceInDays(new Date(), parseISO(deal.holdSince))} days on hold
                        </span>
                     </div>
                   )}
                 </TableCell>
                 <TableCell>
                   <Badge variant="outline" className="text-xs text-muted-foreground">
                     {deal.lastStageBeforeHold}
                   </Badge>
                 </TableCell>
              </>
            )}

             {/* Closed Columns */}
             {type === 'closed' && (
              <>
                 <TableCell className="text-sm">
                    {deal.closedDate ? format(parseISO(deal.closedDate), "MMM d, yyyy") : "-"}
                 </TableCell>
                 <TableCell>
                   <Badge variant="outline" className={cn(
                     "font-normal border-green-200 bg-green-50 text-green-700",
                     deal.outcome === "Pulled" && "border-red-200 bg-red-50 text-red-700",
                     deal.outcome === "Refinanced" && "border-blue-200 bg-blue-50 text-blue-700"
                   )}>
                     {deal.outcome}
                   </Badge>
                 </TableCell>
                 <TableCell className="text-xs text-muted-foreground">
                    S+{deal.pricing.spreadLowBps} • {deal.pricing.oid} OID
                 </TableCell>
              </>
            )}

            <TableCell onClick={(e) => e.stopPropagation()}>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-[180px]">
                  <DropdownMenuLabel>Actions</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {user?.role !== "Investor" && (
                    <DropdownMenuItem onClick={() => setLocation(`/deal/${deal.id}/overview`)}>
                      <TrendingUp className="mr-2 h-4 w-4" /> Overview
                    </DropdownMenuItem>
                  )}
                  
                  {type === 'active' && (
                    <>
                      {user?.role !== "Investor" && (
                        <DropdownMenuItem onClick={() => setLocation(`/deal/${deal.id}/book`)}>
                          <Users className="mr-2 h-4 w-4" /> Investor Book
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem onClick={() => setLocation(`/deal/${deal.id}/documents`)}>
                        <FileText className="mr-2 h-4 w-4" /> Documents
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setLocation(`/deal/${deal.id}/qa`)}>
                        <HelpCircle className="mr-2 h-4 w-4" /> Due Diligence
                      </DropdownMenuItem>
                      {user?.role !== "Investor" && (
                        <DropdownMenuItem onClick={() => setLocation(`/deal/${deal.id}/closing`)}>
                          <CheckSquare className="mr-2 h-4 w-4" /> Closing
                        </DropdownMenuItem>
                      )}
                    </>
                  )}

                  {type === 'on-hold' && user?.role !== "Investor" && (
                    <>
                      <DropdownMenuItem>
                        <FileText className="mr-2 h-4 w-4" /> View Hold Notes
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-primary">
                        <CheckCircle2 className="mr-2 h-4 w-4" /> Resume Process
                      </DropdownMenuItem>
                    </>
                  )}

                  {type === 'closed' && (
                    <>
                      <DropdownMenuItem>
                        <FileText className="mr-2 h-4 w-4" /> Final Summary
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <History className="mr-2 h-4 w-4" /> Document Archive
                      </DropdownMenuItem>
                    </>
                  )}

                </DropdownMenuContent>
              </DropdownMenu>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function StatusBadge({ status }: { status: string }) {
  let className = "";
  let icon = null;

  switch (status) {
    case "Active":
      className = "bg-green-100 text-green-700 hover:bg-green-100 border-green-200";
      break;
    case "Diligence":
      className = "bg-blue-100 text-blue-700 hover:bg-blue-100 border-blue-200";
      break;
    case "Closing":
      className = "bg-purple-100 text-purple-700 hover:bg-purple-100 border-purple-200";
      break;
    case "At Risk":
      className = "bg-red-100 text-red-700 hover:bg-red-100 border-red-200";
      icon = <AlertTriangle className="h-3 w-3 mr-1" />;
      break;
    case "Paused":
      className = "bg-amber-100 text-amber-700 hover:bg-amber-100 border-amber-200";
      icon = <PauseCircle className="h-3 w-3 mr-1" />;
      break;
    case "Closed":
      className = "bg-slate-100 text-slate-700 hover:bg-slate-100 border-slate-200";
      icon = <CheckCircle2 className="h-3 w-3 mr-1" />;
      break;
    default:
      className = "bg-gray-100 text-gray-700 hover:bg-gray-100 border-gray-200";
  }

  return (
    <Badge variant="outline" className={`font-normal ${className} flex w-fit items-center`}>
      {icon}
      {status}
    </Badge>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground bg-muted/10">
      <Briefcase className="h-10 w-10 mb-3 text-muted-foreground/30" />
      <p>{message}</p>
    </div>
  );
}
