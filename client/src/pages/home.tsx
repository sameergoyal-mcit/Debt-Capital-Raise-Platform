import React from "react";
import { Link } from "wouter";
import { 
  ArrowUpRight, 
  TrendingUp, 
  Users, 
  Clock, 
  ArrowRight,
  MoreHorizontal,
  Activity,
  AlertTriangle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Layout } from "@/components/layout";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from "recharts";

const debtMaturityData = [
  { period: "0-3 mos", "Senior Secured": 15, "Mezzanine": 5, "Unitranche": 0 },
  { period: "3-6 mos", "Senior Secured": 30, "Mezzanine": 10, "Unitranche": 25 },
  { period: "6-12 mos", "Senior Secured": 45, "Mezzanine": 20, "Unitranche": 40 },
  { period: "12-24 mos", "Senior Secured": 60, "Mezzanine": 35, "Unitranche": 15 },
];

export default function Home() {
  return (
    <Layout>
      <div className="space-y-8 animate-in fade-in duration-500">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-serif font-bold text-primary tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground mt-1">Overview of your Debt Market Activity and Active Deals</p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline">Download Report</Button>
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
              New Deal
            </Button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <StatCard 
            title="Total Debt Raised (LTM)" 
            value="$245.8M" 
            change="WAS: S+575 bps" 
          />
          <StatCard 
            title="Avg Debt Pricing (SOFR +)" 
            value="625 bps" 
            change="-25 bps vs last quarter" 
          />
          <StatCard 
            title="Committed vs Target" 
            value="82%" 
            change="Across Active Deals" 
            icon={<Users className="h-4 w-4 text-muted-foreground" />}
          />
          <StatCard 
            title="Active Deals" 
            value="12" 
            change="2 At Risk" 
            icon={<Activity className="h-4 w-4 text-muted-foreground" />}
            alert
          />
          <StatCard 
            title="Closings at Risk" 
            value="1" 
            change="Next 30 Days" 
            icon={<AlertTriangle className="h-4 w-4 text-destructive" />}
            destructive
          />
        </div>

        <div className="grid gap-4 md:grid-cols-7">
          {/* Active Deals Table */}
          <Card className="col-span-4 shadow-sm border-border/60">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Active Deals</CardTitle>
                  <CardDescription>Recent deal activity and status updates.</CardDescription>
                </div>
                <Button variant="ghost" size="sm" className="text-primary gap-1">
                  View All <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Deal Name</TableHead>
                    <TableHead>Sector</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentDeals.map((deal) => (
                    <TableRow key={deal.id}>
                      <TableCell className="font-medium">
                        <Link href={`/deal/${deal.id}/overview`} className="hover:underline hover:text-primary transition-colors">
                          {deal.name}
                        </Link>
                      </TableCell>
                      <TableCell>{deal.sector}</TableCell>
                      <TableCell>{deal.size}</TableCell>
                      <TableCell>
                        <StatusBadge status={deal.status} />
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>View Overview</DropdownMenuItem>
                            <DropdownMenuItem>Debt Investor Book</DropdownMenuItem>
                            <DropdownMenuItem>Documents</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Debt Maturing Chart */}
          <Card className="col-span-3 shadow-sm border-border/60">
            <CardHeader>
              <CardTitle>Debt Maturing</CardTitle>
              <CardDescription>Upcoming debt maturities by time horizon.</CardDescription>
            </CardHeader>
            <CardContent className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={debtMaturityData}>
                  <XAxis 
                    dataKey="period" 
                    stroke="#888888" 
                    fontSize={12} 
                    tickLine={false} 
                    axisLine={false} 
                  />
                  <YAxis 
                    stroke="#888888" 
                    fontSize={12} 
                    tickLine={false} 
                    axisLine={false} 
                    tickFormatter={(value) => `$${value}M`} 
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: "hsl(var(--popover))", 
                      borderRadius: "8px", 
                      border: "1px solid hsl(var(--border))" 
                    }}
                    itemStyle={{ color: "hsl(var(--foreground))" }}
                  />
                  <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "10px" }} />
                  <Bar dataKey="Senior Secured" stackId="a" fill="hsl(var(--chart-1))" radius={[0, 0, 4, 4]} />
                  <Bar dataKey="Mezzanine" stackId="a" fill="hsl(var(--chart-2))" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="Unitranche" stackId="a" fill="hsl(var(--chart-3))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}

function StatCard({ title, value, change, icon, destructive, alert }: { title: string; value: string; change: string; icon?: React.ReactNode, destructive?: boolean, alert?: boolean }) {
  return (
    <Card className={cn(
      "shadow-sm border-border/60",
      destructive && "border-destructive/50 bg-destructive/5",
      alert && "border-amber-500/50 bg-amber-500/5"
    )}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className={cn("text-2xl font-bold font-serif", destructive ? "text-destructive" : "text-primary")}>{value}</div>
        <p className={cn("text-xs mt-1", destructive ? "text-destructive/80 font-medium" : "text-muted-foreground")}>
          {change}
        </p>
      </CardContent>
    </Card>
  );
}

function StatusBadge({ status }: { status: string }) {
  let variant = "default";
  let className = "";

  switch (status.toLowerCase()) {
    case "active":
      className = "bg-green-100 text-green-700 hover:bg-green-100 border-green-200";
      break;
    case "diligence":
      className = "bg-blue-100 text-blue-700 hover:bg-blue-100 border-blue-200";
      break;
    case "closing":
      className = "bg-amber-100 text-amber-700 hover:bg-amber-100 border-amber-200";
      break;
    default:
      className = "bg-gray-100 text-gray-700 hover:bg-gray-100 border-gray-200";
  }

  return (
    <Badge variant="outline" className={`font-normal ${className}`}>
      {status}
    </Badge>
  );
}

const recentDeals = [
  { id: "123", name: "Project Titan", sector: "TMT", size: "$45M", status: "Closing" },
  { id: "124", name: "Helios Energy", sector: "Infrastructure", size: "$120M", status: "Diligence" },
  { id: "125", name: "Apex Logistics", sector: "Transport", size: "$35M", status: "Active" },
  { id: "126", name: "Quantum Health", sector: "Healthcare", size: "$60M", status: "Active" },
  { id: "127", name: "BlueSky Retail", sector: "Consumer", size: "$28M", status: "Diligence" },
];
