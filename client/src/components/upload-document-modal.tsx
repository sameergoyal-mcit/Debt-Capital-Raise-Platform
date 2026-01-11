import React, { useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Upload, FileText, X, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface UploadDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (doc: UploadedDocument) => void;
  dealId: string;
  role: string;
}

export interface UploadedDocument {
  id: string;
  dealId: string;
  name: string;
  category: string;
  type: string;
  version: string;
  uploadedAt: string;
  updatedAt: string;
  uploadedBy: string;
  visibilityTier: "early" | "full" | "legal";
  notes?: string;
  fileRef: string;
  fileSize: string;
  isNew: boolean;
}

const documentCategories = [
  "Lender Presentation",
  "Supplemental Information",
  "KYC & Compliance",
  "Lender Paydown Model",
  "Legal",
  "Closing"
];

const documentTypes = [
  "Financial",
  "Legal",
  "Model",
  "Presentation",
  "Compliance",
  "Other"
];

const visibilityTiers = [
  { value: "early", label: "Early Look (Tier 1)" },
  { value: "full", label: "Full Access (Tier 2)" },
  { value: "legal", label: "Legal Only (Tier 3)" }
];

export function UploadDocumentModal({ 
  isOpen, 
  onClose, 
  onUpload, 
  dealId, 
  role 
}: UploadDocumentModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [category, setCategory] = useState("");
  const [docType, setDocType] = useState("");
  const [visibility, setVisibility] = useState<"early" | "full" | "legal">("full");
  const [notes, setNotes] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const isInvestor = role === "Investor";
  const allowedCategories = isInvestor ? ["Legal"] : documentCategories;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
    }
  };

  const handleUpload = async () => {
    if (!file || !category || !docType) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive"
      });
      return;
    }

    setIsUploading(true);

    // Simulate upload delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    const newDoc: UploadedDocument = {
      id: `doc-${Date.now()}`,
      dealId,
      name: file.name,
      category,
      type: docType,
      version: "v1.0",
      uploadedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      uploadedBy: role,
      visibilityTier: isInvestor ? "legal" : visibility,
      notes,
      fileRef: URL.createObjectURL(file),
      fileSize: formatFileSize(file.size),
      isNew: true
    };

    onUpload(newDoc);
    setIsUploading(false);
    
    toast({
      title: "Document Uploaded",
      description: `${file.name} has been uploaded successfully.`
    });

    // Reset form
    setFile(null);
    setCategory("");
    setDocType("");
    setVisibility("full");
    setNotes("");
    onClose();
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-primary" />
            Upload Document
          </DialogTitle>
          <DialogDescription>
            {isInvestor 
              ? "Upload markup documents to the Legal folder."
              : "Upload a document to the deal data room."
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* File picker */}
          <div className="space-y-2">
            <Label>File</Label>
            <div 
              className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              {file ? (
                <div className="flex items-center justify-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  <span className="font-medium">{file.name}</span>
                  <span className="text-xs text-muted-foreground">
                    ({formatFileSize(file.size)})
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      setFile(null);
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="text-muted-foreground">
                  <Upload className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Click to select a file</p>
                  <p className="text-xs">PDF, XLS, XLSX, CSV, DOC, DOCX</p>
                </div>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept=".pdf,.xls,.xlsx,.csv,.doc,.docx"
              onChange={handleFileChange}
              data-testid="input-file-upload"
            />
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label>Category *</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger data-testid="select-category">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {allowedCategories.map(cat => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Document Type */}
          <div className="space-y-2">
            <Label>Document Type *</Label>
            <Select value={docType} onValueChange={setDocType}>
              <SelectTrigger data-testid="select-doc-type">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {documentTypes.map(type => (
                  <SelectItem key={type} value={type}>{type}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Visibility (issuer/bookrunner only) */}
          {!isInvestor && (
            <div className="space-y-2">
              <Label>Visible To</Label>
              <Select value={visibility} onValueChange={(v) => setVisibility(v as typeof visibility)}>
                <SelectTrigger data-testid="select-visibility">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {visibilityTiers.map(tier => (
                    <SelectItem key={tier.value} value={tier.value}>{tier.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Notes */}
          <div className="space-y-2">
            <Label>Notes / Change Summary</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional: describe changes or add notes..."
              className="h-20"
              data-testid="input-notes"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleUpload} 
            disabled={!file || !category || !docType || isUploading}
            className="gap-2"
          >
            {isUploading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4" />
                Upload
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
