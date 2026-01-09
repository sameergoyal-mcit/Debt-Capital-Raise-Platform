import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  ReferenceArea,
  Legend,
} from "recharts";
import { Shield, AlertTriangle, CheckCircle2, TrendingUp, TrendingDown } from "lucide-react";

interface CovenantMetric {
  year: number;
  label: string;
  leverage: number;
  dscr: number;
  interestCoverage: number;
}

interface CovenantThresholds {
  maxLeverage: number;
  minDscr: number;
  minInterestCoverage: number;
}

interface CovenantChartProps {
  projections: CovenantMetric[];
  thresholds: CovenantThresholds;
  title?: string;
}

type MetricType = "leverage" | "dscr" | "interestCoverage";

const metricConfig: Record<MetricType, {
  label: string;
  unit: string;
  threshold: keyof CovenantThresholds;
  inverted: boolean;
  description: string;
  color: string;
}> = {
  leverage: {
    label: "Leverage Ratio",
    unit: "x",
    threshold: "maxLeverage",
    inverted: false,
    description: "Total Debt / EBITDA",
    color: "#3b82f6",
  },
  dscr: {
    label: "DSCR",
    unit: "x",
    threshold: "minDscr",
    inverted: true,
    description: "Debt Service Coverage Ratio",
    color: "#22c55e",
  },
  interestCoverage: {
    label: "Interest Coverage",
    unit: "x",
    threshold: "minInterestCoverage",
    inverted: true,
    description: "EBITDA / Interest Expense",
    color: "#8b5cf6",
  },
};

export function CovenantChart({
  projections,
  thresholds,
  title = "Covenant Trajectory",
}: CovenantChartProps) {
  const [selectedMetric, setSelectedMetric] = useState<MetricType>("leverage");

  const config = metricConfig[selectedMetric];
  const thresholdValue = thresholds[config.threshold];

  // Calculate headroom for each year
  const chartData = useMemo(() => {
    return projections.map((p) => {
      const value = p[selectedMetric];
      const headroom = config.inverted
        ? ((value - thresholdValue) / thresholdValue) * 100
        : ((thresholdValue - value) / thresholdValue) * 100;

      const isBreach = config.inverted
        ? value < thresholdValue
        : value > thresholdValue;

      const isWatch = !isBreach && Math.abs(headroom) < 15;
      const isTight = !isBreach && Math.abs(headroom) < 10;

      return {
        ...p,
        value,
        headroom: Math.round(headroom * 10) / 10,
        status: isBreach ? "breach" : isTight ? "tight" : isWatch ? "watch" : "healthy",
      };
    });
  }, [projections, selectedMetric, thresholdValue, config.inverted]);

  // Summary stats
  const yearProjections = chartData.filter(p => p.year > 0);
  const worstValue = config.inverted
    ? Math.min(...yearProjections.map(p => p.value))
    : Math.max(...yearProjections.map(p => p.value));
  const worstYear = yearProjections.find(p => p.value === worstValue)?.year || 1;
  const avgValue = yearProjections.reduce((sum, p) => sum + p.value, 0) / yearProjections.length;
  const breachCount = yearProjections.filter(p => p.status === "breach").length;
  const exitValue = yearProjections[yearProjections.length - 1]?.value || 0;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "breach":
        return <Badge variant="destructive">Breach</Badge>;
      case "tight":
        return <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-100">Tight</Badge>;
      case "watch":
        return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Watch</Badge>;
      default:
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Healthy</Badge>;
    }
  };

  const getHeadroomZone = () => {
    if (config.inverted) {
      return {
        y1: thresholdValue,
        y2: thresholdValue * 1.5,
      };
    }
    return {
      y1: thresholdValue * 0.7,
      y2: thresholdValue,
    };
  };

  const headroomZone = getHeadroomZone();
  const yDomain = config.inverted
    ? [0, Math.max(...chartData.map(d => d.value), thresholdValue * 1.2)]
    : [0, Math.max(...chartData.map(d => d.value), thresholdValue * 1.3)];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Shield className="h-5 w-5" />
            {title}
          </h3>
          <p className="text-sm text-muted-foreground">
            Covenant metrics with threshold monitoring
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-sm">Metric:</Label>
          <Select value={selectedMetric} onValueChange={(v) => setSelectedMetric(v as MetricType)}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="leverage">Leverage Ratio</SelectItem>
              <SelectItem value="dscr">DSCR</SelectItem>
              <SelectItem value="interestCoverage">Interest Coverage</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-xs text-muted-foreground uppercase mb-1">Covenant</div>
            <div className="text-lg font-semibold">{config.label}</div>
            <div className="text-xs text-muted-foreground">{config.description}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-xs text-muted-foreground uppercase mb-1">Threshold</div>
            <div className="text-2xl font-bold">
              {config.inverted ? "≥" : "≤"} {thresholdValue.toFixed(2)}{config.unit}
            </div>
          </CardContent>
        </Card>
        <Card className={breachCount > 0 ? "border-red-200 bg-red-50 dark:bg-red-950/20" : "border-green-200 bg-green-50 dark:bg-green-950/20"}>
          <CardContent className="pt-4">
            <div className="text-xs text-muted-foreground uppercase mb-1">Worst Year</div>
            <div className="flex items-center gap-2">
              <span className={`text-2xl font-bold ${breachCount > 0 ? "text-red-600" : "text-green-600"}`}>
                {worstValue.toFixed(2)}{config.unit}
              </span>
              <span className="text-sm text-muted-foreground">(Y{worstYear})</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-xs text-muted-foreground uppercase mb-1">Exit Value</div>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold">{exitValue.toFixed(2)}{config.unit}</span>
              {config.inverted ? (
                exitValue > thresholdValue ? (
                  <TrendingUp className="h-4 w-4 text-green-500" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-red-500" />
                )
              ) : exitValue < thresholdValue ? (
                <TrendingUp className="h-4 w-4 text-green-500" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-500" />
              )}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-xs text-muted-foreground uppercase mb-1">Status</div>
            <div className="flex items-center gap-2">
              {breachCount > 0 ? (
                <>
                  <AlertTriangle className="h-5 w-5 text-red-500" />
                  <span className="text-red-600 font-semibold">{breachCount} Breach{breachCount > 1 ? "es" : ""}</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  <span className="text-green-600 font-semibold">Compliant</span>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{config.label} Over Time</CardTitle>
          <CardDescription>
            {config.inverted ? "Higher is better" : "Lower is better"} - Threshold: {thresholdValue.toFixed(2)}{config.unit}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 20, right: 30, left: 10, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                <YAxis
                  domain={yDomain as [number, number]}
                  tickFormatter={(v) => `${v.toFixed(1)}${config.unit}`}
                  tick={{ fontSize: 12 }}
                />
                <Tooltip
                  formatter={(value: number, name: string) => [
                    `${value.toFixed(2)}${config.unit}`,
                    config.label,
                  ]}
                  labelFormatter={(label) => `${label}`}
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-background border rounded-lg shadow-lg p-3 text-sm">
                          <p className="font-semibold mb-2">{label}</p>
                          <div className="space-y-1">
                            <div className="flex justify-between gap-4">
                              <span className="text-muted-foreground">{config.label}:</span>
                              <span className="font-medium">{data.value.toFixed(2)}{config.unit}</span>
                            </div>
                            <div className="flex justify-between gap-4">
                              <span className="text-muted-foreground">Headroom:</span>
                              <span className={`font-medium ${data.headroom >= 0 ? "text-green-600" : "text-red-600"}`}>
                                {data.headroom >= 0 ? "+" : ""}{data.headroom}%
                              </span>
                            </div>
                            <div className="flex justify-between gap-4">
                              <span className="text-muted-foreground">Status:</span>
                              {getStatusBadge(data.status)}
                            </div>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />

                {/* Healthy zone shading */}
                <ReferenceArea
                  y1={headroomZone.y1}
                  y2={headroomZone.y2}
                  fill="#22c55e"
                  fillOpacity={0.1}
                />

                {/* Covenant threshold line */}
                <ReferenceLine
                  y={thresholdValue}
                  stroke="#ef4444"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  label={{
                    value: `Covenant: ${thresholdValue}${config.unit}`,
                    position: "right",
                    className: "text-xs fill-red-500",
                  }}
                />

                <Line
                  type="monotone"
                  dataKey="value"
                  stroke={config.color}
                  strokeWidth={3}
                  dot={(props: any) => {
                    const { cx, cy, payload } = props;
                    const status = payload.status;
                    const fillColor = status === "breach" ? "#ef4444" :
                                     status === "tight" ? "#f97316" :
                                     status === "watch" ? "#eab308" : "#22c55e";
                    return (
                      <circle
                        cx={cx}
                        cy={cy}
                        r={6}
                        fill={fillColor}
                        stroke="white"
                        strokeWidth={2}
                      />
                    );
                  }}
                  name={config.label}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Year-by-Year Table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Covenant Compliance by Year</CardTitle>
        </CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2">Period</th>
                <th className="text-center py-2">{config.label}</th>
                <th className="text-center py-2">Threshold</th>
                <th className="text-center py-2">Headroom</th>
                <th className="text-center py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {chartData.map((row) => (
                <tr key={row.year} className={`border-b ${row.status === "breach" ? "bg-red-50 dark:bg-red-950/20" : ""}`}>
                  <td className="py-2 font-medium">{row.label}</td>
                  <td className="text-center py-2 font-mono">
                    {row.value.toFixed(2)}{config.unit}
                  </td>
                  <td className="text-center py-2 text-muted-foreground">
                    {config.inverted ? "≥" : "≤"} {thresholdValue.toFixed(2)}{config.unit}
                  </td>
                  <td className="text-center py-2">
                    <span className={`font-medium ${row.headroom >= 0 ? "text-green-600" : "text-red-600"}`}>
                      {row.headroom >= 0 ? "+" : ""}{row.headroom}%
                    </span>
                  </td>
                  <td className="text-center py-2">
                    {getStatusBadge(row.status)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Legend */}
      <div className="flex justify-center gap-6 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-green-500" />
          <span>Healthy (&gt;15% headroom)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-yellow-500" />
          <span>Watch (10-15% headroom)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-orange-500" />
          <span>Tight (&lt;10% headroom)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500" />
          <span>Breach</span>
        </div>
      </div>
    </div>
  );
}
