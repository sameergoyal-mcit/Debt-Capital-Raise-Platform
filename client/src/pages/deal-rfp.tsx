import React, { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/layout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { CompareGrids } from "@/components/rfp/compare-grids";
import {
  Loader2,
  Building2,
  UserPlus,
  Eye,
  FileEdit,
  Send,
  CheckCircle2,
  XCircle,
  Trophy,
} from "lucide-react";

interface Organization {
  id: string;
  name: string;
  orgType: string;
}

interface Candidate {
  id: string;
  dealId: string;
  bankOrgId: string;
  bankName: string;
  status: string;
  hasProposal: boolean;
  proposalStatus: string | null;
  createdAt: string;
}

interface RfpDashboard {
  deal: {
    id: string;
    dealName: string;
    borrowerName: string;
    status: string;
    mandatedBankOrgId: string | null;
  };
  candidates: Candidate[];
  proposalCount: number;
}

export default function DealRfpPage() {
  const { id: dealId } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedBankId, setSelectedBankId] = useState<string>("");

  // Fetch RFP dashboard data
  const { data: rfpData, isLoading: rfpLoading, isError: rfpError } = useQuery<RfpDashboard>({
    queryKey: ["rfp", dealId],
    queryFn: async () => {
      const res = await fetch(`/api/deals/${dealId}/rfp`, {
        credentials: "include",
      });
      if (!res.ok) {
        throw new Error("Failed to fetch RFP data");
      }
      return res.json();
    },
  });

  // Fetch available banks
  const { data: banks = [] } = useQuery<Organization[]>({
    queryKey: ["organizations", "banks"],
    queryFn: async () => {
      const res = await fetch("/api/organizations/banks", {
        credentials: "include",
      });
      if (!res.ok) {
        return [];
      }
      return res.json();
    },
  });

  // Invite bank mutation
  const inviteMutation = useMutation({
    mutationFn: async (bankOrgId: string) => {
      const res = await fetch(`/api/deals/${dealId}/rfp/invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ bankOrgIds: [bankOrgId] }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to invite bank");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rfp", dealId] });
      toast({
        title: "Bank Invited",
        description: "The bank has been invited to submit a proposal.",
      });
      setSelectedBankId("");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleInviteBank = () => {
    if (selectedBankId) {
      inviteMutation.mutate(selectedBankId);
    }
  };

  const handleMandateAwarded = () => {
    // Refresh and potentially navigate to syndication
    queryClient.invalidateQueries({ queryKey: ["rfp", dealId] });
    queryClient.invalidateQueries({ queryKey: ["deal", dealId] });
  };

  if (rfpLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </Layout>
    );
  }

  if (rfpError || !rfpData) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64 text-destructive">
          Failed to load RFP data
        </div>
      </Layout>
    );
  }

  const { deal, candidates, proposalCount } = rfpData;
  const isRfpStage = deal.status === "rfp_stage";
  const isMandated = deal.mandatedBankOrgId !== null;

  // Filter out already invited banks
  const invitedBankIds = new Set(candidates.map(c => c.bankOrgId));
  const availableBanks = banks.filter(b => !invitedBankIds.has(b.id));

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "invited":
        return <UserPlus className="h-4 w-4 text-muted-foreground" />;
      case "viewed":
        return <Eye className="h-4 w-4 text-blue-500" />;
      case "drafting":
        return <FileEdit className="h-4 w-4 text-amber-500" />;
      case "submitted":
        return <Send className="h-4 w-4 text-green-500" />;
      case "mandated":
        return <Trophy className="h-4 w-4 text-amber-500" />;
      case "declined":
        return <XCircle className="h-4 w-4 text-destructive" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (candidate: Candidate) => {
    const status = candidate.status;
    switch (status) {
      case "invited":
        return <Badge variant="outline">Invited</Badge>;
      case "viewed":
        return <Badge variant="outline" className="border-blue-300">Viewed</Badge>;
      case "drafting":
        return <Badge variant="outline" className="border-amber-300">Drafting</Badge>;
      case "submitted":
        return <Badge className="bg-green-600">Submitted</Badge>;
      case "mandated":
        return <Badge className="bg-amber-500">Mandated</Badge>;
      case "declined":
        return <Badge variant="destructive">Declined</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold">RFP / Beauty Contest</h1>
          <p className="text-muted-foreground">
            {deal.dealName} - {deal.borrowerName}
          </p>
        </div>

        {/* Status Banner */}
        {isMandated ? (
          <Card className="bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900">
            <CardContent className="flex items-center gap-3 py-4">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <div>
                <p className="font-medium text-green-700 dark:text-green-400">Mandate Awarded</p>
                <p className="text-sm text-green-600 dark:text-green-500">
                  The RFP is complete. Deal has moved to live syndication.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="ml-auto"
                onClick={() => navigate(`/deal/${dealId}/syndicate`)}
              >
                View Syndication
              </Button>
            </CardContent>
          </Card>
        ) : null}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Invite Banks + Candidates List */}
        <div className="space-y-6">
          {/* Invite Banks */}
          {isRfpStage && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Building2 className="h-5 w-5" />
                  Invite Potential Bookrunners
                </CardTitle>
                <CardDescription>
                  Invite banks to submit financing proposals
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Select value={selectedBankId} onValueChange={setSelectedBankId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a bank..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableBanks.length === 0 ? (
                      <div className="py-2 px-3 text-sm text-muted-foreground">
                        No banks available to invite
                      </div>
                    ) : (
                      availableBanks.map((bank) => (
                        <SelectItem key={bank.id} value={bank.id}>
                          {bank.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                <Button
                  onClick={handleInviteBank}
                  disabled={!selectedBankId || inviteMutation.isPending}
                  className="w-full"
                >
                  {inviteMutation.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <UserPlus className="mr-2 h-4 w-4" />
                  )}
                  Invite Bank
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Candidates List */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Invited Banks</CardTitle>
              <CardDescription>
                {candidates.length} bank{candidates.length !== 1 ? "s" : ""} invited
                {proposalCount > 0 && ` - ${proposalCount} proposal${proposalCount !== 1 ? "s" : ""} received`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {candidates.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No banks invited yet. Use the form above to invite banks.
                </p>
              ) : (
                <div className="space-y-3">
                  {candidates.map((candidate) => (
                    <div
                      key={candidate.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        {getStatusIcon(candidate.status)}
                        <div>
                          <p className="font-medium">{candidate.bankName}</p>
                          <p className="text-xs text-muted-foreground">
                            {candidate.hasProposal
                              ? `Proposal: ${candidate.proposalStatus}`
                              : "No proposal yet"}
                          </p>
                        </div>
                      </div>
                      {getStatusBadge(candidate)}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Proposal Comparison */}
        <div className="lg:col-span-2">
          <CompareGrids
            dealId={dealId!}
            dealName={deal.dealName}
            onMandateAwarded={handleMandateAwarded}
          />
        </div>
        </div>
      </div>
    </Layout>
  );
}
