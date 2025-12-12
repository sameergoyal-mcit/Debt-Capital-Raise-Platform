import React, { useState } from "react";
import { Link, useRoute } from "wouter";
import { 
  FileText, 
  Folder, 
  Download, 
  Upload, 
  MoreHorizontal,
  FileSpreadsheet,
  Grid,
  History,
  GitBranch,
  ChevronRight,
  FolderOpen,
  Eye,
  Clock,
  ChevronDown
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export default function Documents() {
  const [, params] = useRoute("/deal/:id/documents");
  const dealId = params?.id || "123";

  return (
    <Layout>
      <div className="space-y-6 animate-in fade-in duration-500">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <Link href={`/deal/${dealId}/overview`} className="hover:text-primary">Project Titan</Link>
              <span>/</span>
              <span>Documents</span>
            </div>
            <h1 className="text-3xl font-serif font-bold text-primary tracking-tight">Data Room</h1>
            <p className="text-muted-foreground mt-1">Manage and share confidential deal documents.</p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" className="gap-2">
              <Upload className="h-4 w-4" /> Upload
            </Button>
            <Button className="bg-primary text-primary-foreground">
              New Folder
            </Button>
          </div>
        </div>

        <Tabs defaultValue="files" className="space-y-6">
          <TabsList>
            <TabsTrigger value="files">Files & Folders</TabsTrigger>
            <TabsTrigger value="access">Investor Access Logs</TabsTrigger>
          </TabsList>

          <TabsContent value="files">
            <div className="grid gap-6 md:grid-cols-4">
              {/* Folders Navigation */}
              <Card className="col-span-1 border-border/60 shadow-sm h-fit">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Folders</CardTitle>
                </CardHeader>
                <CardContent className="space-y-1 p-2">
                  <div className="px-2 py-1.5 text-sm font-medium flex items-center gap-2 text-foreground">
                    <FolderOpen className="h-4 w-4 text-primary" />
                    Data Room
                  </div>
                  <div className="pl-4 space-y-1 border-l border-border ml-3">
                    <FolderItem label="Grids" count={3} />
                    <FolderItem label="Lender Presentation" count={2} />
                    <FolderItem label="Financial Model" count={5} />
                    <FolderItem label="Supplementary Info" count={12} />
                    <FolderItem label="Legal Documents" count={8} active />
                    <FolderItem label="KYC Documents" count={4} />
                  </div>
                </CardContent>
              </Card>

              {/* Files List */}
              <Card className="col-span-3 border-border/60 shadow-sm">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Folder className="h-4 w-4 text-primary" /> Legal Documents
                    </CardTitle>
                    <div className="relative w-64">
                      <Input 
                        placeholder="Search files..." 
                        className="h-8 text-sm"
                      />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="mb-8">
                    <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2 uppercase tracking-wider">
                      Credit Agreement Drafts
                    </h3>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[45%]">Name</TableHead>
                          <TableHead>Version</TableHead>
                          <TableHead>Last Modified</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <FileRow 
                          name="Credit Agreement - Draft v4 (Lender Comments).docx" 
                          type="DOCX" 
                          size="2.4 MB" 
                          date="Today 9:15 AM"
                          version="v4.0"
                          hasHistory
                          icon={<FileText className="h-4 w-4 text-blue-600" />}
                        />
                        <FileRow 
                          name="Credit Agreement - Draft v3 (Clean).docx" 
                          type="DOCX" 
                          size="2.3 MB" 
                          date="2 days ago"
                          version="v3.0"
                          hasHistory
                          icon={<FileText className="h-4 w-4 text-blue-600" />}
                        />
                         <FileRow 
                          name="Credit Agreement - Draft v2 (Redline).pdf" 
                          type="PDF" 
                          size="3.1 MB" 
                          date="5 days ago"
                          version="v2.0"
                          hasHistory
                          icon={<FileText className="h-4 w-4 text-red-600" />}
                        />
                        <FileRow 
                          name="Term Sheet - Executed.pdf" 
                          type="PDF" 
                          size="1.5 MB" 
                          date="2 weeks ago"
                          icon={<FileText className="h-4 w-4 text-red-600" />}
                        />
                      </TableBody>
                    </Table>
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2 uppercase tracking-wider">
                      Ancillary Documents
                    </h3>
                    <Table>
                      <TableBody>
                        <FileRow 
                          name="Intercreditor Agreement.docx" 
                          type="DOCX" 
                          size="1.1 MB" 
                          date="3 days ago"
                          icon={<FileText className="h-4 w-4 text-blue-600" />}
                        />
                        <FileRow 
                          name="Security Agreement.docx" 
                          type="DOCX" 
                          size="950 KB" 
                          date="3 days ago"
                          icon={<FileText className="h-4 w-4 text-blue-600" />}
                        />
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="access">
             <Card className="border-border/60 shadow-sm">
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

function FolderItem({ label, count, active }: { label: string; count: number; active?: boolean }) {
  return (
    <div className={cn(
      "flex items-center justify-between p-2 rounded-md cursor-pointer transition-colors text-sm",
      active ? "bg-secondary text-primary font-medium" : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
    )}>
      <div className="flex items-center gap-2">
        <Folder className={cn("h-4 w-4", active ? "fill-primary/20 text-primary" : "text-muted-foreground")} />
        {label}
      </div>
      <span className="text-xs opacity-70">{count}</span>
    </div>
  );
}

function FileRow({ name, type, size, date, icon, version, hasHistory }: { name: string; type: string; size: string; date: string; icon: React.ReactNode; version?: string; hasHistory?: boolean }) {
  return (
    <TableRow className="group cursor-pointer hover:bg-secondary/30">
      <TableCell className="font-medium">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 bg-secondary/30 rounded flex items-center justify-center">
            {icon}
          </div>
          <div className="flex flex-col">
            <span>{name}</span>
            <span className="text-xs text-muted-foreground md:hidden">{size} • {date}</span>
          </div>
        </div>
      </TableCell>
      <TableCell>
        {version && (
          <Badge variant="outline" className="font-mono text-xs text-muted-foreground">
            {version}
          </Badge>
        )}
      </TableCell>
      <TableCell className="text-muted-foreground text-sm">{date}</TableCell>
      <TableCell className="text-right">
        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          {hasHistory && (
             <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground hover:text-primary">
               <History className="h-4 w-4" />
             </Button>
          )}
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Download className="h-4 w-4" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>Preview</DropdownMenuItem>
              <DropdownMenuItem>Rename</DropdownMenuItem>
              <DropdownMenuItem>Share</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive">Delete</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </TableCell>
    </TableRow>
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
