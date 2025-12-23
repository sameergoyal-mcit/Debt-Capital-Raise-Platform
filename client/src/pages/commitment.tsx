import React, { useState } from "react";
import { useRoute, useLocation } from "wouter";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Upload, FileText, CheckCircle2, DollarSign, AlertCircle, ArrowLeft } from "lucide-react";
import { mockDeals } from "@/data/deals";
import { useAuth } from "@/context/auth-context";

export default function SubmitCommitment() {
  const [, params] = useRoute("/deal/:id/commitment");
  const dealId = params?.id || "101";
  const deal = mockDeals.find(d => d.id === dealId) || mockDeals[0];
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const [amount, setAmount] = useState<number>(10000000); // 10M default
  const [ticketType, setTicketType] = useState<string>("indicative");
  const [conditions, setConditions] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [files, setFiles] = useState<string[]>([]);

  const handleSubmit = () => {
    setIsSubmitting(true);
    
    // Simulate API call
    setTimeout(() => {
      setIsSubmitting(false);
      toast({
        title: "Commitment Submitted",
        description: `Your ${ticketType} commitment of $${(amount / 1000000).toFixed(1)}M has been recorded.`,
      });
      setLocation(`/deal/${dealId}/overview`);
    }, 1500);
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

  if (!user || user.role !== "Investor") {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center h-[60vh] text-center">
          <AlertCircle className="h-12 w-12 text-destructive mb-4" />
          <h2 className="text-xl font-bold">Access Denied</h2>
          <p className="text-muted-foreground mt-2">Only accredited investors can submit commitments.</p>
          <Button className="mt-6" onClick={() => setLocation(`/deal/${dealId}/overview`)}>
            Return to Overview
          </Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-500">
        <div className="mb-6">
          <Button variant="ghost" className="pl-0 gap-2 mb-2" onClick={() => setLocation(`/deal/${dealId}/overview`)}>
            <ArrowLeft className="h-4 w-4" /> Back to Deal
          </Button>
          <h1 className="text-3xl font-serif font-bold text-primary">Submit Commitment</h1>
          <p className="text-muted-foreground">
            {deal.dealName} • {deal.instrument} • Target: ${(deal.targetSize / 1000000).toFixed(0)}M
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Main Form */}
          <Card className="md:col-span-2 border-border/60 shadow-sm">
            <CardHeader>
              <CardTitle>Commitment Details</CardTitle>
              <CardDescription>Enter your ticket size and conditions.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              
              <div className="space-y-4">
                <div className="flex justify-between">
                  <Label className="text-base">Commitment Amount</Label>
                  <span className="text-2xl font-bold font-serif text-primary">
                    ${(amount / 1000000).toFixed(1)}M
                  </span>
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
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Commitment Type</Label>
                  <Select value={ticketType} onValueChange={setTicketType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="indicative">Indicative / Soft Circle</SelectItem>
                      <SelectItem value="firm">Firm Commitment</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Currency</Label>
                  <Input value={deal.currency} disabled />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Conditions / Subjectivities</Label>
                <Textarea 
                  placeholder="e.g. Subject to final IC approval, legal review of definitions..." 
                  className="min-h-[100px]"
                  value={conditions}
                  onChange={(e) => setConditions(e.target.value)}
                />
              </div>

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

            </CardContent>
            <CardFooter className="flex justify-between border-t p-6">
              <div className="text-sm text-muted-foreground">
                <span className="font-semibold">Investor:</span> {user.name}
                {user.lenderId && <span className="ml-1">({user.lenderId})</span>}
              </div>
              <Button onClick={handleSubmit} disabled={isSubmitting} className="min-w-[150px]">
                {isSubmitting ? "Submitting..." : ticketType === "firm" ? "Submit Firm Bid" : "Submit Indication"}
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
    </Layout>
  );
}
