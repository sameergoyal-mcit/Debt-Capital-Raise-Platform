import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Send, Save, FileText, DollarSign, Percent, Clock, Info, Lock } from "lucide-react";

interface FinancingProposal {
  id: string;
  dealId: string;
  bankOrgId: string;
  status: string;
  leverageSenior: string | null;
  leverageTotal: string | null;
  interestMarginBps: number | null;
  oidBps: number | null;
  upfrontFeeBps: number | null;
  tenorYears: string | null;
  amortization: string | null;
  covenantsNotes: string | null;
  conditionsNotes: string | null;
  freeformNotes: string | null;
  submittedAt: string | null;
}

interface RfpData {
  deal: {
    id: string;
    dealName: string;
    borrowerName: string;
    sector: string;
    sponsor: string;
    facilityType: string;
    facilitySize: string;
    status: string;
    closeDate: string;
  };
  candidate: {
    status: string;
    viewedAt: string | null;
  };
  proposal: FinancingProposal | null;
}

const proposalFormSchema = z.object({
  leverageSenior: z.coerce.number().min(0).max(10).optional(),
  leverageTotal: z.coerce.number().min(0).max(15).optional(),
  interestMarginBps: z.coerce.number().min(0).max(2000).optional(),
  oidBps: z.coerce.number().min(0).max(500).optional(),
  upfrontFeeBps: z.coerce.number().min(0).max(500).optional(),
  tenorYears: z.coerce.number().min(1).max(15).optional(),
  amortization: z.string().optional(),
  covenantsNotes: z.string().optional(),
  conditionsNotes: z.string().optional(),
  freeformNotes: z.string().optional(),
});

type ProposalFormData = z.infer<typeof proposalFormSchema>;

interface SubmitProposalProps {
  dealId: string;
}

export function SubmitProposal({ dealId }: SubmitProposalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch proposal data (deal teaser + own proposal)
  const { data: rfpData, isLoading, isError } = useQuery<RfpData>({
    queryKey: ["proposal", dealId],
    queryFn: async () => {
      const res = await fetch(`/api/deals/${dealId}/proposal`, {
        credentials: "include",
      });
      if (!res.ok) {
        if (res.status === 403) {
          throw new Error("You are not invited to submit a proposal for this deal");
        }
        throw new Error("Failed to fetch proposal data");
      }
      return res.json();
    },
  });

  const form = useForm<ProposalFormData>({
    resolver: zodResolver(proposalFormSchema),
    defaultValues: {
      leverageSenior: undefined,
      leverageTotal: undefined,
      interestMarginBps: undefined,
      oidBps: undefined,
      upfrontFeeBps: undefined,
      tenorYears: undefined,
      amortization: "",
      covenantsNotes: "",
      conditionsNotes: "",
      freeformNotes: "",
    },
  });

  // Reset form when proposal data loads
  useEffect(() => {
    if (rfpData?.proposal) {
      const p = rfpData.proposal;
      form.reset({
        leverageSenior: p.leverageSenior ? parseFloat(p.leverageSenior) : undefined,
        leverageTotal: p.leverageTotal ? parseFloat(p.leverageTotal) : undefined,
        interestMarginBps: p.interestMarginBps || undefined,
        oidBps: p.oidBps || undefined,
        upfrontFeeBps: p.upfrontFeeBps || undefined,
        tenorYears: p.tenorYears ? parseFloat(p.tenorYears) : undefined,
        amortization: p.amortization || "",
        covenantsNotes: p.covenantsNotes || "",
        conditionsNotes: p.conditionsNotes || "",
        freeformNotes: p.freeformNotes || "",
      });
    }
  }, [rfpData?.proposal, form]);

  // Save draft mutation
  const saveMutation = useMutation({
    mutationFn: async (data: ProposalFormData) => {
      const res = await fetch(`/api/deals/${dealId}/proposals`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to save proposal");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["proposal", dealId] });
      toast({
        title: "Draft Saved",
        description: "Your proposal has been saved as a draft.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Submit proposal mutation
  const submitMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/deals/${dealId}/proposals/submit`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to submit proposal");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["proposal", dealId] });
      toast({
        title: "Proposal Submitted",
        description: "Your financing proposal has been submitted to the issuer.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSaveDraft = async (data: ProposalFormData) => {
    await saveMutation.mutateAsync(data);
  };

  const onSubmit = async (data: ProposalFormData) => {
    setIsSubmitting(true);
    try {
      // First save the latest data
      await saveMutation.mutateAsync(data);
      // Then submit the proposal
      await submitMutation.mutateAsync();
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (isError || !rfpData) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8 text-destructive">
          Failed to load RFP data
        </CardContent>
      </Card>
    );
  }

  const { deal, candidate, proposal } = rfpData;
  const isSubmitted = proposal?.status === "submitted";
  const isSelected = proposal?.status === "selected";
  const isDeclined = deal.status !== "rfp_stage";
  const isLocked = isSubmitted || isSelected || isDeclined;

  const formatCurrency = (value: string) => {
    const num = parseFloat(value);
    if (isNaN(num)) return value;
    return `$${(num / 1000000).toFixed(0)}MM`;
  };

  return (
    <div className="space-y-6">
      {/* Confidential Submission Banner */}
      <Alert>
        <Lock className="h-4 w-4" />
        <AlertDescription>
          <strong>Confidential Submission</strong> - Your proposal is visible only to the Issuer.
        </AlertDescription>
      </Alert>

      {/* Deal Summary Card */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Deal Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Borrower</p>
              <p className="font-medium">{deal.borrowerName}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Sector</p>
              <p className="font-medium">{deal.sector}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Facility Size</p>
              <p className="font-medium">{formatCurrency(deal.facilitySize)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Target Close</p>
              <p className="font-medium">{deal.closeDate}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Proposal Form */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Submit Financing Proposal
              </CardTitle>
              <CardDescription>
                For {deal.dealName} - Submit your competitive financing terms for consideration.
              </CardDescription>
            </div>
            {proposal && (
              <Badge
                variant={
                  isSubmitted ? "default" :
                  isSelected ? "default" :
                  "secondary"
                }
                className={isSelected ? "bg-green-600" : ""}
              >
                {proposal.status.charAt(0).toUpperCase() + proposal.status.slice(1)}
              </Badge>
            )}
          </div>
        </CardHeader>

        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-6">
            {/* Leverage Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="leverageSenior" className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  Senior Leverage (x)
                </Label>
                <Input
                  id="leverageSenior"
                  type="number"
                  step="0.1"
                  placeholder="e.g., 4.5"
                  {...form.register("leverageSenior")}
                  disabled={isLocked}
                />
                <p className="text-xs text-muted-foreground">Senior debt / EBITDA multiple</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="leverageTotal" className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  Total Leverage (x)
                </Label>
                <Input
                  id="leverageTotal"
                  type="number"
                  step="0.1"
                  placeholder="e.g., 5.5"
                  {...form.register("leverageTotal")}
                  disabled={isLocked}
                />
                <p className="text-xs text-muted-foreground">Total debt / EBITDA multiple</p>
              </div>
            </div>

            {/* Pricing Section */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="interestMarginBps" className="flex items-center gap-2">
                  <Percent className="h-4 w-4 text-muted-foreground" />
                  Interest Margin (bps)
                </Label>
                <Input
                  id="interestMarginBps"
                  type="number"
                  placeholder="e.g., 450"
                  {...form.register("interestMarginBps")}
                  disabled={isLocked}
                />
                <p className="text-xs text-muted-foreground">Spread over SOFR in basis points</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="oidBps" className="flex items-center gap-2">
                  <Percent className="h-4 w-4 text-muted-foreground" />
                  OID (bps)
                </Label>
                <Input
                  id="oidBps"
                  type="number"
                  placeholder="e.g., 200"
                  {...form.register("oidBps")}
                  disabled={isLocked}
                />
                <p className="text-xs text-muted-foreground">Original Issue Discount in basis points</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="upfrontFeeBps" className="flex items-center gap-2">
                  <Percent className="h-4 w-4 text-muted-foreground" />
                  Upfront Fee (bps)
                </Label>
                <Input
                  id="upfrontFeeBps"
                  type="number"
                  placeholder="e.g., 150"
                  {...form.register("upfrontFeeBps")}
                  disabled={isLocked}
                />
                <p className="text-xs text-muted-foreground">Arrangement/underwriting fee</p>
              </div>
            </div>

            {/* Tenor Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="tenorYears" className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  Tenor (Years)
                </Label>
                <Input
                  id="tenorYears"
                  type="number"
                  placeholder="e.g., 7"
                  {...form.register("tenorYears")}
                  disabled={isLocked}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="amortization">Amortization</Label>
                <Input
                  id="amortization"
                  placeholder="e.g., 1% annual, bullet at maturity"
                  {...form.register("amortization")}
                  disabled={isLocked}
                />
              </div>
            </div>

            {/* Notes Sections */}
            <div className="space-y-2">
              <Label htmlFor="covenantsNotes">Key Covenants</Label>
              <Textarea
                id="covenantsNotes"
                placeholder="Describe proposed covenant package..."
                rows={3}
                {...form.register("covenantsNotes")}
                disabled={isLocked}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="conditionsNotes">Conditions Precedent</Label>
              <Textarea
                id="conditionsNotes"
                placeholder="Key conditions precedent..."
                rows={2}
                {...form.register("conditionsNotes")}
                disabled={isLocked}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="freeformNotes">Additional Notes</Label>
              <Textarea
                id="freeformNotes"
                placeholder="Any additional terms or conditions..."
                rows={3}
                {...form.register("freeformNotes")}
                disabled={isLocked}
              />
            </div>
          </CardContent>

          <CardFooter className="flex justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={form.handleSubmit(onSaveDraft)}
              disabled={saveMutation.isPending || isLocked}
            >
              {saveMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Save Draft
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || isLocked}
            >
              {isSubmitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Send className="mr-2 h-4 w-4" />
              )}
              Submit Proposal
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
