import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Award, CheckCircle2, XCircle, Clock, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";

interface EnrichedProposal {
  id: string;
  dealId: string;
  bankOrgId: string;
  bankName: string;
  submittedByName: string | null;
  status: string;
  leverageSenior: string | null;
  leverageTotal: string | null;
  interestMarginBps: number | null;
  oidBps: number | null;
  upfrontFeeBps: number | null;
  tenorYears: string | null;
  amortization: string | null;
  covenantsNotes: string | null;
  freeformNotes: string | null;
  allInBps: number;
  submittedAt: string | null;
}

interface CompareGridsProps {
  dealId: string;
  dealName?: string;
  onMandateAwarded?: () => void;
}

// Find the best value for a numeric field
function findBest(
  proposals: EnrichedProposal[],
  getValue: (p: EnrichedProposal) => number | null,
  compare: "lowest" | "highest" = "lowest"
): number | null {
  const values = proposals
    .filter(p => p.status === "submitted")
    .map(getValue)
    .filter((v): v is number => v !== null);

  if (values.length === 0) return null;

  if (compare === "lowest") {
    return Math.min(...values);
  }
  return Math.max(...values);
}

export function CompareGrids({ dealId, dealName, onMandateAwarded }: CompareGridsProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch proposals via compare endpoint
  const { data: proposals = [], isLoading, isError } = useQuery<EnrichedProposal[]>({
    queryKey: ["proposals-compare", dealId],
    queryFn: async () => {
      const res = await fetch(`/api/deals/${dealId}/proposals/compare`, {
        credentials: "include",
      });
      if (!res.ok) {
        throw new Error("Failed to fetch proposals");
      }
      return res.json();
    },
  });

  // Award mandate mutation
  const awardMutation = useMutation({
    mutationFn: async (bankOrgId: string) => {
      const res = await fetch(`/api/deals/${dealId}/rfp/award`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ bankOrgId }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to award mandate");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["proposals-compare", dealId] });
      queryClient.invalidateQueries({ queryKey: ["rfp", dealId] });
      queryClient.invalidateQueries({ queryKey: ["deal", dealId] });
      toast({
        title: "Mandate Awarded",
        description: "The selected bank has been awarded the mandate. Deal is now in live syndication.",
      });
      onMandateAwarded?.();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8 text-destructive">
          Failed to load proposals
        </CardContent>
      </Card>
    );
  }

  const submittedProposals = proposals.filter(p => p.status === "submitted");
  const hasSelectedProposal = proposals.some(p => p.status === "selected");

  // Calculate best values
  const bestMargin = findBest(proposals, p => p.interestMarginBps, "lowest");
  const bestOid = findBest(proposals, p => p.oidBps, "lowest");
  const bestFee = findBest(proposals, p => p.upfrontFeeBps, "lowest");
  const bestTenor = findBest(proposals, p => p.tenorYears ? parseFloat(p.tenorYears) : null, "highest");
  const bestLeverage = findBest(proposals, p => p.leverageSenior ? parseFloat(p.leverageSenior) : null, "highest");
  const bestAllIn = findBest(proposals, p => p.allInBps, "lowest");

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "submitted":
        return <Badge variant="outline" className="gap-1"><Clock className="h-3 w-3" />Pending</Badge>;
      case "selected":
        return <Badge className="bg-green-600 gap-1"><CheckCircle2 className="h-3 w-3" />Mandated</Badge>;
      case "declined":
        return <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" />Declined</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const isBest = (value: number | null, best: number | null) => {
    if (value === null || best === null) return false;
    return value === best;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5" />
              Compare Financing Proposals
            </CardTitle>
            <CardDescription>
              {dealName && `${dealName} - `}
              {submittedProposals.length} proposal{submittedProposals.length !== 1 ? "s" : ""} received
            </CardDescription>
          </div>
          {hasSelectedProposal && (
            <Badge className="bg-green-600">Mandate Awarded</Badge>
          )}
        </div>
      </CardHeader>

      <CardContent>
        {proposals.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No proposals received yet. Invite banks to submit their financing terms.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[180px]">Term</TableHead>
                  {proposals.map((proposal) => (
                    <TableHead key={proposal.id} className="text-center min-w-[150px]">
                      <div className="font-semibold">{proposal.bankName}</div>
                      {proposal.submittedByName && (
                        <div className="text-xs text-muted-foreground font-normal">
                          {proposal.submittedByName}
                        </div>
                      )}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {/* Status Row */}
                <TableRow>
                  <TableCell className="font-medium">Status</TableCell>
                  {proposals.map((proposal) => (
                    <TableCell key={proposal.id} className="text-center">
                      {getStatusBadge(proposal.status)}
                    </TableCell>
                  ))}
                </TableRow>

                {/* Senior Leverage */}
                <TableRow>
                  <TableCell className="font-medium">Senior Leverage</TableCell>
                  {proposals.map((proposal) => (
                    <TableCell
                      key={proposal.id}
                      className={cn(
                        "text-center",
                        isBest(proposal.leverageSenior ? parseFloat(proposal.leverageSenior) : null, bestLeverage) &&
                          "bg-green-50 dark:bg-green-950/30 font-semibold text-green-700 dark:text-green-400"
                      )}
                    >
                      {proposal.leverageSenior ? `${proposal.leverageSenior}x` : "-"}
                    </TableCell>
                  ))}
                </TableRow>

                {/* Total Leverage */}
                <TableRow>
                  <TableCell className="font-medium">Total Leverage</TableCell>
                  {proposals.map((proposal) => (
                    <TableCell key={proposal.id} className="text-center">
                      {proposal.leverageTotal ? `${proposal.leverageTotal}x` : "-"}
                    </TableCell>
                  ))}
                </TableRow>

                {/* Interest Margin */}
                <TableRow>
                  <TableCell className="font-medium">Interest Margin</TableCell>
                  {proposals.map((proposal) => (
                    <TableCell
                      key={proposal.id}
                      className={cn(
                        "text-center",
                        isBest(proposal.interestMarginBps, bestMargin) &&
                          "bg-green-50 dark:bg-green-950/30 font-semibold text-green-700 dark:text-green-400"
                      )}
                    >
                      {proposal.interestMarginBps !== null ? `S+${proposal.interestMarginBps}bps` : "-"}
                    </TableCell>
                  ))}
                </TableRow>

                {/* OID */}
                <TableRow>
                  <TableCell className="font-medium">OID</TableCell>
                  {proposals.map((proposal) => (
                    <TableCell
                      key={proposal.id}
                      className={cn(
                        "text-center",
                        isBest(proposal.oidBps, bestOid) &&
                          "bg-green-50 dark:bg-green-950/30 font-semibold text-green-700 dark:text-green-400"
                      )}
                    >
                      {proposal.oidBps !== null ? `${proposal.oidBps}bps` : "-"}
                    </TableCell>
                  ))}
                </TableRow>

                {/* Upfront Fee */}
                <TableRow>
                  <TableCell className="font-medium">Upfront Fee</TableCell>
                  {proposals.map((proposal) => (
                    <TableCell
                      key={proposal.id}
                      className={cn(
                        "text-center",
                        isBest(proposal.upfrontFeeBps, bestFee) &&
                          "bg-green-50 dark:bg-green-950/30 font-semibold text-green-700 dark:text-green-400"
                      )}
                    >
                      {proposal.upfrontFeeBps !== null ? `${proposal.upfrontFeeBps}bps` : "-"}
                    </TableCell>
                  ))}
                </TableRow>

                {/* Tenor */}
                <TableRow>
                  <TableCell className="font-medium">Tenor</TableCell>
                  {proposals.map((proposal) => (
                    <TableCell
                      key={proposal.id}
                      className={cn(
                        "text-center",
                        isBest(proposal.tenorYears ? parseFloat(proposal.tenorYears) : null, bestTenor) &&
                          "bg-green-50 dark:bg-green-950/30 font-semibold text-green-700 dark:text-green-400"
                      )}
                    >
                      {proposal.tenorYears ? `${proposal.tenorYears} years` : "-"}
                    </TableCell>
                  ))}
                </TableRow>

                {/* All-In Yield */}
                <TableRow className="bg-muted/50">
                  <TableCell className="font-semibold">All-In Yield (Est.)</TableCell>
                  {proposals.map((proposal) => (
                    <TableCell
                      key={proposal.id}
                      className={cn(
                        "text-center font-semibold",
                        isBest(proposal.allInBps, bestAllIn) &&
                          "bg-green-100 dark:bg-green-950/50 text-green-700 dark:text-green-400"
                      )}
                    >
                      {proposal.allInBps ? `S+${proposal.allInBps}bps` : "-"}
                    </TableCell>
                  ))}
                </TableRow>

                {/* Amortization */}
                <TableRow>
                  <TableCell className="font-medium">Amortization</TableCell>
                  {proposals.map((proposal) => (
                    <TableCell key={proposal.id} className="text-center text-sm">
                      {proposal.amortization || "-"}
                    </TableCell>
                  ))}
                </TableRow>

                {/* Notes */}
                <TableRow>
                  <TableCell className="font-medium">Notes</TableCell>
                  {proposals.map((proposal) => (
                    <TableCell key={proposal.id} className="text-center text-sm max-w-[200px]">
                      <span className="line-clamp-2">{proposal.freeformNotes || "-"}</span>
                    </TableCell>
                  ))}
                </TableRow>

                {/* Award Action Row */}
                {!hasSelectedProposal && (
                  <TableRow>
                    <TableCell className="font-medium">Action</TableCell>
                    {proposals.map((proposal) => (
                      <TableCell key={proposal.id} className="text-center">
                        {proposal.status === "submitted" ? (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                size="sm"
                                className="gap-1"
                                disabled={awardMutation.isPending}
                              >
                                {awardMutation.isPending ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Award className="h-4 w-4" />
                                )}
                                Award Mandate
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Award Mandate to {proposal.bankName}?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will select {proposal.bankName} as the bookrunner for this deal.
                                  All other banks will be notified their proposals were not selected,
                                  and the deal will move to live syndication.
                                  This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => awardMutation.mutate(proposal.bankOrgId)}>
                                  Award Mandate
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
