import React, { useState } from "react";
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
  Download
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

// Update mock items to have lenderId
const mockQAItems = [
  {
    id: "q1",
    status: "open",
    question: "Can you provide a breakdown of the COGS in the base case model vs. the downside case for FY25?",
    asker: "BlackRock Credit",
    lenderId: "1",
    date: "2 hours ago",
    topic: "Financials"
  },
  {
    id: "q2",
    status: "draft",
    question: "Please clarify the change of control provisions in the current credit agreement draft regarding the sponsor equity cure.",
    asker: "Apollo Global",
    lenderId: "2",
    date: "5 hours ago",
    topic: "Legal",
    draftAnswer: "The sponsor equity cure is limited to 2 times over the life of the facility and cannot be used in consecutive quarters. We believe this is market standard for this credit profile."
  },
  {
    id: "q3",
    status: "closed",
    question: "What is the churn rate for the Enterprise segment specifically over the last 12 months?",
    asker: "Oak Hill Advisors",
    lenderId: "3",
    date: "Yesterday",
    topic: "Commercial",
    answer: "Enterprise churn for LTM was 4.2% on a logo basis and -110% on a net revenue retention basis. Please refer to tab 'KPIs' in the Financial Model v3."
  },
  {
    id: "q4",
    status: "closed",
    question: "Are there any outstanding litigation matters related to the IP portfolio that could impact collateral value?",
    asker: "Barings",
    lenderId: "4",
    date: "2 days ago",
    topic: "Legal",
    answer: "There are no material outstanding litigation matters. Please see the Legal Vendor Due Diligence report pages 45-48 for a full IP analysis."
  }
];

export default function QACenter() {
  const [, params] = useRoute("/deal/:id/qa");
  const dealId = params?.id || "123";
  const { user } = useAuth();

  const isInvestor = user?.role === "Investor";

  // Filter questions for investors
  // If investor: only show questions from their lenderId
  // If internal: show all
  const filteredQA = isInvestor 
    ? mockQAItems.filter(q => q.lenderId === user?.lenderId)
    : mockQAItems;

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
              <DownloadReport className="h-4 w-4" /> Export Q&A Log
            </Button>
            {isInvestor && (
              <Button className="gap-2">
                <MessageCircle className="h-4 w-4" /> Ask Question
              </Button>
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
                    <FilterItem label="All Questions" count={filteredQA.length} active />
                    <FilterItem label="Open" count={filteredQA.filter(q => q.status === 'open').length} dot="bg-red-500" />
                    {!isInvestor && <FilterItem label="Draft Answers" count={filteredQA.filter(q => q.status === 'draft').length} dot="bg-amber-500" />}
                    <FilterItem label="Closed/Answered" count={filteredQA.filter(q => q.status === 'closed').length} dot="bg-green-500" />
                  </div>
                </div>
                
                <div className="space-y-2 pt-4 border-t border-border">
                  <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Topics</h3>
                   <div className="space-y-1">
                    <FilterItem label="Financials" count={filteredQA.filter(q => q.topic === 'Financials').length} />
                    <FilterItem label="Legal" count={filteredQA.filter(q => q.topic === 'Legal').length} />
                    <FilterItem label="Commercial" count={filteredQA.filter(q => q.topic === 'Commercial').length} />
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

            {filteredQA.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
                <p>No questions found.</p>
              </div>
            ) : (
              <Accordion type="single" collapsible className="space-y-3">
                {filteredQA.map(item => (
                  <QAItem key={item.id} {...item} />
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

function QAItem({ id, status, question, asker, date, topic, answer, draftAnswer }: any) {
  const [isOpen, setIsOpen] = useState(false);
  const { user } = useAuth();
  const isInternal = user?.role !== "Investor";

  return (
    <Card className="border-border/60 shadow-sm overflow-hidden">
      <AccordionItem value={id} className="border-none">
        <AccordionTrigger className="px-6 py-4 hover:bg-secondary/20 hover:no-underline" onClick={() => setIsOpen(!isOpen)}>
          <div className="flex flex-col gap-2 text-left w-full">
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2">
                <StatusBadge status={status} />
                <Badge variant="outline" className="text-xs font-normal text-muted-foreground">
                  {topic}
                </Badge>
              </div>
              <span className="text-xs text-muted-foreground font-normal">{date}</span>
            </div>
            <p className="font-medium text-foreground pr-4">{question}</p>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <User className="h-3 w-3" /> Asked by <span className="font-medium text-foreground">{asker}</span>
            </div>
          </div>
        </AccordionTrigger>
        <AccordionContent className="px-6 pb-6 bg-secondary/10 border-t border-border/40">
           <div className="pt-4 space-y-4">
             {status === 'closed' && (
               <div className="bg-green-50/50 border border-green-100 p-4 rounded-md">
                 <div className="text-xs font-semibold text-green-800 mb-1 flex items-center gap-1">
                   <CheckCircle2 className="h-3 w-3" /> Answered
                 </div>
                 <p className="text-sm text-foreground">{answer}</p>
               </div>
             )}

             {isInternal && status === 'draft' && (
                <div className="space-y-3">
                  <div className="bg-amber-50/50 border border-amber-100 p-4 rounded-md">
                    <div className="text-xs font-semibold text-amber-800 mb-1 flex items-center gap-1">
                      <Clock className="h-3 w-3" /> Draft Answer
                    </div>
                    <Textarea 
                      className="mt-2 bg-white border-amber-200 focus-visible:ring-amber-500" 
                      defaultValue={draftAnswer}
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="sm">Discard</Button>
                    <Button size="sm" className="bg-amber-600 hover:bg-amber-700 text-white gap-2">
                      <Send className="h-3 w-3" /> Submit Answer
                    </Button>
                  </div>
                </div>
             )}

             {isInternal && status === 'open' && (
               <div className="space-y-3">
                 <Textarea placeholder="Type your answer here..." className="bg-white" />
                 <div className="flex justify-end gap-2">
                   <Button variant="outline" size="sm">Save Draft</Button>
                   <Button size="sm" className="gap-2">
                     <Send className="h-3 w-3" /> Submit Answer
                   </Button>
                 </div>
               </div>
             )}
             
             {!isInternal && status !== 'closed' && (
               <div className="text-sm text-muted-foreground italic">
                 Awaiting response from deal team.
               </div>
             )}
           </div>
        </AccordionContent>
      </AccordionItem>
    </Card>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles = {
    open: "bg-red-100 text-red-700 border-red-200",
    draft: "bg-amber-100 text-amber-700 border-amber-200",
    closed: "bg-green-100 text-green-700 border-green-200"
  };

  const labels = {
    open: "Open Question",
    draft: "Draft Pending",
    closed: "Answered"
  };

  return (
    <Badge variant="outline" className={cn("font-medium border", styles[status as keyof typeof styles])}>
      {labels[status as keyof typeof labels]}
    </Badge>
  );
}

function DownloadReport({ className }: { className?: string }) {
    return (
        <svg 
            xmlns="http://www.w3.org/2000/svg" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            className={className}
        >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" x2="12" y1="15" y2="3" />
        </svg>
    )
}
