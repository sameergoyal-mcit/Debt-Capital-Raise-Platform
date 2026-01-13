import React, { useState } from "react";
import { Link, useRoute, useLocation, useSearch } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  FileText,
  Scale,
  Clock,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Download,
  Upload,
  ArrowLeft,
  ChevronRight,
  Eye,
  MessageSquare,
  ShieldAlert,
} from "lucide-react";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/auth-context";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface DocumentVersion {
  id: string;
  masterDocId: string;
  versionNumber: number;
  filePath: string;
  mimeType: string | null;
  uploadedBy: string | null;
  changeSummary: string | null;
  createdAt: string;
}

interface LenderMarkup {
  id: string;
  masterDocId: string;
  lenderId: string;
  filePath: string;
  mimeType: string | null;
  uploadedByUserId: string | null;
  status: "uploaded" | "reviewing" | "incorporated" | "rejected";
  incorporatedVersionId: string | null;
  incorporatedVersionNumber?: number;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  lender?: {
    id: string;
    firstName: string;
    lastName: string;
    organization: string;
  };
}

interface MasterDocDetail {
  id: string;
  dealId: string;
  docKey: string;
  title: string;
  currentVersionId: string | null;
  createdAt: string;
  updatedAt: string;
  versions: DocumentVersion[];
  markups: LenderMarkup[];
}

const docTitles: Record<string, string> = {
  financing_grid: "Financing Grid",
  term_sheet: "Term Sheet",
  credit_agreement: "Credit Agreement",
};

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

// Restricted access component for standard lenders
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

// Restricted access for viewing other lender's markups
function OtherLenderAccessRestricted() {
  return (
    <Layout>
      <div className="flex items-center justify-center h-[60vh]">
        <Card className="max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-red-100 flex items-center justify-center">
              <ShieldAlert className="h-6 w-6 text-red-600" />
            </div>
            <CardTitle className="text-destructive">Access Restricted</CardTitle>
            <CardDescription>
              You can only view and manage documents submitted on behalf of your firm.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    </Layout>
  );
}

export default function LegalDocWorkspace() {
  const [, params] = useRoute("/deal/:id/legal/docs/:docKey");
  const dealId = params?.id || "101";
  const docKey = params?.docKey || "financing_grid";
  const searchString = useSearch();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Parse lender filter from URL
  const urlParams = new URLSearchParams(searchString);
  const lenderFilter = urlParams.get("lender");

  const [uploadVersionOpen, setUploadVersionOpen] = useState(false);
  const [uploadMarkupOpen, setUploadMarkupOpen] = useState(false);
  const [reviewMarkupId, setReviewMarkupId] = useState<string | null>(null);
  const [selectedMarkup, setSelectedMarkup] = useState<LenderMarkup | null>(null);

  const userRole = user?.role?.toLowerCase();
  const isInternal = ["bookrunner", "issuer", "sponsor"].includes(userRole || "");
  const isCounsel = userRole === "lender_counsel" || userRole === "counsel";
  const isLenderStandard = userRole === "lender" || userRole === "investor";

  // Restrict access for standard lenders
  if (isLenderStandard) {
    return <RestrictedAccess />;
  }

  // Fetch master doc with versions and markups
  const { data: masterDoc, isLoading } = useQuery<MasterDocDetail>({
    queryKey: ["master-doc", dealId, docKey],
    queryFn: async () => {
      const res = await fetch(`/api/deals/${dealId}/master-docs/${docKey}`, {
        credentials: "include",
      });
      if (!res.ok) {
        return getMockDoc(docKey);
      }
      return res.json();
    },
  });

  // Upload version mutation
  const uploadVersionMutation = useMutation({
    mutationFn: async (data: { filePath: string; changeSummary?: string }) => {
      const res = await fetch(
        `/api/deals/${dealId}/master-docs/${docKey}/versions`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(data),
        }
      );
      if (!res.ok) throw new Error("Failed to upload version");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["master-doc", dealId, docKey] });
      toast({ title: "Version uploaded successfully" });
      setUploadVersionOpen(false);
    },
    onError: () => {
      toast({ title: "Failed to upload version", variant: "destructive" });
    },
  });

  // Upload markup mutation (for lenders/counsel)
  const uploadMarkupMutation = useMutation({
    mutationFn: async (data: { filePath: string; notes?: string }) => {
      const res = await fetch(
        `/api/deals/${dealId}/master-docs/${docKey}/markups`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(data),
        }
      );
      if (!res.ok) throw new Error("Failed to upload markup");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["master-doc", dealId, docKey] });
      toast({ title: "Markup uploaded successfully" });
      setUploadMarkupOpen(false);
    },
    onError: () => {
      toast({ title: "Failed to upload markup", variant: "destructive" });
    },
  });

  // Review markup mutation
  const reviewMarkupMutation = useMutation({
    mutationFn: async (data: { markupId: string; status: string; notes?: string; incorporatedVersionId?: string }) => {
      const res = await fetch(`/api/markups/${data.markupId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          status: data.status,
          notes: data.notes,
          incorporatedVersionId: data.incorporatedVersionId
        }),
      });
      if (!res.ok) throw new Error("Failed to update markup");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["master-doc", dealId, docKey] });
      toast({ title: "Markup updated successfully" });
      setReviewMarkupId(null);
      setSelectedMarkup(null);
    },
    onError: () => {
      toast({ title: "Failed to update markup", variant: "destructive" });
    },
  });

  const doc = masterDoc || getMockDoc(docKey);
  const title = docTitles[docKey] || docKey;

  // Filter markups for counsel - only show their own
  let filteredMarkups = doc.markups;
  if (isCounsel && user?.lenderId) {
    filteredMarkups = doc.markups.filter((m) => m.lenderId === user.lenderId);
  } else if (lenderFilter) {
    filteredMarkups = doc.markups.filter((m) => m.lenderId === lenderFilter);
  }

  // Check if counsel is trying to view another lender's markup
  if (isCounsel && lenderFilter && lenderFilter !== user?.lenderId) {
    return <OtherLenderAccessRestricted />;
  }

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">Loading document...</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6 animate-in fade-in duration-500">
        {/* Counsel Banner */}
        {isCounsel && <CounselBanner lenderName={user?.lenderId ? "Your Firm" : "Unknown"} />}

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <Link
                href={`/deal/${dealId}/legal/negotiation`}
                className="hover:text-primary flex items-center gap-1"
              >
                <ArrowLeft className="h-3 w-3" /> Legal Workspace
              </Link>
              <ChevronRight className="h-3 w-3" />
              <span>{title}</span>
            </div>
            <h1 className="text-2xl font-semibold text-primary tracking-tight flex items-center gap-2">
              <Scale className="h-6 w-6" />
              {title} — Legal Workspace
            </h1>
            <p className="text-muted-foreground mt-1">
              Master versions and lender markups for this document.
            </p>
          </div>
          <div className="flex gap-2">
            {isInternal && (
              <Button
                className="gap-2"
                onClick={() => setUploadVersionOpen(true)}
              >
                <Upload className="h-4 w-4" /> Upload New Version
              </Button>
            )}
            {isCounsel && (
              <Button
                className="gap-2"
                onClick={() => setUploadMarkupOpen(true)}
              >
                <Upload className="h-4 w-4" /> Upload Markup
              </Button>
            )}
          </div>
        </div>

        {/* Lender Filter Notice */}
        {lenderFilter && (
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="py-3 flex items-center justify-between">
              <span className="text-sm text-blue-700">
                Showing markups from a specific lender
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate(`/deal/${dealId}/legal/docs/${docKey}`)}
              >
                Clear Filter
              </Button>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Master Versions */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Master Versions
              </CardTitle>
              <CardDescription>
                Master document versions uploaded by the deal team
              </CardDescription>
            </CardHeader>
            <CardContent>
              {doc.versions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <h4 className="font-medium text-foreground mb-2">No master versions uploaded</h4>
                  <p className="text-sm mb-4">Upload the first version to begin collecting lender feedback.</p>
                  {isInternal && (
                    <Button
                      variant="outline"
                      className="gap-2"
                      onClick={() => setUploadVersionOpen(true)}
                    >
                      <Upload className="h-4 w-4" /> Upload Master Version
                    </Button>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {doc.versions.map((version, idx) => (
                    <div
                      key={version.id}
                      className={cn(
                        "p-3 rounded-lg border",
                        idx === 0
                          ? "bg-primary/5 border-primary/30"
                          : "bg-secondary/30"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={idx === 0 ? "default" : "secondary"}
                            className="font-mono"
                          >
                            v{version.versionNumber}
                          </Badge>
                          {idx === 0 && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Badge
                                    variant="outline"
                                    className="bg-green-50 text-green-700 border-green-200"
                                  >
                                    Current Version
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent>
                                  This is the latest working version of the document.
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                        </div>
                        <Button variant="ghost" size="sm" className="gap-1">
                          <Download className="h-3.5 w-3.5" /> Download
                        </Button>
                      </div>
                      <div className="mt-2 text-sm font-medium">
                        {version.versionNumber === 1
                          ? "Version 1 — Initial Draft"
                          : `Version ${version.versionNumber} — Updated After Lender Review`}
                      </div>
                      <div className="mt-1 text-sm text-muted-foreground">
                        {version.changeSummary || "No change summary"}
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {format(new Date(version.createdAt), "MMM d, yyyy h:mm a")}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Main Column: Lender Markups */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Lender Markups
              </CardTitle>
              <CardDescription>
                Feedback and revisions from lender counsel
              </CardDescription>
            </CardHeader>
            <CardContent>
              {filteredMarkups.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  {isInternal ? (
                    <>
                      <h4 className="font-medium text-foreground mb-2">No markups received yet</h4>
                      <p className="text-sm">Markups from lender counsel will appear here once uploaded.</p>
                    </>
                  ) : isCounsel ? (
                    <>
                      <h4 className="font-medium text-foreground mb-2">No markup uploaded</h4>
                      <p className="text-sm mb-4">Upload your firm's markup for review by the issuer and bookrunner.</p>
                      <Button
                        variant="outline"
                        className="gap-2"
                        onClick={() => setUploadMarkupOpen(true)}
                      >
                        <Upload className="h-4 w-4" /> Upload Markup
                      </Button>
                    </>
                  ) : (
                    <>
                      <h4 className="font-medium text-foreground mb-2">No markups submitted yet</h4>
                      <p className="text-sm">Markups will appear here once uploaded.</p>
                    </>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredMarkups.map((markup) => (
                    <div
                      key={markup.id}
                      className={cn(
                        "p-3 rounded-lg border cursor-pointer transition-colors",
                        selectedMarkup?.id === markup.id
                          ? "border-primary bg-primary/5"
                          : "hover:bg-secondary/50"
                      )}
                      onClick={() => setSelectedMarkup(markup)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="font-medium text-sm">
                          {markup.lender?.organization || "Unknown Lender"}
                        </div>
                        <MarkupStatusBadge
                          status={markup.status}
                          incorporatedVersion={markup.incorporatedVersionNumber}
                        />
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        Submitted {format(new Date(markup.createdAt), "MMM d, yyyy")}
                      </div>
                      {markup.status === "incorporated" && markup.incorporatedVersionNumber && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="mt-2 text-xs text-green-700 flex items-center gap-1">
                                <CheckCircle2 className="h-3 w-3" />
                                Incorporated into Version {markup.incorporatedVersionNumber}
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              Changes from this markup were reflected in the specified master version.
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Right Panel: Review Actions */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Review Actions
              </CardTitle>
              <CardDescription>
                {isInternal ? "Review and process lender markups" : "View markup details"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!selectedMarkup ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Eye className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">Select a lender markup to review and take action.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="p-3 bg-secondary/30 rounded-lg">
                    <div className="text-sm font-medium">
                      {selectedMarkup.lender?.organization || "Unknown Lender"}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Submitted {format(new Date(selectedMarkup.createdAt), "MMM d, yyyy")}
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Current Status</span>
                    <MarkupStatusBadge
                      status={selectedMarkup.status}
                      incorporatedVersion={selectedMarkup.incorporatedVersionNumber}
                    />
                  </div>

                  <Button variant="outline" className="w-full gap-2">
                    <Download className="h-4 w-4" /> Download Markup
                  </Button>

                  {isInternal && selectedMarkup.status !== "incorporated" && selectedMarkup.status !== "rejected" && (
                    <>
                      <Separator />
                      <div className="space-y-2">
                        <Button
                          variant="outline"
                          className="w-full justify-start gap-2"
                          onClick={() => reviewMarkupMutation.mutate({
                            markupId: selectedMarkup.id,
                            status: "reviewing"
                          })}
                        >
                          <Eye className="h-4 w-4" /> Mark as Under Review
                        </Button>
                        <Button
                          variant="outline"
                          className="w-full justify-start gap-2 text-green-700 hover:text-green-700"
                          onClick={() => setReviewMarkupId(selectedMarkup.id)}
                        >
                          <CheckCircle2 className="h-4 w-4" /> Mark as Incorporated
                        </Button>
                        <Button
                          variant="outline"
                          className="w-full justify-start gap-2 text-red-600 hover:text-red-600"
                          onClick={() => reviewMarkupMutation.mutate({
                            markupId: selectedMarkup.id,
                            status: "rejected"
                          })}
                        >
                          <XCircle className="h-4 w-4" /> Mark as Not Incorporated
                        </Button>
                      </div>
                    </>
                  )}

                  {selectedMarkup.notes && (
                    <>
                      <Separator />
                      <div>
                        <Label className="text-xs text-muted-foreground">Internal Notes</Label>
                        <p className="text-sm mt-1">{selectedMarkup.notes}</p>
                      </div>
                    </>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Upload Version Dialog */}
        <UploadVersionDialog
          open={uploadVersionOpen}
          onClose={() => setUploadVersionOpen(false)}
          onUpload={(data) => uploadVersionMutation.mutate(data)}
          isLoading={uploadVersionMutation.isPending}
        />

        {/* Upload Markup Dialog */}
        <UploadMarkupDialog
          open={uploadMarkupOpen}
          onClose={() => setUploadMarkupOpen(false)}
          onUpload={(data) => uploadMarkupMutation.mutate(data)}
          isLoading={uploadMarkupMutation.isPending}
        />

        {/* Incorporate Markup Dialog */}
        {reviewMarkupId && selectedMarkup && (
          <IncorporateMarkupDialog
            markup={selectedMarkup}
            versions={doc.versions}
            open={!!reviewMarkupId}
            onClose={() => setReviewMarkupId(null)}
            onIncorporate={(data) =>
              reviewMarkupMutation.mutate({ markupId: reviewMarkupId, status: "incorporated", ...data })
            }
            isLoading={reviewMarkupMutation.isPending}
          />
        )}
      </div>
    </Layout>
  );
}

function MarkupStatusBadge({
  status,
  incorporatedVersion,
}: {
  status: "uploaded" | "reviewing" | "incorporated" | "rejected";
  incorporatedVersion?: number;
}) {
  const styles: Record<string, { className: string; icon: React.ReactNode; label: string }> = {
    uploaded: {
      className: "bg-amber-50 text-amber-700 border-amber-200",
      icon: <Clock className="h-3 w-3" />,
      label: "Uploaded",
    },
    reviewing: {
      className: "bg-blue-50 text-blue-700 border-blue-200",
      icon: <Eye className="h-3 w-3" />,
      label: "Under Review",
    },
    incorporated: {
      className: "bg-green-50 text-green-700 border-green-200",
      icon: <CheckCircle2 className="h-3 w-3" />,
      label: "Incorporated",
    },
    rejected: {
      className: "bg-red-50 text-red-600 border-red-200",
      icon: <XCircle className="h-3 w-3" />,
      label: "Not Incorporated",
    },
  };
  const style = styles[status];
  return (
    <Badge variant="outline" className={cn("gap-1", style.className)}>
      {style.icon}
      {style.label}
    </Badge>
  );
}

function UploadVersionDialog({
  open,
  onClose,
  onUpload,
  isLoading,
}: {
  open: boolean;
  onClose: () => void;
  onUpload: (data: { filePath: string; changeSummary?: string }) => void;
  isLoading: boolean;
}) {
  const [filePath, setFilePath] = useState("");
  const [changeSummary, setChangeSummary] = useState("");

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
          <DialogTitle>Upload New Version</DialogTitle>
          <DialogDescription>
            Upload a new version of the master document
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
            <Label>Change Summary</Label>
            <Textarea
              placeholder="Describe changes in this version..."
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
            {isLoading ? "Uploading..." : "Upload Version"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function UploadMarkupDialog({
  open,
  onClose,
  onUpload,
  isLoading,
}: {
  open: boolean;
  onClose: () => void;
  onUpload: (data: { filePath: string; notes?: string }) => void;
  isLoading: boolean;
}) {
  const [filePath, setFilePath] = useState("");
  const [notes, setNotes] = useState("");

  const handleSubmit = () => {
    if (!filePath) return;
    onUpload({ filePath, notes: notes || undefined });
    setFilePath("");
    setNotes("");
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Upload Markup</DialogTitle>
          <DialogDescription>
            Upload your firm's markup for review by the issuer and bookrunner.
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
            <Label>Notes (optional)</Label>
            <Textarea
              placeholder="Add any notes about your markup..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!filePath || isLoading}>
            {isLoading ? "Uploading..." : "Upload Markup"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function IncorporateMarkupDialog({
  markup,
  versions,
  open,
  onClose,
  onIncorporate,
  isLoading,
}: {
  markup: LenderMarkup;
  versions: DocumentVersion[];
  open: boolean;
  onClose: () => void;
  onIncorporate: (data: { incorporatedVersionId: string; notes?: string }) => void;
  isLoading: boolean;
}) {
  const [selectedVersionId, setSelectedVersionId] = useState(versions[0]?.id || "");
  const [notes, setNotes] = useState(markup.notes || "");

  const handleSubmit = () => {
    if (!selectedVersionId) return;
    onIncorporate({ incorporatedVersionId: selectedVersionId, notes: notes || undefined });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Mark as Incorporated</DialogTitle>
          <DialogDescription>
            Confirm that changes from this markup have been incorporated into a master version.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="p-3 bg-secondary/30 rounded-lg">
            <div className="text-sm font-medium">
              {markup.lender?.organization || "Unknown Lender"}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Submitted {format(new Date(markup.createdAt), "MMM d, yyyy")}
            </div>
          </div>
          <div className="space-y-2">
            <Label>Select the master version where these changes were incorporated</Label>
            <Select value={selectedVersionId} onValueChange={setSelectedVersionId}>
              <SelectTrigger>
                <SelectValue placeholder="Select version" />
              </SelectTrigger>
              <SelectContent>
                {versions.map((v) => (
                  <SelectItem key={v.id} value={v.id}>
                    Version {v.versionNumber} {v.versionNumber === versions[0].versionNumber ? "(Current)" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Select the master version where these changes were incorporated.
            </p>
          </div>
          <div className="space-y-2">
            <Label>Internal Notes</Label>
            <Textarea
              placeholder="Add internal notes for the deal team (not visible to lenders)."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!selectedVersionId || isLoading}>
            {isLoading ? "Saving..." : "Mark as Incorporated"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function getMockDoc(docKey: string): MasterDocDetail {
  return {
    id: "md1",
    dealId: "101",
    docKey,
    title: docTitles[docKey] || docKey,
    currentVersionId: "v1",
    createdAt: "2024-01-10T00:00:00Z",
    updatedAt: "2024-01-20T00:00:00Z",
    versions: [
      {
        id: "v2",
        masterDocId: "md1",
        versionNumber: 2,
        filePath: "/docs/term_sheet_v2.pdf",
        mimeType: "application/pdf",
        uploadedBy: "user1",
        changeSummary: "Updated pricing terms and covenants section",
        createdAt: "2024-01-20T00:00:00Z",
      },
      {
        id: "v1",
        masterDocId: "md1",
        versionNumber: 1,
        filePath: "/docs/term_sheet_v1.pdf",
        mimeType: "application/pdf",
        uploadedBy: "user1",
        changeSummary: "Initial version",
        createdAt: "2024-01-10T00:00:00Z",
      },
    ],
    markups: [
      {
        id: "m1",
        masterDocId: "md1",
        lenderId: "1",
        filePath: "/markups/blackrock_ts_v1.pdf",
        mimeType: "application/pdf",
        uploadedByUserId: "lu1",
        status: "uploaded",
        incorporatedVersionId: null,
        notes: "Minor changes to definitions section",
        createdAt: "2024-01-18T00:00:00Z",
        updatedAt: "2024-01-18T00:00:00Z",
        lender: {
          id: "1",
          firstName: "John",
          lastName: "Smith",
          organization: "BlackRock Capital",
        },
      },
      {
        id: "m2",
        masterDocId: "md1",
        lenderId: "2",
        filePath: "/markups/apollo_ts_v1.pdf",
        mimeType: "application/pdf",
        uploadedByUserId: "lu2",
        status: "incorporated",
        incorporatedVersionId: "v2",
        incorporatedVersionNumber: 2,
        notes: "Covenant language adjustments",
        createdAt: "2024-01-15T00:00:00Z",
        updatedAt: "2024-01-19T00:00:00Z",
        lender: {
          id: "2",
          firstName: "Sarah",
          lastName: "Johnson",
          organization: "Apollo Global",
        },
      },
    ],
  };
}
