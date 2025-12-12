import React from "react";
import { Link, useRoute } from "wouter";
import { 
  FileText, 
  Folder, 
  Download, 
  Upload, 
  MoreHorizontal,
  FileSpreadsheet,
  File,
  FileBarChart,
  Grid
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
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[40%]">Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead>Last Modified</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <FileRow 
                    name="Capital Structure Grid - v3.xlsx" 
                    type="XLSX" 
                    size="245 KB" 
                    date="2 days ago" 
                    icon={<Grid className="h-4 w-4 text-green-600" />}
                  />
                  <FileRow 
                    name="Lender Comparables Grid.xlsx" 
                    type="XLSX" 
                    size="1.2 MB" 
                    date="1 week ago" 
                    icon={<Grid className="h-4 w-4 text-green-600" />}
                  />
                  <FileRow 
                    name="Pricing Grid Sensitivity.xlsx" 
                    type="XLSX" 
                    size="850 KB" 
                    date="3 days ago" 
                    icon={<Grid className="h-4 w-4 text-green-600" />}
                  />
                </TableBody>
              </Table>

              <div className="mt-8 mb-4">
                <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
                  <Folder className="h-4 w-4" /> Lender Presentation
                </h3>
                <Table>
                   <TableBody>
                    <FileRow 
                      name="Project Titan - Management Presentation.pdf" 
                      type="PDF" 
                      size="15.4 MB" 
                      date="Nov 05" 
                      icon={<FileText className="h-4 w-4 text-red-500" />}
                    />
                    <FileRow 
                      name="Lender Presentation Deck.pptx" 
                      type="PPTX" 
                      size="24 MB" 
                      date="Nov 01" 
                      icon={<FileText className="h-4 w-4 text-orange-500" />}
                    />
                   </TableBody>
                </Table>
              </div>

               <div className="mt-8 mb-4">
                <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
                  <Folder className="h-4 w-4" /> Financial Model
                </h3>
                <Table>
                   <TableBody>
                    <FileRow 
                      name="Titan Financial Model - Base Case.xlsx" 
                      type="XLSX" 
                      size="8.2 MB" 
                      date="Oct 28" 
                      icon={<FileSpreadsheet className="h-4 w-4 text-green-600" />}
                    />
                    <FileRow 
                      name="Downside Scenario Analysis.xlsx" 
                      type="XLSX" 
                      size="4.5 MB" 
                      date="Oct 30" 
                      icon={<FileSpreadsheet className="h-4 w-4 text-green-600" />}
                    />
                   </TableBody>
                </Table>
              </div>

               <div className="mt-8 mb-4">
                <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
                  <Folder className="h-4 w-4" /> Supplementary Information
                </h3>
                <Table>
                   <TableBody>
                    <FileRow 
                      name="Commercial Due Diligence Report (McK).pdf" 
                      type="PDF" 
                      size="12 MB" 
                      date="Oct 15" 
                      icon={<FileText className="h-4 w-4 text-red-500" />}
                    />
                    <FileRow 
                      name="Quality of Earnings (KPMG).pdf" 
                      type="PDF" 
                      size="8.4 MB" 
                      date="Oct 12" 
                      icon={<FileText className="h-4 w-4 text-red-500" />}
                    />
                     <FileRow 
                      name="Legal Vendor Due Diligence.pdf" 
                      type="PDF" 
                      size="5.1 MB" 
                      date="Oct 20" 
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

function FileRow({ name, type, size, date, icon }: { name: string; type: string; size: string; date: string; icon: React.ReactNode }) {
  return (
    <TableRow className="group cursor-pointer">
      <TableCell className="font-medium">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 bg-secondary/30 rounded flex items-center justify-center">
            {icon}
          </div>
          {name}
        </div>
      </TableCell>
      <TableCell>{type}</TableCell>
      <TableCell>{size}</TableCell>
      <TableCell className="text-muted-foreground">{date}</TableCell>
      <TableCell className="text-right">
        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
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
