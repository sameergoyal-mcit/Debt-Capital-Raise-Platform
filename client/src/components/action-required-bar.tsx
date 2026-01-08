import React from "react";
import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  AlertCircle, 
  FileText, 
  PenTool, 
  HelpCircle, 
  Users, 
  FileSignature,
  ChevronRight,
  Eye
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface ActionItem {
  id: string;
  type: "nda" | "docs" | "commitment" | "qa" | "lenders_nda" | "lenders_commitment" | "lenders_docs";
  label: string;
  count?: number;
  href: string;
  urgent?: boolean;
}

interface ActionRequiredBarProps {
  dealId: string;
  actions: ActionItem[];
  role: "Investor" | "Issuer" | "Bookrunner";
}

const actionIcons: Record<ActionItem["type"], React.ReactNode> = {
  nda: <FileSignature className="h-3.5 w-3.5" />,
  docs: <FileText className="h-3.5 w-3.5" />,
  commitment: <PenTool className="h-3.5 w-3.5" />,
  qa: <HelpCircle className="h-3.5 w-3.5" />,
  lenders_nda: <Users className="h-3.5 w-3.5" />,
  lenders_commitment: <Users className="h-3.5 w-3.5" />,
  lenders_docs: <Eye className="h-3.5 w-3.5" />
};

export function ActionRequiredBar({ dealId, actions, role }: ActionRequiredBarProps) {
  if (actions.length === 0) return null;

  // Show max 3 items, compact layout
  const displayActions = actions.slice(0, 3);
  const hasUrgent = displayActions.some(a => a.urgent);

  return (
    <div 
      className={cn(
        "rounded-md px-4 py-2.5 mb-4",
        hasUrgent 
          ? "bg-red-900/5 border border-red-900/10" 
          : "bg-amber-900/5 border border-amber-900/10"
      )} 
      data-testid="action-required-bar"
    >
      <div className="flex items-center gap-3">
        <AlertCircle 
          className={cn(
            "h-4 w-4 shrink-0",
            hasUrgent ? "text-red-800" : "text-amber-800"
          )} 
        />
        
        <div className="flex-1 flex flex-wrap items-center gap-x-4 gap-y-1">
          {displayActions.map((action, index) => (
            <React.Fragment key={action.id}>
              <Link href={action.href}>
                <span
                  className={cn(
                    "text-sm font-medium cursor-pointer hover:underline inline-flex items-center gap-1.5",
                    action.urgent ? "text-red-800" : "text-amber-800"
                  )}
                  data-testid={`action-${action.type}`}
                >
                  {actionIcons[action.type]}
                  {action.label}
                  {action.count !== undefined && action.count > 0 && (
                    <span className="text-xs opacity-70">({action.count})</span>
                  )}
                  <ChevronRight className="h-3 w-3" />
                </span>
              </Link>
              {index < displayActions.length - 1 && (
                <span className="text-slate-300">·</span>
              )}
            </React.Fragment>
          ))}
        </div>

        {actions.length > 3 && (
          <span className="text-xs text-slate-500">
            +{actions.length - 3} more
          </span>
        )}
      </div>
    </div>
  );
}

export function computeInvestorActions(
  dealId: string,
  options: {
    ndaSigned?: boolean;
    hasUpdatedDocs?: boolean;
    commitmentSubmitted?: boolean;
    hasAnsweredQA?: boolean;
    commitmentWindowOpen?: boolean;
  }
): ActionItem[] {
  const actions: ActionItem[] = [];
  
  if (!options.ndaSigned) {
    actions.push({
      id: "sign-nda",
      type: "nda",
      label: "Sign NDA",
      href: `/deal/${dealId}/documents`,
      urgent: true
    });
  }

  if (options.hasUpdatedDocs) {
    actions.push({
      id: "review-docs",
      type: "docs",
      label: "Review Updated Docs",
      href: `/deal/${dealId}/documents`
    });
  }

  if (options.commitmentWindowOpen && !options.commitmentSubmitted) {
    actions.push({
      id: "submit-commitment",
      type: "commitment",
      label: "Submit Commitment",
      href: `/deal/${dealId}/commitment`,
      urgent: true
    });
  }

  if (options.hasAnsweredQA) {
    actions.push({
      id: "review-qa",
      type: "qa",
      label: "Review Answered Q&A",
      href: `/deal/${dealId}/qa`
    });
  }

  return actions;
}

export function computeInternalActions(
  dealId: string,
  options: {
    lendersMissingNDA?: number;
    lendersMissingCommitment?: number;
    lendersNotViewedDocs?: number;
    openQACount?: number;
  }
): ActionItem[] {
  const actions: ActionItem[] = [];

  if (options.lendersMissingNDA && options.lendersMissingNDA > 0) {
    actions.push({
      id: "lenders-nda",
      type: "lenders_nda",
      label: "Lenders Missing NDA",
      count: options.lendersMissingNDA,
      href: `/deal/${dealId}/book`
    });
  }

  if (options.lendersMissingCommitment && options.lendersMissingCommitment > 0) {
    actions.push({
      id: "lenders-commitment",
      type: "lenders_commitment",
      label: "Pending Commitments",
      count: options.lendersMissingCommitment,
      href: `/deal/${dealId}/book`
    });
  }

  if (options.lendersNotViewedDocs && options.lendersNotViewedDocs > 0) {
    actions.push({
      id: "lenders-docs",
      type: "lenders_docs",
      label: "Haven't Viewed Docs",
      count: options.lendersNotViewedDocs,
      href: `/deal/${dealId}/book`
    });
  }

  if (options.openQACount && options.openQACount > 0) {
    actions.push({
      id: "open-qa",
      type: "qa",
      label: "Open Questions",
      count: options.openQACount,
      href: `/deal/${dealId}/qa`,
      urgent: options.openQACount >= 3
    });
  }

  return actions;
}
