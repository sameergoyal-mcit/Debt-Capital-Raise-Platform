import React, { useState } from "react";
import { Link, useRoute, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  FileText,
  Scale,
  Clock,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Upload,
  Eye,
  Users,
  ShieldAlert,
} from "lucide-react";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useAuth } from "@/context/auth-context";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface MasterDocWithStats {
  id: string;
  dealId: string;
  docKey: string;
  title: string;
  currentVersionId: string | null;
  createdAt: string;
  updatedAt: string;
  versionCount: number;
  currentVersionNumber: number;
  markupCounts: {
    total: number;
    uploaded: number;
    reviewing: number;
    incorporated: number;
    rejected: number;
  };
}

// Counsel banner component
function CounselBanner({ lenderName }: { lenderName: string }) {
  return (
    <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-6">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
          <Scale className="h-5 w-5 text-purple-700" />
        </div>
        <div>
          <div className="font-medium text-purple-900">Acting on behalf of: {lenderName}</div>
          <div className="text-sm text-purple-700">
            You can upload legal markups and view documents shared with your firm.
          </div>
        </div>
      </div>
    </div>
  );
}

// Restricted access component
function RestrictedAccess() {
  return (
    <Layout>
      <div className="flex items-center justify-center h-[60vh]">
        <Card className="max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-red-100 flex items-center justify-center">
              <ShieldAlert className="h-6 w-6 text-red-600" />
            </div>
            <CardTitle className="text-destructive">Restricted Access</CardTitle>
            <CardDescription>
              Legal negotiation materials are managed by the issuer, bookrunner, and counsel.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    </Layout>
  );
}

// Document empty state descriptions
const emptyStateDescriptions: Record<string, string> = {
  financing_grid: "Upload the initial Financing Grid to begin lender review and markup collection.",
  term_sheet: "Upload the working Term Sheet to enable lender and counsel markups.",
  credit_agreement: "Upload the initial draft to start legal review and redline tracking.",
};

const uploadButtonLabels: Record<string, string> = {
  financing_grid: "Upload Financing Grid",
  term_sheet: "Upload Term Sheet",
  credit_agreement: "Upload Credit Agreement",
};

export default function LegalNegotiation() {
  const [, params] = useRoute("/deal/:id/legal/negotiation");
  const dealId = params?.id || "101";
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [uploadDocKey, setUploadDocKey] = useState<string | null>(null);

  const userRole = user?.role?.toLowerCase();
  const isInternal = userRole === "bookrunner" || userRole === "issuer";
  const isCounsel = userRole === "lender_counsel" || userRole === "counsel";
  const isLenderStandard = userRole === "lender" || userRole === "investor";

  // Restrict access for standard lenders
  if (isLenderStandard) {
    return <RestrictedAccess />;
  }

  // Fetch master docs with stats
  const { data: masterDocs, isLoading } = useQuery<MasterDocWithStats[]>({
    queryKey: ["master-docs", dealId],
    queryFn: async () => {
      const res = await fetch(`/api/deals/${dealId}/master-docs`, {
        credentials: "include",
      });
      if (!res.ok) {
        return getMockDocs();
      }
      return res.json();
    },
  });

  // Ensure master docs exist on load
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

  // Upload version mutation
  const uploadVersionMutation = useMutation({
    mutationFn: async (data: { docKey: string; filePath: string; changeSummary?: string }) => {
      const res = await fetch(
        `/api/deals/${dealId}/master-docs/${data.docKey}/versions`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ filePath: data.filePath, changeSummary: data.changeSummary }),
        }
      );
      if (!res.ok) throw new Error("Failed to upload");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["master-docs", dealId] });
      toast({ title: "Document uploaded successfully" });
      setUploadDocKey(null);
    },
    onError: () => {
      toast({ title: "Failed to upload document", variant: "destructive" });
    },
  });

  const docs = masterDocs || getMockDocs();

  // Calculate overall stats
  const totalMarkups = docs.reduce((sum, d) => sum + d.markupCounts.total, 0);
  const pendingMarkups = docs.reduce(
    (sum, d) => sum + d.markupCounts.uploaded + d.markupCounts.reviewing,
    0
  );
  const incorporatedMarkups = docs.reduce(
    (sum, d) => sum + d.markupCounts.incorporated,
    0
  );

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">Loading legal documents...</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6 animate-in fade-in duration-500">
        {/* Counsel Banner */}
        {isCounsel && <CounselBanner lenderName={user?.lenderId ? "Your Firm" : "Unknown"} />}

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <Link href={`/deal/${dealId}/overview`} className="hover:text-primary">
                Deal Overview
              </Link>
              <span>/</span>
              <span>Legal Workspace</span>
            </div>
            <h1 className="text-2xl font-semibold text-primary tracking-tight flex items-center gap-2">
              <Scale className="h-6 w-6" />
              Legal Workspace
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage master documents, lender markups, and incorporated changes across the syndicate.
            </p>
          </div>
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => navigate(`/deal/${dealId}/execution/lenders`)}
          >
            <Eye className="h-4 w-4" /> Lender Progress
          </Button>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Master Documents
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{docs.length}</div>
              <div className="text-xs text-muted-foreground mt-1">
                Active legal documents
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Markups
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalMarkups}</div>
              <div className="text-xs text-muted-foreground mt-1">
                From all lenders
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Pending Review
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-600">
                {pendingMarkups}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                Awaiting action
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Incorporated
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {incorporatedMarkups}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                Changes accepted
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Document Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {docs.map((doc) => (
            <DocumentCard
              key={doc.docKey}
              doc={doc}
              dealId={dealId}
              isInternal={isInternal}
              onOpen={() => navigate(`/deal/${dealId}/legal/docs/${doc.docKey}`)}
              onUpload={() => setUploadDocKey(doc.docKey)}
            />
          ))}
        </div>

        {/* Quick Actions */}
        <Card className="border-dashed">
          <CardContent className="py-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium">Need to review lender feedback?</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Open the Lender Progress view to see all lender activity
                </p>
              </div>
              <Button
                variant="outline"
                className="gap-2"
                onClick={() => navigate(`/deal/${dealId}/execution/lenders`)}
              >
                View Lender Progress <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Upload Dialog */}
        <UploadMasterDialog
          open={!!uploadDocKey}
          docKey={uploadDocKey || ""}
          onClose={() => setUploadDocKey(null)}
          onUpload={(data) => uploadVersionMutation.mutate({ docKey: uploadDocKey!, ...data })}
          isLoading={uploadVersionMutation.isPending}
        />
      </div>
    </Layout>
  );
}

function DocumentCard({
  doc,
  dealId,
  isInternal,
  onOpen,
  onUpload,
}: {
  doc: MasterDocWithStats;
  dealId: string;
  isInternal: boolean;
  onOpen: () => void;
  onUpload: () => void;
}) {
  const { markupCounts, versionCount, currentVersionNumber } = doc;
  const pendingCount = markupCounts.uploaded + markupCounts.reviewing;
  const hasPending = pendingCount > 0;
  const hasNoMaster = versionCount === 0;
  const hasNoMarkups = markupCounts.total === 0 && versionCount > 0;
  const progressPercent =
    markupCounts.total > 0
      ? Math.round((markupCounts.incorporated / markupCounts.total) * 100)
      : 0;

  const docIcons: Record<string, React.ReactNode> = {
    financing_grid: <FileText className="h-5 w-5" />,
    term_sheet: <FileText className="h-5 w-5" />,
    credit_agreement: <Scale className="h-5 w-5" />,
  };

  // Empty state - no master uploaded
  if (hasNoMaster) {
    return (
      <Card className="border-dashed border-2">
        <CardContent className="py-8 text-center">
          <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-secondary/50 flex items-center justify-center">
            {docIcons[doc.docKey] || <FileText className="h-6 w-6 text-muted-foreground/50" />}
          </div>
          <h3 className="font-semibold text-foreground mb-2">No {doc.title} uploaded</h3>
          <p className="text-sm text-muted-foreground mb-6 max-w-xs mx-auto">
            {emptyStateDescriptions[doc.docKey]}
          </p>
          {isInternal && (
            <Button className="gap-2" onClick={onUpload}>
              <Upload className="h-4 w-4" /> {uploadButtonLabels[doc.docKey]}
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  // State - master exists but no lender markups
  if (hasNoMarkups) {
    return (
      <Card
        className="cursor-pointer transition-all hover:shadow-md hover:border-primary/50"
        onClick={onOpen}
      >
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg flex items-center justify-center bg-primary/10 text-primary">
                {docIcons[doc.docKey] || <FileText className="h-5 w-5" />}
              </div>
              <div>
                <CardTitle className="text-lg">{doc.title}</CardTitle>
                <CardDescription>
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3 text-green-600" />
                    Version {currentVersionNumber}
                  </span>
                </CardDescription>
              </div>
            </div>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge
                    variant="outline"
                    className="bg-slate-100 text-slate-600 border-slate-200 gap-1"
                  >
                    <Clock className="h-3 w-3" />
                    Awaiting Markups
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  Markups from lender counsel will appear here once uploaded.
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center py-4 text-muted-foreground">
            <p className="font-medium">No lender markups received yet</p>
            <p className="text-sm mt-1">
              Markups from lender counsel will appear here once uploaded.
            </p>
          </div>
          <Button variant="outline" className="w-full gap-2" onClick={onOpen}>
            Open Workspace <ArrowRight className="h-4 w-4" />
          </Button>
        </CardContent>
      </Card>
    );
  }

  // State - markups exist
  return (
    <Card
      className={cn(
        "cursor-pointer transition-all hover:shadow-md hover:border-primary/50",
        hasPending && "border-amber-200 bg-amber-50/30"
      )}
      onClick={onOpen}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "h-10 w-10 rounded-lg flex items-center justify-center",
                hasPending
                  ? "bg-amber-100 text-amber-700"
                  : "bg-primary/10 text-primary"
              )}
            >
              {docIcons[doc.docKey] || <FileText className="h-5 w-5" />}
            </div>
            <div>
              <CardTitle className="text-lg">{doc.title}</CardTitle>
              <CardDescription>
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3 text-green-600" />
                  Version {currentVersionNumber}
                </span>
              </CardDescription>
            </div>
          </div>
          {hasPending && (
            <Badge
              variant="outline"
              className="bg-amber-100 text-amber-700 border-amber-200 gap-1"
            >
              <AlertCircle className="h-3 w-3" />
              {pendingCount} Pending
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Markup Stats */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <div className="text-lg font-bold">{markupCounts.total}</div>
            <div className="text-xs text-muted-foreground">Markups Received</div>
          </div>
          <div>
            <div className="text-lg font-bold text-green-600">
              {markupCounts.incorporated}
            </div>
            <div className="text-xs text-muted-foreground">Incorporated</div>
          </div>
          <div>
            <div className="text-lg font-bold text-amber-600">
              {pendingCount}
            </div>
            <div className="text-xs text-muted-foreground">Pending Review</div>
          </div>
        </div>

        {/* Progress Bar */}
        {markupCounts.total > 0 && (
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Review Progress</span>
              <span className="font-medium">{progressPercent}%</span>
            </div>
            <Progress value={progressPercent} className="h-2" />
          </div>
        )}

        {/* Action Button */}
        <Button variant="outline" className="w-full gap-2" onClick={onOpen}>
          Open Workspace <ArrowRight className="h-4 w-4" />
        </Button>
      </CardContent>
    </Card>
  );
}

function UploadMasterDialog({
  open,
  docKey,
  onClose,
  onUpload,
  isLoading,
}: {
  open: boolean;
  docKey: string;
  onClose: () => void;
  onUpload: (data: { filePath: string; changeSummary?: string }) => void;
  isLoading: boolean;
}) {
  const [filePath, setFilePath] = useState("");
  const [changeSummary, setChangeSummary] = useState("");

  const titles: Record<string, string> = {
    financing_grid: "Financing Grid",
    term_sheet: "Term Sheet",
    credit_agreement: "Credit Agreement",
  };

  const handleSubmit = () => {
    if (!filePath) return;
    onUpload({ filePath, changeSummary: changeSummary || undefined });
    setFilePath("");
    setChangeSummary("");
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Upload {titles[docKey] || "Document"}</DialogTitle>
          <DialogDescription>
            Upload the master version of this document to begin collecting lender feedback.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>File Path / URL</Label>
            <Input
              placeholder="Enter file path or URL"
              value={filePath}
              onChange={(e) => setFilePath(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Change Summary (optional)</Label>
            <Textarea
              placeholder="Describe this version..."
              value={changeSummary}
              onChange={(e) => setChangeSummary(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!filePath || isLoading}>
            {isLoading ? "Uploading..." : "Upload"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function getMockDocs(): MasterDocWithStats[] {
  return [
    {
      id: "md1",
      dealId: "101",
      docKey: "financing_grid",
      title: "Financing Grid",
      currentVersionId: "v1",
      createdAt: "2024-01-10T00:00:00Z",
      updatedAt: "2024-01-20T00:00:00Z",
      versionCount: 2,
      currentVersionNumber: 2,
      markupCounts: {
        total: 5,
        uploaded: 2,
        reviewing: 1,
        incorporated: 1,
        rejected: 1,
      },
    },
    {
      id: "md2",
      dealId: "101",
      docKey: "term_sheet",
      title: "Term Sheet",
      currentVersionId: "v2",
      createdAt: "2024-01-10T00:00:00Z",
      updatedAt: "2024-01-18T00:00:00Z",
      versionCount: 3,
      currentVersionNumber: 3,
      markupCounts: {
        total: 0,
        uploaded: 0,
        reviewing: 0,
        incorporated: 0,
        rejected: 0,
      },
    },
    {
      id: "md3",
      dealId: "101",
      docKey: "credit_agreement",
      title: "Credit Agreement",
      currentVersionId: null,
      createdAt: "2024-01-10T00:00:00Z",
      updatedAt: "2024-01-10T00:00:00Z",
      versionCount: 0,
      currentVersionNumber: 0,
      markupCounts: {
        total: 0,
        uploaded: 0,
        reviewing: 0,
        incorporated: 0,
        rejected: 0,
      },
    },
  ];
}
