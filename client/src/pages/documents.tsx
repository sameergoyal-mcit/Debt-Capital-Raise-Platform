import React, { useState } from "react";
import { useRoute, Link } from "wouter";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { 
  FileText, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  MessageSquare,
  ChevronRight,
  Upload,
  Download,
  Filter,
  FolderOpen,
  Folder,
  MoreHorizontal,
  History,
  Eye
} from "lucide-react";
import { mockDocuments, Document, DocumentCategory } from "@/data/documents";
import { format, parseISO, formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export default function DocumentsPage() {
  const [, params] = useRoute("/deal/:id/documents");
  const dealId = params?.id || "101";
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);

  const selectedDoc = mockDocuments.find(d => d.id === selectedDocId) || mockDocuments[0];

  // Group by category
  const groupedDocs = mockDocuments.reduce((acc, doc) => {
    if (!acc[doc.category]) acc[doc.category] = [];
    acc[doc.category].push(doc);
    return acc;
  }, {} as Record<DocumentCategory, Document[]>);

  // Blocking items logic
  const blockingDocs = mockDocuments.filter(d => 
    ["Credit Agreement", "Security", "Intercreditor"].includes(d.category) && 
    d.status !== "Ready to Sign" && d.status !== "Lender Approved"
  );

  return (
    <Layout>
      <div className="space-y-6 animate-in fade-in duration-500 h-[calc(100vh-140px)] flex flex-col">
        <div className="flex justify-between items-center shrink-0">
          <div>
             <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <Link href={`/deal/${dealId}/overview`} className="hover:text-primary">Project Titan</Link>
              <span>/</span>
              <span>Data Room & Docs</span>
            </div>
            <h1 className="text-3xl font-serif font-bold text-primary tracking-tight">Documents & Redlines</h1>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="gap-2">
              <Filter className="h-4 w-4" /> Filter
            </Button>
            <Button className="gap-2">
              <Upload className="h-4 w-4" /> Upload New Version
            </Button>
          </div>
        </div>

        <Tabs defaultValue="files" className="flex-1 min-h-0 flex flex-col">
          <TabsList className="w-fit mb-4">
            <TabsTrigger value="files">Files & Redlines</TabsTrigger>
            <TabsTrigger value="access">Investor Access Logs</TabsTrigger>
          </TabsList>

          <TabsContent value="files" className="flex-1 min-h-0 mt-0">
            <div className="grid grid-cols-12 gap-6 h-full">
              
              {/* Left Panel: Document List */}
              <Card className="col-span-3 flex flex-col h-full border-border/60">
                <CardHeader className="pb-3 shrink-0">
                  <CardTitle className="text-lg">Files</CardTitle>
                </CardHeader>
                <CardContent className="p-0 flex-1 min-h-0">
                  <ScrollArea className="h-full px-4 pb-4">
                    <div className="space-y-6">
                      {Object.entries(groupedDocs).map(([category, docs]) => (
                        <div key={category}>
                          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 sticky top-0 bg-card py-1 z-10">
                            {category}
                          </h3>
                          <div className="space-y-1">
                            {docs.map(doc => (
                              <div 
                                key={doc.id}
                                onClick={() => setSelectedDocId(doc.id)}
                                className={cn(
                                  "flex items-start gap-3 p-2 rounded-md cursor-pointer transition-colors text-sm group",
                                  selectedDoc?.id === doc.id ? "bg-primary/10 text-primary" : "hover:bg-secondary/50"
                                )}
                              >
                                <FileText className={cn("h-4 w-4 mt-0.5 shrink-0", selectedDoc?.id === doc.id ? "text-primary" : "text-muted-foreground")} />
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
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>

              {/* Middle Panel: Selected Doc Preview/Status */}
              <Card className="col-span-6 flex flex-col h-full border-border/60">
                <CardHeader className="pb-4 border-b">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline">{selectedDoc.category}</Badge>
                        <span className="text-xs text-muted-foreground">Last updated {formatDistanceToNow(parseISO(selectedDoc.lastUpdatedAt))} ago</span>
                      </div>
                      <CardTitle className="text-xl font-serif">{selectedDoc.name}</CardTitle>
                    </div>
                    <Button size="sm" variant="outline" className="gap-2">
                      <Download className="h-4 w-4" /> Download
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 p-6 overflow-y-auto">
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

                     {/* Comments Mock */}
                     <div>
                        <h3 className="text-sm font-semibold mb-4 flex items-center justify-between">
                          <span>Open Issues ({selectedDoc.openCommentsCount})</span>
                          <Button variant="ghost" size="sm" className="h-6 text-xs text-primary">View All History</Button>
                        </h3>
                        
                        {selectedDoc.openCommentsCount > 0 ? (
                          <div className="space-y-3">
                            <div className="p-3 bg-amber-50 border border-amber-100 rounded-lg text-sm">
                              <div className="flex justify-between mb-1">
                                <span className="font-semibold text-amber-900">Definition of "EBITDA"</span>
                                <span className="text-xs text-amber-700">Lender Counsel • 2h ago</span>
                              </div>
                              <p className="text-amber-800">Please revert add-back cap to 15% as discussed in committee.</p>
                              <div className="mt-2 flex gap-2">
                                 <Button size="sm" variant="outline" className="h-6 text-xs bg-white border-amber-200">Reply</Button>
                                 <Button size="sm" variant="outline" className="h-6 text-xs bg-white border-amber-200">Resolve</Button>
                              </div>
                            </div>
                             <div className="p-3 bg-secondary/30 border border-border rounded-lg text-sm">
                              <div className="flex justify-between mb-1">
                                <span className="font-semibold">Negative Covenants</span>
                                <span className="text-xs text-muted-foreground">Issuer Counsel • 1d ago</span>
                              </div>
                              <p className="text-foreground/80">Confirming baskets for permitted acquisitions.</p>
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
                            <CheckCircle2 className="h-8 w-8 mb-2 text-green-500" />
                            <p>No open issues. Document is clean.</p>
                          </div>
                        )}
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
                </CardContent>
              </Card>

              {/* Right Panel: Blockers */}
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
    </Layout>
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