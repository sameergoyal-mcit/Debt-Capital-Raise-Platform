import React from "react";
import { Link, useRoute } from "wouter";
import { 
  Search, 
  Filter, 
  Download, 
  Plus,
  MoreHorizontal,
  Mail,
  Phone
} from "lucide-react";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function InvestorBook() {
  const [, params] = useRoute("/deal/:id/book");
  const dealId = params?.id || "123";

  return (
    <Layout>
      <div className="space-y-6 animate-in fade-in duration-500">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <Link href={`/deal/${dealId}/overview`} className="hover:text-primary">Project Titan</Link>
              <span>/</span>
              <span>Investor Book</span>
            </div>
            <h1 className="text-3xl font-serif font-bold text-primary tracking-tight">Investor Book</h1>
            <p className="text-muted-foreground mt-1">Manage investor interest, allocations, and commitments.</p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" className="gap-2">
              <Download className="h-4 w-4" /> Export CSV
            </Button>
            <Button className="gap-2 bg-primary text-primary-foreground">
              <Plus className="h-4 w-4" /> Add Investor
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-primary text-primary-foreground">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-primary-foreground/80">Total Committed</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">$32.5M</div>
              <div className="text-xs text-primary-foreground/70 mt-1">72% of target</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Soft Circled</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">$5.0M</div>
              <div className="text-xs text-muted-foreground mt-1">2 Investors</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Active Diligence</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">$15.0M</div>
              <div className="text-xs text-muted-foreground mt-1">4 Investors</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Declined</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">$8.0M</div>
              <div className="text-xs text-muted-foreground mt-1">3 Investors</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters & Table */}
        <Card className="border-border/60 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="relative w-72">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Search investors..." 
                  className="pl-9 bg-secondary/30"
                />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="gap-2">
                  <Filter className="h-4 w-4" /> Status
                </Button>
                <Button variant="outline" size="sm" className="gap-2">
                  <Filter className="h-4 w-4" /> Type
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Investor Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ask Amount</TableHead>
                  <TableHead>Committed</TableHead>
                  <TableHead>Last Activity</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {investors.map((investor) => (
                  <TableRow key={investor.id}>
                    <TableCell className="font-medium">{investor.name}</TableCell>
                    <TableCell>{investor.type}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-primary">
                          <Mail className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-primary">
                          <Phone className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={investor.status} />
                    </TableCell>
                    <TableCell>{investor.ask}</TableCell>
                    <TableCell className="font-medium text-primary">{investor.committed}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{investor.lastActivity}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>View Details</DropdownMenuItem>
                          <DropdownMenuItem>Edit Allocation</DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive">Remove</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}

function StatusBadge({ status }: { status: string }) {
  let className = "";
  
  switch (status) {
    case "Committed":
      className = "bg-green-100 text-green-700 border-green-200";
      break;
    case "Soft Circle":
      className = "bg-blue-100 text-blue-700 border-blue-200";
      break;
    case "Diligence":
      className = "bg-amber-100 text-amber-700 border-amber-200";
      break;
    case "Declined":
      className = "bg-gray-100 text-gray-700 border-gray-200";
      break;
    default:
      className = "bg-secondary text-muted-foreground border-border";
  }

  return (
    <Badge variant="outline" className={`font-normal ${className}`}>
      {status}
    </Badge>
  );
}

const investors = [
  { id: 1, name: "BlackRock Credit", type: "Asset Manager", status: "Committed", ask: "$10M", committed: "$10M", lastActivity: "2 days ago" },
  { id: 2, name: "Apollo Global", type: "Private Equity", status: "Committed", ask: "$15M", committed: "$15M", lastActivity: "5 days ago" },
  { id: 3, name: "Oak Hill Advisors", type: "Credit Fund", status: "Soft Circle", ask: "$8M", committed: "$5M", lastActivity: "Today" },
  { id: 4, name: "Barings", type: "Asset Manager", status: "Diligence", ask: "$5M", committed: "-", lastActivity: "Yesterday" },
  { id: 5, name: "Golub Capital", type: "Private Debt", status: "Diligence", ask: "$10M", committed: "-", lastActivity: "3 days ago" },
  { id: 6, name: "Ares Management", type: "Alternative Asset", status: "Committed", ask: "$7.5M", committed: "$7.5M", lastActivity: "1 week ago" },
  { id: 7, name: "KKR Credit", type: "Private Equity", status: "Declined", ask: "$10M", committed: "-", lastActivity: "2 weeks ago" },
];
