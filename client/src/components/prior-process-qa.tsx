import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/auth-context";
import {
  Search,
  Filter,
  Edit2,
  Trash2,
  Eye,
  EyeOff,
  Upload,
  Loader2,
  FileText,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import { format, parseISO } from "date-fns";

interface PriorQaItem {
  id: string;
  dealId: string;
  uploadedDocumentId: string | null;
  question: string;
  answer: string;
  topic: string | null;
  sourceProcess: string | null;
  shareable: boolean;
  createdAt: string;
  updatedAt: string;
}

interface PriorProcessQAProps {
  dealId: string;
}

export function PriorProcessQA({ dealId }: PriorProcessQAProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [topicFilter, setTopicFilter] = useState<string>("all");
  const [editItem, setEditItem] = useState<PriorQaItem | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);

  const userRole = user?.role?.toLowerCase();
  const isInternal = userRole === "bookrunner" || userRole === "issuer";

  // Fetch prior Q&A items
  const { data: items = [], isLoading, isError } = useQuery<PriorQaItem[]>({
    queryKey: ["prior-qa", dealId],
    queryFn: async () => {
      const res = await fetch(`/api/deals/${dealId}/prior-qa`, {
        credentials: "include",
      });
      if (!res.ok) {
        if (res.status === 403) {
          throw new Error("NDA required");
        }
        throw new Error("Failed to fetch prior Q&A");
      }
      return res.json();
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (data: { id: string; updates: Partial<PriorQaItem> }) => {
      const res = await fetch(`/api/prior-qa/${data.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data.updates),
      });
      if (!res.ok) {
        throw new Error("Failed to update item");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["prior-qa", dealId] });
      toast({ title: "Updated", description: "Q&A item updated successfully." });
      setIsEditOpen(false);
      setEditItem(null);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/prior-qa/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        throw new Error("Failed to delete item");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["prior-qa", dealId] });
      toast({ title: "Deleted", description: "Q&A item deleted." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Get unique topics for filter
  const topics = Array.from(new Set(items.map(i => i.topic).filter(Boolean))) as string[];

  // Filter items
  const filteredItems = items.filter(item => {
    const matchesSearch = searchTerm === "" ||
      item.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.answer.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTopic = topicFilter === "all" || item.topic === topicFilter;
    return matchesSearch && matchesTopic;
  });

  const handleEdit = (item: PriorQaItem) => {
    setEditItem(item);
    setIsEditOpen(true);
  };

  const handleSaveEdit = () => {
    if (!editItem) return;
    updateMutation.mutate({
      id: editItem.id,
      updates: {
        question: editItem.question,
        answer: editItem.answer,
        topic: editItem.topic,
        sourceProcess: editItem.sourceProcess,
        shareable: editItem.shareable,
      },
    });
  };

  const handleToggleShareable = (item: PriorQaItem) => {
    updateMutation.mutate({
      id: item.id,
      updates: { shareable: !item.shareable },
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isError) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Failed to load prior Q&A. You may need to sign the NDA first.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      {/* Disclaimer Banner for Lenders */}
      {!isInternal && (
        <Alert className="bg-amber-50 border-amber-200">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800">
            <strong>Prior Process Q&A</strong> - Curated Q&A from prior financing processes.
            Information may not reflect current transaction terms or conditions.
          </AlertDescription>
        </Alert>
      )}

      {/* Search and Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search questions or answers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={topicFilter} onValueChange={setTopicFilter}>
          <SelectTrigger className="w-[180px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Filter by topic" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Topics</SelectItem>
            {topics.map(topic => (
              <SelectItem key={topic} value={topic}>{topic}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Stats */}
      <div className="flex gap-4 text-sm text-muted-foreground">
        <span>{filteredItems.length} items</span>
        {isInternal && (
          <>
            <span className="text-muted-foreground/50">|</span>
            <span className="flex items-center gap-1">
              <Eye className="h-3 w-3" /> {items.filter(i => i.shareable).length} shareable
            </span>
            <span className="flex items-center gap-1">
              <EyeOff className="h-3 w-3" /> {items.filter(i => !i.shareable).length} internal only
            </span>
          </>
        )}
      </div>

      {/* Q&A List */}
      {filteredItems.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed rounded-lg bg-muted/10">
          <FileText className="h-12 w-12 mx-auto mb-4 opacity-20" />
          <h3 className="text-lg font-medium">No Prior Q&A Items</h3>
          <p className="text-sm text-muted-foreground mt-1">
            {isInternal
              ? "Upload a CSV file in the Documents section to import Q&A from prior processes."
              : "No Q&A from prior processes is available for this deal."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredItems.map(item => (
            <Card key={item.id} className="border-border/60">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-2">
                    {/* Header badges */}
                    <div className="flex items-center gap-2 flex-wrap">
                      {item.topic && (
                        <Badge variant="outline" className="text-xs">
                          {item.topic}
                        </Badge>
                      )}
                      {item.sourceProcess && (
                        <Badge variant="secondary" className="text-xs">
                          {item.sourceProcess}
                        </Badge>
                      )}
                      {isInternal && (
                        <Badge
                          variant={item.shareable ? "default" : "outline"}
                          className={item.shareable ? "bg-green-100 text-green-700 border-green-200" : "text-muted-foreground"}
                        >
                          {item.shareable ? (
                            <><Eye className="h-3 w-3 mr-1" /> Shareable</>
                          ) : (
                            <><EyeOff className="h-3 w-3 mr-1" /> Internal Only</>
                          )}
                        </Badge>
                      )}
                    </div>

                    {/* Question */}
                    <div>
                      <p className="font-medium text-foreground">{item.question}</p>
                    </div>

                    {/* Answer */}
                    <div className="bg-muted/30 rounded-md p-3">
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">{item.answer}</p>
                    </div>
                  </div>

                  {/* Actions for internal users */}
                  {isInternal && (
                    <div className="flex flex-col gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggleShareable(item)}
                        title={item.shareable ? "Make internal only" : "Make shareable"}
                      >
                        {item.shareable ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(item)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (confirm("Delete this Q&A item?")) {
                            deleteMutation.mutate(item.id);
                          }
                        }}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Q&A Item</DialogTitle>
            <DialogDescription>
              Modify the question, answer, or visibility settings.
            </DialogDescription>
          </DialogHeader>
          {editItem && (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Question</label>
                <Textarea
                  value={editItem.question}
                  onChange={(e) => setEditItem({ ...editItem, question: e.target.value })}
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Answer</label>
                <Textarea
                  value={editItem.answer}
                  onChange={(e) => setEditItem({ ...editItem, answer: e.target.value })}
                  rows={4}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Topic</label>
                  <Input
                    value={editItem.topic || ""}
                    onChange={(e) => setEditItem({ ...editItem, topic: e.target.value || null })}
                    placeholder="e.g., Financials, Legal, Operations"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Source Process</label>
                  <Input
                    value={editItem.sourceProcess || ""}
                    onChange={(e) => setEditItem({ ...editItem, sourceProcess: e.target.value || null })}
                    placeholder="e.g., 2023 Financing"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="shareable"
                  checked={editItem.shareable}
                  onChange={(e) => setEditItem({ ...editItem, shareable: e.target.checked })}
                  className="rounded"
                />
                <label htmlFor="shareable" className="text-sm">
                  Shareable with lenders (visible after NDA)
                </label>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} disabled={updateMutation.isPending}>
              {updateMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
