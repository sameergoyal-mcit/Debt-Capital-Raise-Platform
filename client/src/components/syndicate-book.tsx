import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  BookOpen,
  DollarSign,
  TrendingUp,
  CheckCircle2,
  Clock,
  AlertCircle,
  Save,
  Edit2,
  X,
  RefreshCw,
  Lock,
  FileSignature
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/auth-context";
import { mockLenders, LenderStatusLabels, type LenderStatus } from "@/data/lenders";
import { getDealInvitations } from "@/data/invitations";
import { mockDeals } from "@/data/deals";

export type SyndicateBookFilter = "all" | "no_ioi" | "firm_committed" | "soft_circled";

interface SyndicateBookProps {
  dealId: string;
  filter?: SyndicateBookFilter;
  onClearFilter?: () => void;
}

interface SyndicateBookEntry {
  id: string;
  dealId: string;
  lenderId: string;
  status: LenderStatus;
  indicatedAmount: string | null;
  firmCommitmentAmount: string | null;
  allocatedAmount: string | null;
  spreadBps: number | null;
  internalNotes: string | null;
  lastUpdatedBy: string | null;
  lastUpdatedAt: string;
  createdAt: string;
}

interface Indication {
  id: string;
  dealId: string;
  lenderId: string;
  ioiAmount: string;
  termsJson: {
    spreadBps?: number;
    oid?: number;
    isFirm?: boolean;
    conditions?: string;
  };
  status: "submitted" | "updated" | "withdrawn";
  submittedAt: string;
  updatedAt: string;
  lender?: {
    id: string;
    firstName: string;
    lastName: string;
    organization: string;
  };
}

const SYNDICATE_STATUSES: { value: LenderStatus; label: string }[] = [
  { value: "invited", label: "Invited" },
  { value: "interested", label: "Interested" },
  { value: "ioi_submitted", label: "IOI Submitted" },
  { value: "soft_circled", label: "Soft Circled" },
  { value: "firm_committed", label: "Firm Committed" },
  { value: "allocated", label: "Allocated" },
  { value: "declined", label: "Declined" },
];

export function SyndicateBook({ dealId, filter = "all", onClearFilter }: SyndicateBookProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingNotes, setEditingNotes] = useState<string>("");
  const [editingStatus, setEditingStatus] = useState<LenderStatus | null>(null);

  const deal = mockDeals.find(d => d.id === dealId);
  const invitations = useMemo(() => getDealInvitations(dealId), [dealId]);

  // Fetch syndicate book entries
  const { data: entries = [], isLoading, refetch } = useQuery<SyndicateBookEntry[]>({
    queryKey: ["syndicate-book", dealId],
    queryFn: async () => {
      const res = await fetch(`/api/deals/${dealId}/syndicate-book`, {
        headers: {
          "x-user-role": user?.role || "Bookrunner",
        },
      });
      if (!res.ok) {
        if (res.status === 403) {
          throw new Error("Access denied. Internal users only.");
        }
        throw new Error("Failed to fetch syndicate book");
      }
      return res.json();
    },
    refetchInterval: 30000, // Auto-refresh every 30 seconds
  });

  // Fetch all indications for the deal (internal users only)
  const { data: indications = [] } = useQuery<Indication[]>({
    queryKey: ["indications", dealId],
    queryFn: async () => {
      const res = await fetch(`/api/deals/${dealId}/indications`, {
        headers: {
          "x-user-role": user?.role || "Bookrunner",
        },
      });
      if (!res.ok) {
        if (res.status === 403) return [];
        throw new Error("Failed to fetch indications");
      }
      return res.json();
    },
    refetchInterval: 30000,
  });

  // Create a map of lenderId -> indication for quick lookup
  const indicationsByLender = useMemo(() => {
    const map = new Map<string, Indication>();
    indications.forEach(ind => {
      if (ind.status !== "withdrawn") {
        map.set(ind.lenderId, ind);
      }
    });
    return map;
  }, [indications]);

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({ lenderId, updates }: { lenderId: string; updates: Partial<SyndicateBookEntry> }) => {
      const res = await fetch(`/api/deals/${dealId}/syndicate-book/${lenderId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-user-role": user?.role || "Bookrunner",
        },
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error("Failed to update entry");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["syndicate-book", dealId] });
      toast({
        title: "Updated",
        description: "Syndicate book entry updated successfully.",
      });
      setEditingId(null);
      setEditingNotes("");
      setEditingStatus(null);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update entry. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Calculate summary metrics
  const metrics = useMemo(() => {
    const targetSize = deal?.facilitySize || 45000000;
    let indicatedTotal = 0;
    let softCircledTotal = 0;
    let firmCommittedTotal = 0;
    let allocatedTotal = 0;

    entries.forEach((entry) => {
      const indicated = parseFloat(entry.indicatedAmount || "0");
      const firm = parseFloat(entry.firmCommitmentAmount || "0");
      const allocated = parseFloat(entry.allocatedAmount || "0");

      indicatedTotal += indicated;

      if (entry.status === "soft_circled") {
        softCircledTotal += indicated;
      }
      if (entry.status === "firm_committed" || entry.status === "allocated") {
        firmCommittedTotal += firm;
      }
      if (entry.status === "allocated") {
        allocatedTotal += allocated;
      }
    });

    const progressPercent = Math.min(100, (firmCommittedTotal / targetSize) * 100);

    return {
      targetSize,
      indicatedTotal,
      softCircledTotal,
      firmCommittedTotal,
      allocatedTotal,
      progressPercent,
    };
  }, [entries, deal]);

  // Filter entries based on filter prop
  const filteredEntries = useMemo(() => {
    if (filter === "all") return entries;

    return entries.filter(entry => {
      switch (filter) {
        case "no_ioi":
          // Lenders who have signed NDA but haven't submitted IOI
          const inv = invitations.find(i => i.lenderId === entry.lenderId);
          const hasNDA = inv?.ndaSignedAt;
          const hasNoIOI = !["ioi_submitted", "soft_circled", "firm_committed", "allocated"].includes(entry.status);
          return hasNDA && hasNoIOI;
        case "firm_committed":
          return entry.status === "firm_committed" || entry.status === "allocated";
        case "soft_circled":
          return entry.status === "soft_circled";
        default:
          return true;
      }
    });
  }, [entries, filter, invitations]);

  // Get lender info with NDA status
  const getLenderInfo = (lenderId: string) => {
    const lender = mockLenders.find(l => l.id === lenderId);
    const invitation = invitations.find(i => i.lenderId === lenderId);
    return {
      name: lender?.name || "Unknown Lender",
      type: lender?.type || "Unknown",
      ndaSigned: !!invitation?.ndaSignedAt,
      ndaRequired: invitation?.ndaRequired ?? true,
    };
  };

  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    }
    if (value >= 1000) {
      return `$${(value / 1000).toFixed(0)}K`;
    }
    return `$${value.toFixed(0)}`;
  };

  const handleSaveNotes = (entry: SyndicateBookEntry) => {
    updateMutation.mutate({
      lenderId: entry.lenderId,
      updates: { internalNotes: editingNotes },
    });
  };

  const handleStatusChange = (entry: SyndicateBookEntry, newStatus: LenderStatus) => {
    updateMutation.mutate({
      lenderId: entry.lenderId,
      updates: { status: newStatus },
    });
  };

  const getStatusBadgeVariant = (status: LenderStatus) => {
    switch (status) {
      case "allocated":
      case "firm_committed":
        return "bg-green-50 text-green-700 border-green-200";
      case "soft_circled":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "ioi_submitted":
        return "bg-purple-50 text-purple-700 border-purple-200";
      case "interested":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "declined":
        return "bg-red-50 text-red-700 border-red-200";
      default:
        return "bg-gray-50 text-gray-700 border-gray-200";
    }
  };

  if (isLoading) {
    return (
      <Card className="border-border/60 shadow-sm">
        <CardContent className="py-12 text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Loading syndicate book...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Security Notice */}
      <div className="flex items-center gap-2 px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg">
        <Lock className="h-4 w-4 text-amber-600" />
        <p className="text-sm text-amber-800">
          <span className="font-medium">Internal Only:</span> This syndicate book is visible only to bookrunners and issuers.
          Data here is never shared with investors.
        </p>
      </div>

      {/* Filter Alert Banner */}
      {filter !== "all" && (
        <Alert className={filter === "no_ioi" ? "bg-red-50 border-red-200" : "bg-blue-50 border-blue-200"}>
          <AlertCircle className={`h-4 w-4 ${filter === "no_ioi" ? "text-red-600" : "text-blue-600"}`} />
          <AlertDescription className={`text-sm flex-1 ${filter === "no_ioi" ? "text-red-800" : "text-blue-800"}`}>
            {filter === "no_ioi" && (
              <span className="font-medium">No Indication Received:</span>
            )}
            {filter === "firm_committed" && (
              <span className="font-medium">Firm Committed Lenders</span>
            )}
            {filter === "soft_circled" && (
              <span className="font-medium">Soft Circled Lenders</span>
            )}
            {" "}Showing {filteredEntries.length} entr{filteredEntries.length !== 1 ? "ies" : "y"}.
          </AlertDescription>
          {onClearFilter && (
            <Button
              variant="outline"
              size="sm"
              onClick={onClearFilter}
              className="ml-auto shrink-0"
            >
              Clear Filter
            </Button>
          )}
        </Alert>
      )}

      {/* Summary Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="border-border/60">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Target Raise</span>
            </div>
            <p className="text-2xl font-bold text-primary">{formatCurrency(metrics.targetSize)}</p>
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4 text-purple-500" />
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Indicated (IOIs)</span>
            </div>
            <p className="text-2xl font-bold text-purple-600">{formatCurrency(metrics.indicatedTotal)}</p>
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="h-4 w-4 text-blue-500" />
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Soft Circled</span>
            </div>
            <p className="text-2xl font-bold text-blue-600">{formatCurrency(metrics.softCircledTotal)}</p>
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Firm Committed</span>
            </div>
            <p className="text-2xl font-bold text-green-600">{formatCurrency(metrics.firmCommittedTotal)}</p>
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Progress to Target</span>
            </div>
            <p className="text-2xl font-bold text-primary mb-2">{metrics.progressPercent.toFixed(0)}%</p>
            <Progress value={metrics.progressPercent} className="h-2" />
          </CardContent>
        </Card>
      </div>

      {/* Syndicate Book Table */}
      <Card className="border-border/60 shadow-sm">
        <CardHeader className="pb-3 border-b border-border/40">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-primary" />
                Syndicate Book
              </CardTitle>
              <CardDescription>
                Internal tracking for all lenders in this deal. Notes are private.
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => { refetch(); queryClient.invalidateQueries({ queryKey: ["indications", dealId] }); }} className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <Table>
            <TableHeader>
              <TableRow className="text-xs uppercase">
                <TableHead>Lender Name</TableHead>
                <TableHead>NDA Status</TableHead>
                <TableHead className="text-right">IOI Amount</TableHead>
                <TableHead className="text-right">Firm Commitment</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Internal Notes</TableHead>
                <TableHead>Last Updated</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEntries.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                    <AlertCircle className="h-8 w-8 mx-auto mb-3 text-muted-foreground/50" />
                    {entries.length === 0 ? (
                      <>
                        <p className="font-medium">No entries in syndicate book</p>
                        <p className="text-sm">Invite lenders to the deal to start tracking.</p>
                      </>
                    ) : (
                      <>
                        <p className="font-medium">No matching entries</p>
                        <p className="text-sm">No lenders match the current filter criteria.</p>
                      </>
                    )}
                  </TableCell>
                </TableRow>
              ) : (
                filteredEntries.map((entry) => {
                  const lenderInfo = getLenderInfo(entry.lenderId);
                  const isEditing = editingId === entry.id;

                  return (
                    <TableRow key={entry.id} className="group">
                      <TableCell>
                        <div>
                          <p className="font-medium">{lenderInfo.name}</p>
                          <p className="text-xs text-muted-foreground">{lenderInfo.type}</p>
                        </div>
                      </TableCell>

                      <TableCell>
                        {lenderInfo.ndaRequired ? (
                          lenderInfo.ndaSigned ? (
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 gap-1">
                              <FileSignature className="h-3 w-3" /> Signed
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 gap-1">
                              <Clock className="h-3 w-3" /> Pending
                            </Badge>
                          )
                        ) : (
                          <span className="text-xs text-muted-foreground">Not Required</span>
                        )}
                      </TableCell>

                      <TableCell className="text-right">
                        {(() => {
                          const indication = indicationsByLender.get(entry.lenderId);
                          if (indication) {
                            return (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div className="text-right">
                                      <p className="font-medium tabular-nums">{formatCurrency(parseFloat(indication.ioiAmount))}</p>
                                      <p className="text-xs text-muted-foreground">
                                        {indication.termsJson?.isFirm ? (
                                          <Badge variant="outline" className="text-[10px] px-1 bg-green-50 text-green-700 border-green-200">Firm</Badge>
                                        ) : (
                                          <span>{formatDistanceToNow(new Date(indication.submittedAt), { addSuffix: true })}</span>
                                        )}
                                      </p>
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent side="left" className="max-w-[250px]">
                                    <div className="text-xs space-y-1">
                                      <p><span className="text-muted-foreground">Amount:</span> {formatCurrency(parseFloat(indication.ioiAmount))}</p>
                                      {indication.termsJson?.spreadBps && (
                                        <p><span className="text-muted-foreground">Spread:</span> {indication.termsJson.spreadBps} bps</p>
                                      )}
                                      {indication.termsJson?.oid && (
                                        <p><span className="text-muted-foreground">OID:</span> {indication.termsJson.oid}%</p>
                                      )}
                                      {indication.termsJson?.conditions && (
                                        <p><span className="text-muted-foreground">Conditions:</span> {indication.termsJson.conditions}</p>
                                      )}
                                      <p className="pt-1 border-t text-muted-foreground">
                                        {indication.status === "updated" ? "Updated" : "Submitted"} {formatDistanceToNow(new Date(indication.updatedAt), { addSuffix: true })}
                                      </p>
                                    </div>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            );
                          }
                          return <span className="text-muted-foreground">-</span>;
                        })()}
                      </TableCell>

                      <TableCell className="text-right font-medium tabular-nums">
                        {entry.firmCommitmentAmount ? formatCurrency(parseFloat(entry.firmCommitmentAmount)) : "-"}
                      </TableCell>

                      <TableCell>
                        <Select
                          value={entry.status}
                          onValueChange={(value) => handleStatusChange(entry, value as LenderStatus)}
                        >
                          <SelectTrigger className="h-8 w-[140px]">
                            <SelectValue>
                              <Badge variant="outline" className={`font-normal ${getStatusBadgeVariant(entry.status)}`}>
                                {LenderStatusLabels[entry.status] || entry.status}
                              </Badge>
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            {SYNDICATE_STATUSES.map((status) => (
                              <SelectItem key={status.value} value={status.value}>
                                {status.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>

                      <TableCell className="max-w-[200px]">
                        {isEditing ? (
                          <div className="flex items-center gap-2">
                            <Textarea
                              value={editingNotes}
                              onChange={(e) => setEditingNotes(e.target.value)}
                              className="h-20 text-xs resize-none"
                              placeholder="Internal notes..."
                            />
                            <div className="flex flex-col gap-1">
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-6 w-6"
                                onClick={() => handleSaveNotes(entry)}
                                disabled={updateMutation.isPending}
                              >
                                <Save className="h-3 w-3" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-6 w-6"
                                onClick={() => {
                                  setEditingId(null);
                                  setEditingNotes("");
                                }}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div
                                  className="flex items-center gap-2 cursor-pointer group/notes"
                                  onClick={() => {
                                    setEditingId(entry.id);
                                    setEditingNotes(entry.internalNotes || "");
                                  }}
                                >
                                  <p className="text-xs text-muted-foreground truncate max-w-[150px]">
                                    {entry.internalNotes || "Click to add notes..."}
                                  </p>
                                  <Edit2 className="h-3 w-3 opacity-0 group-hover/notes:opacity-100 transition-opacity text-muted-foreground" />
                                </div>
                              </TooltipTrigger>
                              {entry.internalNotes && (
                                <TooltipContent side="left" className="max-w-[300px]">
                                  <p className="text-xs whitespace-pre-wrap">{entry.internalNotes}</p>
                                </TooltipContent>
                              )}
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </TableCell>

                      <TableCell className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(entry.lastUpdatedAt), { addSuffix: true })}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
