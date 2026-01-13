import React, { useState, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Upload, FileText, CheckCircle2, DollarSign, AlertCircle, ArrowLeft, Clock, XCircle } from "lucide-react";
import { mockDeals } from "@/data/deals";
import { useAuth } from "@/context/auth-context";
import { NDAGate } from "@/components/nda-gate";
import { format, parseISO } from "date-fns";

interface Indication {
  id: string;
  dealId: string;
  lenderId: string;
  submittedByUserId: string;
  ioiAmount: string;
  currency: string;
  termsJson: {
    spreadBps?: number;
    oid?: number;
    fees?: number;
    tenorMonths?: number;
    amortization?: string;
    covenantsNotes?: string;
    conditions?: string;
    comments?: string;
    isFirm?: boolean;
  };
  status: "submitted" | "updated" | "withdrawn";
  submittedAt: string;
  updatedAt: string;
}

export default function SubmitCommitment() {
  const [, params] = useRoute("/deal/:id/commitment");
  const dealId = params?.id || "101";
  const deal = mockDeals.find(d => d.id === dealId) || mockDeals[0];
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const [amount, setAmount] = useState<number>(10000000); // 10M default
  const [ticketType, setTicketType] = useState<string>("indicative");
  const [conditions, setConditions] = useState<string>("");
  const [spreadBps, setSpreadBps] = useState<number | undefined>(undefined);
  const [oid, setOid] = useState<number | undefined>(undefined);
  const [comments, setComments] = useState<string>("");
  const [files, setFiles] = useState<string[]>([]);
  const [showUpdateForm, setShowUpdateForm] = useState(false);

  const isDecline = ticketType === "decline";
  const isFirm = ticketType === "firm";

  // Fetch existing indication
  const { data: existingIndication, isLoading: isLoadingIndication } = useQuery<Indication | null>({
    queryKey: ["indication", dealId, user?.lenderId],
    queryFn: async () => {
      if (!user?.lenderId) return null;
      const res = await fetch(`/api/deals/${dealId}/indication`, {
        headers: {
          "x-user-id": user.email || "",
          "x-user-role": "lender",
          "x-lender-id": user.lenderId,
        },
      });
      if (res.status === 403) return null;
      if (!res.ok) throw new Error("Failed to fetch indication");
      const data = await res.json();
      return data;
    },
    enabled: !!user?.lenderId,
  });

  // Populate form with existing data
  useEffect(() => {
    if (existingIndication && existingIndication.status !== "withdrawn") {
      setAmount(parseFloat(existingIndication.ioiAmount) || 10000000);
      setTicketType(existingIndication.termsJson?.isFirm ? "firm" : "indicative");
      setConditions(existingIndication.termsJson?.conditions || "");
      setSpreadBps(existingIndication.termsJson?.spreadBps);
      setOid(existingIndication.termsJson?.oid);
      setComments(existingIndication.termsJson?.comments || "");
    }
  }, [existingIndication]);

  // Submit/update indication mutation
  const submitMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/deals/${dealId}/indication`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": user?.email || "",
          "x-user-role": "lender",
          "x-lender-id": user?.lenderId || "",
        },
        body: JSON.stringify({
          ioiAmount: amount.toString(),
          currency: deal.currency || "USD",
          termsJson: {
            spreadBps,
            oid,
            conditions,
            comments,
            isFirm,
          },
        }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to submit indication");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["indication", dealId] });
      const isUpdate = !!existingIndication && existingIndication.status !== "withdrawn";
      toast({
        title: isUpdate ? "Indication Updated" : "Indication Submitted",
        description: `Your ${isFirm ? "firm commitment" : "IOI"} of $${(amount / 1000000).toFixed(1)}M has been ${isUpdate ? "updated" : "recorded"}.`,
      });
      setShowUpdateForm(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Withdraw indication mutation
  const withdrawMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/deals/${dealId}/indication/withdraw`, {
        method: "POST",
        headers: {
          "x-user-id": user?.email || "",
          "x-user-role": "lender",
          "x-lender-id": user?.lenderId || "",
        },
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to withdraw indication");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["indication", dealId] });
      toast({
        title: "Indication Withdrawn",
        description: "Your indication has been withdrawn.",
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

  const handleSubmit = () => {
    if (isDecline) {
      withdrawMutation.mutate();
    } else {
      submitMutation.mutate();
    }
  };

  const handleFileUpload = () => {
    // Mock upload
    const newFile = `Internal_Memo_v${files.length + 1}.pdf`;
    setFiles([...files, newFile]);
    toast({
      title: "File Uploaded",
      description: `${newFile} attached to commitment.`,
    });
  };

  const hasActiveIndication = existingIndication && existingIndication.status !== "withdrawn";
  const isSubmitting = submitMutation.isPending || withdrawMutation.isPending;

  const userRole = user?.role?.toLowerCase();
  const PageContent = () => {
      if (!user || (userRole !== "investor" && userRole !== "lender")) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] text-center">
              <AlertCircle className="h-12 w-12 text-destructive mb-4" />
              <h2 className="text-xl font-bold">Access Denied</h2>
              <p className="text-muted-foreground mt-2">Only accredited lenders can submit indications.</p>
              <Button className="mt-6" onClick={() => setLocation(`/deal/${dealId}/overview`)}>
                Return to Overview
              </Button>
            </div>
        );
      }

      // Show loading state
      if (isLoadingIndication) {
        return (
          <div className="flex items-center justify-center h-[40vh]">
            <Clock className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">Loading...</span>
          </div>
        );
      }

      // Show existing indication summary with update/withdraw options
      if (hasActiveIndication && !showUpdateForm) {
        return (
          <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-500">
            <div className="mb-6">
              <Button variant="ghost" className="pl-0 gap-2 mb-2" onClick={() => setLocation(`/deal/${dealId}/overview`)}>
                <ArrowLeft className="h-4 w-4" /> Back to Deal
              </Button>
              <h1 className="text-2xl font-semibold text-primary">Your Indication</h1>
              <p className="text-muted-foreground">
                {deal.dealName} • {deal.instrument} • Target: ${(deal.targetSize / 1000000).toFixed(0)}M
              </p>
            </div>

            {/* Indication Status Card */}
            <Card className="border-green-200 bg-green-50/50">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-6 w-6 text-green-600" />
                    <div>
                      <CardTitle className="text-green-800">
                        {existingIndication?.termsJson?.isFirm ? "Firm Commitment" : "Indication (IOI)"} Submitted
                      </CardTitle>
                      <CardDescription className="text-green-700/70">
                        {existingIndication?.status === "updated" ? "Last updated" : "Submitted"}{" "}
                        {existingIndication?.updatedAt && format(parseISO(existingIndication.updatedAt), "MMM d, yyyy 'at' h:mm a")}
                      </CardDescription>
                    </div>
                  </div>
                  <Badge variant={existingIndication?.termsJson?.isFirm ? "default" : "outline"} className="text-base px-4 py-1">
                    ${(parseFloat(existingIndication?.ioiAmount || "0") / 1000000).toFixed(1)}M
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Type</span>
                    <p className="font-medium">{existingIndication?.termsJson?.isFirm ? "Firm Commitment" : "Indicative / Soft Circle"}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Currency</span>
                    <p className="font-medium">{existingIndication?.currency || "USD"}</p>
                  </div>
                  {existingIndication?.termsJson?.spreadBps && (
                    <div>
                      <span className="text-muted-foreground">Spread (bps)</span>
                      <p className="font-medium">{existingIndication.termsJson.spreadBps}</p>
                    </div>
                  )}
                  {existingIndication?.termsJson?.oid && (
                    <div>
                      <span className="text-muted-foreground">OID</span>
                      <p className="font-medium">{existingIndication.termsJson.oid}%</p>
                    </div>
                  )}
                </div>
                {existingIndication?.termsJson?.conditions && (
                  <div>
                    <span className="text-sm text-muted-foreground">Conditions / Comments</span>
                    <p className="text-sm mt-1 p-3 bg-white rounded border">{existingIndication.termsJson.conditions}</p>
                  </div>
                )}
              </CardContent>
              <CardFooter className="flex gap-3 border-t pt-6">
                <Button onClick={() => setShowUpdateForm(true)} className="gap-2">
                  <FileText className="h-4 w-4" /> Update Indication
                </Button>
                <Button
                  variant="outline"
                  onClick={() => withdrawMutation.mutate()}
                  disabled={withdrawMutation.isPending}
                  className="gap-2 text-destructive hover:text-destructive"
                >
                  <XCircle className="h-4 w-4" />
                  {withdrawMutation.isPending ? "Withdrawing..." : "Withdraw"}
                </Button>
              </CardFooter>
            </Card>

            {/* Sidebar */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-2" />
              <Card className="bg-secondary/20 border-border/60">
                <CardHeader>
                  <CardTitle className="text-base">Deal Terms Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Pricing</span>
                    <span className="font-medium">{deal.pricing.benchmark} + {deal.pricing.spreadLowBps}-{deal.pricing.spreadHighBps}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">OID Guidance</span>
                    <span className="font-medium">{deal.pricing.oid}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Upfront Fee</span>
                    <span className="font-medium">{deal.pricing.feesPct}%</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        );
      }

      return (
        <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-500">
        <div className="mb-6">
          <Button variant="ghost" className="pl-0 gap-2 mb-2" onClick={() => hasActiveIndication ? setShowUpdateForm(false) : setLocation(`/deal/${dealId}/overview`)}>
            <ArrowLeft className="h-4 w-4" /> {hasActiveIndication ? "Back to Indication" : "Back to Deal"}
          </Button>
          <h1 className="text-2xl font-semibold text-primary">{hasActiveIndication ? "Update Indication" : "Submit Indication"}</h1>
          <p className="text-muted-foreground">
            {deal.dealName} • {deal.instrument} • Target: ${(deal.targetSize / 1000000).toFixed(0)}M
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Main Form */}
          <Card className="md:col-span-2 border-border/60 shadow-sm">
            <CardHeader>
              <CardTitle>Commitment Details</CardTitle>
              <CardDescription>{hasActiveIndication ? "Update your ticket size and conditions." : "Enter your ticket size and conditions."}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Response Type</Label>
                  <Select value={ticketType} onValueChange={setTicketType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="indicative">Indicative / Soft Circle</SelectItem>
                      <SelectItem value="firm">Firm Commitment</SelectItem>
                      <SelectItem value="decline">Decline Commitment</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {!isDecline && (
                  <div className="space-y-2">
                    <Label>Currency</Label>
                    <Input value={deal.currency} disabled />
                  </div>
                )}
              </div>

              {!isDecline && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <Label className="text-base">Commitment Amount</Label>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">$</span>
                      <Input
                        type="number"
                        value={amount / 1000000}
                        onChange={(e) => {
                          const value = parseFloat(e.target.value) || 0;
                          setAmount(Math.min(50000000, Math.max(1000000, value * 1000000)));
                        }}
                        className="w-24 text-right font-bold text-lg"
                        min={1}
                        max={50}
                        step={0.5}
                      />
                      <span className="text-muted-foreground font-medium">M</span>
                    </div>
                  </div>
                  <Slider
                    value={[amount]}
                    min={1000000}
                    max={50000000}
                    step={500000}
                    onValueChange={(v) => setAmount(v[0])}
                    className="py-4"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>$1.0M</span>
                    <span>$25.0M</span>
                    <span>$50.0M</span>
                  </div>
                  {/* Quick preset buttons */}
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant={amount === 5000000 ? "default" : "outline"}
                      size="sm"
                      onClick={() => setAmount(5000000)}
                    >
                      $5M
                    </Button>
                    <Button
                      type="button"
                      variant={amount === 10000000 ? "default" : "outline"}
                      size="sm"
                      onClick={() => setAmount(10000000)}
                    >
                      $10M
                    </Button>
                    <Button
                      type="button"
                      variant={amount === 25000000 ? "default" : "outline"}
                      size="sm"
                      onClick={() => setAmount(25000000)}
                    >
                      $25M
                    </Button>
                    <Button
                      type="button"
                      variant={amount === 50000000 ? "default" : "outline"}
                      size="sm"
                      onClick={() => setAmount(50000000)}
                    >
                      $50M
                    </Button>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label>{isDecline ? "Reason for Declining (Optional)" : "Conditions / Subjectivities / Highlights"}</Label>
                <Textarea
                  placeholder={isDecline
                    ? "e.g. Pricing outside mandate, sector allocation full, timing constraints..."
                    : "e.g. Subject to final IC approval, legal review of definitions..."
                  }
                  className="min-h-[100px]"
                  value={conditions}
                  onChange={(e) => setConditions(e.target.value)}
                />
              </div>

              {!isDecline && (
                <div className="space-y-2">
                  <Label>Supporting Documentation</Label>
                  <div className="border-2 border-dashed border-border rounded-lg p-6 flex flex-col items-center justify-center text-center hover:bg-secondary/20 transition-colors cursor-pointer" onClick={handleFileUpload}>
                    <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                    <p className="text-sm font-medium">Click to upload files</p>
                    <p className="text-xs text-muted-foreground">Internal memos, KYC forms, etc.</p>
                  </div>
                  {files.length > 0 && (
                    <div className="space-y-2 mt-2">
                      {files.map((file, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-sm bg-secondary/30 p-2 rounded">
                          <FileText className="h-4 w-4 text-primary" />
                          <span className="flex-1">{file}</span>
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

            </CardContent>
            <CardFooter className="flex justify-between border-t p-6">
              <div className="text-sm text-muted-foreground">
                <span className="font-semibold">Investor:</span> {user.name}
                {user.lenderId && <span className="ml-1">({user.lenderId})</span>}
              </div>
              <Button onClick={handleSubmit} disabled={isSubmitting} className="min-w-[150px]">
                {isSubmitting
                  ? (hasActiveIndication ? "Updating..." : "Submitting...")
                  : isDecline
                    ? "Withdraw Indication"
                    : hasActiveIndication
                      ? (ticketType === "firm" ? "Update Firm Commitment" : "Update Indication")
                      : (ticketType === "firm" ? "Submit Firm Commitment" : "Submit Indication (IOI)")}
              </Button>
            </CardFooter>
          </Card>

          {/* Sidebar Summary */}
          <div className="space-y-6">
            <Card className="bg-secondary/20 border-border/60">
              <CardHeader>
                <CardTitle className="text-base">Deal Terms Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <div className="flex justify-between">
                   <span className="text-muted-foreground">Pricing</span>
                   <span className="font-medium">{deal.pricing.benchmark} + {deal.pricing.spreadLowBps}-{deal.pricing.spreadHighBps}</span>
                </div>
                <div className="flex justify-between">
                   <span className="text-muted-foreground">OID Guidance</span>
                   <span className="font-medium">{deal.pricing.oid}</span>
                </div>
                <div className="flex justify-between">
                   <span className="text-muted-foreground">Upfront Fee</span>
                   <span className="font-medium">{deal.pricing.feesPct}%</span>
                </div>
                <div className="flex justify-between">
                   <span className="text-muted-foreground">Maturity</span>
                   <span className="font-medium">5 Years</span>
                </div>
                <Separator />
                <div className="flex justify-between items-center pt-2">
                   <span className="text-muted-foreground">Est. Yield</span>
                   <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">~11.5%</Badge>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/60">
              <CardHeader>
                 <CardTitle className="text-base flex items-center gap-2">
                   <AlertCircle className="h-4 w-4 text-amber-500" /> Submission Rules
                 </CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground space-y-2">
                <p>• Allocations are at the sole discretion of the Bookrunner.</p>
                <p>• Firm commitments are binding subject only to documentation.</p>
                <p>• Please attach all standard KYC documentation if not already on file.</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      );
  }

  return (
    <Layout>
        <NDAGate dealId={dealId} title="Commitment Portal Access">
            <PageContent />
        </NDAGate>
    </Layout>
  );
}
