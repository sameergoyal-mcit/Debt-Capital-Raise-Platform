import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Download, FileText, Package, Loader2 } from "lucide-react";
import { mockDocuments, Document } from "@/data/documents";
import { useToast } from "@/hooks/use-toast";

interface BatchDownloadModalProps {
  dealId: string;
  accessTier?: "early" | "full" | "legal" | null;
  role: "Investor" | "Issuer" | "Bookrunner";
}

export function BatchDownloadModal({ dealId, accessTier, role }: BatchDownloadModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedDocs, setSelectedDocs] = useState<string[]>([]);
  const [isDownloading, setIsDownloading] = useState(false);
  const { toast } = useToast();

  const availableDocs = mockDocuments.filter(doc => {
    if (doc.dealId !== dealId) return false;
    
    if (role === "Issuer" || role === "Bookrunner") return true;
    
    if (!accessTier) return false;
    if (accessTier === "early" && doc.accessTier !== "early") return false;
    if (accessTier === "full" && doc.accessTier === "legal") return false;
    
    return true;
  });

  const handleSelectAll = () => {
    if (selectedDocs.length === availableDocs.length) {
      setSelectedDocs([]);
    } else {
      setSelectedDocs(availableDocs.map(d => d.id));
    }
  };

  const handleToggleDoc = (docId: string) => {
    setSelectedDocs(prev => 
      prev.includes(docId) 
        ? prev.filter(id => id !== docId)
        : [...prev, docId]
    );
  };

  const handleDownload = async () => {
    setIsDownloading(true);
    
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    setIsDownloading(false);
    setIsOpen(false);
    
    toast({
      title: "Download Started",
      description: `${selectedDocs.length} documents will be downloaded as a ZIP file.`,
    });
  };

  const totalSize = availableDocs
    .filter(d => selectedDocs.includes(d.id))
    .reduce((acc, d) => {
      const size = parseFloat(d.fileSize?.replace(/[^0-9.]/g, "") || "0");
      return acc + size;
    }, 0);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2" data-testid="button-batch-download">
          <Package className="h-4 w-4" />
          {role === "Investor" ? "Download Lender Package" : "Download All Documents"}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5 text-primary" />
            Download Package
          </DialogTitle>
          <DialogDescription>
            Select documents to include in your download package.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <div className="flex items-center justify-between mb-3">
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-xs h-7"
              onClick={handleSelectAll}
            >
              {selectedDocs.length === availableDocs.length ? "Deselect All" : "Select All"}
            </Button>
            <span className="text-xs text-muted-foreground">
              {selectedDocs.length} of {availableDocs.length} selected
              {totalSize > 0 && ` • ~${totalSize.toFixed(1)} MB`}
            </span>
          </div>

          <ScrollArea className="h-[300px] border rounded-md">
            <div className="divide-y divide-border/50">
              {availableDocs.map(doc => (
                <label 
                  key={doc.id}
                  className="flex items-center gap-3 p-3 hover:bg-secondary/20 cursor-pointer transition-colors"
                >
                  <Checkbox
                    checked={selectedDocs.includes(doc.id)}
                    onCheckedChange={() => handleToggleDoc(doc.id)}
                  />
                  <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{doc.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">
                        {doc.category}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground">
                        {doc.fileSize}
                      </span>
                    </div>
                  </div>
                </label>
              ))}
              
              {availableDocs.length === 0 && (
                <div className="p-6 text-center text-sm text-muted-foreground">
                  No documents available for download.
                </div>
              )}
            </div>
          </ScrollArea>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleDownload} 
            disabled={selectedDocs.length === 0 || isDownloading}
            className="gap-2"
          >
            {isDownloading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Preparing...
              </>
            ) : (
              <>
                <Download className="h-4 w-4" />
                Download ({selectedDocs.length})
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
