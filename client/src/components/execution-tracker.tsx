import React from "react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { CheckCircle, Clock, AlertCircle, MinusCircle, FileText, PenTool, MessageSquare } from "lucide-react";
import { format, parseISO, differenceInDays } from "date-fns";

export interface LenderExecutionRow {
  lenderId: string;
  lenderName: string;
  ndaStatus: "not_sent" | "sent" | "signed";
  ndaSignedAt?: string;
  docsViewed: number;
  totalDocs: number;
  lastDocViewedAt?: string;
  commitmentStatus: "not_submitted" | "submitted" | "firm" | "withdrawn";
  commitmentAmount?: number;
  qaCount: number;
  openQaCount: number;
  lastActivityAt?: string;
}

interface ExecutionTrackerProps {
  lenders: LenderExecutionRow[];
  dealId: string;
}

const statusColors = {
  hot: "bg-green-500",
  warm: "bg-amber-400",
  cold: "bg-slate-300",
  inactive: "bg-slate-100"
};

function getEngagementLevel(row: LenderExecutionRow): "hot" | "warm" | "cold" | "inactive" {
  const now = new Date();
  if (!row.lastActivityAt) return "inactive";
  
  const daysSinceActivity = differenceInDays(now, parseISO(row.lastActivityAt));
  
  if (daysSinceActivity <= 1 && row.docsViewed / row.totalDocs > 0.5) return "hot";
  if (daysSinceActivity <= 3) return "warm";
  if (daysSinceActivity <= 7) return "cold";
  return "inactive";
}

function NDACell({ status, signedAt }: { status: string; signedAt?: string }) {
  if (status === "signed") {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger>
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 gap-1">
              <CheckCircle className="h-3 w-3" /> Signed
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p className="text-xs">Signed: {signedAt ? format(parseISO(signedAt), "MMM d, h:mm a") : "N/A"}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }
  if (status === "sent") {
    return (
      <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 gap-1">
        <Clock className="h-3 w-3" /> Pending
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="bg-slate-50 text-slate-500 border-slate-200 gap-1">
      <MinusCircle className="h-3 w-3" /> Not Sent
    </Badge>
  );
}

function DocsCell({ viewed, total, lastViewedAt }: { viewed: number; total: number; lastViewedAt?: string }) {
  const pct = total > 0 ? Math.round((viewed / total) * 100) : 0;
  const barColor = pct >= 80 ? "bg-green-500" : pct >= 50 ? "bg-amber-400" : "bg-slate-300";
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger>
          <div className="flex items-center gap-2">
            <div className="w-16 h-2 bg-slate-100 rounded-full overflow-hidden">
              <div className={`h-full ${barColor} transition-all`} style={{ width: `${pct}%` }} />
            </div>
            <span className="text-xs text-muted-foreground">{viewed}/{total}</span>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs">{viewed} of {total} documents viewed ({pct}%)</p>
          {lastViewedAt && <p className="text-xs text-muted-foreground">Last: {format(parseISO(lastViewedAt), "MMM d, h:mm a")}</p>}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function CommitmentCell({ status, amount }: { status: string; amount?: number }) {
  if (status === "firm") {
    return (
      <Badge className="bg-green-600 text-white gap-1">
        <CheckCircle className="h-3 w-3" /> Firm {amount ? `$${(amount / 1e6).toFixed(1)}M` : ""}
      </Badge>
    );
  }
  if (status === "submitted") {
    return (
      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 gap-1">
        <PenTool className="h-3 w-3" /> Submitted {amount ? `$${(amount / 1e6).toFixed(1)}M` : ""}
      </Badge>
    );
  }
  if (status === "withdrawn") {
    return (
      <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 gap-1">
        <AlertCircle className="h-3 w-3" /> Withdrawn
      </Badge>
    );
  }
  return <span className="text-xs text-muted-foreground">—</span>;
}

function QACell({ total, open }: { total: number; open: number }) {
  if (total === 0) return <span className="text-xs text-muted-foreground">—</span>;
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger>
          <div className="flex items-center gap-1">
            <MessageSquare className="h-3 w-3 text-muted-foreground" />
            <span className="text-xs">{total}</span>
            {open > 0 && <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4">{open} open</Badge>}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs">{total} questions total, {open} awaiting response</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function ExecutionTracker({ lenders, dealId }: ExecutionTrackerProps) {
  return (
    <div className="rounded-lg border border-border overflow-hidden" data-testid="table-execution-tracker">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-secondary/30 text-xs uppercase tracking-wider text-muted-foreground">
            <th className="px-4 py-3 text-left font-medium">Lender</th>
            <th className="px-3 py-3 text-center font-medium w-8">Heat</th>
            <th className="px-3 py-3 text-left font-medium">NDA</th>
            <th className="px-3 py-3 text-left font-medium">Docs Reviewed</th>
            <th className="px-3 py-3 text-left font-medium">Commitment</th>
            <th className="px-3 py-3 text-left font-medium">Q&A</th>
            <th className="px-3 py-3 text-right font-medium">Last Activity</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/50">
          {lenders.map((lender) => {
            const heat = getEngagementLevel(lender);
            return (
              <tr key={lender.lenderId} className="hover:bg-secondary/10 transition-colors" data-testid={`row-lender-${lender.lenderId}`}>
                <td className="px-4 py-3 font-medium">{lender.lenderName}</td>
                <td className="px-3 py-3 text-center">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <div className={`w-3 h-3 rounded-full ${statusColors[heat]} mx-auto`} />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs capitalize">{heat} engagement</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </td>
                <td className="px-3 py-3">
                  <NDACell status={lender.ndaStatus} signedAt={lender.ndaSignedAt} />
                </td>
                <td className="px-3 py-3">
                  <DocsCell viewed={lender.docsViewed} total={lender.totalDocs} lastViewedAt={lender.lastDocViewedAt} />
                </td>
                <td className="px-3 py-3">
                  <CommitmentCell status={lender.commitmentStatus} amount={lender.commitmentAmount} />
                </td>
                <td className="px-3 py-3">
                  <QACell total={lender.qaCount} open={lender.openQaCount} />
                </td>
                <td className="px-3 py-3 text-right text-xs text-muted-foreground">
                  {lender.lastActivityAt 
                    ? format(parseISO(lender.lastActivityAt), "MMM d, h:mm a") 
                    : "—"}
                </td>
              </tr>
            );
          })}
          {lenders.length === 0 && (
            <tr>
              <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                No lenders invited yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export function getMockExecutionData(dealId: string): LenderExecutionRow[] {
  return [
    {
      lenderId: "lender_1",
      lenderName: "Ares Management",
      ndaStatus: "signed",
      ndaSignedAt: "2024-03-10T14:30:00Z",
      docsViewed: 18,
      totalDocs: 22,
      lastDocViewedAt: "2024-03-14T10:15:00Z",
      commitmentStatus: "firm",
      commitmentAmount: 15000000,
      qaCount: 5,
      openQaCount: 1,
      lastActivityAt: "2024-03-14T16:45:00Z"
    },
    {
      lenderId: "lender_2",
      lenderName: "Blue Owl Capital",
      ndaStatus: "signed",
      ndaSignedAt: "2024-03-11T09:00:00Z",
      docsViewed: 12,
      totalDocs: 22,
      lastDocViewedAt: "2024-03-13T15:20:00Z",
      commitmentStatus: "submitted",
      commitmentAmount: 10000000,
      qaCount: 3,
      openQaCount: 0,
      lastActivityAt: "2024-03-13T15:20:00Z"
    },
    {
      lenderId: "lender_3",
      lenderName: "Golub Capital",
      ndaStatus: "signed",
      ndaSignedAt: "2024-03-12T11:30:00Z",
      docsViewed: 6,
      totalDocs: 22,
      lastDocViewedAt: "2024-03-12T14:00:00Z",
      commitmentStatus: "not_submitted",
      qaCount: 1,
      openQaCount: 1,
      lastActivityAt: "2024-03-12T14:00:00Z"
    },
    {
      lenderId: "lender_4",
      lenderName: "HPS Investment Partners",
      ndaStatus: "sent",
      docsViewed: 0,
      totalDocs: 22,
      commitmentStatus: "not_submitted",
      qaCount: 0,
      openQaCount: 0
    },
    {
      lenderId: "lender_5",
      lenderName: "Owl Rock Capital",
      ndaStatus: "signed",
      ndaSignedAt: "2024-03-09T16:00:00Z",
      docsViewed: 20,
      totalDocs: 22,
      lastDocViewedAt: "2024-03-14T09:00:00Z",
      commitmentStatus: "withdrawn",
      qaCount: 2,
      openQaCount: 0,
      lastActivityAt: "2024-03-11T10:30:00Z"
    }
  ];
}
