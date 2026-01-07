import React, { useState, useMemo, useEffect } from "react";
import { Layout } from "@/components/layout";
import { useAuth } from "@/context/auth-context";
import { getThreadsForUser, getMessages, MessageThread, Message, mockMessages } from "@/data/messages";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { 
  Search, 
  Send, 
  Paperclip, 
  MoreVertical, 
  Phone, 
  Video, 
  Search as SearchIcon,
  ChevronLeft
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

export default function MessagesPage() {
  const { user } = useAuth();
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [newMessage, setNewMessage] = useState("");
  const [mobileView, setMobileView] = useState<"list" | "chat">("list");

  const threads = useMemo(() => {
    if (!user) return [];
    return getThreadsForUser(user.role, user.lenderId);
  }, [user]);

  const filteredThreads = threads.filter(t => 
    t.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.participants.some(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Group threads by category
  const groupedThreads = {
    Issuer: filteredThreads.filter(t => t.category === "Issuer"),
    Investor: filteredThreads.filter(t => t.category === "Investor"),
    Counsel: filteredThreads.filter(t => t.category === "Counsel")
  };

  const activeThread = threads.find(t => t.id === activeThreadId);
  const messages = activeThreadId ? getMessages(activeThreadId) : [];

  const handleThreadClick = (threadId: string) => {
    setActiveThreadId(threadId);
    setMobileView("chat");
  };

  const handleBackToList = () => {
    setMobileView("list");
  };

  const handleSendMessage = () => {
    if (!newMessage.trim() || !activeThreadId || !user) return;
    
    // Mock send
    const newMsg: Message = {
        id: `m-new-${Date.now()}`,
        threadId: activeThreadId,
        senderId: "u1", // Mock current user ID
        body: newMessage,
        createdAt: new Date().toISOString(),
        readBy: []
    };
    
    // In a real app we'd push to store, here we just force update local state (but since getMessages is static, we cheat a bit for UI demo)
    mockMessages[activeThreadId].push(newMsg);
    setNewMessage("");
  };

  // Auto-select first thread on desktop
  useEffect(() => {
    if (!activeThreadId && threads.length > 0 && window.innerWidth >= 768) {
      setActiveThreadId(threads[0].id);
    }
  }, [threads, activeThreadId]);

  if (!user) return null;

  return (
    <Layout>
      <div className="flex h-[calc(100vh-8rem)] rounded-lg border border-border/60 bg-background shadow-sm overflow-hidden animate-in fade-in duration-500">
        
        {/* Sidebar - Thread List */}
        <div className={cn(
          "w-full md:w-80 border-r border-border flex flex-col bg-secondary/10",
          mobileView === "chat" ? "hidden md:flex" : "flex"
        )}>
          <div className="p-4 border-b border-border space-y-4">
            <h2 className="font-serif text-xl font-bold px-1">Messages</h2>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search threads..." 
                className="pl-9 bg-background" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          
          <ScrollArea className="flex-1">
            <div className="p-2 space-y-6">
              {Object.entries(groupedThreads).map(([category, categoryThreads]) => (
                categoryThreads.length > 0 && (
                  <div key={category}>
                    <h3 className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">{category}</h3>
                    <div className="space-y-1">
                      {categoryThreads.map(thread => (
                        <button
                          key={thread.id}
                          onClick={() => handleThreadClick(thread.id)}
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
                          <span className="text-xs text-muted-foreground truncate w-full pr-2 font-medium">
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
                   No threads found.
                </div>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Main Content - Chat */}
        <div className={cn(
          "flex-1 flex flex-col bg-background",
          mobileView === "list" ? "hidden md:flex" : "flex"
        )}>
          {activeThread ? (
            <>
              {/* Chat Header */}
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

              {/* Chat Messages */}
              <ScrollArea className="flex-1 p-4 md:p-6">
                <div className="space-y-6 max-w-3xl mx-auto">
                    {/* Date separator example */}
                    <div className="flex justify-center">
                        <span className="text-[10px] text-muted-foreground bg-secondary/50 px-2 py-1 rounded-full">Today</span>
                    </div>

                  {messages.map((msg) => {
                    const isMe = msg.senderId === "u1"; // Mock current user check
                    return (
                      <div key={msg.id} className={cn("flex gap-3", isMe ? "flex-row-reverse" : "flex-row")}>
                        <Avatar className="h-8 w-8 mt-1 border">
                          <AvatarFallback>U</AvatarFallback>
                        </Avatar>
                        <div className={cn("flex flex-col gap-1 max-w-[75%]", isMe ? "items-end" : "items-start")}>
                           <div className={cn(
                             "p-3 rounded-2xl text-sm shadow-sm",
                             isMe ? "bg-primary text-primary-foreground rounded-tr-none" : "bg-secondary text-secondary-foreground rounded-tl-none"
                           )}>
                             {msg.body}
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
                           <span className="text-[10px] text-muted-foreground px-1">
                             {formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true })}
                           </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>

              {/* Chat Input */}
              <div className="p-4 bg-background border-t border-border">
                <div className="max-w-3xl mx-auto flex items-end gap-2 bg-secondary/20 p-2 rounded-lg border border-border/50 focus-within:ring-1 focus-within:ring-primary/20 transition-all">
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground shrink-0 rounded-full hover:bg-secondary/40">
                    <Paperclip className="h-4 w-4" />
                  </Button>
                  <Input 
                    className="border-0 bg-transparent focus-visible:ring-0 px-2 h-auto min-h-[36px] py-2 max-h-32 resize-none" 
                    placeholder="Type a message..." 
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSendMessage();
                        }
                    }}
                  />
                  <Button size="icon" className="h-8 w-8 shrink-0 rounded-full" onClick={handleSendMessage} disabled={!newMessage.trim()}>
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-8">
              <div className="h-16 w-16 bg-secondary/50 rounded-full flex items-center justify-center mb-4">
                <MoreVertical className="h-8 w-8 opacity-20" />
              </div>
              <p>Select a conversation to start messaging</p>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
