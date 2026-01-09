import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Bell,
  FileText,
  DollarSign,
  MessageSquare,
  CheckCircle2,
  AlertCircle,
  Clock,
  X,
  Check,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export type NotificationType =
  | "document_uploaded"
  | "commitment_approved"
  | "commitment_submitted"
  | "qa_answered"
  | "deal_update"
  | "deadline_reminder";

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  dealId?: string;
  dealName?: string;
  resourceId?: string;
  read: boolean;
  createdAt: Date;
}

// Mock notifications for demo
const mockNotifications: Notification[] = [
  {
    id: "1",
    type: "document_uploaded",
    title: "New Document Available",
    message: "Lender Presentation v2.1 has been uploaded to Acme Corp TL deal.",
    dealId: "101",
    dealName: "Acme Corp TL",
    read: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 15), // 15 mins ago
  },
  {
    id: "2",
    type: "commitment_approved",
    title: "Commitment Approved",
    message: "Your $10M commitment to TechStart Revolver has been approved.",
    dealId: "102",
    dealName: "TechStart Revolver",
    read: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
  },
  {
    id: "3",
    type: "qa_answered",
    title: "Q&A Response",
    message: "Bookrunner responded to your question about covenant definitions.",
    dealId: "101",
    dealName: "Acme Corp TL",
    read: true,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
  },
  {
    id: "4",
    type: "deadline_reminder",
    title: "Deadline Approaching",
    message: "Commitment deadline for HealthCo ABL is in 2 days.",
    dealId: "103",
    dealName: "HealthCo ABL",
    read: true,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2), // 2 days ago
  },
];

const getNotificationIcon = (type: NotificationType) => {
  switch (type) {
    case "document_uploaded":
      return <FileText className="h-4 w-4 text-blue-500" />;
    case "commitment_approved":
      return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    case "commitment_submitted":
      return <DollarSign className="h-4 w-4 text-purple-500" />;
    case "qa_answered":
      return <MessageSquare className="h-4 w-4 text-orange-500" />;
    case "deal_update":
      return <AlertCircle className="h-4 w-4 text-yellow-500" />;
    case "deadline_reminder":
      return <Clock className="h-4 w-4 text-red-500" />;
    default:
      return <Bell className="h-4 w-4" />;
  }
};

interface NotificationCenterProps {
  onNavigate?: (href: string) => void;
}

export function NotificationCenter({ onNavigate }: NotificationCenterProps) {
  const [notifications, setNotifications] = useState<Notification[]>(mockNotifications);
  const [isOpen, setIsOpen] = useState(false);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const removeNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const handleNotificationClick = (notification: Notification) => {
    markAsRead(notification.id);
    if (notification.dealId && onNavigate) {
      onNavigate(`/deal/${notification.dealId}/overview`);
      setIsOpen(false);
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-destructive text-[10px] font-medium text-destructive-foreground flex items-center justify-center">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h4 className="font-semibold">Notifications</h4>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" onClick={markAllAsRead} className="text-xs h-7">
              <Check className="h-3 w-3 mr-1" />
              Mark all read
            </Button>
          )}
        </div>

        <ScrollArea className="h-[400px]">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Bell className="h-8 w-8 mb-2 opacity-50" />
              <p className="text-sm">No notifications</p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`relative px-4 py-3 hover:bg-muted/50 cursor-pointer transition-colors ${
                    !notification.read ? "bg-primary/5" : ""
                  }`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 mt-0.5">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={`text-sm ${!notification.read ? "font-medium" : ""}`}>
                          {notification.title}
                        </p>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            removeNotification(notification.id);
                          }}
                          className="text-muted-foreground hover:text-foreground p-0.5"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {notification.message}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        {notification.dealName && (
                          <Badge variant="outline" className="text-xs px-1.5 py-0">
                            {notification.dealName}
                          </Badge>
                        )}
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(notification.createdAt, { addSuffix: true })}
                        </span>
                      </div>
                    </div>
                    {!notification.read && (
                      <div className="absolute left-1 top-1/2 -translate-y-1/2">
                        <div className="h-2 w-2 rounded-full bg-primary" />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        <div className="border-t px-4 py-2">
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-xs"
            onClick={() => {
              setIsOpen(false);
              onNavigate?.("/notifications");
            }}
          >
            View all notifications
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
