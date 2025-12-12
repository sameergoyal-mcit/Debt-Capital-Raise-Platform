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
  FolderOpen
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

        <div className="grid gap-6 md:grid-cols-4">
          {/* Folders Navigation */}
          <Card className="col-span-1 border-border/60 shadow-sm h-fit">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Folders</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 p-2">
              <FolderItem label="Grids" count={3} active />
              <FolderItem label="Lender Presentation" count={2} />
              <FolderItem label="Financial Model" count={5} />
              <FolderItem label="Supplementary Info" count={12} />
              <FolderItem label="Legal Docs" count={8} />
              <FolderItem label="KYC Documents" count={4} />
              <FolderItem label="Due Diligence" count={15} />
            </CardContent>
          </Card>

          {/* Files List */}
          <Card className="col-span-3 border-border/60 shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Folder className="h-4 w-4 text-primary" /> Grids
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
              {/* Master Grids Section */}
              <div className="mb-8">
                <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2 uppercase tracking-wider">
                  Master Files (Distribution)
                </h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[40%]">Name</TableHead>
                      <TableHead>Version</TableHead>
                      <TableHead>Last Modified</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <FileRow 
                      name="Capital Structure Grid - Master.xlsx" 
                      type="XLSX" 
                      size="245 KB" 
                      date="2 days ago" 
                      version="v3.2"
                      hasHistory
                      icon={<Grid className="h-4 w-4 text-green-600" />}
                    />
                    <FileRow 
                      name="Lender Comparables Grid.xlsx" 
                      type="XLSX" 
                      size="1.2 MB" 
                      date="1 week ago"
                      version="v1.0"
                      hasHistory
                      icon={<Grid className="h-4 w-4 text-green-600" />}
                    />
                  </TableBody>
                </Table>
              </div>

              {/* Investor Responses Section */}
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2 uppercase tracking-wider">
                  Investor Responses
                </h3>
                <div className="space-y-2">
                  <InvestorFolder name="BlackRock Credit" count={2} updated="Today">
                     <Table>
                      <TableBody>
                        <FileRow 
                          name="BlackRock_Response_Grid_v1.xlsx" 
                          type="XLSX" 
                          size="250 KB" 
                          date="Today 10:30 AM" 
                          icon={<FileSpreadsheet className="h-4 w-4 text-blue-600" />}
                        />
                         <FileRow 
                          name="BlackRock_Questions_Log.docx" 
                          type="DOCX" 
                          size="45 KB" 
                          date="Today 10:30 AM" 
                          icon={<FileText className="h-4 w-4 text-blue-600" />}
                        />
                      </TableBody>
                    </Table>
                  </InvestorFolder>
                  
                  <InvestorFolder name="Apollo Global" count={1} updated="Yesterday">
                     <Table>
                      <TableBody>
                        <FileRow 
                          name="Apollo_Grid_Response_v2.xlsx" 
                          type="XLSX" 
                          size="265 KB" 
                          date="Yesterday" 
                          icon={<FileSpreadsheet className="h-4 w-4 text-blue-600" />}
                        />
                      </TableBody>
                    </Table>
                  </InvestorFolder>

                  <InvestorFolder name="Oak Hill Advisors" count={1} updated="3 days ago">
                     <Table>
                      <TableBody>
                        <FileRow 
                          name="OakHill_Prelim_Grid.xlsx" 
                          type="XLSX" 
                          size="240 KB" 
                          date="3 days ago" 
                          icon={<FileSpreadsheet className="h-4 w-4 text-blue-600" />}
                        />
                      </TableBody>
                    </Table>
                  </InvestorFolder>
                </div>
              </div>

              {/* KYC Documents Section */}
              <div className="mb-8">
                <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2 uppercase tracking-wider">
                  KYC Documents
                </h3>
                <Table>
                  <TableBody>
                    <FileRow 
                      name="Certificate of Incorporation.pdf" 
                      type="PDF" 
                      size="1.2 MB" 
                      date="Oct 10" 
                      icon={<FileText className="h-4 w-4 text-red-500" />}
                    />
                    <FileRow 
                      name="Articles of Association.pdf" 
                      type="PDF" 
                      size="3.5 MB" 
                      date="Oct 10" 
                      icon={<FileText className="h-4 w-4 text-red-500" />}
                    />
                    <FileRow 
                      name="UBO Declaration Form.pdf" 
                      type="PDF" 
                      size="850 KB" 
                      date="Oct 12" 
                      icon={<FileText className="h-4 w-4 text-red-500" />}
                    />
                    <FileRow 
                      name="Director Passports (Redacted).pdf" 
                      type="PDF" 
                      size="4.2 MB" 
                      date="Oct 12" 
                      icon={<FileText className="h-4 w-4 text-red-500" />}
                    />
                  </TableBody>
                </Table>
              </div>

            </CardContent>
          </Card>
        </div>
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

function InvestorFolder({ name, count, updated, children }: { name: string; count: number; updated: string; children: React.ReactNode }) {
  return (
    <Accordion type="single" collapsible className="w-full border border-border/40 rounded-lg bg-secondary/10">
      <AccordionItem value={name} className="border-none">
        <AccordionTrigger className="px-4 py-3 hover:bg-secondary/20 hover:no-underline">
          <div className="flex items-center gap-3 w-full">
            <div className="h-8 w-8 bg-primary/10 rounded flex items-center justify-center text-primary">
              <FolderOpen className="h-4 w-4" />
            </div>
            <div className="flex flex-col items-start text-left flex-1">
              <span className="text-sm font-medium text-foreground">{name}</span>
              <span className="text-xs text-muted-foreground">Last updated {updated}</span>
            </div>
            <Badge variant="secondary" className="mr-2 text-xs font-normal">
              {count} files
            </Badge>
          </div>
        </AccordionTrigger>
        <AccordionContent className="px-4 pb-4 border-t border-border/40 bg-background/50">
          <div className="pt-2 pl-4 border-l-2 border-border/60 ml-3">
             {children}
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
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
             <Sheet>
               <SheetTrigger asChild>
                 <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground hover:text-primary">
                   <History className="h-4 w-4" />
                   <span className="hidden sm:inline">History</span>
                 </Button>
               </SheetTrigger>
               <SheetContent>
                 <SheetHeader>
                   <SheetTitle>Version History</SheetTitle>
                   <SheetDescription>
                     Track changes for {name}
                   </SheetDescription>
                 </SheetHeader>
                 <div className="mt-6 space-y-6">
                   <div className="relative border-l border-border ml-2 pl-6 space-y-6">
                     <div className="relative">
                       <div className="absolute -left-[29px] top-1 h-3 w-3 rounded-full bg-primary ring-4 ring-background" />
                       <div className="flex flex-col gap-1">
                         <div className="flex items-center gap-2">
                           <span className="font-semibold text-sm">Version 3.2</span>
                           <Badge variant="secondary" className="text-[10px] h-5">Current</Badge>
                         </div>
                         <p className="text-xs text-muted-foreground">Updated by Alex Davis • 2 days ago</p>
                         <p className="text-sm mt-1 bg-secondary/30 p-2 rounded text-foreground/80">
                           Updated tranche B pricing assumptions based on feedback.
                         </p>
                       </div>
                     </div>
                     <div className="relative">
                       <div className="absolute -left-[29px] top-1 h-3 w-3 rounded-full bg-border ring-4 ring-background" />
                        <div className="flex flex-col gap-1">
                         <div className="flex items-center gap-2">
                           <span className="font-medium text-sm text-muted-foreground">Version 3.1</span>
                         </div>
                         <p className="text-xs text-muted-foreground">Updated by Sarah Jenkins • 4 days ago</p>
                         <p className="text-sm mt-1 text-muted-foreground">
                           Added new downside case sensitivity rows.
                         </p>
                       </div>
                     </div>
                     <div className="relative">
                       <div className="absolute -left-[29px] top-1 h-3 w-3 rounded-full bg-border ring-4 ring-background" />
                        <div className="flex flex-col gap-1">
                         <div className="flex items-center gap-2">
                           <span className="font-medium text-sm text-muted-foreground">Version 2.0</span>
                         </div>
                         <p className="text-xs text-muted-foreground">Updated by Alex Davis • 1 week ago</p>
                         <p className="text-sm mt-1 text-muted-foreground">
                           Initial distribution version.
                         </p>
                       </div>
                     </div>
                   </div>
                 </div>
               </SheetContent>
             </Sheet>
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
