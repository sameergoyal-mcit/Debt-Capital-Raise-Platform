import React from "react";
import { Button } from "@/components/ui/button";
import { 
  FileText, 
  MessageSquare, 
  Users, 
  PenTool, 
  HelpCircle,
  FolderOpen,
  Mail,
  Calendar
} from "lucide-react";
import { Link } from "wouter";

type EmptyStateType = 
  | "commitments"
  | "qa"
  | "documents"
  | "invitations"
  | "messages"
  | "activity";

interface EmptyStateProps {
  type: EmptyStateType;
  role?: "Investor" | "Issuer" | "Bookrunner";
  actionHref?: string;
  actionLabel?: string;
  onAction?: () => void;
}

const emptyStateConfig: Record<EmptyStateType, {
  icon: React.ReactNode;
  title: string;
  description: Record<string, string>;
}> = {
  commitments: {
    icon: <PenTool className="h-10 w-10 text-muted-foreground/40" />,
    title: "No Commitments Yet",
    description: {
      Investor: "Submit your commitment when you're ready to participate in this deal.",
      Issuer: "Lender commitments will appear here once submitted.",
      Bookrunner: "Lender commitments will appear here once submitted."
    }
  },
  qa: {
    icon: <HelpCircle className="h-10 w-10 text-muted-foreground/40" />,
    title: "No Questions Yet",
    description: {
      Investor: "Have a question about this deal? Submit it here for a response from the deal team.",
      Issuer: "Lender diligence questions will be tracked here.",
      Bookrunner: "Lender diligence questions will be tracked here."
    }
  },
  documents: {
    icon: <FolderOpen className="h-10 w-10 text-muted-foreground/40" />,
    title: "No Documents Available",
    description: {
      Investor: "Documents will appear here once uploaded to the data room.",
      Issuer: "Upload documents to make them available to lenders.",
      Bookrunner: "Upload documents to make them available to lenders."
    }
  },
  invitations: {
    icon: <Mail className="h-10 w-10 text-muted-foreground/40" />,
    title: "No Lenders Invited",
    description: {
      Issuer: "Invite lenders to participate in this transaction.",
      Bookrunner: "Invite lenders to participate in this transaction.",
      Investor: ""
    }
  },
  messages: {
    icon: <MessageSquare className="h-10 w-10 text-muted-foreground/40" />,
    title: "No Messages Yet",
    description: {
      Investor: "Start a conversation with the deal team.",
      Issuer: "Lender messages will appear here.",
      Bookrunner: "Lender messages will appear here."
    }
  },
  activity: {
    icon: <Calendar className="h-10 w-10 text-muted-foreground/40" />,
    title: "No Recent Activity",
    description: {
      Investor: "Your activity on this deal will be tracked here.",
      Issuer: "Lender activity will be logged here.",
      Bookrunner: "Lender activity will be logged here."
    }
  }
};

export function EmptyState({ type, role = "Investor", actionHref, actionLabel, onAction }: EmptyStateProps) {
  const config = emptyStateConfig[type];
  const description = config.description[role] || config.description.Investor;

  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center" data-testid={`empty-state-${type}`}>
      <div className="mb-4 p-4 rounded-full bg-secondary/30">
        {config.icon}
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-2">{config.title}</h3>
      <p className="text-sm text-muted-foreground max-w-sm mb-6">{description}</p>
      
      {actionHref && actionLabel && (
        <Link href={actionHref}>
          <Button variant="outline" className="gap-2">
            {actionLabel}
          </Button>
        </Link>
      )}
      
      {onAction && actionLabel && (
        <Button variant="outline" className="gap-2" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
