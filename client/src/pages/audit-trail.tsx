import { useState } from "react";
import { useParams, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/context/auth-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  ArrowLeft, 
  Eye, 
  Download, 
  FileSignature, 
  MessageSquare, 
  DollarSign, 
  AlertCircle,
  Search,
  RefreshCw
} from "lucide-react";
import { format } from "date-fns";

interface AuditLog {
  id: string;
  dealId: string;
  lenderId: string | null;
  userId: string | null;
  actorRole: string;
  actorEmail: string | null;
  action: string;
  resourceId: string | null;
  resourceType: string | null;
  metadata: Record<string, any> | null;
  createdAt: string;
}

interface Lender {
  id: string;
  firstName: string;
  lastName: string;
  organization: string;
  email: string;
}

const actionIcons: Record<string, React.ReactNode> = {
  VIEW_DEAL: <Eye className="h-4 w-4" />,
  DOWNLOAD_DOC: <Download className="h-4 w-4" />,
  SIGN_NDA: <FileSignature className="h-4 w-4" />,
  SUBMIT_COMMITMENT: <DollarSign className="h-4 w-4" />,
  ASK_QUESTION: <MessageSquare className="h-4 w-4" />,
};

const actionLabels: Record<string, string> = {
  VIEW_DEAL: "Viewed Deal",
  DOWNLOAD_DOC: "Downloaded Document",
  SIGN_NDA: "Signed NDA",
  SUBMIT_COMMITMENT: "Submitted Commitment",
  ASK_QUESTION: "Asked Question",
};

const actionColors: Record<string, string> = {
  VIEW_DEAL: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  DOWNLOAD_DOC: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  SIGN_NDA: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  SUBMIT_COMMITMENT: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  ASK_QUESTION: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
};

export default function AuditTrail() {
  const { id: dealId } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [actionFilter, setActionFilter] = useState("all");

  const { data: logs = [], isLoading: logsLoading, refetch } = useQuery<AuditLog[]>({
    queryKey: ["audit-logs", dealId],
    queryFn: async () => {
      const response = await fetch(`/api/deals/${dealId}/logs?limit=200`);
      if (!response.ok) throw new Error("Failed to fetch logs");
      return response.json();
    },
    enabled: !!dealId,
  });

  const { data: lenders = [] } = useQuery<Lender[]>({
    queryKey: ["lenders"],
    queryFn: async () => {
      const response = await fetch("/api/lenders");
      if (!response.ok) throw new Error("Failed to fetch lenders");
      return response.json();
    },
  });

  const lenderMap = lenders.reduce((acc, lender) => {
    acc[lender.id] = lender;
    return acc;
  }, {} as Record<string, Lender>);

  const filteredLogs = logs.filter((log) => {
    const matchesSearch = searchTerm === "" || 
      log.actorEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lenderMap[log.lenderId || ""]?.organization?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.metadata?.documentName?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesAction = actionFilter === "all" || log.action === actionFilter;
    
    return matchesSearch && matchesAction;
  });

  const getLenderInfo = (lenderId: string | null) => {
    if (!lenderId) return { name: "Unknown", org: "Unknown" };
    const lender = lenderMap[lenderId];
    if (!lender) return { name: "Unknown", org: "Unknown" };
    return { 
      name: `${lender.firstName} ${lender.lastName}`, 
      org: lender.organization 
    };
  };

  const formatMetadata = (log: AuditLog) => {
    if (!log.metadata) return null;
    
    switch (log.action) {
      case "DOWNLOAD_DOC":
        return log.metadata.documentName;
      case "SIGN_NDA":
        return `v${log.metadata.ndaVersion}`;
      case "SUBMIT_COMMITMENT":
        return `$${Number(log.metadata.amount || 0).toLocaleString()}`;
      default:
        return null;
    }
  };

  if (!dealId) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex items-center gap-2 text-destructive">
          <AlertCircle className="h-5 w-5" />
          <span>Invalid deal ID</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 px-4 max-w-7xl" data-testid="page-audit-trail">
      <div className="flex items-center gap-4 mb-6">
        <Link href={`/deal/${dealId}/overview`}>
          <Button variant="ghost" size="sm" data-testid="link-back">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Deal
          </Button>
        </Link>
        <div className="flex-1" />
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => refetch()}
          data-testid="button-refresh"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle data-testid="text-title">Audit Trail</CardTitle>
          <CardDescription>
            Complete log of all investor activity on this deal
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by investor, organization, or document..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
                data-testid="input-search"
              />
            </div>
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="w-[200px]" data-testid="select-action-filter">
                <SelectValue placeholder="Filter by action" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                <SelectItem value="VIEW_DEAL">View Deal</SelectItem>
                <SelectItem value="DOWNLOAD_DOC">Download Document</SelectItem>
                <SelectItem value="SIGN_NDA">Sign NDA</SelectItem>
                <SelectItem value="SUBMIT_COMMITMENT">Submit Commitment</SelectItem>
                <SelectItem value="ASK_QUESTION">Ask Question</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {logsLoading ? (
            <div className="space-y-3">
              {[...Array(10)].map((_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No activity logs found</p>
              <p className="text-sm mt-1">
                {searchTerm || actionFilter !== "all" 
                  ? "Try adjusting your filters" 
                  : "Investor activity will appear here"
                }
              </p>
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[180px]">Time</TableHead>
                    <TableHead>Investor</TableHead>
                    <TableHead>Organization</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLogs.map((log) => {
                    const lenderInfo = getLenderInfo(log.lenderId);
                    const metadata = formatMetadata(log);
                    
                    return (
                      <TableRow key={log.id} data-testid={`row-log-${log.id}`}>
                        <TableCell className="font-mono text-sm text-muted-foreground">
                          {format(new Date(log.createdAt), "MMM d, HH:mm:ss")}
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{lenderInfo.name}</div>
                            <div className="text-sm text-muted-foreground">{log.actorEmail}</div>
                          </div>
                        </TableCell>
                        <TableCell>{lenderInfo.org}</TableCell>
                        <TableCell>
                          <Badge 
                            variant="secondary" 
                            className={`gap-1 ${actionColors[log.action] || ""}`}
                          >
                            {actionIcons[log.action]}
                            {actionLabels[log.action] || log.action}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {metadata}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}

          <div className="mt-4 text-sm text-muted-foreground">
            Showing {filteredLogs.length} of {logs.length} entries
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
