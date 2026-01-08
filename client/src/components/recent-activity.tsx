import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getAccessLogs, getActionLabel, AccessLogEntry } from "@/data/access-logs";
import { format, parseISO } from "date-fns";
import { 
  FileText, 
  Download, 
  Upload, 
  PenTool, 
  HelpCircle, 
  Shield, 
  Eye, 
  MessageSquare,
  Activity
} from "lucide-react";

interface RecentActivityProps {
  dealId: string;
  limit?: number;
}

const actionIcons: Record<string, React.ReactNode> = {
  view_doc: <Eye className="h-3 w-3 text-blue-500" />,
  download_doc: <Download className="h-3 w-3 text-green-500" />,
  upload_markup: <Upload className="h-3 w-3 text-purple-500" />,
  submit_commitment: <PenTool className="h-3 w-3 text-emerald-600" />,
  view_qa: <HelpCircle className="h-3 w-3 text-amber-500" />,
  submit_qa: <HelpCircle className="h-3 w-3 text-amber-600" />,
  sign_nda: <Shield className="h-3 w-3 text-green-600" />,
  view_deal: <Eye className="h-3 w-3 text-slate-500" />,
  view_messages: <MessageSquare className="h-3 w-3 text-blue-500" />
};

export function RecentActivity({ dealId, limit = 10 }: RecentActivityProps) {
  const logs = getAccessLogs(dealId, { limit });

  return (
    <Card className="border-border/60" data-testid="card-recent-activity">
      <CardHeader className="pb-3 border-b border-border/40">
        <CardTitle className="text-base flex items-center gap-2">
          <Activity className="h-4 w-4 text-primary" /> Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[300px]">
          <div className="divide-y divide-border/30">
            {logs.map((log) => (
              <ActivityRow key={log.id} log={log} />
            ))}
            {logs.length === 0 && (
              <div className="p-6 text-center text-sm text-muted-foreground">
                No activity recorded yet.
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

function ActivityRow({ log }: { log: AccessLogEntry }) {
  return (
    <div className="flex items-start gap-3 p-3 hover:bg-secondary/20 transition-colors" data-testid={`activity-${log.id}`}>
      <div className="mt-0.5 p-1.5 bg-secondary/50 rounded-full">
        {actionIcons[log.action] || <Eye className="h-3 w-3" />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm truncate">{log.lenderName}</span>
          <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 font-normal">
            {getActionLabel(log.action)}
          </Badge>
        </div>
        {log.resourceName && (
          <p className="text-xs text-muted-foreground truncate mt-0.5">
            {log.resourceName}
          </p>
        )}
        <p className="text-[10px] text-muted-foreground mt-1">
          {format(parseISO(log.timestamp), "MMM d, h:mm a")}
        </p>
      </div>
    </div>
  );
}
