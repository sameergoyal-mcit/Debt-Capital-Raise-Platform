import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/auth-context";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Plus,
  Upload,
  CheckCircle,
  Clock,
  FileText,
  MoreVertical,
  Trash2,
  Check,
  AlertCircle,
  Shield,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ClosingItem {
  id: string;
  dealId: string;
  description: string;
  status: "pending" | "uploaded" | "approved";
  fileId?: string;
  category: string;
  requiredBy?: string;
  dueDate?: string;
  notes?: string;
  uploadedBy?: string;
  uploadedAt?: string;
  approvedBy?: string;
  approvedAt?: string;
  createdAt: string;
}

interface ClosingChecklistProps {
  dealId: string;
  role: "Investor" | "Issuer" | "Bookrunner";
}

const CATEGORIES = [
  { value: "legal", label: "Legal" },
  { value: "financial", label: "Financial" },
  { value: "insurance", label: "Insurance" },
  { value: "compliance", label: "Compliance" },
  { value: "general", label: "General" },
];

const STATUS_CONFIG = {
  pending: {
    label: "Pending",
    icon: Clock,
    variant: "secondary" as const,
    color: "text-muted-foreground",
  },
  uploaded: {
    label: "Uploaded",
    icon: FileText,
    variant: "outline" as const,
    color: "text-blue-600",
  },
  approved: {
    label: "Approved",
    icon: CheckCircle,
    variant: "default" as const,
    color: "text-green-600",
  },
};

export function ClosingChecklist({ dealId, role }: ClosingChecklistProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [items, setItems] = useState<ClosingItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<ClosingItem | null>(null);

  // Form state for adding new item
  const [newDescription, setNewDescription] = useState("");
  const [newCategory, setNewCategory] = useState("general");
  const [newRequiredBy, setNewRequiredBy] = useState("");
  const [newDueDate, setNewDueDate] = useState("");
  const [newNotes, setNewNotes] = useState("");

  const isInternal = role !== "Investor";
  const canAdd = role === "Issuer" || role === "Bookrunner";
  const canApprove = role === "Bookrunner";
  const canUpload = role === "Investor" || isInternal;

  useEffect(() => {
    fetchItems();
  }, [dealId]);

  const fetchItems = async () => {
    try {
      const response = await fetch(`/api/deals/${dealId}/closing-items`);
      if (response.ok) {
        const data = await response.json();
        setItems(data);
      }
    } catch (error) {
      console.error("Failed to fetch closing items:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddItem = async () => {
    if (!newDescription.trim()) {
      toast({
        title: "Description Required",
        description: "Please enter a description for the closing item.",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await fetch("/api/closing-items", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-role": role.toLowerCase(),
          "x-user-email": user?.email || "",
        },
        body: JSON.stringify({
          dealId,
          description: newDescription,
          category: newCategory,
          requiredBy: newRequiredBy || undefined,
          dueDate: newDueDate || undefined,
          notes: newNotes || undefined,
        }),
      });

      if (response.ok) {
        const item = await response.json();
        setItems([...items, item]);
        setIsAddModalOpen(false);
        resetForm();
        toast({
          title: "Item Added",
          description: "Closing checklist item has been added.",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add closing item.",
        variant: "destructive",
      });
    }
  };

  const handleUpload = async () => {
    if (!selectedItem) return;

    try {
      // In a real implementation, this would handle file upload
      // For now, we simulate by just updating the status
      const response = await fetch(`/api/closing-items/${selectedItem.id}/upload`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-role": role.toLowerCase(),
          "x-user-email": user?.email || "",
          "x-user-id": user?.lenderId || user?.email || "",
        },
        body: JSON.stringify({
          fileId: `file-${Date.now()}`, // Simulated file ID
        }),
      });

      if (response.ok) {
        const updatedItem = await response.json();
        setItems(items.map((i) => (i.id === updatedItem.id ? updatedItem : i)));
        setIsUploadModalOpen(false);
        setSelectedItem(null);
        toast({
          title: "Document Uploaded",
          description: "The document has been uploaded successfully.",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to upload document.",
        variant: "destructive",
      });
    }
  };

  const handleApprove = async (item: ClosingItem) => {
    try {
      const response = await fetch(`/api/closing-items/${item.id}/approve`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-role": role.toLowerCase(),
          "x-user-email": user?.email || "",
          "x-user-id": user?.lenderId || user?.email || "",
        },
      });

      if (response.ok) {
        const updatedItem = await response.json();
        setItems(items.map((i) => (i.id === updatedItem.id ? updatedItem : i)));
        toast({
          title: "Item Approved",
          description: "The closing item has been approved.",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to approve item.",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (item: ClosingItem) => {
    try {
      const response = await fetch(`/api/closing-items/${item.id}`, {
        method: "DELETE",
        headers: {
          "x-user-role": role.toLowerCase(),
          "x-user-email": user?.email || "",
        },
      });

      if (response.ok) {
        setItems(items.filter((i) => i.id !== item.id));
        toast({
          title: "Item Deleted",
          description: "The closing item has been removed.",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete item.",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setNewDescription("");
    setNewCategory("general");
    setNewRequiredBy("");
    setNewDueDate("");
    setNewNotes("");
  };

  // Calculate progress
  const totalItems = items.length;
  const approvedItems = items.filter((i) => i.status === "approved").length;
  const progressPercent = totalItems > 0 ? Math.round((approvedItems / totalItems) * 100) : 0;

  const getStatusBadge = (status: ClosingItem["status"]) => {
    const config = STATUS_CONFIG[status];
    const Icon = config.icon;
    return (
      <Badge variant={config.variant} className={`gap-1 ${config.color}`}>
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <Card className="border-border/60 shadow-sm">
        <CardContent className="py-8">
          <div className="flex items-center justify-center text-muted-foreground">
            Loading closing checklist...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/60 shadow-sm">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Shield className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">Closing Checklist</CardTitle>
              <CardDescription>Conditions precedent for deal closing</CardDescription>
            </div>
          </div>
          {canAdd && (
            <Button onClick={() => setIsAddModalOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" /> Add Item
            </Button>
          )}
        </div>

        {/* Progress Bar */}
        {totalItems > 0 && (
          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Ready to Fund Progress</span>
              <span className="font-semibold text-primary">{progressPercent}% Complete</span>
            </div>
            <Progress value={progressPercent} className="h-3" />
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span>{approvedItems} of {totalItems} items approved</span>
              {progressPercent === 100 && (
                <Badge variant="default" className="gap-1 bg-green-600">
                  <CheckCircle className="h-3 w-3" /> Ready to Fund
                </Badge>
              )}
            </div>
          </div>
        )}
      </CardHeader>

      <CardContent>
        {items.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
            <AlertCircle className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No Closing Items</p>
            <p className="text-sm mt-1">
              {canAdd
                ? "Add conditions precedent to track closing requirements."
                : "No closing requirements have been added yet."}
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40%]">Description</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Required By</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{item.description}</p>
                      {item.notes && (
                        <p className="text-xs text-muted-foreground mt-1">{item.notes}</p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">
                      {item.category}
                    </Badge>
                  </TableCell>
                  <TableCell>{getStatusBadge(item.status)}</TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">
                      {item.requiredBy || "—"}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      {item.status === "pending" && canUpload && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1"
                          onClick={() => {
                            setSelectedItem(item);
                            setIsUploadModalOpen(true);
                          }}
                        >
                          <Upload className="h-3 w-3" /> Upload
                        </Button>
                      )}
                      {item.status === "uploaded" && canApprove && (
                        <Button
                          variant="default"
                          size="sm"
                          className="gap-1 bg-green-600 hover:bg-green-700"
                          onClick={() => handleApprove(item)}
                        >
                          <Check className="h-3 w-3" /> Approve
                        </Button>
                      )}
                      {isInternal && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => handleDelete(item)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      {/* Add Item Modal */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Closing Item</DialogTitle>
            <DialogDescription>
              Add a new condition precedent to the closing checklist.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Input
                id="description"
                placeholder="e.g., Insurance Certificate"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select value={newCategory} onValueChange={setNewCategory}>
                  <SelectTrigger id="category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="requiredBy">Required By</Label>
                <Input
                  id="requiredBy"
                  placeholder="e.g., Agent, Lender Group"
                  value={newRequiredBy}
                  onChange={(e) => setNewRequiredBy(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="dueDate">Due Date (Optional)</Label>
              <Input
                id="dueDate"
                type="date"
                value={newDueDate}
                onChange={(e) => setNewDueDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                placeholder="Additional details or requirements..."
                value={newNotes}
                onChange={(e) => setNewNotes(e.target.value)}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddItem}>Add Item</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Upload Modal */}
      <Dialog open={isUploadModalOpen} onOpenChange={setIsUploadModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Document</DialogTitle>
            <DialogDescription>
              Upload a document to fulfill: {selectedItem?.description}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="border-2 border-dashed rounded-lg p-8 text-center">
              <Upload className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
              <p className="text-sm text-muted-foreground mb-2">
                Drag and drop your file here, or click to browse
              </p>
              <Button variant="outline" size="sm">
                Select File
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2 text-center">
              Supported formats: PDF, DOC, DOCX, XLS, XLSX (max 25MB)
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsUploadModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpload}>Upload</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
