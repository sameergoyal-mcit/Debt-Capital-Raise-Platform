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

  return (
    <div className="bg-amber-50/80 border border-amber-200/60 rounded-lg px-4 py-3 mb-6 animate-in fade-in slide-in-from-top-2 duration-300" data-testid="action-required-bar">
      <div className="flex items-center gap-2 mb-2">
        <AlertCircle className="h-4 w-4 text-amber-600" />
        <span className="text-sm font-semibold text-amber-800">
          {actions.length} Action{actions.length > 1 ? "s" : ""} Required
        </span>
      </div>
      
      <div className="flex flex-wrap gap-2">
        {actions.map((action) => (
          <Link key={action.id} href={action.href}>
            <button
              className={cn(
                "inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all",
                "hover:scale-[1.02] active:scale-[0.98]",
                action.urgent
                  ? "bg-red-100 text-red-700 border border-red-200 hover:bg-red-150"
                  : "bg-white text-amber-700 border border-amber-200 hover:bg-amber-100"
              )}
              data-testid={`action-${action.type}`}
            >
              {actionIcons[action.type]}
              <span>{action.label}</span>
              {action.count !== undefined && action.count > 0 && (
                <Badge variant="secondary" className="h-4 px-1.5 text-[10px] bg-amber-200/50">
                  {action.count}
                </Badge>
              )}
              <ChevronRight className="h-3 w-3 opacity-50" />
            </button>
          </Link>
        ))}
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
