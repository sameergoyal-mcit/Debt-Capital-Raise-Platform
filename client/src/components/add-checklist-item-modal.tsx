import React, { useState } from "react";
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
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Link as LinkIcon, Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Document } from "@/data/documents";

export interface ChecklistItem {
  id: string;
  dealId: string;
  section: string;
  name: string;
  description?: string;
  required: boolean;
  status: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETE";
  ownerRole?: "issuer" | "bookrunner" | "counsel" | "investor";
  relatedDocumentId?: string;
  createdBy: string;
  createdAt: string;
}

interface AddChecklistItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (item: Omit<ChecklistItem, "id" | "createdAt">) => void;
  dealId: string;
  existingDocuments: Document[];
  onUploadClick?: () => void;
}

const checklistSections = [
  "Credit Agreement Deliverables",
  "KYC & Compliance",
  "Corporate Documents",
  "Funds Flow",
  "Security Documents",
  "Third Party Consents",
  "Insurance",
  "Other"
];

const ownerRoles = [
  { value: "issuer", label: "Issuer" },
  { value: "bookrunner", label: "Bookrunner" },
  { value: "counsel", label: "Counsel" },
  { value: "investor", label: "Investor" }
];

export function AddChecklistItemModal({
  isOpen,
  onClose,
  onAdd,
  dealId,
  existingDocuments,
  onUploadClick
}: AddChecklistItemModalProps) {
  const [section, setSection] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [required, setRequired] = useState(true);
  const [ownerRole, setOwnerRole] = useState<ChecklistItem["ownerRole"]>();
  const [relatedDocumentId, setRelatedDocumentId] = useState("");
  const { toast } = useToast();

  const handleSubmit = () => {
    if (!section || !name) {
      toast({
        title: "Missing Information",
        description: "Please provide a section and item name.",
        variant: "destructive"
      });
      return;
    }

    onAdd({
      dealId,
      section,
      name,
      description: description || undefined,
      required,
      status: "NOT_STARTED",
      ownerRole,
      relatedDocumentId: relatedDocumentId || undefined,
      createdBy: "Issuer"
    });

    toast({
      title: "Checklist Item Added",
      description: `"${name}" has been added to ${section}.`
    });

    // Reset form
    setSection("");
    setName("");
    setDescription("");
    setRequired(true);
    setOwnerRole(undefined);
    setRelatedDocumentId("");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5 text-primary" />
            Add Checklist Item
          </DialogTitle>
          <DialogDescription>
            Add a new deliverable to the closing checklist.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Section */}
          <div className="space-y-2">
            <Label>Section *</Label>
            <Select value={section} onValueChange={setSection}>
              <SelectTrigger data-testid="select-checklist-section">
                <SelectValue placeholder="Select section" />
              </SelectTrigger>
              <SelectContent>
                {checklistSections.map(sec => (
                  <SelectItem key={sec} value={sec}>{sec}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Item Name */}
          <div className="space-y-2">
            <Label>Item Name *</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Officer's Certificate"
              data-testid="input-checklist-name"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description or notes..."
              className="h-16"
              data-testid="input-checklist-description"
            />
          </div>

          {/* Required Toggle */}
          <div className="flex items-center justify-between">
            <Label>Required for Closing</Label>
            <Switch
              checked={required}
              onCheckedChange={setRequired}
            />
          </div>

          {/* Owner Role */}
          <div className="space-y-2">
            <Label>Owner</Label>
            <Select value={ownerRole || ""} onValueChange={(v) => setOwnerRole(v as ChecklistItem["ownerRole"])}>
              <SelectTrigger data-testid="select-owner-role">
                <SelectValue placeholder="Select owner (optional)" />
              </SelectTrigger>
              <SelectContent>
                {ownerRoles.map(role => (
                  <SelectItem key={role.value} value={role.value}>{role.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Link Document */}
          <div className="space-y-2">
            <Label>Link to Document</Label>
            <div className="flex gap-2">
              <Select value={relatedDocumentId} onValueChange={setRelatedDocumentId}>
                <SelectTrigger className="flex-1" data-testid="select-related-doc">
                  <SelectValue placeholder="Select existing document" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  {existingDocuments.map(doc => (
                    <SelectItem key={doc.id} value={doc.id}>
                      {doc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {onUploadClick && (
                <Button variant="outline" size="icon" onClick={onUploadClick} title="Upload new document">
                  <Upload className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Item
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
