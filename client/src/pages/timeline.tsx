import React, { useState, useCallback } from "react";
import { useRoute, Link, useLocation } from "wouter";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  CheckCircle2,
  Circle,
  Clock,
  Calendar,
  AlertTriangle,
  ChevronRight,
  Download,
  Lock,
  Unlock,
  Play,
  Check,
  AlertCircle
} from "lucide-react";
import { mockDeals } from "@/data/deals";
import { mockDocuments } from "@/data/documents";
import { useAuth } from "@/context/auth-context";
import { downloadICS, downloadCsvFromRecords } from "@/lib/download";
import { buildExportFilename } from "@/lib/export-names";
import { getDealBlockers } from "@/lib/deal-blockers";
import { useToast } from "@/hooks/use-toast";
import { parse, format } from "date-fns";
import {
  getDealTimeline,
  completeMilestone,
  lockMilestone,
  milestoneValidationRules,
  getMilestonesByPhase,
  getTimelineProgress,
  Milestone,
  MilestoneStatus,
  TimelinePhase,
  ValidationContext,
} from "@/data/timeline";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function Timeline() {
  const [, params] = useRoute("/deal/:id/timeline");
  const dealId = params?.id || "101";
  const deal = mockDeals.find(d => d.id === dealId) || mockDeals[0];
  const { user } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const isInvestor = user?.role === "Investor";
  const isIssuer = user?.role === "Issuer";
  const isBookrunner = user?.role === "Bookrunner";
  const canModifyTimeline = isIssuer; // Only issuer can modify

  // Get computed blockers from real data
  const blockers = getDealBlockers({
    dealId,
    role: (user?.role as "Bookrunner" | "Issuer" | "Investor") || "Bookrunner",
    lenderId: user?.lenderId
  });

  // Timeline state
  const [timeline, setTimeline] = useState(() => getDealTimeline(dealId));
  const [validationWarning, setValidationWarning] = useState<{ show: boolean; message: string; milestoneId: string | null }>({
    show: false,
    message: "",
    milestoneId: null,
  });
  const [lockConfirmation, setLockConfirmation] = useState<{ show: boolean; milestoneId: string | null; label: string }>({
    show: false,
    milestoneId: null,
    label: "",
  });

  const milestonesByPhase = getMilestonesByPhase(timeline);
  const progress = getTimelineProgress(dealId);

  // Build validation context
  const buildValidationContext = useCallback((): ValidationContext => {
    const dealDocuments = mockDocuments.filter(d => d.dealId === dealId);

    // Check for Financial Model in VDR (interactive_model or specific document)
    const hasFinancialModelInVDR = dealDocuments.some(
      d => d.type === "interactive_model" ||
           d.category === "Lender Paydown Model" ||
           d.name.toLowerCase().includes("financial model")
    );

    // Check for published financial model (interactive models are published)
    const hasPublishedFinancialModel = dealDocuments.some(
      d => d.type === "interactive_model"
    );

    // Check for Lender Presentation in VDR
    const hasLenderPresentationInVDR = dealDocuments.some(
      d => d.category === "Lender Presentation"
    );

    // Check for lender markup uploads
    const hasLenderMarkupUploaded = dealDocuments.some(
      d => d.owner === "Lender Counsel" && d.status !== "Draft"
    );

    return {
      hasFinancialModelInVDR,
      hasPublishedFinancialModel,
      hasLenderPresentationInVDR,
      hasLenderMarkupUploaded,
      getMilestoneStatus: (milestoneId: string) => {
        const m = timeline.milestones.find(ms => ms.id === milestoneId);
        return m?.status || "not_started";
      },
      isMilestoneLocked: (milestoneId: string) => {
        const m = timeline.milestones.find(ms => ms.id === milestoneId);
        return m?.locked || false;
      },
    };
  }, [dealId, timeline.milestones]);

  // Handle mark complete
  const handleMarkComplete = (milestone: Milestone) => {
    // Run validation if rule exists
    const validationRule = milestoneValidationRules[milestone.id];
    if (validationRule) {
      const context = buildValidationContext();
      const result = validationRule(context);
      if (!result.valid) {
        setValidationWarning({
          show: true,
          message: result.message || "Validation failed",
          milestoneId: milestone.id,
        });
        return;
      }
    }

    // Mark complete
    const updated = completeMilestone(dealId, milestone.id, user?.email || "unknown");
    if (updated) {
      setTimeline({ ...updated });
      toast({
        title: "Milestone Completed",
        description: `"${milestone.label}" has been marked as complete.`,
      });
    }
  };

  // Handle lock
  const handleLock = (milestone: Milestone) => {
    setLockConfirmation({
      show: true,
      milestoneId: milestone.id,
      label: milestone.label,
    });
  };

  const confirmLock = () => {
    if (!lockConfirmation.milestoneId) return;

    const updated = lockMilestone(dealId, lockConfirmation.milestoneId);
    if (updated) {
      setTimeline({ ...updated });
      toast({
        title: "Milestone Locked",
        description: `"${lockConfirmation.label}" has been locked and cannot be edited.`,
      });
    }
    setLockConfirmation({ show: false, milestoneId: null, label: "" });
  };

  // Export handlers
  const handleSyncCalendar = () => {
    const completedMilestones = timeline.milestones.filter(m => m.completedAt);
    const icsEvents = completedMilestones.map(item => ({
      title: `${deal.dealName}: ${item.label}`,
      start: item.completedAt ? new Date(item.completedAt) : new Date(),
      description: `Deal milestone for ${deal.dealName} - ${item.phase}`,
    }));
    downloadICS(buildExportFilename(deal.dealName, "Calendar", "ics"), icsEvents);
    toast({ title: "Calendar Downloaded", description: "ICS file ready to import into your calendar." });
  };

  const handleExportTimeline = () => {
    const rows = timeline.milestones.map(item => ({
      Deal: deal.dealName,
      Phase: item.phase,
      Milestone: item.label,
      Status: item.status,
      CompletedAt: item.completedAt ? format(new Date(item.completedAt), "MMM dd, yyyy HH:mm") : "",
      CompletedBy: item.completedBy || "",
      Locked: item.locked ? "Yes" : "No",
    }));
    downloadCsvFromRecords(buildExportFilename(deal.dealName, "Timeline", "csv"), rows);
    toast({ title: "Timeline Exported", description: "CSV downloaded successfully." });
  };

  // Find next active milestone
  const getNextMilestone = () => {
    const inProgress = timeline.milestones.find(m => m.status === "in_progress");
    if (inProgress) return inProgress;

    const notStarted = timeline.milestones.find(m => m.status === "not_started");
    return notStarted;
  };

  const nextMilestone = getNextMilestone();

  return (
    <Layout>
      <div className="space-y-6 animate-in fade-in duration-500">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-semibold text-primary tracking-tight">Timeline</h1>
              <Badge variant="outline" className="bg-primary/5 border-primary/20 text-primary">
                {deal.stage}
              </Badge>
              <Badge variant="secondary" className="font-normal">
                {progress.completed} of {progress.total} milestones
              </Badge>
            </div>
            <p className="text-muted-foreground">Debt execution milestones for {deal.dealName}.</p>
          </div>
          <div className="flex items-center gap-3">
             <Button variant="outline" onClick={handleExportTimeline} data-testid="button-export-timeline">
               <Download className="mr-2 h-4 w-4" /> Export CSV
             </Button>
             <Button onClick={handleSyncCalendar} data-testid="button-sync-calendar">
               <Calendar className="mr-2 h-4 w-4" /> Sync Calendar
             </Button>
          </div>
        </div>

        {/* Role indicator */}
        {!canModifyTimeline && (
          <div className="bg-secondary/50 border border-border rounded-lg px-4 py-2 text-sm text-muted-foreground flex items-center gap-2">
            <Lock className="h-4 w-4" />
            {isInvestor ? "Timeline is read-only for investors." : "Timeline modifications require Issuer access."}
          </div>
        )}

        <div className="grid gap-6 md:grid-cols-3">
          {/* Main Timeline (2/3) */}
          <div className="md:col-span-2 space-y-6">
            <Card className="border-border/60 shadow-sm">
               <CardHeader>
                 <CardTitle>Execution Schedule</CardTitle>
                 <CardDescription>
                   Target closing: {new Date(deal.closeDate).toLocaleDateString()}
                   {" "}• Progress: {progress.percentage}% complete
                 </CardDescription>
               </CardHeader>
               <CardContent>
                 <div className="space-y-8">
                   {(Object.keys(milestonesByPhase) as TimelinePhase[]).map((phase, phaseIdx) => {
                     const phaseMilestones = milestonesByPhase[phase];
                     // Investors don't see Preparation phase (internal only)
                     if (isInvestor && phase === "Preparation") return null;

                     return (
                       <div key={phase} className="relative">
                         <div className="flex items-center gap-3 mb-4">
                           <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
                             {phaseIdx + 1}
                           </span>
                           <h3 className="text-lg font-semibold text-primary">{phase}</h3>
                           {phase === "Preparation" && !isInvestor && (
                             <Badge variant="outline" className="text-xs">Internal Only</Badge>
                           )}
                         </div>

                         <div className="ml-3 border-l-2 border-border pl-8 space-y-3">
                           {phaseMilestones.map((milestone) => (
                             <MilestoneRow
                               key={milestone.id}
                               milestone={milestone}
                               canModify={canModifyTimeline}
                               onMarkComplete={handleMarkComplete}
                               onLock={handleLock}
                             />
                           ))}
                         </div>
                       </div>
                     );
                   })}
                 </div>
               </CardContent>
            </Card>
          </div>

          {/* Sidebar (1/3) */}
          <div className="space-y-6">
            {/* Progress Summary */}
            <Card className="border-border/60 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Execution Progress</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="relative pt-1">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-primary">{progress.percentage}%</span>
                      <span className="text-xs text-muted-foreground">{progress.completed}/{progress.total}</span>
                    </div>
                    <div className="overflow-hidden h-2 text-xs flex rounded-full bg-secondary">
                      <div
                        style={{ width: `${progress.percentage}%` }}
                        className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-primary transition-all duration-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-center">
                    <div className="bg-green-50 rounded-lg p-3 border border-green-100">
                      <div className="text-2xl font-bold text-green-700">
                        {timeline.milestones.filter(m => m.locked).length}
                      </div>
                      <div className="text-xs text-green-600">Locked</div>
                    </div>
                    <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
                      <div className="text-2xl font-bold text-blue-700">
                        {timeline.milestones.filter(m => m.status === "in_progress").length}
                      </div>
                      <div className="text-xs text-blue-600">In Progress</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Next Milestone */}
            {nextMilestone && (
              <Card className="shadow-sm border-border/60">
                <CardHeader>
                  <CardTitle className="text-base">Next Milestone</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-2">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-blue-100 mb-3">
                      {nextMilestone.status === "in_progress" ? (
                        <Play className="h-5 w-5 text-blue-600" />
                      ) : (
                        <Circle className="h-5 w-5 text-blue-600" />
                      )}
                    </div>
                    <p className="font-semibold text-primary">{nextMilestone.label}</p>
                    <p className="text-sm text-muted-foreground mt-1">{nextMilestone.phase}</p>
                    {nextMilestone.optional && (
                      <Badge variant="outline" className="mt-2 text-xs">Optional</Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Potential Blockers (internal only) */}
            {!isInvestor && blockers.length > 0 && (
              <Card className={`border-l-4 shadow-sm ${blockers.some(b => b.severity === "critical") ? "border-l-red-500" : "border-l-amber-500"}`}>
                <CardHeader className="pb-2">
                  <CardTitle className={`flex items-center gap-2 text-base ${blockers.some(b => b.severity === "critical") ? "text-red-700" : "text-amber-700"}`}>
                    <AlertTriangle className="h-5 w-5" /> Potential Blockers
                    <Badge variant="outline" className={`ml-2 ${blockers.some(b => b.severity === "critical") ? "bg-red-50 text-red-700 border-red-200" : "bg-amber-50 text-amber-700 border-amber-200"}`}>
                      {blockers.length}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {blockers.map((blocker) => (
                    <div
                      key={blocker.id}
                      onClick={() => navigate(blocker.href)}
                      className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all hover:shadow-md ${
                        blocker.severity === "critical"
                          ? "bg-red-50 border-red-200 hover:bg-red-100"
                          : "bg-amber-50 border-amber-200 hover:bg-amber-100"
                      }`}
                    >
                      <div className={`h-2 w-2 rounded-full shrink-0 ${
                        blocker.severity === "critical" ? "bg-red-500 animate-pulse" : "bg-amber-500"
                      }`} />
                      <div className="flex-1 min-w-0">
                        <span className={`font-medium text-sm ${
                          blocker.severity === "critical" ? "text-red-800" : "text-amber-800"
                        }`}>
                          {blocker.label}
                        </span>
                      </div>
                      <Badge variant="secondary" className="h-5 text-xs">
                        {blocker.count}
                      </Badge>
                      <ChevronRight className={`h-4 w-4 shrink-0 ${
                        blocker.severity === "critical" ? "text-red-400" : "text-amber-400"
                      }`} />
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            <Card className="shadow-sm border-border/60">
              <CardHeader>
                <CardTitle className="text-base">Key Dates</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Launch Date</span>
                  <span className="font-medium">{format(new Date(deal.launchDate), "MMM dd, yyyy")}</span>
                </div>
                {deal.commitmentDate && (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Commitment Date</span>
                    <span className="font-medium">{format(new Date(deal.commitmentDate), "MMM dd, yyyy")}</span>
                  </div>
                )}
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Target Close</span>
                  <span className="font-medium">{format(new Date(deal.closeDate), "MMM dd, yyyy")}</span>
                </div>
                <Separator />
                <Link href={`/deal/${dealId}/calendar`}>
                  <Button className="w-full" variant="outline" data-testid="button-view-calendar">
                    View Full Calendar
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Validation Warning Dialog */}
      <Dialog open={validationWarning.show} onOpenChange={(open) => !open && setValidationWarning({ show: false, message: "", milestoneId: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-600">
              <AlertCircle className="h-5 w-5" /> Validation Required
            </DialogTitle>
            <DialogDescription>
              {validationWarning.message}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setValidationWarning({ show: false, message: "", milestoneId: null })}>
              Understood
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Lock Confirmation Dialog */}
      <AlertDialog open={lockConfirmation.show} onOpenChange={(open) => !open && setLockConfirmation({ show: false, milestoneId: null, label: "" })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" /> Lock Milestone?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to lock "{lockConfirmation.label}"?
              Once locked, this milestone cannot be edited or unlocked.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmLock}>Lock Milestone</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
}

// Milestone Row Component
interface MilestoneRowProps {
  milestone: Milestone;
  canModify: boolean;
  onMarkComplete: (milestone: Milestone) => void;
  onLock: (milestone: Milestone) => void;
}

function MilestoneRow({ milestone, canModify, onMarkComplete, onLock }: MilestoneRowProps) {
  const getStatusIcon = () => {
    if (milestone.locked) {
      return (
        <div className="h-5 w-5 rounded-full bg-green-600 flex items-center justify-center">
          <Lock className="h-3 w-3 text-white" />
        </div>
      );
    }
    switch (milestone.status) {
      case "completed":
        return <CheckCircle2 className="h-5 w-5 text-green-600" />;
      case "in_progress":
        return (
          <div className="h-5 w-5 rounded-full border-2 border-blue-600 bg-blue-100 flex items-center justify-center">
            <div className="h-2 w-2 rounded-full bg-blue-600 animate-pulse" />
          </div>
        );
      case "not_started":
      default:
        return <Circle className="h-5 w-5 text-muted-foreground/40" />;
    }
  };

  const getStatusBadge = () => {
    if (milestone.locked) {
      return <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-green-200">Locked</Badge>;
    }
    switch (milestone.status) {
      case "completed":
        return <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-green-200">Completed</Badge>;
      case "in_progress":
        return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 border-blue-200">In Progress</Badge>;
      default:
        return null;
    }
  };

  const showMarkCompleteButton = canModify && !milestone.locked && milestone.status !== "completed";
  const showLockButton = canModify && milestone.status === "completed" && !milestone.locked;

  return (
    <div className={`p-3 rounded-lg border transition-colors ${
      milestone.locked ? 'bg-green-50/50 border-green-100' :
      milestone.status === 'completed' ? 'bg-green-50/30 border-green-100' :
      milestone.status === 'in_progress' ? 'bg-blue-50/50 border-blue-100' :
      'bg-card border-border/50 hover:border-border'
    }`}>
      <div className="flex items-start gap-3">
        <div className="mt-0.5">{getStatusIcon()}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <p className={`font-medium ${milestone.locked || milestone.status === 'completed' ? 'text-muted-foreground' : 'text-foreground'}`}>
                {milestone.label}
                {milestone.optional && (
                  <span className="ml-2 text-xs text-muted-foreground font-normal">(Optional)</span>
                )}
              </p>
              {milestone.completedAt && (
                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {format(new Date(milestone.completedAt), "MMM dd, yyyy 'at' h:mm a")}
                  {milestone.completedBy && (
                    <span className="ml-2">by {milestone.completedBy === "system" ? "System" : milestone.completedBy}</span>
                  )}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {getStatusBadge()}
            </div>
          </div>

          {/* Action buttons for Issuer */}
          {(showMarkCompleteButton || showLockButton) && (
            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border/50">
              {showMarkCompleteButton && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs gap-1"
                  onClick={() => onMarkComplete(milestone)}
                >
                  <Check className="h-3 w-3" /> Mark Complete
                </Button>
              )}
              {showLockButton && (
                <Button
                  variant="default"
                  size="sm"
                  className="h-7 text-xs gap-1"
                  onClick={() => onLock(milestone)}
                >
                  <Lock className="h-3 w-3" /> Lock Milestone
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
