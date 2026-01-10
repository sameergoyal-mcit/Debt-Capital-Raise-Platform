import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  Cell,
  LineChart,
  Line,
  CartesianGrid,
} from "recharts";
import {
  Activity,
  FileText,
  Eye,
  EyeOff,
  TrendingUp,
  Users,
  Clock,
  RefreshCw,
  Lock,
  BarChart3,
  AlertCircle,
  Calendar
} from "lucide-react";
import { formatDistanceToNow, format, parseISO } from "date-fns";
import { useAuth } from "@/context/auth-context";

interface EngagementAnalyticsProps {
  dealId: string;
}

interface AnalyticsData {
  dealId: string;
  dealName: string;
  period: string;
  summary: {
    totalActivity: number;
    avgDailyActivity: number;
    documentViews: number;
    uniqueDocuments: number;
  };
  documentViews: { documentId: string; documentName: string; viewCount: number }[];
  engagementByTier: { tier: string; count: number }[];
  activityTrend: { date: string; count: number }[];
  topLenders: { lenderId: string; lenderName: string; activityCount: number }[];
  recentActivity: {
    id: string;
    action: string;
    description: string;
    timestamp: string;
    resourceType: string;
    resourceId: string;
  }[];
  generatedAt: string;
}

const TIER_COLORS: Record<string, string> = {
  early: "#3b82f6",
  full: "#8b5cf6",
  legal: "#10b981",
  unknown: "#9ca3af",
};

const TIER_LABELS: Record<string, string> = {
  early: "Early Access",
  full: "Full Access",
  legal: "Legal Access",
  unknown: "Other",
};

export function EngagementAnalytics({ dealId }: EngagementAnalyticsProps) {
  const { user } = useAuth();
  const [days, setDays] = useState<string>("7");
  const [showTopLenders, setShowTopLenders] = useState(false);
  const [anonymize, setAnonymize] = useState(true);

  const { data, isLoading, error, refetch } = useQuery<AnalyticsData>({
    queryKey: ["engagement-analytics", dealId, days, showTopLenders, anonymize],
    queryFn: async () => {
      const params = new URLSearchParams({
        days,
        showTopLenders: showTopLenders.toString(),
        anonymize: anonymize.toString(),
      });
      const res = await fetch(`/api/deals/${dealId}/engagement-analytics?${params}`, {
        headers: {
          "x-user-role": user?.role || "Bookrunner",
        },
      });
      if (!res.ok) {
        if (res.status === 403) {
          throw new Error("Access denied. Internal users only.");
        }
        throw new Error("Failed to fetch analytics");
      }
      return res.json();
    },
    refetchInterval: 60000, // Refresh every minute
  });

  if (isLoading) {
    return (
      <Card className="border-border/60 shadow-sm">
        <CardContent className="py-12 text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Loading engagement analytics...</p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-border/60 shadow-sm">
        <CardContent className="py-12 text-center">
          <AlertCircle className="h-8 w-8 mx-auto text-destructive mb-4" />
          <p className="text-destructive font-medium">Failed to load analytics</p>
          <p className="text-muted-foreground text-sm mt-1">{(error as Error).message}</p>
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  const chartColors = ["#3b82f6", "#8b5cf6", "#10b981", "#f59e0b", "#ef4444"];

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <Label htmlFor="period" className="text-sm text-muted-foreground">Period:</Label>
          <Select value={days} onValueChange={setDays}>
            <SelectTrigger id="period" className="w-[140px] h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="14">Last 14 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <Eye className="h-4 w-4 text-muted-foreground" />
          <Switch
            id="show-lenders"
            checked={showTopLenders}
            onCheckedChange={setShowTopLenders}
          />
          <Label htmlFor="show-lenders" className="text-sm">Show top lenders</Label>
        </div>

        {showTopLenders && (
          <div className="flex items-center gap-2">
            <EyeOff className="h-4 w-4 text-muted-foreground" />
            <Switch
              id="anonymize"
              checked={anonymize}
              onCheckedChange={setAnonymize}
            />
            <Label htmlFor="anonymize" className="text-sm">Anonymize names</Label>
          </div>
        )}

        <Button variant="outline" size="sm" onClick={() => refetch()} className="ml-auto gap-2">
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-border/60">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="h-4 w-4 text-primary" />
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Total Activity</span>
            </div>
            <p className="text-2xl font-bold text-primary">{data.summary.totalActivity}</p>
            <p className="text-xs text-muted-foreground mt-1">{data.period}</p>
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4 text-green-500" />
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Avg/Day</span>
            </div>
            <p className="text-2xl font-bold text-green-600">{data.summary.avgDailyActivity}</p>
            <p className="text-xs text-muted-foreground mt-1">actions per day</p>
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-2">
              <Eye className="h-4 w-4 text-blue-500" />
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Doc Views</span>
            </div>
            <p className="text-2xl font-bold text-blue-600">{data.summary.documentViews}</p>
            <p className="text-xs text-muted-foreground mt-1">{data.summary.uniqueDocuments} unique docs</p>
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-2">
              <Users className="h-4 w-4 text-purple-500" />
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Active Lenders</span>
            </div>
            <p className="text-2xl font-bold text-purple-600">{data.topLenders?.length || 0}+</p>
            <p className="text-xs text-muted-foreground mt-1">engaged this period</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Document Views Chart */}
        <Card className="border-border/60 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              Most Viewed Documents
            </CardTitle>
            <CardDescription>Top 5 documents by view count</CardDescription>
          </CardHeader>
          <CardContent>
            {data.documentViews.length > 0 ? (
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={data.documentViews}
                    layout="vertical"
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                  >
                    <XAxis type="number" hide />
                    <YAxis
                      dataKey="documentName"
                      type="category"
                      width={120}
                      tick={{ fontSize: 11 }}
                      tickFormatter={(value) =>
                        value.length > 18 ? `${value.substring(0, 18)}...` : value
                      }
                    />
                    <RechartsTooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const d = payload[0].payload;
                          return (
                            <div className="bg-popover border border-border rounded-lg p-2 shadow-md">
                              <p className="font-medium text-sm">{d.documentName}</p>
                              <p className="text-xs text-muted-foreground">
                                {d.viewCount} view{d.viewCount !== 1 ? "s" : ""}
                              </p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar dataKey="viewCount" radius={[0, 4, 4, 0]}>
                      {data.documentViews.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={chartColors[index % chartColors.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">
                No document views recorded
              </div>
            )}
          </CardContent>
        </Card>

        {/* Activity Trend Chart */}
        <Card className="border-border/60 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Activity Trend
            </CardTitle>
            <CardDescription>Daily activity over {data.period.toLowerCase()}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.activityTrend} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11 }}
                    tickFormatter={(value) => format(parseISO(value), "MMM d")}
                  />
                  <YAxis tick={{ fontSize: 11 }} />
                  <RechartsTooltip
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-popover border border-border rounded-lg p-2 shadow-md">
                            <p className="font-medium text-sm">{format(parseISO(label), "MMM d, yyyy")}</p>
                            <p className="text-xs text-muted-foreground">
                              {payload[0].value} action{payload[0].value !== 1 ? "s" : ""}
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Engagement by Tier */}
        <Card className="border-border/60 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Engagement by Access Tier
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.engagementByTier.length > 0 ? (
                data.engagementByTier.map((tier) => {
                  const total = data.engagementByTier.reduce((sum, t) => sum + t.count, 0);
                  const percentage = total > 0 ? Math.round((tier.count / total) * 100) : 0;
                  return (
                    <div key={tier.tier} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">{TIER_LABELS[tier.tier] || tier.tier}</span>
                        <span className="text-muted-foreground">
                          {tier.count} ({percentage}%)
                        </span>
                      </div>
                      <div className="h-2 bg-secondary rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${percentage}%`,
                            backgroundColor: TIER_COLORS[tier.tier] || TIER_COLORS.unknown,
                          }}
                        />
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="py-8 text-center text-muted-foreground text-sm">
                  No tier data available
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Top Lenders (Optional) */}
        {showTopLenders && (
          <Card className="border-border/60 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="h-5 w-5 text-amber-500" />
                Most Active Lenders
                <Badge variant="outline" className="ml-2 text-[10px]">Top 3</Badge>
              </CardTitle>
              <CardDescription>
                {anonymize ? "Anonymized for privacy" : "Based on activity count"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {data.topLenders.length > 0 ? (
                <div className="space-y-3">
                  {data.topLenders.map((lender, index) => (
                    <div
                      key={lender.lenderId}
                      className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 border border-border/50"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`h-8 w-8 rounded-full flex items-center justify-center text-white font-bold text-sm ${
                            index === 0
                              ? "bg-amber-500"
                              : index === 1
                              ? "bg-gray-400"
                              : "bg-amber-700"
                          }`}
                        >
                          {index + 1}
                        </div>
                        <span className="font-medium">{lender.lenderName}</span>
                      </div>
                      <Badge variant="secondary">{lender.activityCount} actions</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center text-muted-foreground text-sm">
                  No lender activity data
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Recent Activity Feed */}
        <Card className={`border-border/60 shadow-sm ${showTopLenders ? "" : "lg:col-span-1"}`}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              Recent Activity
            </CardTitle>
            <CardDescription>Latest actions by lenders</CardDescription>
          </CardHeader>
          <CardContent>
            {data.recentActivity.length > 0 ? (
              <div className="space-y-3 max-h-[300px] overflow-y-auto">
                {data.recentActivity.map((activity) => (
                  <div
                    key={activity.id}
                    className="flex items-start gap-3 p-2 rounded-md hover:bg-secondary/30 transition-colors"
                  >
                    <div className="mt-0.5">
                      {activity.action.includes("document") || activity.action.includes("download") ? (
                        <FileText className="h-4 w-4 text-blue-500" />
                      ) : activity.action.includes("nda") ? (
                        <Lock className="h-4 w-4 text-green-500" />
                      ) : activity.action.includes("commitment") ? (
                        <TrendingUp className="h-4 w-4 text-purple-500" />
                      ) : (
                        <Activity className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate">{activity.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-muted-foreground text-sm">
                No recent activity
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Footer */}
      <p className="text-xs text-muted-foreground text-center">
        Analytics generated at {format(new Date(data.generatedAt), "MMM d, yyyy h:mm a")}
      </p>
    </div>
  );
}
