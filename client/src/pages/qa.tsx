import React, { useState, useMemo, useEffect } from "react";
import { Link, useRoute, useLocation, useSearch } from "wouter";
import {
  Search,
  Filter,
  MessageCircle,
  CheckCircle2,
  Clock,
  User,
  Send,
  Download,
  ExternalLink,
  RefreshCw,
  Save,
  FileText,
  AlertCircle,
  History
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/context/auth-context";
import { useDeal, useDeals, useQA, useAnswerQuestion } from "@/hooks/api-hooks";
import type { QAItem } from "@shared/schema";
// Keep mock data imports for mutation functions until we have API endpoints
import {
  MaterialSource,
  MaterialSources,
  MaterialSourceLabels,
} from "@/data/qa";
import { formatDistanceToNow, parseISO, format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { downloadCSV } from "@/lib/download";
import { PriorProcessQA } from "@/components/prior-process-qa";

export type QAFilter = "all" | "open" | "draft_ready" | "answered" | "awaiting_draft";

export default function QACenter() {
  const [, params] = useRoute("/deal/:id/qa");
  const dealId = params?.id || "101";
  const [location, navigate] = useLocation();
  const searchString = useSearch();
  const { user } = useAuth();
  const { toast } = useToast();

  const [refreshKey, setRefreshKey] = useState(0);
  const refresh = () => setRefreshKey(prev => prev + 1);

  // Parse tab and filter from URL query params
  const getTabFromUrl = (): "live" | "prior" => {
    const params = new URLSearchParams(searchString);
    const tab = params.get("tab");
    if (tab === "prior") return "prior";
    return "live";
  };

  const getFilterFromUrl = (): QAFilter => {
    const params = new URLSearchParams(searchString);
    const filter = params.get("filter");
    if (filter === "open" || filter === "draft_ready" || filter === "answered" || filter === "awaiting_draft") {
      return filter;
    }
    return "all";
  };

  const [activeTab, setActiveTab] = useState<"live" | "prior">(getTabFromUrl());
  const [activeFilter, setActiveFilter] = useState<QAFilter>(getFilterFromUrl());

  // Sync state with URL changes
  useEffect(() => {
    setActiveTab(getTabFromUrl());
    setActiveFilter(getFilterFromUrl());
  }, [searchString]);

  // Update URL when tab changes
  const handleTabChange = (tab: string) => {
    setActiveTab(tab as "live" | "prior");
    if (tab === "prior") {
      navigate(`/deal/${dealId}/qa?tab=prior`);
    } else {
      navigate(`/deal/${dealId}/qa`);
    }
  };

  // Update URL when filter changes
  const handleFilterChange = (filter: QAFilter) => {
    setActiveFilter(filter);
    if (filter === "all") {
      navigate(`/deal/${dealId}/qa`);
    } else {
      navigate(`/deal/${dealId}/qa?filter=${filter}`);
    }
  };

  const userRole = user?.role?.toLowerCase();
  const isInvestor = userRole === "investor" || userRole === "lender";
  const isInternal = userRole === "bookrunner" || userRole === "issuer";

  // Fetch data from API
  const { data: currentDeal } = useDeal(dealId);
  const { data: availableDeals = [] } = useDeals();
  const { data: qaData = [], refetch: refetchQA } = useQA(dealId);
  const answerMutation = useAnswerQuestion();

  // Get all items first for counts
  const allQaItems = useMemo(() => {
    // Filter by lender if investor
    let items = qaData;
    if (isInvestor && user?.lenderId) {
      items = items.filter((q: any) => q.lenderId === user.lenderId);
    }
    return [...items].sort((a: any, b: any) => {
      const aDate = a.answeredAt || a.createdAt;
      const bDate = b.answeredAt || b.createdAt;
      return new Date(bDate).getTime() - new Date(aDate).getTime();
    });
  }, [qaData, user, isInvestor, refreshKey]);

  // Filter items based on active filter
  const qaItems = useMemo(() => {
    switch (activeFilter) {
      case "open":
        // qa.status == "open"
        return allQaItems.filter(q => q.status === "open");
      case "draft_ready":
        // qa.draftStatus == "ready" AND !qa.submittedAnswer (issuer/bookrunner only)
        return allQaItems.filter(q =>
          q.draftStatus === "ready" &&
          (!q.submittedAnswer || q.submittedAnswer.trim() === "")
        );
      case "answered":
        // qa.status == "answered" OR !!qa.submittedAnswer
        return allQaItems.filter(q =>
          q.status === "answered" ||
          q.status === "closed" ||
          (q.submittedAnswer && q.submittedAnswer.trim() !== "")
        );
      case "awaiting_draft":
        return allQaItems.filter(q => q.draftStatus === "none" || q.draftStatus === "generating");
      default:
        return allQaItems;
    }
  }, [allQaItems, activeFilter]);

  // Compute counts for status chips
  const statusCounts = useMemo(() => ({
    all: allQaItems.length,
    open: allQaItems.filter(q => q.status === "open").length,
    draft_ready: allQaItems.filter(q =>
      q.draftStatus === "ready" &&
      (!q.submittedAnswer || q.submittedAnswer.trim() === "")
    ).length,
    answered: allQaItems.filter(q =>
      q.status === "answered" ||
      q.status === "closed" ||
      (q.submittedAnswer && q.submittedAnswer.trim() !== "")
    ).length
  }), [allQaItems]);

  const handleDealChange = (newDealId: string) => {
    navigate(`/deal/${newDealId}/qa`);
  };

  return (
    <Layout>
      <div className="space-y-6 animate-in fade-in duration-500">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <Link href={`/deal/${dealId}/overview`} className="hover:text-primary">{currentDeal?.dealName || "Deal"}</Link>
              <span>/</span>
              <span>Q&A</span>
            </div>
            <h1 className="text-2xl font-semibold text-primary tracking-tight">Lender Q&A</h1>
            <p className="text-muted-foreground mt-1">Manage lender inquiries and diligence questions.</p>
          </div>
          <div className="flex gap-3 items-center">
            {isInternal && (
              <Select value={dealId} onValueChange={handleDealChange}>
                <SelectTrigger className="w-[200px]" data-testid="select-deal">
                  <SelectValue placeholder="Select Deal" />
                </SelectTrigger>
                <SelectContent>
                  {availableDeals.map(d => (
                    <SelectItem key={d.id} value={d.id}>{d.dealName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {activeTab === "live" && (
              <Button
                variant="outline"
                className="gap-2"
                onClick={() => {
                  const headers = ["Deal", "Lender", "Category", "Status", "Question", "AskedAt", "Answer", "AnsweredAt", "MaterialSource", "OriginSource"];
                  const rows = qaItems.map(q => [
                    currentDeal?.dealName || dealId,
                    q.asker || "Investor",
                    q.topic || "General",
                    q.status,
                    q.question,
                    q.questionCreatedAt ? format(parseISO(q.questionCreatedAt), "yyyy-MM-dd HH:mm") : "",
                    q.submittedAnswer || q.answer || "",
                    q.submittedAt || q.answerUpdatedAt ? format(parseISO(q.submittedAt || q.answerUpdatedAt || ""), "yyyy-MM-dd HH:mm") : "",
                    MaterialSourceLabels[q.materialSource] || q.materialSource,
                    q.originSource || "direct"
                  ]);
                  downloadCSV(`${currentDeal?.dealName || "deal"}_qa_export.csv`, headers, rows);
                  toast({ title: "Export Complete", description: `Exported ${qaItems.length} Q&A items to CSV.` });
                }}
                data-testid="button-export-qa"
              >
                <Download className="h-4 w-4" /> Export Q&A Log
              </Button>
            )}
            {isInvestor && activeTab === "live" && (
              <Link href={`/deal/${dealId}/messages`}>
                <Button className="gap-2">
                    <MessageCircle className="h-4 w-4" /> Ask Question
                </Button>
              </Link>
            )}
          </div>
        </div>

        {/* Tab Navigation */}
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="live" className="gap-2">
              <MessageCircle className="h-4 w-4" />
              Live Q&A
            </TabsTrigger>
            <TabsTrigger value="prior" className="gap-2">
              <History className="h-4 w-4" />
              Prior Process Q&A
            </TabsTrigger>
          </TabsList>

          {/* Live Q&A Tab */}
          <TabsContent value="live" className="mt-6">
            {/* Status Summary Chips - Clickable filters */}
        <div className="flex flex-wrap gap-2">
          <StatusChip
            label="All"
            count={statusCounts.all}
            active={activeFilter === "all"}
            onClick={() => handleFilterChange("all")}
          />
          <StatusChip
            label="Open"
            count={statusCounts.open}
            active={activeFilter === "open"}
            onClick={() => handleFilterChange("open")}
            variant="warning"
          />
          {isInternal && (
            <StatusChip
              label="Draft Ready"
              count={statusCounts.draft_ready}
              active={activeFilter === "draft_ready"}
              onClick={() => handleFilterChange("draft_ready")}
              variant="info"
            />
          )}
          <StatusChip
            label="Answered"
            count={statusCounts.answered}
            active={activeFilter === "answered"}
            onClick={() => handleFilterChange("answered")}
            variant="success"
          />
        </div>

        <div className="grid gap-6 md:grid-cols-4">
          {/* Stats / Filters */}
          <div className="space-y-4 col-span-1">
             <Card className="border-border/60 shadow-sm">
              <CardContent className="p-4 space-y-4">
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Status</h3>
                  <div className="space-y-1">
                    <FilterItem
                      label="All Questions"
                      count={statusCounts.all}
                      active={activeFilter === "all"}
                      onClick={() => handleFilterChange("all")}
                    />
                    <FilterItem
                      label="Open"
                      count={statusCounts.open}
                      dot="bg-red-500"
                      active={activeFilter === "open"}
                      onClick={() => handleFilterChange("open")}
                    />
                    {isInternal && (
                      <FilterItem
                        label="Draft Ready"
                        count={statusCounts.draft_ready}
                        dot="bg-amber-500"
                        active={activeFilter === "draft_ready"}
                        onClick={() => handleFilterChange("draft_ready")}
                      />
                    )}
                    <FilterItem
                      label="Answered"
                      count={statusCounts.answered}
                      dot="bg-green-500"
                      active={activeFilter === "answered"}
                      onClick={() => handleFilterChange("answered")}
                    />
                  </div>
                </div>

                {isInternal && (
                  <div className="space-y-2 pt-4 border-t border-border">
                    <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Source</h3>
                    <div className="space-y-1">
                      {MaterialSources.map(src => (
                        <FilterItem
                          key={src}
                          label={MaterialSourceLabels[src]}
                          count={allQaItems.filter(q => q.materialSource === src).length}
                        />
                      ))}
                    </div>
                  </div>
                )}

                <div className="space-y-2 pt-4 border-t border-border">
                  <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Topics</h3>
                   <div className="space-y-1">
                    <FilterItem label="Financials" count={allQaItems.filter(q => q.topic === 'Financials' || q.category === 'Financials').length} />
                    <FilterItem label="Legal" count={allQaItems.filter(q => q.topic === 'Legal' || q.category === 'Legal / Documentation').length} />
                    <FilterItem label="Commercial" count={allQaItems.filter(q => q.topic === 'Commercial' || q.category === 'Commercial').length} />
                  </div>
                </div>
              </CardContent>
             </Card>
          </div>

          {/* Q&A List */}
          <div className="col-span-3 space-y-4">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Search questions or keywords..." 
                  className="pl-9 bg-white"
                />
              </div>
              <Button variant="outline" className="gap-2">
                <Filter className="h-4 w-4" /> Filter
              </Button>
            </div>

            {qaItems.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg bg-secondary/5">
                <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-20" />
                <h3 className="text-lg font-medium">No Lender Q&A Questions Yet</h3>
                <p className="text-sm mt-1">
                  {isInvestor
                    ? "Use Messages to ask diligence questions."
                    : "Questions from lenders will appear here."}
                </p>
                {isInvestor && (
                  <Link href={`/deal/${dealId}/messages`}>
                    <Button className="mt-4 gap-2">
                      <MessageCircle className="h-4 w-4" /> Go to Messages
                    </Button>
                  </Link>
                )}
              </div>
            ) : (
              <Accordion type="single" collapsible className="space-y-3">
                {qaItems.map(item => (
                  <QAItemRow key={item.id} item={item} isInternal={!isInvestor} onUpdate={refresh} />
                ))}
              </Accordion>
            )}
          </div>
        </div>
          </TabsContent>

          {/* Prior Process Q&A Tab */}
          <TabsContent value="prior" className="mt-6">
            <PriorProcessQA dealId={dealId} />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}

function StatusChip({
  label,
  count,
  active,
  onClick,
  variant = "default"
}: {
  label: string;
  count: number;
  active?: boolean;
  onClick: () => void;
  variant?: "default" | "warning" | "info" | "success";
}) {
  const variantStyles = {
    default: active
      ? "bg-primary text-primary-foreground border-primary"
      : "bg-background text-foreground border-border hover:bg-secondary",
    warning: active
      ? "bg-red-500 text-white border-red-500"
      : "bg-red-50 text-red-700 border-red-200 hover:bg-red-100",
    info: active
      ? "bg-amber-500 text-white border-amber-500"
      : "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100",
    success: active
      ? "bg-green-500 text-white border-green-500"
      : "bg-green-50 text-green-700 border-green-200 hover:bg-green-100"
  };

  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-medium transition-all",
        variantStyles[variant]
      )}
    >
      {label}
      <span className={cn(
        "inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-xs font-semibold",
        active
          ? "bg-white/20 text-inherit"
          : variant === "default"
            ? "bg-muted text-muted-foreground"
            : "bg-white/50"
      )}>
        {count}
      </span>
    </button>
  );
}

function FilterItem({
  label,
  count,
  active,
  dot,
  onClick
}: {
  label: string;
  count: number;
  active?: boolean;
  dot?: string;
  onClick?: () => void;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between p-2 rounded-md transition-colors text-sm",
        onClick ? "cursor-pointer" : "",
        active ? "bg-secondary text-primary font-medium" : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
      )}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') onClick(); } : undefined}
    >
      <div className="flex items-center gap-2">
        {dot && <div className={cn("h-2 w-2 rounded-full", dot)} />}
        {label}
      </div>
      <span className={cn(
        "text-xs bg-background border border-border px-1.5 py-0.5 rounded-full",
        active ? "opacity-100" : "opacity-70"
      )}>
        {count}
      </span>
    </div>
  );
}

function QAItemRow({ item, isInternal, onUpdate }: { item: QAItem; isInternal: boolean; onUpdate: () => void }) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [draft, setDraft] = useState(item.draftAnswer || "");
  const [selectedSource, setSelectedSource] = useState<MaterialSource>(item.materialSource);
  const [sourceNotes, setSourceNotes] = useState(item.sourceNotes || "");
  const [isRegenerating, setIsRegenerating] = useState(false);

  // Can submit only if:
  // - role is issuer or bookrunner (isInternal)
  // - draftAnswer has content
  // - if source is "other", sourceNotes must be provided
  const canSubmit = isInternal &&
    draft.trim().length > 0 &&
    (selectedSource !== "other" || sourceNotes.trim().length > 0);

  const handleSourceChange = (newSource: MaterialSource) => {
    setSelectedSource(newSource);
    setDraftSource(item.id, newSource, newSource === "other" ? sourceNotes : undefined);
    // Refresh the draft from the store
    const updatedItem = { ...item };
    setDraft(updatedItem.draftAnswer || "");
    onUpdate();
  };

  const handleRegenerateDraft = () => {
    setIsRegenerating(true);
    generateDraftAnswer(item.id);
    setTimeout(() => {
      setIsRegenerating(false);
      // Refresh draft from store
      onUpdate();
    }, 500);
    toast({
      title: "Draft Regenerated",
      description: "A new draft has been generated based on the selected source."
    });
  };

  const handleSaveDraft = () => {
    updateDraftAnswer(item.id, draft);
    if (selectedSource === "other") {
      setDraftSource(item.id, selectedSource, sourceNotes);
    }
    toast({
      title: "Draft Saved",
      description: "Your draft has been saved. It is not visible to investors."
    });
    onUpdate();
  };

  const handleSubmitToInvestor = () => {
    if (!canSubmit) {
      if (selectedSource === "other" && sourceNotes.trim().length === 0) {
        toast({
          title: "Source Notes Required",
          description: "Please provide source notes when 'Other' is selected as the source.",
          variant: "destructive"
        });
        return;
      }
      return;
    }

    // Make sure draft is saved first
    updateDraftAnswer(item.id, draft);
    if (selectedSource === "other") {
      setDraftSource(item.id, selectedSource, sourceNotes);
    }

    const success = submitAnswer(item.id, user?.email || "bookrunner@bank.com");
    if (success) {
      toast({
        title: "Response Submitted",
        description: "The investor can now see your response."
      });
      onUpdate();
    } else {
      toast({
        title: "Submission Failed",
        description: "Please ensure draft answer is not empty and source notes are provided if required.",
        variant: "destructive"
      });
    }
  };

  // Sync local state when item changes
  React.useEffect(() => {
    setDraft(item.draftAnswer || "");
    setSelectedSource(item.materialSource);
    setSourceNotes(item.sourceNotes || "");
  }, [item.draftAnswer, item.materialSource, item.sourceNotes]);

  return (
    <Card className="border-border/60 shadow-sm overflow-hidden">
      <AccordionItem value={item.id} className="border-none">
        <AccordionTrigger className="px-6 py-4 hover:bg-secondary/20 hover:no-underline">
          <div className="flex flex-col gap-2 text-left w-full">
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2 flex-wrap">
                <StatusBadge status={item.status} draftStatus={item.draftStatus} isInternal={isInternal} />
                <Badge variant="outline" className="text-xs font-normal text-muted-foreground">
                  {item.category || item.topic || "General"}
                </Badge>
                {/* Source badge - shown to both but labeled differently */}
                <Badge variant="secondary" className="text-[10px] gap-1 h-5 px-1.5">
                  <FileText className="h-3 w-3" /> {MaterialSourceLabels[item.materialSource]}
                </Badge>
                {item.originSource === "messages" && (
                  <Badge variant="secondary" className="text-[10px] gap-1 h-5 px-1.5">
                    <MessageCircle className="h-3 w-3" /> From Messages
                  </Badge>
                )}
              </div>
              <span className="text-xs text-muted-foreground font-normal">
                {formatDistanceToNow(parseISO(item.questionCreatedAt), { addSuffix: true })}
              </span>
            </div>
            <p className="font-medium text-foreground pr-4">{item.question}</p>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <User className="h-3 w-3" /> Asked by <span className="font-medium text-foreground">{item.asker || "Investor"}</span>
              {isInternal && item.lenderId && (
                <span className="text-muted-foreground">• Lender ID: {item.lenderId}</span>
              )}
            </div>
          </div>
        </AccordionTrigger>
        <AccordionContent className="px-6 pb-6 bg-secondary/10 border-t border-border/40">
          <div className="pt-4 space-y-4">
            {/* INVESTOR VIEW: Show submitted answer or awaiting response */}
            {!isInternal && (
              <>
                {item.submittedAnswer ? (
                  <div className="bg-green-50/50 border border-green-100 p-4 rounded-md">
                    <div className="text-xs font-semibold text-green-800 mb-1 flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" /> Response
                      {item.submittedAt && (
                        <span className="text-green-600/70 font-normal ml-1">
                          • {formatDistanceToNow(parseISO(item.submittedAt), { addSuffix: true })}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-foreground whitespace-pre-wrap">{item.submittedAnswer}</p>
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground italic bg-secondary/20 p-4 rounded text-center flex items-center justify-center gap-2">
                    <Clock className="h-4 w-4" />
                    Awaiting response from deal team...
                  </div>
                )}
              </>
            )}

            {/* ISSUER/BOOKRUNNER VIEW: Show draft editor and controls */}
            {isInternal && (
              <>
                {/* If already submitted, show the submitted answer */}
                {item.draftStatus === "submitted" && item.submittedAnswer && (
                  <div className="bg-green-50/50 border border-green-100 p-4 rounded-md">
                    <div className="text-xs font-semibold text-green-800 mb-1 flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" /> Submitted to Investor
                      {item.submittedAt && (
                        <span className="text-green-600/70 font-normal ml-1">
                          • {formatDistanceToNow(parseISO(item.submittedAt), { addSuffix: true })}
                        </span>
                      )}
                      {item.submittedBy && (
                        <span className="text-green-600/70 font-normal ml-1">
                          by {item.submittedBy}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-foreground whitespace-pre-wrap">{item.submittedAnswer}</p>
                  </div>
                )}

                {/* Draft Answer Panel - only if not yet submitted */}
                {item.draftStatus !== "submitted" && (
                  <Card className="border-amber-200 bg-amber-50/30">
                    <CardContent className="p-4 space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-semibold text-amber-800 flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          Draft Answer
                          <DraftStatusBadge status={item.draftStatus} />
                        </div>
                        <p className="text-xs text-muted-foreground italic">
                          Draft is internal. Investor sees only submitted responses.
                        </p>
                      </div>

                      {/* Source Selector */}
                      <div className="space-y-2">
                        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Answer Source
                        </label>
                        <Select value={selectedSource} onValueChange={(val) => handleSourceChange(val as MaterialSource)}>
                          <SelectTrigger className="w-full bg-white">
                            <SelectValue placeholder="Select source..." />
                          </SelectTrigger>
                          <SelectContent>
                            {MaterialSources.map(src => (
                              <SelectItem key={src} value={src}>
                                {MaterialSourceLabels[src]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Source Notes - required if source is "other" */}
                      {selectedSource === "other" && (
                        <div className="space-y-2">
                          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                            Source Notes <span className="text-red-500">*</span>
                            <AlertCircle className="h-3 w-3 text-amber-600" />
                          </label>
                          <Input
                            placeholder="Describe where this information comes from..."
                            value={sourceNotes}
                            onChange={(e) => setSourceNotes(e.target.value)}
                            className="bg-white"
                          />
                          {sourceNotes.trim().length === 0 && (
                            <p className="text-xs text-red-500">Required when source is "Other"</p>
                          )}
                        </div>
                      )}

                      {/* Draft Editor */}
                      <div className="space-y-2">
                        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Response Draft
                        </label>
                        <Textarea
                          className="bg-white min-h-[120px]"
                          placeholder="Type your response here..."
                          value={draft}
                          onChange={(e) => setDraft(e.target.value)}
                        />
                      </div>

                      {/* Action Buttons */}
                      <div className="flex justify-between items-center pt-2 border-t border-amber-200">
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-2"
                          onClick={handleRegenerateDraft}
                          disabled={isRegenerating}
                        >
                          <RefreshCw className={cn("h-3 w-3", isRegenerating && "animate-spin")} />
                          Regenerate Draft
                        </Button>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-2"
                            onClick={handleSaveDraft}
                          >
                            <Save className="h-3 w-3" /> Save Draft
                          </Button>
                          <Button
                            size="sm"
                            className="gap-2"
                            onClick={handleSubmitToInvestor}
                            disabled={!canSubmit}
                          >
                            <Send className="h-3 w-3" /> Submit to Investor
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            )}

            {/* Link back to thread if it exists */}
            {item.threadId && item.originSource === "messages" && (
              <div className="flex justify-end pt-2">
                <Link href={`/deal/${item.dealId}/messages?threadId=${item.threadId}&qaId=${item.id}`}>
                  <Button variant="link" size="sm" className="text-xs text-muted-foreground gap-1 h-auto p-0" data-testid={`link-messages-${item.id}`}>
                    View in Messages <ExternalLink className="h-3 w-3" />
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </AccordionContent>
      </AccordionItem>
    </Card>
  );
}

function StatusBadge({ status, draftStatus, isInternal }: { status: string; draftStatus?: string; isInternal?: boolean }) {
  // For investors, show simpler status
  if (!isInternal) {
    if (status === "answered" || status === "closed") {
      return (
        <Badge variant="outline" className="font-medium border bg-green-100 text-green-700 border-green-200">
          Answered
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="font-medium border bg-amber-100 text-amber-700 border-amber-200">
        Pending
      </Badge>
    );
  }

  // For internal users, show detailed status
  const styles: Record<string, string> = {
    open: "bg-red-100 text-red-700 border-red-200",
    draft: "bg-amber-100 text-amber-700 border-amber-200",
    answered: "bg-green-100 text-green-700 border-green-200",
    closed: "bg-gray-100 text-gray-700 border-gray-200"
  };

  const labels: Record<string, string> = {
    open: "Open Question",
    draft: "Draft Pending",
    answered: "Submitted",
    closed: "Closed"
  };

  // Override based on draftStatus for more granular view
  if (draftStatus === "submitted") {
    return (
      <Badge variant="outline" className="font-medium border bg-green-100 text-green-700 border-green-200">
        Submitted
      </Badge>
    );
  }

  if (draftStatus === "ready" && status !== "answered") {
    return (
      <Badge variant="outline" className="font-medium border bg-amber-100 text-amber-700 border-amber-200">
        Draft Ready
      </Badge>
    );
  }

  if (draftStatus === "generating") {
    return (
      <Badge variant="outline" className="font-medium border bg-blue-100 text-blue-700 border-blue-200">
        Generating Draft
      </Badge>
    );
  }

  if (draftStatus === "none" || !draftStatus) {
    return (
      <Badge variant="outline" className="font-medium border bg-gray-100 text-gray-700 border-gray-200">
        Awaiting Draft
      </Badge>
    );
  }

  return (
    <Badge variant="outline" className={cn("font-medium border", styles[status] || styles.open)}>
      {labels[status] || status}
    </Badge>
  );
}

function DraftStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    none: "bg-gray-100 text-gray-600",
    generating: "bg-blue-100 text-blue-700",
    ready: "bg-amber-100 text-amber-700",
    submitted: "bg-green-100 text-green-700"
  };

  const labels: Record<string, string> = {
    none: "No Draft",
    generating: "Generating...",
    ready: "Ready",
    submitted: "Submitted"
  };

  return (
    <Badge variant="secondary" className={cn("text-[10px] h-5 px-1.5", styles[status] || styles.none)}>
      {labels[status] || status}
    </Badge>
  );
}
