import React, { useState } from "react";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  PieChart, 
  Pie, 
  ResponsiveContainer, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Legend, 
  Cell, 
  AreaChart, 
  Area,
  CartesianGrid
} from "recharts";
import { ArrowUpRight, ArrowDownRight, Activity, DollarSign, Clock, AlertCircle, Filter } from "lucide-react";

const dealOptions = [
  { id: "all", name: "All Deals" },
  { id: "101", name: "Project Titan" },
  { id: "102", name: "Project Nova" },
];

export default function Analytics() {
  const [selectedDeal, setSelectedDeal] = useState("all");
  
  return (
    <Layout>
      <div className="space-y-6 animate-in fade-in duration-500">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-primary tracking-tight">Analytics</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Deep dive into deal execution, lender behavior, and portfolio performance.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={selectedDeal} onValueChange={setSelectedDeal}>
              <SelectTrigger className="w-[180px]" data-testid="select-deal-filter">
                <SelectValue placeholder="Select deal..." />
              </SelectTrigger>
              <SelectContent>
                {dealOptions.map((deal) => (
                  <SelectItem key={deal.id} value={deal.id}>
                    {deal.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Tabs defaultValue="deal" className="space-y-6">
          <TabsList>
            <TabsTrigger value="deal">Deal Analytics</TabsTrigger>
            <TabsTrigger value="execution">Execution Benchmarking</TabsTrigger>
            <TabsTrigger value="portfolio">Portfolio Dashboard</TabsTrigger>
          </TabsList>

          {/* Tab 1: Deal Analytics */}
          <TabsContent value="deal" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              {/* Coverage Ratio Over Time */}
              <Card>
                <CardHeader>
                  <CardTitle>Coverage Ratio Evolution</CardTitle>
                  <CardDescription>Subscription levels over the marketing period.</CardDescription>
                </CardHeader>
                <CardContent className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={coverageData}>
                      <defs>
                        <linearGradient id="colorCoverage" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#0f172a" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#0f172a" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="day" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}x`} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: "#fff", borderRadius: "8px", border: "1px solid #e2e8f0" }}
                        formatter={(value: number) => [`${value}x`, "Coverage"]}
                      />
                      <Area type="monotone" dataKey="ratio" stroke="#0f172a" fillOpacity={1} fill="url(#colorCoverage)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Lender Type Mix */}
              <Card>
                <CardHeader>
                  <CardTitle>Lender Mix by Type</CardTitle>
                  <CardDescription>Distribution of commitments across investor categories.</CardDescription>
                </CardHeader>
                <CardContent className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={lenderMixData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {lenderMixData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                         contentStyle={{ backgroundColor: "#fff", borderRadius: "8px", border: "1px solid #e2e8f0" }}
                      />
                      <Legend verticalAlign="bottom" height={36} iconType="circle" />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Pricing Band Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle>Pricing Sensitivity</CardTitle>
                  <CardDescription>Volume of orders at different spread levels.</CardDescription>
                </CardHeader>
                <CardContent className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={pricingBandData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                      <XAxis type="number" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `$${val}M`} />
                      <YAxis dataKey="band" type="category" width={100} fontSize={12} tickLine={false} axisLine={false} />
                      <Tooltip 
                        cursor={{fill: 'transparent'}}
                        contentStyle={{ backgroundColor: "#fff", borderRadius: "8px", border: "1px solid #e2e8f0" }}
                        formatter={(value: number) => [`$${value}M`, "Volume"]}
                      />
                      <Bar dataKey="volume" fill="#0f172a" radius={[0, 4, 4, 0]} barSize={30} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Conversion Funnel */}
              <Card>
                <CardHeader>
                  <CardTitle>Investor Conversion Funnel</CardTitle>
                  <CardDescription>Conversion rates from initial outreach to firm bids.</CardDescription>
                </CardHeader>
                <CardContent className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={funnelData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="stage" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis fontSize={12} tickLine={false} axisLine={false} />
                      <Tooltip 
                        cursor={{fill: '#f1f5f9'}}
                        contentStyle={{ backgroundColor: "#fff", borderRadius: "8px", border: "1px solid #e2e8f0" }}
                      />
                      <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={40}>
                         {funnelData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Tab 2: Execution Benchmarking */}
          <TabsContent value="execution" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <Card className="col-span-2 md:col-span-1">
                <CardHeader>
                  <CardTitle>Time in Stage vs Benchmark</CardTitle>
                  <CardDescription>Average days spent in each deal phase.</CardDescription>
                </CardHeader>
                <CardContent className="h-[350px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={timeInStageData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="stage" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `${val}d`} />
                      <Tooltip 
                        cursor={{fill: '#f1f5f9'}}
                        contentStyle={{ backgroundColor: "#fff", borderRadius: "8px", border: "1px solid #e2e8f0" }}
                      />
                      <Legend />
                      <Bar dataKey="Current Deal" fill="#0f172a" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Market Benchmark" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
              
              <div className="space-y-6">
                <Card>
                   <CardHeader>
                     <CardTitle>Blocker Analysis</CardTitle>
                     <CardDescription>Most frequent bottlenecks across deals.</CardDescription>
                   </CardHeader>
                   <CardContent>
                     <div className="space-y-4">
                       <BlockerItem name="Legal / Docs Negotiation" count={12} percent={45} color="bg-red-500" />
                       <BlockerItem name="Diligence Responses" count={8} percent={30} color="bg-amber-500" />
                       <BlockerItem name="KYC / Onboarding" count={4} percent={15} color="bg-blue-500" />
                       <BlockerItem name="IC Approval Scheduling" count={2} percent={10} color="bg-green-500" />
                     </div>
                   </CardContent>
                </Card>

                <div className="grid grid-cols-2 gap-4">
                  <StatCard title="Avg Time to Close" value="42 Days" subtext="-5 days vs benchmark" icon={<Clock className="h-4 w-4 text-green-600" />} />
                  <StatCard title="Deal Velocity Score" value="8.5/10" subtext="Top quartile speed" icon={<Activity className="h-4 w-4 text-blue-600" />} />
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Tab 3: Portfolio Dashboard */}
          <TabsContent value="portfolio" className="space-y-6">
             {/* Portfolio Stats Row */}
             <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <StatCard title="Total Debt Raised (YTD)" value="$845M" subtext="12 Deals Closed" icon={<DollarSign className="h-4 w-4 text-primary" />} />
                <StatCard title="Weighted Avg Spread" value="S + 580" subtext="-15 bps QoQ" icon={<Activity className="h-4 w-4 text-primary" />} />
                <StatCard title="Avg OID / Fees" value="98.5 / 1.75%" subtext="Effective Yield 10.2%" icon={<DollarSign className="h-4 w-4 text-primary" />} />
                <StatCard title="Upcoming Maturities" value="$120M" subtext="Next 12 Months" icon={<AlertCircle className="h-4 w-4 text-amber-600" />} />
             </div>

             <div className="grid gap-6 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Maturity Wall</CardTitle>
                    <CardDescription>Debt maturities by year.</CardDescription>
                  </CardHeader>
                  <CardContent className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={maturityData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="year" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `$${val}M`} />
                        <Tooltip 
                          cursor={{fill: '#f1f5f9'}}
                          contentStyle={{ backgroundColor: "#fff", borderRadius: "8px", border: "1px solid #e2e8f0" }}
                          formatter={(value: number) => [`$${value}M`, "Amount"]}
                        />
                        <Bar dataKey="amount" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Pricing Trends (WAS)</CardTitle>
                    <CardDescription>Weighted average spread evolution over quarters.</CardDescription>
                  </CardHeader>
                  <CardContent className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={wasTrendData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="quarter" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis domain={[500, 700]} fontSize={12} tickLine={false} axisLine={false} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: "#fff", borderRadius: "8px", border: "1px solid #e2e8f0" }}
                        />
                        <Line type="monotone" dataKey="spread" stroke="#0f172a" strokeWidth={2} activeDot={{ r: 8 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
             </div>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}

// --- Components & Data ---

function StatCard({ title, value, subtext, icon }: { title: string, value: string, subtext: string, icon?: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between space-y-0 pb-2">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">{title}</p>
          {icon}
        </div>
        <div className="text-2xl font-semibold tabular-nums">{value}</div>
        <p className="text-xs text-muted-foreground mt-1">{subtext}</p>
      </CardContent>
    </Card>
  )
}

function BlockerItem({ name, count, percent, color }: { name: string, count: number, percent: number, color: string }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="font-medium">{name}</span>
        <span className="text-muted-foreground">{count} deals</span>
      </div>
      <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
        <div className={`h-full ${color}`} style={{ width: `${percent}%` }} />
      </div>
    </div>
  )
}

// Mock Data

const coverageData = [
  { day: "Day 1", ratio: 0.1 },
  { day: "Day 5", ratio: 0.4 },
  { day: "Day 10", ratio: 0.8 },
  { day: "Day 15", ratio: 1.2 },
  { day: "Day 20", ratio: 1.5 },
  { day: "Day 25", ratio: 1.8 },
  { day: "Day 30", ratio: 2.1 },
];

const lenderMixData = [
  { name: "Direct Lenders", value: 55, color: "#0f172a" },
  { name: "Banks", value: 20, color: "#334155" },
  { name: "Credit Funds", value: 15, color: "#475569" },
  { name: "Family Offices", value: 10, color: "#94a3b8" },
];

const pricingBandData = [
  { band: "S+600", volume: 5 },
  { band: "S+625", volume: 15 },
  { band: "S+650", volume: 20 },
  { band: "S+675", volume: 5 },
];

const funnelData = [
  { stage: "Outreach", count: 85, color: "#94a3b8" },
  { stage: "NDA", count: 60, color: "#64748b" },
  { stage: "LP", count: 45, color: "#475569" },
  { stage: "IOI", count: 20, color: "#334155" },
  { stage: "Firm Bid", count: 8, color: "#0f172a" },
];

const timeInStageData = [
  { stage: "NDA", "Current Deal": 5, "Market Benchmark": 7 },
  { stage: "Diligence", "Current Deal": 14, "Market Benchmark": 21 },
  { stage: "Documentation", "Current Deal": 10, "Market Benchmark": 14 },
  { stage: "Closing", "Current Deal": 3, "Market Benchmark": 5 },
];

const maturityData = [
  { year: "2025", amount: 45 },
  { year: "2026", amount: 80 },
  { year: "2027", amount: 150 },
  { year: "2028", amount: 200 },
  { year: "2029", amount: 120 },
];

const wasTrendData = [
  { quarter: "Q1 '24", spread: 625 },
  { quarter: "Q2 '24", spread: 610 },
  { quarter: "Q3 '24", spread: 595 },
  { quarter: "Q4 '24", spread: 580 },
];
