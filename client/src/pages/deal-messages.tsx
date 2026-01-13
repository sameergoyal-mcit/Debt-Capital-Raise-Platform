import React, { useState, useMemo, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { Layout } from "@/components/layout";
import { useAuth } from "@/context/auth-context";
import { getThreadsForUser, getMessages, MessageThread, Message, mockMessages, getAllParticipants, Mention } from "@/data/messages";
import { addQuestion, updateQA, findOpenQAForThread } from "@/data/qa";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { NewConversationDialog } from "@/components/new-conversation-dialog";
import { MentionInput } from "@/components/mention-input";
import { MentionText } from "@/components/mention-text";
import {
  Search,
  Send,
  Paperclip,
  MoreVertical,
  Phone,
  Video,
  ChevronLeft,
  MessageCircle,
  HelpCircle,
  Users,
  Building2,
  Scale,
  Plus
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useDeal } from "@/hooks/api-hooks";

export default function DealMessagesPage() {
  const [, params] = useRoute("/deal/:id/messages");
  const dealId = params?.id || "1";
  const { data: deal } = useDeal(dealId);
  
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [newMessage, setNewMessage] = useState("");
  const [messageType, setMessageType] = useState<"deal_process" | "due_diligence">("deal_process");
  const [mobileView, setMobileView] = useState<"list" | "chat">("list");
  const [filterType, setFilterType] = useState<"all" | "due_diligence" | "deal_process">("all");
  const [showNewConversation, setShowNewConversation] = useState(false);
  const [pendingMentions, setPendingMentions] = useState<Mention[]>([]);

  // Get all participants for mention picker
  const allParticipants = useMemo(() => getAllParticipants(), []);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const threadId = urlParams.get("threadId");
    const qaId = urlParams.get("qaId");
    
    if (threadId) {
      setActiveThreadId(threadId);
      setMobileView("chat");
      
      if (qaId) {
          setTimeout(() => {
              const msgs = getMessages(threadId);
              const targetMsg = msgs.find(m => m.qaId === qaId);
              
              if (targetMsg) {
                  const element = document.getElementById(`msg-${targetMsg.id}`);
                  if (element) {
                      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                      element.classList.add("bg-primary/5", "rounded-lg", "transition-colors", "duration-1000");
                      setTimeout(() => {
                          element.classList.remove("bg-primary/5");
                      }, 2000);
                  }
              }
          }, 500);
      }
    }
  }, []);

  const threads = useMemo(() => {
    if (!user) return [];
    const allThreads = getThreadsForUser(user.role, user.lenderId);
    return allThreads.filter(t => t.dealId === dealId);
  }, [user, dealId]);

  const filteredThreads = threads.filter(t => 
    t.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.participants.some(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const groupedThreads = {
    Issuer: filteredThreads.filter(t => t.category === "Issuer"),
    Investor: filteredThreads.filter(t => t.category === "Investor"),
    Counsel: filteredThreads.filter(t => t.category === "Counsel")
  };

  const activeThread = useMemo(() => {
    return threads.find(t => t.id === activeThreadId);
  }, [threads, activeThreadId]);

  const messages = useMemo(() => {
    if (!activeThreadId) return [];
    let msgs = getMessages(activeThreadId);
    
    if (filterType !== "all") {
        msgs = msgs.filter(m => m.category === filterType);
    }
    return msgs;
  }, [activeThreadId, filterType]);

  const handleThreadClick = (threadId: string) => {
    setActiveThreadId(threadId);
    setMobileView("chat");
    setMessageType("deal_process");
    setFilterType("all");
  };

  const handleBackToList = () => {
    setMobileView("list");
  };

  const handleSendMessage = () => {
    if (!newMessage.trim() || !activeThreadId || !user) return;
    
    const isInvestor = user.role?.toLowerCase() === "investor" || user.role?.toLowerCase() === "lender";
    let newQaId: string | undefined;

    if (isInvestor && messageType === "due_diligence") {
        const qaItem = addQuestion({
            dealId: dealId,
            lenderId: user.lenderId || "unknown",
            question: newMessage,
            asker: user.name,
            threadId: activeThreadId,
            originSource: "messages"
        });
        newQaId = qaItem.id;

        toast({
            title: "Q&A Item Created",
            description: "Your question has been added to the Due Diligence log with an auto-generated draft."
        });
    }

    if (!isInvestor) {
        const openQA = findOpenQAForThread(activeThreadId);
        if (openQA) {
            updateQA(openQA.id, {
                answer: newMessage,
                answerUpdatedAt: new Date().toISOString(),
                status: "answered"
            });
            toast({
                title: "Answer Synced",
                description: "This reply has been synced to the Q&A log."
            });
        }
    }

    const newMsg: Message = {
        id: `m-new-${Date.now()}`,
        threadId: activeThreadId,
        senderId: user.role?.toLowerCase() === "bookrunner" ? "u1" : "u3",
        body: newMessage,
        createdAt: new Date().toISOString(),
        readBy: [],
        category: messageType,
        dealId: dealId,
        qaId: newQaId,
        mentions: pendingMentions.length > 0 ? pendingMentions : undefined
    };

    if (!mockMessages[activeThreadId]) {
        mockMessages[activeThreadId] = [];
    }
    mockMessages[activeThreadId].push(newMsg);
    setNewMessage("");
    setPendingMentions([]);
    setMessageType("deal_process");
  };

  const handleMessageChange = (value: string, mentions: Mention[]) => {
    setNewMessage(value);
    setPendingMentions(mentions);
  };

  useEffect(() => {
    if (!activeThreadId && threads.length > 0 && window.innerWidth >= 768) {
      setActiveThreadId(threads[0].id);
    }
  }, [threads, activeThreadId]);

  if (!user) return null;

  const isInvestor = user.role?.toLowerCase() === "investor" || user.role?.toLowerCase() === "lender";

  const getCategoryIcon = (category: string) => {
    switch(category) {
      case "Issuer": return <Building2 className="h-4 w-4" />;
      case "Investor": return <Users className="h-4 w-4" />;
      case "Counsel": return <Scale className="h-4 w-4" />;
      default: return <MessageCircle className="h-4 w-4" />;
    }
  };

  return (
    <Layout>
      <div className="flex h-[calc(100vh-8rem)] rounded-lg border border-border/60 bg-background shadow-sm overflow-hidden animate-in fade-in duration-500">
        
        <div className={cn(
          "w-full md:w-80 border-r border-border flex flex-col bg-secondary/10",
          mobileView === "chat" ? "hidden md:flex" : "flex"
        )}>
          <div className="p-4 border-b border-border space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-serif text-xl font-bold">Messages</h2>
                <p className="text-xs text-muted-foreground">{deal?.dealName || "Deal"}</p>
              </div>
              <Button
                size="sm"
                className="h-8 gap-1"
                onClick={() => setShowNewConversation(true)}
              >
                <Plus className="h-4 w-4" />
                New
              </Button>
            </div>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search threads..." 
                className="pl-9 bg-background" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                data-testid="input-search-threads"
              />
            </div>
          </div>
          
          <ScrollArea className="flex-1">
            <div className="p-2 space-y-4">
              {Object.entries(groupedThreads).map(([category, categoryThreads]) => (
                categoryThreads.length > 0 && (
                  <div key={category}>
                    <h3 className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-2">
                      {getCategoryIcon(category)}
                      {category}
                    </h3>
                    <div className="space-y-1">
                      {categoryThreads.map(thread => (
                        <button
                          key={thread.id}
                          onClick={() => handleThreadClick(thread.id)}
                          data-testid={`thread-${thread.id}`}
                          className={cn(
                            "w-full flex flex-col items-start gap-1 p-3 rounded-md text-left transition-colors hover:bg-accent/50",
                            activeThreadId === thread.id ? "bg-accent text-accent-foreground" : "text-foreground"
                          )}
                        >
                          <div className="flex w-full items-center justify-between">
                            <span className="font-medium text-sm truncate max-w-[140px]">
                                {thread.participants.find(p => p.role !== user.role)?.name || thread.subject}
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              {formatDistanceToNow(new Date(thread.lastMessageAt), { addSuffix: true })}
                            </span>
                          </div>
                          <span className="text-xs text-muted-foreground truncate w-full pr-2">
                            {thread.subject}
                          </span>
                          {thread.unreadCount > 0 && (
                             <Badge variant="default" className="mt-1 h-5 px-1.5 text-[10px]">{thread.unreadCount} new</Badge>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )
              ))}
              {filteredThreads.length === 0 && (
                <div className="text-center p-8 text-muted-foreground text-sm">
                   <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-20" />
                   No conversations for this deal yet.
                </div>
              )}
            </div>
          </ScrollArea>
        </div>

        <div className={cn(
          "flex-1 flex flex-col bg-background",
          mobileView === "list" ? "hidden md:flex" : "flex"
        )}>
          {activeThread ? (
            <>
              <div className="h-16 border-b border-border flex items-center justify-between px-4 md:px-6 bg-background/50 backdrop-blur-sm">
                <div className="flex items-center gap-3">
                  <Button variant="ghost" size="icon" className="md:hidden" onClick={handleBackToList}>
                    <ChevronLeft className="h-5 w-5" />
                  </Button>
                  <Avatar className="h-9 w-9 border">
                    <AvatarFallback>{activeThread.subject.substring(0,2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col">
                    <span className="font-semibold text-sm">{activeThread.subject}</span>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                        {activeThread.participants.map(p => p.name).join(", ")}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" title="Start Call">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                  </Button>
                  <Button variant="ghost" size="icon" title="Video Call">
                    <Video className="h-4 w-4 text-muted-foreground" />
                  </Button>
                  <Button variant="ghost" size="icon">
                    <MoreVertical className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </div>
              </div>

              <div className="px-4 py-2 border-b border-border bg-secondary/5 flex items-center gap-2">
                 <span className="text-xs font-medium text-muted-foreground">Show:</span>
                 <div className="flex bg-secondary/50 rounded-md p-0.5">
                   <button 
                     onClick={() => setFilterType("all")}
                     data-testid="filter-all"
                     className={cn("text-[10px] px-2 py-1 rounded-sm transition-all", filterType === "all" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground")}
                   >
                     All
                   </button>
                   <button 
                     onClick={() => setFilterType("due_diligence")}
                     data-testid="filter-due-diligence"
                     className={cn("text-[10px] px-2 py-1 rounded-sm transition-all", filterType === "due_diligence" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground")}
                   >
                     Due Diligence
                   </button>
                   <button 
                     onClick={() => setFilterType("deal_process")}
                     data-testid="filter-deal-process"
                     className={cn("text-[10px] px-2 py-1 rounded-sm transition-all", filterType === "deal_process" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground")}
                   >
                     Process / Logistics
                   </button>
                 </div>
              </div>

              <ScrollArea className="flex-1 p-4 md:p-6">
                <div className="space-y-6 max-w-3xl mx-auto">
                    <div className="flex justify-center">
                        <span className="text-[10px] text-muted-foreground bg-secondary/50 px-2 py-1 rounded-full">Today</span>
                    </div>

                  {messages.length === 0 && (
                      <div className="text-center py-10 text-muted-foreground text-sm">
                        {filterType === "all" ? "No messages yet." : `No ${filterType.replace("_", " ")} messages found.`}
                      </div>
                  )}

                  {messages.map((msg) => {
                    const isMe = (user.role?.toLowerCase() === "bookrunner" && msg.senderId === "u1") || (user.role?.toLowerCase() === "investor" || user.role?.toLowerCase() === "lender" && msg.senderId === "u3");
                    
                    return (
                      <div key={msg.id} id={`msg-${msg.id}`} className={cn("flex gap-3 scroll-mt-24", isMe ? "flex-row-reverse" : "flex-row")}>
                        <Avatar className="h-8 w-8 mt-1 border">
                          <AvatarFallback>U</AvatarFallback>
                        </Avatar>
                        <div className={cn("flex flex-col gap-1 max-w-[75%]", isMe ? "items-end" : "items-start")}>
                           <div className={cn(
                             "p-3 rounded-2xl text-sm shadow-sm relative",
                             isMe ? "bg-primary text-primary-foreground rounded-tr-none" : "bg-secondary text-secondary-foreground rounded-tl-none"
                           )}>
                             <MentionText text={msg.body} mentions={msg.mentions} />
                           </div>
                           
                           {msg.attachments && msg.attachments.length > 0 && (
                             <div className="flex gap-2 mt-1">
                               {msg.attachments.map(att => (
                                 <div key={att.id} className="flex items-center gap-2 bg-secondary/30 border border-border/50 p-2 rounded text-xs">
                                   <Paperclip className="h-3 w-3" />
                                   <span>{att.name}</span>
                                 </div>
                               ))}
                             </div>
                           )}

                           {msg.category === "due_diligence" && (
                               <Badge variant="outline" className={cn(
                                   "mt-1 text-[10px] gap-1 px-1.5 h-5 font-normal",
                                   isMe ? "bg-primary-foreground/10 text-muted-foreground border-primary/20" : "bg-background/50 border-border/50"
                               )}>
                                   <HelpCircle className="h-3 w-3" /> Due Diligence
                               </Badge>
                           )}

                           {msg.category === "deal_process" && (
                               <Badge variant="outline" className={cn(
                                   "mt-1 text-[10px] gap-1 px-1.5 h-5 font-normal",
                                   isMe ? "bg-primary-foreground/10 text-muted-foreground border-primary/20" : "bg-background/50 border-border/50"
                               )}>
                                   <MessageCircle className="h-3 w-3" /> Process / Logistics
                               </Badge>
                           )}

                           <span className="text-[10px] text-muted-foreground px-1">
                             {formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true })}
                           </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>

              <div className="p-4 bg-background border-t border-border space-y-3">
                
                {isInvestor && activeThread.category === "Investor" && (
                  <div className="flex flex-col gap-1 px-1">
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-muted-foreground">Message Type:</span>
                        <Select value={messageType} onValueChange={(v: any) => setMessageType(v)}>
                            <SelectTrigger className="h-7 text-xs w-[180px] bg-secondary/30 border-transparent hover:bg-secondary/50 focus:ring-0" data-testid="select-message-type">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="deal_process">
                                    <div className="flex items-center gap-2">
                                        <MessageCircle className="h-3 w-3" /> Process / Logistics
                                    </div>
                                </SelectItem>
                                <SelectItem value="due_diligence">
                                    <div className="flex items-center gap-2">
                                        <HelpCircle className="h-3 w-3" /> Due Diligence Question
                                    </div>
                                </SelectItem>
                            </SelectContent>
                        </Select>
                        
                        <span className="text-[10px] text-muted-foreground hidden md:inline-block">
                            {messageType === "due_diligence" 
                                ? "Tracked in Q&A log. Best for formal diligence." 
                                : "Stays in Messages. Best for process & logistics."}
                        </span>
                    </div>
                    {messageType === "due_diligence" && (
                        <span className="text-[10px] text-primary bg-primary/5 px-2 py-1 rounded-full w-fit animate-in fade-in slide-in-from-left-2">
                            Will create a Q&A item
                        </span>
                    )}
                  </div>
                )}

                <div className="max-w-3xl mx-auto flex items-end gap-2 bg-secondary/20 p-2 rounded-lg border border-border/50 focus-within:ring-1 focus-within:ring-primary/20 transition-all">
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground shrink-0 rounded-full hover:bg-secondary/40">
                    <Paperclip className="h-4 w-4" />
                  </Button>
                  <MentionInput
                    value={newMessage}
                    onChange={handleMessageChange}
                    participants={allParticipants}
                    placeholder={isInvestor && messageType === "due_diligence" ? "Type your due diligence question... Use @ to mention" : "Type a message... Use @ to mention"}
                    className="border-0 bg-transparent focus-visible:ring-0 px-2 h-auto min-h-[36px] py-2"
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSendMessage();
                        }
                    }}
                  />
                  <Button size="icon" className="h-8 w-8 shrink-0 rounded-full" onClick={handleSendMessage} disabled={!newMessage.trim()} data-testid="button-send-message">
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-8">
              <div className="h-16 w-16 bg-secondary/50 rounded-full flex items-center justify-center mb-4">
                <MessageCircle className="h-8 w-8 opacity-20" />
              </div>
              <p>Select a conversation to start messaging</p>
            </div>
          )}
        </div>
      </div>

      {/* New Conversation Dialog */}
      <NewConversationDialog
        isOpen={showNewConversation}
        onClose={() => setShowNewConversation(false)}
        dealId={dealId}
        dealName={deal?.dealName}
        onThreadCreated={(thread) => {
          setActiveThreadId(thread.id);
          setMobileView("chat");
        }}
      />
    </Layout>
  );
}
