import React from "react";
import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { getDealStageChip, StatusChip, DealStageType } from "@/lib/status-chips";
import { Calendar, Building2, Briefcase, DollarSign, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { format, parseISO, differenceInDays } from "date-fns";

interface Deal {
  id: string;
  dealName: string;
  sponsor: string;
  industry: string;
  instrument: string;
  size: number;
  stage?: string;
  nextDeadline?: string;
  nextDeadlineLabel?: string;
}

interface DealPageHeaderProps {
  deal: Deal;
  role?: "Investor" | "Issuer" | "Bookrunner";
  showBackLink?: boolean;
  backLinkHref?: string;
}

export function DealPageHeader({ deal, role, showBackLink = false, backLinkHref }: DealPageHeaderProps) {
  const stageChip = getDealStageChip((deal.stage || "marketing") as DealStageType);
  
  const deadlineDays = deal.nextDeadline 
    ? differenceInDays(parseISO(deal.nextDeadline), new Date()) 
    : null;
  
  const isDeadlineUrgent = deadlineDays !== null && deadlineDays <= 3;

  return (
    <div className="bg-gradient-to-r from-primary/5 via-primary/3 to-transparent border-b border-border/60 -mx-6 md:-mx-8 -mt-6 md:-mt-8 px-6 md:px-8 py-4 mb-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-2">
          {showBackLink && (
            <Link href={backLinkHref || (role === "Investor" ? "/investor" : "/deals")}>
              <Button variant="ghost" size="sm" className="h-7 px-2 -ml-2 text-muted-foreground hover:text-foreground gap-1">
                <ArrowLeft className="h-3.5 w-3.5" />
                <span className="text-xs">Back</span>
              </Button>
            </Link>
          )}
          
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Briefcase className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-serif font-bold text-primary tracking-tight" data-testid="text-deal-name">
                {deal.dealName}
              </h1>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Building2 className="h-3.5 w-3.5" />
                <span>{deal.sponsor}</span>
                <span className="text-border">•</span>
                <span>{deal.industry}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-background/80 backdrop-blur-sm rounded-lg px-3 py-2 border border-border/50">
            <DollarSign className="h-4 w-4 text-muted-foreground" />
            <div className="text-sm">
              <span className="font-semibold">${(deal.size / 1000000).toFixed(0)}M</span>
              <span className="text-muted-foreground ml-1">{deal.instrument}</span>
            </div>
          </div>

          <StatusChip config={stageChip} />

          {deal.nextDeadline && deal.nextDeadlineLabel && (
            <div className={cn(
              "flex items-center gap-2 rounded-lg px-3 py-2 border text-sm",
              isDeadlineUrgent 
                ? "bg-red-50 border-red-200 text-red-700" 
                : "bg-background/80 border-border/50 text-muted-foreground"
            )}>
              <Calendar className="h-4 w-4" />
              <span>
                <span className="font-medium">{deal.nextDeadlineLabel}</span>
                {deadlineDays !== null && (
                  <span className="ml-1">
                    {deadlineDays === 0 ? "Today" : deadlineDays === 1 ? "Tomorrow" : `in ${deadlineDays} days`}
                  </span>
                )}
              </span>
            </div>
          )}
        </div>
      </div>

      {role === "Investor" && (
        <div className="mt-3 text-[10px] text-muted-foreground/70 flex items-center gap-1">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-green-500"></span>
          Access logged · NDA enforced · You only see your own submissions and questions
        </div>
      )}
    </div>
  );
}
