import React, { useState, useEffect as useReactEffect } from "react";
import { useRoute, Link, useSearch, useLocation } from "wouter";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  FileText,
  AlertCircle,
  CheckCircle2,
  Clock,
  MessageSquare,
  Upload,
  Download,
  Filter,
  FolderOpen,
  Eye,
  FileUp,
  History,
  X,
  Shield
} from "lucide-react";
import { parseISO, formatDistanceToNow, format } from "date-fns";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/context/auth-context";
import { useToast } from "@/hooks/use-toast";
import { NDAGate } from "@/components/nda-gate";
import { useLenderInvitations } from "@/hooks/api-hooks";

// Document category type
type DocumentCategory = "Lender Presentation" | "Supplemental Information" | "Lender Paydown Model" | "KYC & Compliance" | "Legal" | "Prior Process Q&A";

// Extended Document interface for UI
interface Document {
  id: string;
  name: string;
  category: string;
  type: string;
  version: string;
  status: string;
  accessTier?: string;
  lastUpdatedAt: string;
  updatedBy?: string;
  fileKey?: string;
  changeSummary?: string;
  isNew?: boolean;
  isUpdated?: boolean;
  isAutomated?: boolean;
  owner?: string;
  openCommentsCount?: number;
  dealId?: string;
}

// Markup interface
interface Markup {
  id: string;
  documentId: string;
  lenderId: string;
  lenderName?: string;
  fileName: string;
  uploadedAt: string;
  uploadedBy?: string;
  status: string;
  notes?: string;
}
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

import { emailService } from "@/lib/email-service";
import { emailTemplates } from "@/lib/email-templates";
import { storageService } from "@/lib/storage-service";
import { downloadCSV, downloadPlaceholderDoc } from "@/lib/download";
import { UploadDocumentModal, UploadedDocument } from "@/components/upload-document-modal";
import { DocumentFilterPanel, DocumentFilters, defaultDocumentFilters } from "@/components/document-filter-panel";
import { DealSandbox } from "@/components/deal-sandbox";
import { useEffect } from "react";
import { DocumentVersionBadge, generateMockVersions, DocumentVersion } from "@/components/document-versions";

interface GranularAssumptions {
  ltmRevenue: number;
  ltmEbitda: number;
  revenueGrowth: number[];
  ebitdaMargins: number[];
  capexPercent: number[];
  adjustments: number[];
  taxRate: number;
  daPercent: number;
  debtStructure: {
    seniorAmount: number;
    interestRate: number;
    amortRate: number;
  };
  cashSweepPercent: number;
}

function InteractiveModelViewerWrapper({ modelName, fileKey, dealId }: { modelName: string; fileKey?: string; dealId: string }) {
  const [assumptions, setAssumptions] = useState<GranularAssumptions | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (fileKey && fileKey.startsWith("model:")) {
      const modelId = fileKey.replace("model:", "");
      setLoading(true);
      fetch(`/api/deal-models/${modelId}`)
        .then(res => res.ok ? res.json() : null)
        .then(model => {
          if (model?.assumptions) {
            setAssumptions(model.assumptions);
          }
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [fileKey]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full py-12">
        <div className="text-muted-foreground">Loading model...</div>
      </div>
    );
  }

  if (!assumptions) {
    return (
      <div className="flex items-center justify-center h-full py-12">
        <div className="text-muted-foreground">Model data not available</div>
      </div>
    );
  }

  return (
    <DealSandbox 
      dealId={dealId}
      dealName={modelName}
      initialAssumptions={assumptions}
      readOnly={true}
    />
  );
}

export type DocumentUrlFilter = "all" | "action_required" | "required_missing";

export default function DocumentsPage() {
  const [, params] = useRoute("/deal/:id/documents");
  const dealId = params?.id || "101";
  const searchString = useSearch();
  const [, navigate] = useLocation();
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filters, setFilters] = useState<DocumentFilters>(defaultDocumentFilters);
  const [uploadedDocs, setUploadedDocs] = useState<UploadedDocument[]>([]);
  const [apiDocs, setApiDocs] = useState<Document[]>([]);
  const [isExtractingQA, setIsExtractingQA] = useState(false);
  const [extractQADialogOpen, setExtractQADialogOpen] = useState(false);
  const [csvContent, setCsvContent] = useState<string>("");
  const { user } = useAuth();
  const { toast } = useToast();

  // Parse URL filter
  const getUrlFilter = (): DocumentUrlFilter => {
    const urlParams = new URLSearchParams(searchString);
    const filter = urlParams.get("filter");
    if (filter === "action_required") return "action_required";
    if (filter === "required_missing") return "required_missing";
    return "all";
  };

  const [urlFilter, setUrlFilter] = useState<DocumentUrlFilter>(getUrlFilter());

  // Sync with URL changes
  useReactEffect(() => {
    setUrlFilter(getUrlFilter());
  }, [searchString]);

  // Clear filter function
  const clearFilter = () => {
    navigate(`/deal/${dealId}/documents`);
  };

  useEffect(() => {
    fetch(`/api/deals/${dealId}/documents`)
      .then(res => res.ok ? res.json() : [])
      .then((docs: any[]) => {
        const categoryMap: Record<string, DocumentCategory> = {
          "Financial": "Lender Paydown Model",
          "Lender Paydown Model": "Lender Paydown Model",
          "Lender Presentation": "Lender Presentation",
          "Legal": "Legal",
          "Supplemental Information": "Supplemental Information",
          "KYC & Compliance": "KYC & Compliance",
          "Prior Process Q&A": "Prior Process Q&A",
          "prior_process_qa": "Prior Process Q&A",
        };
        const mapped: Document[] = docs.map(d => ({
          id: d.id,
          name: d.name || "Untitled",
          category: (categoryMap[d.category] || "Lender Paydown Model") as string,
          status: "Issuer Approved",
          version: `v${d.version || 1}`,
          lastUpdatedAt: d.uploadedAt || d.updatedAt || new Date().toISOString(),
          owner: "Deal Team",
          openCommentsCount: 0,
          dealId: d.dealId,
          changeSummary: d.changeSummary || "",
          accessTier: (d.visibilityTier || "full") as "early" | "full" | "legal",
          type: d.type || "document",
          fileKey: d.fileKey,
          isNew: true,
        }));
        setApiDocs(mapped);
      })
      .catch(() => {});
  }, [dealId]);

  const handleDownloadDoc = (doc: Document) => {
    downloadPlaceholderDoc(doc.name, doc.version);
    toast({ title: "Download Started", description: `Downloading ${doc.name}...` });
  };

  const handleExportDocs = () => {
    const headers = ["Folder", "DocumentName", "Version", "UpdatedAt", "Visibility", "ChangeSummary"];
    const rows = accessibleDocs.map(d => [
      d.category,
      d.name,
      d.version,
      d.lastUpdatedAt,
      d.accessTier || "all",
      d.changeSummary || ""
    ]);
    downloadCSV(`documents_export.csv`, headers, rows);
    toast({ title: "Export Complete", description: `Exported ${accessibleDocs.length} documents.` });
  };

  const handleNewDocUpload = (doc: UploadedDocument) => {
    setUploadedDocs(prev => [...prev, doc]);
  };

  // Parse CSV content and extract Q&A
  const handleExtractQA = async () => {
    if (!selectedDoc || !csvContent.trim()) {
      toast({ title: "Error", description: "Please paste CSV content with question,answer columns.", variant: "destructive" });
      return;
    }

    setIsExtractingQA(true);
    try {
      // Parse CSV - simple parser for question,answer,topic,source_process,shareable columns
      const lines = csvContent.trim().split("\n");
      const headers = lines[0].split(",").map(h => h.trim().toLowerCase().replace(/"/g, ""));

      const questionIdx = headers.findIndex(h => h === "question");
      const answerIdx = headers.findIndex(h => h === "answer");
      const topicIdx = headers.findIndex(h => h === "topic");
      const sourceIdx = headers.findIndex(h => h === "source_process" || h === "sourceprocess" || h === "source");
      const shareableIdx = headers.findIndex(h => h === "shareable");

      if (questionIdx === -1 || answerIdx === -1) {
        toast({ title: "Invalid CSV", description: "CSV must have 'question' and 'answer' columns.", variant: "destructive" });
        setIsExtractingQA(false);
        return;
      }

      const csvData = lines.slice(1).map(line => {
        // Handle quoted values with commas
        const values: string[] = [];
        let current = "";
        let inQuotes = false;
        for (const char of line) {
          if (char === '"') {
            inQuotes = !inQuotes;
          } else if (char === "," && !inQuotes) {
            values.push(current.trim());
            current = "";
          } else {
            current += char;
          }
        }
        values.push(current.trim());

        return {
          question: values[questionIdx]?.replace(/^"|"$/g, "") || "",
          answer: values[answerIdx]?.replace(/^"|"$/g, "") || "",
          topic: topicIdx >= 0 ? values[topicIdx]?.replace(/^"|"$/g, "") : null,
          source_process: sourceIdx >= 0 ? values[sourceIdx]?.replace(/^"|"$/g, "") : null,
          shareable: shareableIdx >= 0 ? values[shareableIdx]?.toLowerCase() !== "false" : true,
        };
      }).filter(row => row.question && row.answer);

      const res = await fetch(`/api/deals/${dealId}/prior-qa/import`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          uploadedDocumentId: selectedDoc.id,
          csvData,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to import Q&A");
      }

      const result = await res.json();
      toast({
        title: "Q&A Extracted",
        description: `Successfully imported ${result.imported} Q&A items.`
      });
      setExtractQADialogOpen(false);
      setCsvContent("");
      // Navigate to Prior Process Q&A tab
      navigate(`/deal/${dealId}/qa?tab=prior`);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setIsExtractingQA(false);
    }
  };

  const userRole = user?.role?.toLowerCase();
  const isInvestor = userRole === "investor" || userRole === "lender";

  // Fetch lender invitations from API
  const { data: lenderInvitations = [] } = useLenderInvitations(user?.lenderId);
  const invitation = lenderInvitations.find(inv => inv.dealId === dealId) || null;
  const accessTier = invitation?.accessTier || "early"; // Default if not found

  // Define tier permissions
  // early: Lender Presentation
  // full: Lender Presentation, Financials, KYC
  // legal: Lender Presentation, Financials, KYC, Legal (Credit Agreement, Security, Intercreditor)
  
  const getAllowedCategories = (tier: string) => {
    switch(tier) {
      case "legal":
        return ["Lender Presentation", "Supplemental Information", "Lender Paydown Model", "KYC & Compliance", "Legal", "Prior Process Q&A"];
      case "full":
        return ["Lender Presentation", "Supplemental Information", "Lender Paydown Model", "KYC & Compliance", "Prior Process Q&A"];
      case "early":
      default:
        return ["Lender Presentation"];
    }
  };

  const allowedCategories = isInvestor ? getAllowedCategories(accessTier) : null;

  const allDocuments = apiDocs;

  const baseAccessibleDocs = isInvestor 
    ? allDocuments.filter(d => 
        (allowedCategories?.includes(d.category) || d.type === "interactive_model") && 
        d.status !== "Draft"
      )
    : allDocuments;

  // Apply user filters
  const applyDocumentFilters = (docs: Document[], f: DocumentFilters): Document[] => {
    let filtered = [...docs];
    
    // Category filter
    if (f.categories.length > 0) {
      filtered = filtered.filter(d => f.categories.includes(d.category));
    }
    
    // Type filter (map to document type field if available)
    if (f.types.length > 0) {
      const typeMap: Record<string, string[]> = {
        "Financial": ["Financials", "Financial Model"],
        "Legal": ["Credit Agreement", "Security", "Intercreditor"],
        "Model": ["Lender Paydown Model"],
        "Presentation": ["Lender Presentation"],
        "Compliance": ["KYC"],
        "Other": ["Supplemental Information"]
      };
      const allowedCats = f.types.flatMap(t => typeMap[t] || []);
      filtered = filtered.filter(d => allowedCats.some(c => d.category.includes(c) || d.name.toLowerCase().includes(c.toLowerCase())));
    }
    
    // Visibility/access tier filter
    if (f.visibility.length > 0) {
      filtered = filtered.filter(d => f.visibility.includes(d.accessTier || "full"));
    }
    
    // Date range filter
    if (f.dateRange !== "all") {
      const now = new Date();
      const cutoff = f.dateRange === "7days" 
        ? new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        : new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      filtered = filtered.filter(d => new Date(d.lastUpdatedAt) >= cutoff);
    }
    
    // New/Updated only
    if (f.showNewUpdatedOnly) {
      filtered = filtered.filter(d => d.isNew || d.isUpdated);
    }
    
    // Sort
    filtered.sort((a, b) => {
      let cmp = 0;
      switch (f.sortBy) {
        case "name":
          cmp = a.name.localeCompare(b.name);
          break;
        case "category":
          cmp = a.category.localeCompare(b.category);
          break;
        case "version":
          cmp = a.version.localeCompare(b.version);
          break;
        case "updatedAt":
        default:
          cmp = new Date(b.lastUpdatedAt).getTime() - new Date(a.lastUpdatedAt).getTime();
      }
      return f.sortOrder === "asc" ? cmp : -cmp;
    });
    
    return filtered;
  };

  // Required document categories for the deal
  const REQUIRED_DOC_CATEGORIES: string[] = ["Lender Presentation", "Legal"];

  // Check for missing required categories
  const existingCategories = new Set(baseAccessibleDocs.map(d => d.category));
  const missingCategories = REQUIRED_DOC_CATEGORIES.filter(cat => !existingCategories.has(cat));

  // Apply URL-based filter first
  let urlFilteredDocs = baseAccessibleDocs;
  if (urlFilter === "action_required") {
    urlFilteredDocs = baseAccessibleDocs.filter(d =>
      d.status === "Comments Outstanding" ||
      d.status === "In Review" ||
      d.status === "Draft"
    );
  } else if (urlFilter === "required_missing") {
    // For required_missing, show only docs in required categories (or all if none exist)
    urlFilteredDocs = baseAccessibleDocs.filter(d =>
      REQUIRED_DOC_CATEGORIES.includes(d.category)
    );
  }

  const accessibleDocs = applyDocumentFilters(urlFilteredDocs, filters);

  const selectedDoc = accessibleDocs.find(d => d.id === selectedDocId) || accessibleDocs[0];

  // Group by category
  const groupedDocs = accessibleDocs.reduce((acc, doc) => {
    if (!acc[doc.category]) acc[doc.category] = [];
    acc[doc.category].push(doc);
    return acc;
  }, {} as Record<string, Document[]>);

  // Grouped Docs helper to safely get array
  const getDocs = (cat: string) => groupedDocs[cat] || [];
  
  // Check if any filters are active
  const hasActiveFilters = filters.categories.length > 0 || 
    filters.types.length > 0 || 
    filters.visibility.length > 0 || 
    filters.dateRange !== "all" || 
    filters.showNewUpdatedOnly || 
    filters.showUnviewedOnly;

  // Blocking items logic (Internal only)
  const blockingDocs = allDocuments.filter(d => 
    ["Credit Agreement", "Security", "Intercreditor"].includes(d.category) && 
    d.status !== "Ready to Sign" && d.status !== "Lender Approved"
  );

  // Markups state and logic
  const [docMarkups, setDocMarkups] = useState<Markup[]>([]);

  // Fetch markups when selected doc changes
  useEffect(() => {
    if (!selectedDoc) {
      setDocMarkups([]);
      return;
    }

    const fetchMarkups = async () => {
      try {
        const url = isInvestor && user?.lenderId
          ? `/api/deals/${dealId}/documents/${selectedDoc.id}/markups?lenderId=${user.lenderId}`
          : `/api/deals/${dealId}/documents/${selectedDoc.id}/markups`;
        const res = await fetch(url, { credentials: "include" });
        if (res.ok) {
          const data = await res.json();
          setDocMarkups(data);
        }
      } catch (error) {
        // Markups endpoint may not exist yet - silently fail
        setDocMarkups([]);
      }
    };
    fetchMarkups();
  }, [selectedDoc?.id, dealId, isInvestor, user?.lenderId]);
  
  const isLegalDoc = selectedDoc && ["Credit Agreement", "Security", "Intercreditor"].includes(selectedDoc.category);

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDoc || !user) return;

    const fileInput = (e.target as any).file as HTMLInputElement;
    const file = fileInput.files?.[0];
    
    if (!file) return;

    setIsUploading(true);

    try {
      // Use Storage Service (Abstracted S3/Box/Mock)
      const uploadResult = await storageService.uploadFile(file, `markups/${dealId}/${selectedDoc.id}`);

      const filename = file.name;

      // Create markup via API
      const markupRes = await fetch(`/api/deals/${dealId}/documents/${selectedDoc.id}/markups`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          lenderId: user.lenderId || "unknown",
          fileName: filename,
          status: "Pending Review",
          notes: ""
        })
      });

      if (markupRes.ok) {
        const newMarkup = await markupRes.json();
        setDocMarkups(prev => [...prev, newMarkup]);
      }

      setIsUploadOpen(false);

      toast({
        title: "Markup Uploaded",
        description: "Legal team has been notified of your comments.",
      });

      // Send Email Notification
      await emailService.send({
        to: "deal-team@capitalflow.com",
        subject: `Legal Markup: ${filename}`,
        html: emailTemplates.legalMarkup("Project Titan", selectedDoc.name, user.name || user.email)
      });
    } catch (error) {
      console.error("Upload failed", error);
      toast({
        title: "Upload Failed",
        description: "There was an error uploading your document.",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleNewVersionUpload = async () => {
     // Mock logic for new version upload
     toast({
        title: "Version 2.0 Uploaded",
        description: "Investors have been notified of the update."
     });

     await emailService.send({
        to: "investors@capitalflow.com",
        subject: "Document Updated: Project Titan",
        html: emailTemplates.documentUpdated("Project Titan", "Credit Agreement", "2.0")
     });
  }

  const PageContent = () => (
    <div className="space-y-6 animate-in fade-in duration-500 h-[calc(100vh-140px)] flex flex-col">
        <div className="flex justify-between items-center shrink-0">
          <div>
             <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <Link href={`/deal/${dealId}/overview`} className="hover:text-primary">Project Titan</Link>
              <span>/</span>
              <span>Data Room & Docs</span>
            </div>
            <h1 className="text-2xl font-semibold text-primary tracking-tight">
              {isInvestor ? "Virtual Data Room" : "Documents & Redlines"}
            </h1>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="gap-2" onClick={() => setIsFilterOpen(true)} data-testid="button-filter">
              <Filter className="h-4 w-4" /> Filter
            </Button>
            <Button variant="outline" className="gap-2" onClick={handleExportDocs} data-testid="button-export-docs">
              <Download className="h-4 w-4" /> Export CSV
            </Button>
            <Button className="gap-2" onClick={() => setIsUploadOpen(true)} data-testid="button-upload">
              <Upload className="h-4 w-4" /> Upload
            </Button>
          </div>
        </div>

        {/* Security Notice */}
        <Alert className="bg-primary/5 border-primary/20">
          <Shield className="h-4 w-4 text-primary" />
          <AlertDescription className="text-sm">
            <span className="font-medium">Security Notice:</span> All documents are dynamically watermarked with your identity for protection. Downloads are tracked and logged.
          </AlertDescription>
        </Alert>

        {/* Filter Alert Banner */}
        {urlFilter !== "all" && (
          <Alert className={urlFilter === "required_missing" ? "bg-amber-50 border-amber-200" : "bg-blue-50 border-blue-200"}>
            <AlertCircle className={`h-4 w-4 ${urlFilter === "required_missing" ? "text-amber-600" : "text-blue-600"}`} />
            <AlertDescription className={`text-sm flex-1 ${urlFilter === "required_missing" ? "text-amber-800" : "text-blue-800"}`}>
              {urlFilter === "required_missing" ? (
                <>
                  <span className="font-medium">Required Materials Missing:</span>{" "}
                  {missingCategories.length > 0
                    ? `The following required categories have no documents uploaded: ${missingCategories.join(", ")}.`
                    : "All required document categories have been uploaded."}
                </>
              ) : (
                <span className="font-medium">Showing documents requiring action</span>
              )}
            </AlertDescription>
            <Button
              variant="outline"
              size="sm"
              onClick={clearFilter}
              className="ml-auto shrink-0"
            >
              Clear Filter
            </Button>
          </Alert>
        )}

        <Tabs defaultValue="files" className="flex-1 min-h-0 flex flex-col">
          <TabsList className="w-fit mb-4">
            <TabsTrigger value="files">Files {isInvestor ? "" : "& Redlines"}</TabsTrigger>
            {!isInvestor && <TabsTrigger value="access">Lender Access Logs</TabsTrigger>}
          </TabsList>

          <TabsContent value="files" className="flex-1 min-h-0 mt-0">
            <div className="grid grid-cols-12 gap-6 h-full">
              
              {/* Left Panel: Document List */}
              <Card className="col-span-3 flex flex-col h-full border-border/60">
                <CardHeader className="pb-3 shrink-0">
                  <CardTitle className="text-lg">Folders</CardTitle>
                </CardHeader>
                <CardContent className="p-0 flex-1 min-h-0">
                  <ScrollArea className="h-full px-4 pb-4">
                    <div className="space-y-6">
                      {/* Fixed Folders for Investors */}
                      {isInvestor ? (
                        <>
                          {(accessTier === "early" || accessTier === "full" || accessTier === "legal") && (
                            <FolderGroup title="Lender Presentation" docs={getDocs("Lender Presentation")} selectedId={selectedDoc?.id} onSelect={setSelectedDocId} />
                          )}
                          
                          {(accessTier === "full" || accessTier === "legal") && (
                            <>
                              <FolderGroup title="Financials & Model" docs={[...getDocs("Supplemental Information"), ...getDocs("Lender Paydown Model")]} selectedId={selectedDoc?.id} onSelect={setSelectedDocId} />
                              <FolderGroup title="KYC" docs={getDocs("KYC & Compliance")} selectedId={selectedDoc?.id} onSelect={setSelectedDocId} />
                              <FolderGroup title="Prior Process Q&A" docs={getDocs("Prior Process Q&A")} selectedId={selectedDoc?.id} onSelect={setSelectedDocId} dealId={dealId} />
                            </>
                          )}

                          {(accessTier === "legal") && (
                            <FolderGroup title="Legal Documentation" docs={getDocs("Legal")} selectedId={selectedDoc?.id} onSelect={setSelectedDocId} />
                          )}
                          
                          {/* Fallback msg if nothing visible */}
                          {accessibleDocs.length === 0 && (
                            <div className="text-sm text-muted-foreground p-4 text-center">
                              No documents available for your access tier ({accessTier}).
                            </div>
                          )}
                        </>
                      ) : (
                        Object.entries(groupedDocs).map(([category, docs]) => (
                          <FolderGroup key={category} title={category} docs={docs} selectedId={selectedDoc?.id} onSelect={setSelectedDocId} dealId={dealId} />
                        ))
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>

              {/* Middle Panel: Selected Doc Preview/Status */}
              <Card className={`${isInvestor ? 'col-span-9' : 'col-span-6'} flex flex-col h-full border-border/60`}>
                <CardHeader className="pb-4 border-b">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline">{selectedDoc?.category || "Select a file"}</Badge>
                        {selectedDoc && <span className="text-xs text-muted-foreground">Last updated {formatDistanceToNow(parseISO(selectedDoc.lastUpdatedAt))} ago</span>}
                      </div>
                      <CardTitle className="text-xl font-serif">{selectedDoc?.name || "Select a document"}</CardTitle>
                    </div>
                    {selectedDoc && (
                      <div className="flex gap-2">
                        {isInvestor && isLegalDoc && (
                          <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
                            <DialogTrigger asChild>
                              <Button size="sm" variant="secondary" className="gap-2">
                                <FileUp className="h-4 w-4" /> Upload Markup
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-[425px]">
                              <DialogHeader>
                                <DialogTitle>Upload Legal Markup</DialogTitle>
                                <DialogDescription>
                                  Submit your comments for legal counsel review. 
                                  This will only be visible to you and the Deal Team.
                                </DialogDescription>
                              </DialogHeader>
                              <form onSubmit={handleUploadSubmit} className="space-y-4 py-4">
                                <div className="grid w-full max-w-sm items-center gap-1.5">
                                  <Label htmlFor="markup-file">Select File</Label>
                                  <Input id="markup-file" name="file" type="file" required disabled={isUploading} />
                                </div>
                                <div className="text-xs text-muted-foreground bg-secondary/50 p-2 rounded">
                                  Target: {selectedDoc.name} ({selectedDoc.version})
                                </div>
                                <DialogFooter>
                                  <Button type="submit" disabled={isUploading}>
                                    {isUploading ? "Uploading..." : "Upload Markup"}
                                  </Button>
                                </DialogFooter>
                              </form>
                            </DialogContent>
                          </Dialog>
                        )}
                        {selectedDoc.type !== "interactive_model" && (
                          <Button size="sm" variant="outline" className="gap-2" onClick={() => handleDownloadDoc(selectedDoc)} data-testid="button-download-doc">
                            <Download className="h-4 w-4" /> Download
                          </Button>
                        )}
                        {/* Extract Q&A button for Prior Process Q&A documents */}
                        {!isInvestor && selectedDoc.category === "Prior Process Q&A" && (
                          <Dialog open={extractQADialogOpen} onOpenChange={setExtractQADialogOpen}>
                            <DialogTrigger asChild>
                              <Button size="sm" variant="secondary" className="gap-2">
                                <FileText className="h-4 w-4" /> Extract Q&A
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-[600px]">
                              <DialogHeader>
                                <DialogTitle>Extract Q&A from CSV</DialogTitle>
                                <DialogDescription>
                                  Paste CSV content with Q&A data. Required columns: question, answer.
                                  Optional columns: topic, source_process, shareable.
                                </DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4 py-4">
                                <div className="text-xs text-muted-foreground bg-secondary/50 p-2 rounded">
                                  Source document: {selectedDoc.name}
                                </div>
                                <div className="space-y-2">
                                  <Label>CSV Content</Label>
                                  <Textarea
                                    placeholder="question,answer,topic,source_process,shareable&#10;What is the EBITDA?,The EBITDA is $50MM.,Financials,2023 Financing,true"
                                    value={csvContent}
                                    onChange={(e) => setCsvContent(e.target.value)}
                                    className="min-h-[200px] font-mono text-xs"
                                  />
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  Example format: question,answer,topic,source_process,shareable
                                </div>
                              </div>
                              <DialogFooter>
                                <Button variant="outline" onClick={() => setExtractQADialogOpen(false)}>
                                  Cancel
                                </Button>
                                <Button onClick={handleExtractQA} disabled={isExtractingQA}>
                                  {isExtractingQA ? "Importing..." : "Import Q&A"}
                                </Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                        )}
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="flex-1 p-6 overflow-y-auto">
                   {selectedDoc ? (
                     selectedDoc.type === "interactive_model" ? (
                       <InteractiveModelViewerWrapper 
                         modelName={selectedDoc.name}
                         fileKey={selectedDoc.fileKey}
                         dealId={dealId}
                       />
                     ) : (
                     <div className="space-y-8">
                       {/* Status Timeline */}
                       <div>
                         <h3 className="text-sm font-semibold mb-4">Document Status</h3>
                         <div className="flex items-center gap-2 w-full">
                           {["Draft", "In Review", "Comments Outstanding", "Lender Approved", "Ready to Sign"].map((step, i) => {
                              const isCurrent = selectedDoc.status === step;
                              const isPast = ["Draft", "In Review", "Comments Outstanding", "Lender Approved", "Ready to Sign"].indexOf(selectedDoc.status) > i;
                              
                              return (
                                <div key={step} className="flex-1 flex flex-col items-center relative">
                                  {i !== 0 && <div className={cn("absolute top-3 right-[50%] w-full h-0.5 -z-10", isPast ? "bg-primary" : "bg-border")} />}
                                  <div className={cn(
                                    "h-6 w-6 rounded-full flex items-center justify-center border-2 text-[10px] font-bold z-10 transition-colors",
                                    isCurrent ? "border-primary bg-primary text-primary-foreground" : 
                                    isPast ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background text-muted-foreground"
                                  )}>
                                    {isPast || isCurrent ? <CheckCircle2 className="h-3 w-3" /> : i + 1}
                                  </div>
                                  <span className={cn("text-[10px] mt-2 text-center", isCurrent ? "font-bold text-primary" : "text-muted-foreground")}>
                                    {step}
                                  </span>
                                </div>
                              )
                           })}
                         </div>
                       </div>

                        {/* Markups History Section */}
                        {(isLegalDoc || !isInvestor) && (
                          <div className="border-t pt-6">
                            <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                              <History className="h-4 w-4" /> 
                              {isInvestor ? "My Markup History" : "Received Markups"}
                            </h3>
                            
                            {docMarkups.length > 0 ? (
                              <div className="space-y-3">
                                {docMarkups.map(markup => (
                                  <div key={markup.id} className="p-3 bg-secondary/10 border border-border/60 rounded-lg text-sm flex justify-between items-center group hover:bg-secondary/20 transition-colors">
                                    <div className="flex items-start gap-3">
                                      <FileText className="h-8 w-8 text-primary/40 mt-1" />
                                      <div>
                                        <div className="font-medium text-primary flex items-center gap-2">
                                          {markup.fileName}
                                          {markup.status === "Reviewed" && <Badge variant="outline" className="text-[10px] h-4 px-1 bg-green-50 text-green-700 border-green-200">Reviewed</Badge>}
                                          {markup.status === "Pending Review" && <Badge variant="outline" className="text-[10px] h-4 px-1 bg-amber-50 text-amber-700 border-amber-200">Pending</Badge>}
                                        </div>
                                        <div className="text-xs text-muted-foreground mt-0.5">
                                          Uploaded by {markup.uploadedBy || "Unknown"} • {formatDistanceToNow(parseISO(markup.uploadedAt))} ago
                                        </div>
                                      </div>
                                    </div>
                                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                      {!isInvestor && (
                                        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => toast({ title: "Coming Soon", description: "Markup review feature is in development." })} data-testid="button-review-markup">Review</Button>
                                      )}
                                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => { downloadPlaceholderDoc(markup.fileName, "v1"); toast({ title: "Download Started", description: `Downloading ${markup.fileName}...` }); }} data-testid="button-download-markup"><Download className="h-4 w-4" /></Button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="text-center py-6 border-2 border-dashed rounded-lg bg-secondary/5">
                                <p className="text-sm text-muted-foreground">No markups uploaded yet.</p>
                                {isInvestor && isLegalDoc && (
                                  <Button variant="link" size="sm" onClick={() => setIsUploadOpen(true)}>Upload your first markup</Button>
                                )}
                              </div>
                            )}
                          </div>
                        )}

                       {/* Version History */}
                       <div className="border-t pt-6">
                         <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                           <History className="h-4 w-4" />
                           Version History
                         </h3>
                         <VersionHistoryPanel documentName={selectedDoc.name} onDownload={(versionId) => {
                           toast({ title: "Download Started", description: `Downloading version ${versionId}...` });
                         }} />
                       </div>

                       {/* Metadata */}
                       <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                          <div>
                            <span className="text-xs text-muted-foreground block">Owner</span>
                            <span className="text-sm font-medium">{selectedDoc.owner}</span>
                          </div>
                           <div>
                            <span className="text-xs text-muted-foreground block">File Size</span>
                            <span className="text-sm font-medium">2.4 MB</span>
                          </div>
                       </div>
                     </div>
                     )
                   ) : (
                     <div className="flex items-center justify-center h-full text-muted-foreground">
                       Select a file to view details
                     </div>
                   )}
                </CardContent>
              </Card>

              {/* Right Panel: Blockers - Only for Internal */}
              {!isInvestor && (
                <Card className="col-span-3 h-full border-l-4 border-l-red-500 border-y border-r border-border/60 shadow-sm bg-red-50/10">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2 text-red-700">
                      <AlertCircle className="h-5 w-5" /> Blocking Items
                    </CardTitle>
                    <CardDescription>
                      Documents preventing signing.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {blockingDocs.length === 0 ? (
                        <div className="text-sm text-green-600 flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4" /> All clear for signing!
                        </div>
                      ) : (
                        blockingDocs.map(doc => (
                          <div key={doc.id} className="p-3 bg-white border border-red-100 rounded-md shadow-sm">
                             <div className="flex items-start gap-2">
                               <FileText className="h-4 w-4 text-red-400 mt-0.5" />
                               <div className="flex-1 min-w-0">
                                 <p className="text-sm font-semibold truncate" title={doc.name}>{doc.name}</p>
                                 <p className="text-xs text-red-600 font-medium mt-0.5">{doc.status}</p>
                                 <p className="text-xs text-muted-foreground mt-1">{doc.openCommentsCount} open issues</p>
                               </div>
                             </div>
                          </div>
                        ))
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

            </div>
          </TabsContent>

          <TabsContent value="access" className="flex-1 min-h-0">
             <Card className="border-border/60 shadow-sm h-full overflow-y-auto">
                <CardHeader>
                  <CardTitle>Lender Access Activity</CardTitle>
                  <CardDescription>Track who has viewed and downloaded data room files.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <InvestorAccessCard 
                      name="BlackRock Credit"
                      lastActive="10 mins ago"
                      views={145}
                      downloads={42}
                      recentFiles={[
                        "Credit Agreement - Draft v4 (Lender Comments).docx",
                        "Titan Financial Model - Base Case.xlsx",
                        "Lender Presentation Deck.pptx"
                      ]}
                    />
                    <InvestorAccessCard 
                      name="Apollo Global"
                      lastActive="2 hours ago"
                      views={98}
                      downloads={25}
                      recentFiles={[
                        "Commercial Due Diligence Report (McK).pdf",
                        "Capital Structure Grid - Master.xlsx"
                      ]}
                    />
                    <InvestorAccessCard 
                      name="Oak Hill Advisors"
                      lastActive="Yesterday"
                      views={65}
                      downloads={12}
                      recentFiles={[
                        "Lender Presentation Deck.pptx",
                        "Term Sheet - Executed.pdf"
                      ]}
                    />
                     <InvestorAccessCard 
                      name="Barings"
                      lastActive="3 days ago"
                      views={32}
                      downloads={8}
                      recentFiles={[
                        "Lender Presentation Deck.pptx"
                      ]}
                    />
                  </div>

                  <div className="mt-8">
                    <h3 className="text-sm font-semibold text-foreground mb-4">Detailed Access Log</h3>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Investor</TableHead>
                          <TableHead>User</TableHead>
                          <TableHead>Action</TableHead>
                          <TableHead>File</TableHead>
                          <TableHead>Time</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <AccessRow investor="BlackRock" user="John Smith" action="Downloaded" file="Credit Agreement - Draft v4.docx" time="10 mins ago" />
                        <AccessRow investor="BlackRock" user="Sarah Jones" action="Viewed" file="Financial Model v3.xlsx" time="45 mins ago" />
                        <AccessRow investor="Apollo" user="Mike Ross" action="Viewed" file="Commercial DD Report.pdf" time="2 hours ago" />
                        <AccessRow investor="BlackRock" user="John Smith" action="Downloaded" file="Q3 Financials.xlsx" time="3 hours ago" />
                        <AccessRow investor="Apollo" user="Jessica Pearson" action="Viewed" file="Lender Presentation.pptx" time="4 hours ago" />
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
             </Card>
          </TabsContent>
        </Tabs>
    </div>
  );

  return (
    <Layout>
      <NDAGate dealId={dealId} title="Virtual Data Room Access">
        <PageContent />
      </NDAGate>
      
      {/* Upload Document Modal */}
      <UploadDocumentModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onUpload={handleNewDocUpload}
        dealId={dealId}
        role={user?.role || "Investor"}
      />
      
      {/* Filter Panel */}
      <DocumentFilterPanel
        isOpen={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        filters={filters}
        onFiltersChange={setFilters}
        role={user?.role || "Investor"}
      />
    </Layout>
  );
}

function FolderGroup({ title, docs, selectedId, onSelect, dealId }: { title: string, docs: Document[], selectedId?: string, onSelect: (id: string) => void, dealId?: string }) {
  if (docs.length === 0) return null;

  return (
    <div>
      <div className="flex items-center justify-between sticky top-0 bg-card py-1 z-10">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          {title}
        </h3>
        {title === "Prior Process Q&A" && dealId && (
          <Link href={`/deal/${dealId}/qa?tab=prior`}>
            <span className="text-xs text-primary hover:underline cursor-pointer">
              View Extracted Q&A →
            </span>
          </Link>
        )}
      </div>
      <div className="space-y-1 mt-2">
        {docs.map(doc => {
          const versions = generateMockVersions(doc.name);
          const currentVersionNum = parseInt(doc.version.replace('v', '')) || versions.find(v => v.isCurrentVersion)?.version || 1;

          return (
            <div
              key={doc.id}
              onClick={() => onSelect(doc.id)}
              className={cn(
                "flex items-start gap-3 p-2 rounded-md cursor-pointer transition-colors text-sm group",
                selectedId === doc.id ? "bg-primary/10 text-primary" : "hover:bg-secondary/50",
                doc.isAutomated && "bg-blue-50 border-l-2 border-l-blue-400"
              )}
            >
              <FileText className={cn("h-4 w-4 mt-0.5 shrink-0", selectedId === doc.id ? "text-primary" : "text-muted-foreground")} />
              <div className="flex-1 overflow-hidden">
                <div className="flex items-center gap-2">
                  <span className="truncate font-medium">{doc.name}</span>
                  {doc.isAutomated && (
                    <Badge variant="outline" className="h-4 px-1 text-[10px] text-blue-600 border-blue-300 shrink-0">
                      Auto
                    </Badge>
                  )}
                </div>
                <div className="flex items-center justify-between mt-1">
                  <DocumentVersionBadge
                    currentVersion={currentVersionNum}
                    totalVersions={versions.length}
                    versions={versions}
                    onDownload={(versionId) => {
                      // Would download specific version
                    }}
                  />
                  {(doc.openCommentsCount ?? 0) > 0 && (
                    <Badge variant="secondary" className="h-4 px-1 text-[10px] gap-1">
                      <MessageSquare className="h-2 w-2" /> {doc.openCommentsCount}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function InvestorAccessCard({ name, lastActive, views, downloads, recentFiles }: { name: string; lastActive: string; views: number; downloads: number; recentFiles: string[] }) {
  return (
    <Card className="border border-border/60 bg-secondary/10">
      <CardContent className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
             <Avatar className="h-8 w-8">
                <AvatarFallback className="text-xs font-bold text-primary bg-primary/10">
                  {name.substring(0, 2).toUpperCase()}
                </AvatarFallback>
             </Avatar>
             <div>
               <div className="font-semibold text-sm">{name}</div>
               <div className="text-xs text-muted-foreground flex items-center gap-1">
                 <Clock className="h-3 w-3" /> Active {lastActive}
               </div>
             </div>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-2 text-center">
           <div className="bg-background border rounded p-2">
             <div className="text-lg font-bold text-primary">{views}</div>
             <div className="text-[10px] text-muted-foreground uppercase">File Views</div>
           </div>
           <div className="bg-background border rounded p-2">
             <div className="text-lg font-bold text-primary">{downloads}</div>
             <div className="text-[10px] text-muted-foreground uppercase">Downloads</div>
           </div>
        </div>

        <div className="space-y-2">
           <div className="text-xs font-medium text-muted-foreground uppercase">Recently Accessed</div>
           <div className="space-y-1">
             {recentFiles.map((file, i) => (
               <div key={i} className="flex items-start gap-2 text-xs p-1.5 bg-background rounded border border-border/40">
                 <Eye className="h-3 w-3 text-muted-foreground mt-0.5 shrink-0" />
                 <span className="truncate">{file}</span>
               </div>
             ))}
           </div>
        </div>
      </CardContent>
    </Card>
  )
}

function AccessRow({ investor, user, action, file, time }: { investor: string; user: string; action: string; file: string; time: string }) {
  return (
    <TableRow>
      <TableCell className="font-medium">{investor}</TableCell>
      <TableCell className="text-muted-foreground">{user}</TableCell>
      <TableCell>
        <Badge variant="outline" className={cn(
          "font-normal",
          action === "Downloaded" ? "bg-blue-50 text-blue-700 border-blue-200" : "bg-gray-50 text-gray-700 border-gray-200"
        )}>
          {action}
        </Badge>
      </TableCell>
      <TableCell className="text-sm">{file}</TableCell>
      <TableCell className="text-muted-foreground text-sm">{time}</TableCell>
    </TableRow>
  )
}

// Version History Panel component
function VersionHistoryPanel({ documentName, onDownload }: { documentName: string; onDownload?: (versionId: string) => void }) {
  const versions = generateMockVersions(documentName);
  const currentVersion = versions.find(v => v.isCurrentVersion);

  return (
    <div className="space-y-3">
      {versions.map((version, index) => (
        <div
          key={version.id}
          className={cn(
            "relative flex items-start justify-between p-3 rounded-lg border transition-colors",
            version.isCurrentVersion
              ? "border-primary/50 bg-primary/5"
              : "border-border hover:bg-muted/50"
          )}
        >
          <div className="flex items-start gap-3">
            <div
              className={cn(
                "flex-shrink-0 h-7 w-7 rounded-full flex items-center justify-center text-xs font-medium",
                version.isCurrentVersion
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              )}
            >
              v{version.version}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium text-sm truncate">
                  {version.filename}
                </span>
                {version.isCurrentVersion && (
                  <Badge className="text-[10px] px-1.5 py-0 h-4">Current</Badge>
                )}
              </div>
              {version.changeSummary && (
                <p className="text-xs text-muted-foreground mb-1.5 line-clamp-1">
                  {version.changeSummary}
                </p>
              )}
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span>{version.uploadedBy}</span>
                <span>•</span>
                <span>{format(version.uploadedAt, "MMM d, yyyy 'at' h:mm a")}</span>
              </div>
            </div>
          </div>

          {onDownload && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0"
              onClick={() => onDownload(version.id)}
            >
              <Download className="h-4 w-4" />
            </Button>
          )}
        </div>
      ))}
    </div>
  );
}