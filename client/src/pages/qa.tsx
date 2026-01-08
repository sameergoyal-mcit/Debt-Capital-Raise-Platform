import React, { useState, useMemo, useEffect } from "react";
import { Link, useRoute } from "wouter";
import { 
  Search, 
  Filter, 
  MessageCircle, 
  CheckCircle2, 
  Clock, 
  ChevronDown,
  User,
  Send,
  Download,
  ExternalLink
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/context/auth-context";
import { getQAs, updateQA, QAItem } from "@/data/qa";
import { mockMessages, Message } from "@/data/messages";
import { formatDistanceToNow, parseISO } from "date-fns";
import { useToast } from "@/hooks/use-toast";

export default function QACenter() {
  const [, params] = useRoute("/deal/:id/qa");
  const dealId = params?.id || "101"; // Default to 101 for mock
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Force refresh helper
  const [refreshKey, setRefreshKey] = useState(0);
  const refresh = () => setRefreshKey(prev => prev + 1);

  const isInvestor = user?.role === "Investor";

  // Fetch data based on role
  const qaItems = useMemo(() => {
    return getQAs(dealId, isInvestor ? user?.lenderId : undefined);
  }, [dealId, user, isInvestor, refreshKey]);

  return (
    <Layout>
      <div className="space-y-6 animate-in fade-in duration-500">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <Link href={`/deal/${dealId}/overview`} className="hover:text-primary">Project Titan</Link>
              <span>/</span>
              <span>Q&A</span>
            </div>
            <h1 className="text-3xl font-serif font-bold text-primary tracking-tight">Due Diligence Q&A</h1>
            <p className="text-muted-foreground mt-1">Manage investor inquiries and diligence questions.</p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" className="gap-2">
              <Download className="h-4 w-4" /> Export Q&A Log
            </Button>
            {isInvestor && (
              <Link href="/messages">
                <Button className="gap-2">
                    <MessageCircle className="h-4 w-4" /> Ask Question
                </Button>
              </Link>
            )}
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-4">
          {/* Stats / Filters */}
          <div className="space-y-4 col-span-1">
             <Card className="border-border/60 shadow-sm">
              <CardContent className="p-4 space-y-4">
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Status</h3>
                  <div className="space-y-1">
                    <FilterItem label="All Questions" count={qaItems.length} active />
                    <FilterItem label="Open" count={qaItems.filter(q => q.status === 'open').length} dot="bg-red-500" />
                    {!isInvestor && <FilterItem label="Draft Answers" count={qaItems.filter(q => q.status === 'draft').length} dot="bg-amber-500" />}
                    <FilterItem label="Closed/Answered" count={qaItems.filter(q => q.status === 'answered' || q.status === 'closed').length} dot="bg-green-500" />
                  </div>
                </div>
                
                <div className="space-y-2 pt-4 border-t border-border">
                  <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Topics</h3>
                   <div className="space-y-1">
                    <FilterItem label="Financials" count={qaItems.filter(q => q.topic === 'Financials').length} />
                    <FilterItem label="Legal" count={qaItems.filter(q => q.topic === 'Legal').length} />
                    <FilterItem label="Commercial" count={qaItems.filter(q => q.topic === 'Commercial').length} />
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
                <h3 className="text-lg font-medium">No Questions Yet</h3>
                <p className="text-sm mt-1">Questions asked via Messages will appear here.</p>
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
      </div>
    </Layout>
  );
}

function FilterItem({ label, count, active, dot }: { label: string; count: number; active?: boolean; dot?: string }) {
  return (
    <div className={cn(
      "flex items-center justify-between p-2 rounded-md cursor-pointer transition-colors text-sm",
      active ? "bg-secondary text-primary font-medium" : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
    )}>
      <div className="flex items-center gap-2">
        {dot && <div className={cn("h-2 w-2 rounded-full", dot)} />}
        {label}
      </div>
      <span className="text-xs opacity-70 bg-background border border-border px-1.5 py-0.5 rounded-full">{count}</span>
    </div>
  );
}

function QAItemRow({ item, isInternal, onUpdate }: { item: QAItem; isInternal: boolean; onUpdate: () => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();
  const [draft, setDraft] = useState(item.answer || "");

  const handleSubmitAnswer = (status: "draft" | "answered") => {
    updateQA(item.id, {
        answer: draft,
        answerUpdatedAt: new Date().toISOString(),
        status: status
    });

    // Bidirectional Sync: If answered, post to message thread
    if (status === "answered" && item.threadId && item.source === "messages") {
        const newMessage: Message = {
            id: `m-qa-reply-${Date.now()}`,
            threadId: item.threadId,
            senderId: "u1", // Mock Bookrunner
            body: draft,
            createdAt: new Date().toISOString(),
            readBy: [],
            category: "due_diligence", // Keep context
            dealId: item.dealId,
            qaId: item.id
        };
        
        if (mockMessages[item.threadId]) {
            mockMessages[item.threadId].push(newMessage);
        }
    }

    toast({
        title: status === "answered" ? "Answer Published" : "Draft Saved",
        description: status === "answered" ? "The investor has been notified and message sent." : "Response saved as draft."
    });
    onUpdate();
  };

  return (
    <Card className="border-border/60 shadow-sm overflow-hidden">
      <AccordionItem value={item.id} className="border-none">
        <AccordionTrigger className="px-6 py-4 hover:bg-secondary/20 hover:no-underline" onClick={() => setIsOpen(!isOpen)}>
          <div className="flex flex-col gap-2 text-left w-full">
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2">
                <StatusBadge status={item.status} />
                <Badge variant="outline" className="text-xs font-normal text-muted-foreground">
                  {item.topic || "General"}
                </Badge>
                {item.source === "messages" && (
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
            </div>
          </div>
        </AccordionTrigger>
        <AccordionContent className="px-6 pb-6 bg-secondary/10 border-t border-border/40">
           <div className="pt-4 space-y-4">
             {/* If answered/closed, show the answer */}
             {(item.status === 'answered' || item.status === 'closed') && (
               <div className="bg-green-50/50 border border-green-100 p-4 rounded-md">
                 <div className="text-xs font-semibold text-green-800 mb-1 flex items-center gap-1">
                   <CheckCircle2 className="h-3 w-3" /> Answered
                   <span className="text-green-600/70 font-normal ml-1">
                     • {item.answerUpdatedAt && formatDistanceToNow(parseISO(item.answerUpdatedAt), { addSuffix: true })}
                   </span>
                 </div>
                 <p className="text-sm text-foreground">{item.answer}</p>
               </div>
             )}

             {/* If internal user, show edit controls for draft/open */}
             {isInternal && (item.status === 'draft' || item.status === 'open') && (
                <div className="space-y-3">
                  <div className={cn(
                      "p-4 rounded-md border",
                      item.status === 'draft' ? "bg-amber-50/50 border-amber-100" : "bg-white border-border"
                  )}>
                    <div className="text-xs font-semibold text-muted-foreground mb-1 flex items-center gap-1">
                      {item.status === 'draft' ? <Clock className="h-3 w-3 text-amber-600" /> : <MessageCircle className="h-3 w-3" />}
                      {item.status === 'draft' ? "Draft Answer" : "Your Answer"}
                    </div>
                    <Textarea 
                      className="mt-2 bg-transparent border-none focus-visible:ring-0 p-0 shadow-none min-h-[80px]" 
                      placeholder="Type your answer here..."
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="sm">Discard</Button>
                    <Button variant="outline" size="sm" onClick={() => handleSubmitAnswer('draft')}>Save Draft</Button>
                    <Button size="sm" className="gap-2" onClick={() => handleSubmitAnswer('answered')}>
                      <Send className="h-3 w-3" /> Submit Answer
                    </Button>
                  </div>
                </div>
             )}
             
             {/* If investor and not answered, show pending state */}
             {!isInternal && item.status !== 'answered' && item.status !== 'closed' && (
               <div className="text-sm text-muted-foreground italic bg-secondary/20 p-3 rounded text-center">
                 Awaiting response from deal team...
               </div>
             )}
             
             {/* Link back to thread if it exists */}
             {item.threadId && item.source === "messages" && (
                 <div className="flex justify-end pt-2">
                     <Link href={`/messages?threadId=${item.threadId}&qaId=${item.id}`}>
                         <Button variant="link" size="sm" className="text-xs text-muted-foreground gap-1 h-auto p-0">
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

function StatusBadge({ status }: { status: string }) {
  const styles: any = {
    open: "bg-red-100 text-red-700 border-red-200",
    draft: "bg-amber-100 text-amber-700 border-amber-200",
    answered: "bg-green-100 text-green-700 border-green-200",
    closed: "bg-gray-100 text-gray-700 border-gray-200"
  };

  const labels: any = {
    open: "Open Question",
    draft: "Draft Pending",
    answered: "Answered",
    closed: "Closed"
  };

  return (
    <Badge variant="outline" className={cn("font-medium border", styles[status] || styles.closed)}>
      {labels[status] || status}
    </Badge>
  );
}
