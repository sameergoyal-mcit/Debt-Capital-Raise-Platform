import React, { useState } from "react";
import { useRoute, Link } from "wouter";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  X
} from "lucide-react";
import { mockDocuments, Document, DocumentCategory } from "@/data/documents";
import { parseISO, formatDistanceToNow, format } from "date-fns";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/context/auth-context";
import { useToast } from "@/hooks/use-toast";
import { NDAGate } from "@/components/nda-gate";
import { getInvitation } from "@/data/invitations";
import { getMarkups, getLenderMarkups, uploadMarkup, Markup } from "@/data/markups";
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

export default function DocumentsPage() {
  const [, params] = useRoute("/deal/:id/documents");
  const dealId = params?.id || "101";
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filters, setFilters] = useState<DocumentFilters>(defaultDocumentFilters);
  const [uploadedDocs, setUploadedDocs] = useState<UploadedDocument[]>([]);
  const { user } = useAuth();
  const { toast } = useToast();

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

  const isInvestor = user?.role === "Investor";
  const invitation = isInvestor && user?.lenderId ? getInvitation(dealId, user.lenderId) : null;
  const accessTier = invitation?.accessTier || "early"; // Default if not found

  // Define tier permissions
  // early: Lender Presentation
  // full: Lender Presentation, Financials, KYC
  // legal: Lender Presentation, Financials, KYC, Legal (Credit Agreement, Security, Intercreditor)
  
  const getAllowedCategories = (tier: string) => {
    switch(tier) {
      case "legal":
        return ["Lender Presentation", "Financials", "KYC", "Credit Agreement", "Security", "Intercreditor"];
      case "full":
        return ["Lender Presentation", "Financials", "KYC"];
      case "early":
      default:
        return ["Lender Presentation"];
    }
  };

  const allowedCategories = isInvestor ? getAllowedCategories(accessTier) : null;

  // Filter documents for investors (e.g. hide draft internal docs)
  const baseAccessibleDocs = isInvestor 
    ? mockDocuments.filter(d => 
        allowedCategories?.includes(d.category) && 
        d.status !== "Draft"
      )
    : mockDocuments;

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

  const accessibleDocs = applyDocumentFilters(baseAccessibleDocs, filters);

  const selectedDoc = accessibleDocs.find(d => d.id === selectedDocId) || accessibleDocs[0];

  // Group by category
  const groupedDocs = accessibleDocs.reduce((acc, doc) => {
    if (!acc[doc.category]) acc[doc.category] = [];
    acc[doc.category].push(doc);
    return acc;
  }, {} as Record<DocumentCategory, Document[]>);

  // Grouped Docs helper to safely get array
  const getDocs = (cat: DocumentCategory) => groupedDocs[cat] || [];
  
  // Check if any filters are active
  const hasActiveFilters = filters.categories.length > 0 || 
    filters.types.length > 0 || 
    filters.visibility.length > 0 || 
    filters.dateRange !== "all" || 
    filters.showNewUpdatedOnly || 
    filters.showUnviewedOnly;

  // Blocking items logic (Internal only)
  const blockingDocs = mockDocuments.filter(d => 
    ["Credit Agreement", "Security", "Intercreditor"].includes(d.category) && 
    d.status !== "Ready to Sign" && d.status !== "Lender Approved"
  );

  // Markups logic
  const [markupsVersion, setMarkupsVersion] = useState(0); // Trigger re-render
  const docMarkups = selectedDoc 
    ? (isInvestor 
        ? getLenderMarkups(dealId, selectedDoc.id, user?.lenderId || "") 
        : getMarkups(dealId, selectedDoc.id))
    : [];
  
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

      const newMarkup: Markup = {
        id: `m${Date.now()}`,
        documentId: selectedDoc.id,
        lenderId: user.lenderId || "unknown",
        dealId: dealId,
        uploadedAt: new Date().toISOString(),
        filename: filename,
        status: "Pending Review",
        uploadedBy: user.name || user.email
      };

      uploadMarkup(newMarkup);
      setMarkupsVersion(v => v + 1);
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
            <h1 className="text-3xl font-serif font-bold text-primary tracking-tight">
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

        <Tabs defaultValue="files" className="flex-1 min-h-0 flex flex-col">
          <TabsList className="w-fit mb-4">
            <TabsTrigger value="files">Files {isInvestor ? "" : "& Redlines"}</TabsTrigger>
            {!isInvestor && <TabsTrigger value="access">Investor Access Logs</TabsTrigger>}
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
                              <FolderGroup title="Financials & Model" docs={getDocs("Financials")} selectedId={selectedDoc?.id} onSelect={setSelectedDocId} />
                              <FolderGroup title="KYC" docs={getDocs("KYC")} selectedId={selectedDoc?.id} onSelect={setSelectedDocId} />
                            </>
                          )}

                          {(accessTier === "legal") && (
                            <FolderGroup title="Legal Documentation" docs={[...getDocs("Credit Agreement"), ...getDocs("Security"), ...getDocs("Intercreditor")]} selectedId={selectedDoc?.id} onSelect={setSelectedDocId} />
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
                          <FolderGroup key={category} title={category} docs={docs} selectedId={selectedDoc?.id} onSelect={setSelectedDocId} />
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
                        <Button size="sm" variant="outline" className="gap-2">
                          <Download className="h-4 w-4" /> Download
                        </Button>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="flex-1 p-6 overflow-y-auto">
                   {selectedDoc ? (
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
                                          {markup.filename}
                                          {markup.status === "Reviewed" && <Badge variant="outline" className="text-[10px] h-4 px-1 bg-green-50 text-green-700 border-green-200">Reviewed</Badge>}
                                          {markup.status === "Pending Review" && <Badge variant="outline" className="text-[10px] h-4 px-1 bg-amber-50 text-amber-700 border-amber-200">Pending</Badge>}
                                        </div>
                                        <div className="text-xs text-muted-foreground mt-0.5">
                                          Uploaded by {markup.uploadedBy} • {formatDistanceToNow(parseISO(markup.uploadedAt))} ago
                                        </div>
                                      </div>
                                    </div>
                                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                      {!isInvestor && (
                                        <Button size="sm" variant="outline" className="h-7 text-xs">Review</Button>
                                      )}
                                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0"><Download className="h-4 w-4" /></Button>
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
                  <CardTitle>Investor Access Activity</CardTitle>
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

function FolderGroup({ title, docs, selectedId, onSelect }: { title: string, docs: Document[], selectedId?: string, onSelect: (id: string) => void }) {
  if (docs.length === 0) return null;
  
  return (
    <div>
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 sticky top-0 bg-card py-1 z-10">
        {title}
      </h3>
      <div className="space-y-1">
        {docs.map(doc => (
          <div 
            key={doc.id}
            onClick={() => onSelect(doc.id)}
            className={cn(
              "flex items-start gap-3 p-2 rounded-md cursor-pointer transition-colors text-sm group",
              selectedId === doc.id ? "bg-primary/10 text-primary" : "hover:bg-secondary/50"
            )}
          >
            <FileText className={cn("h-4 w-4 mt-0.5 shrink-0", selectedId === doc.id ? "text-primary" : "text-muted-foreground")} />
            <div className="flex-1 overflow-hidden">
              <div className="truncate font-medium">{doc.name}</div>
              <div className="flex items-center justify-between mt-1">
                <span className="text-xs text-muted-foreground">{doc.version}</span>
                {doc.openCommentsCount > 0 && (
                  <Badge variant="secondary" className="h-4 px-1 text-[10px] gap-1">
                    <MessageSquare className="h-2 w-2" /> {doc.openCommentsCount}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        ))}
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