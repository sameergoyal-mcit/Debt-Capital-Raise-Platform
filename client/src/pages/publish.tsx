import React, { useState, useEffect } from "react";
import { Link, useRoute } from "wouter";
import { 
  Send, 
  FileText, 
  Copy, 
  Download, 
  Mail, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Printer, 
  History,
  ShieldCheck,
  Megaphone
} from "lucide-react";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";

export default function Publish() {
  const [, params] = useRoute("/deal/:id/publish");
  const dealId = params?.id || "123";
  const { toast } = useToast();

  // State
  const [templateType, setTemplateType] = useState<"short" | "long">("short");
  const [approvals, setApprovals] = useState({
    issuer: false,
    counsel: false,
    bookrunner: true
  });
  const [destinations, setDestinations] = useState({
    debtDomain: true,
    pitchbook: false,
    nineFin: false,
    internalEmail: true,
    prNewswire: false
  });
  const [announcementText, setAnnouncementText] = useState("");
  const [auditLog, setAuditLog] = useState<any[]>([
    { id: 1, timestamp: new Date(Date.now() - 86400000).toLocaleString(), user: "Sarah Jenkins (Bookrunner)", destinations: ["Internal Email"], hash: "Draft v1" }
  ]);

  // Templates
  const templates = {
    short: `Project Titan - $45M Senior Secured Term Loan
    
Pricing Guidance: S + 625-650 (OID 98.0)
Commitments Due: July 15, 2025 @ 5:00 PM ET

Titan Software Inc. has launched a $45M Senior Secured Term Loan to refinance existing debt.
- Tenor: 5 Years
- Security: First Lien on all assets
- Covenants: Max Leverage 4.50x
    
Please contact the deal team for VDR access.`,
    long: `LAUNCH: Project Titan - $45M Senior Secured Term Loan

Titan Software Inc. ("The Company"), a leading provider of enterprise SaaS solutions, has launched a $45M Senior Secured Term Loan transaction. Proceeds will be used to refinance existing indebtedness and fund general corporate purposes.

Terms:
- Facility: $45M Senior Secured Term Loan
- Tenor: 5 Years
- Pricing: SOFR + 625-650 bps
- OID: 98.0
- Call Protection: 102, 101, Par
- Financial Covenants: Max Total Net Leverage 4.50x

Schedule:
- Bank Meeting: June 15, 2025
- Commitments Due: July 15, 2025 @ 5:00 PM ET
- Closing / Funding: July 20, 2025

The Company is rated B2 / B.

Please access the Virtual Data Room (Debt Domain) for the CIM and Legal Model.
Contact: deal.team@capitalflow.com`
  };

  useEffect(() => {
    setAnnouncementText(templates[templateType]);
  }, [templateType]);

  const handleCopy = () => {
    navigator.clipboard.writeText(announcementText);
    toast({
      title: "Copied to clipboard",
      description: "Announcement text ready to paste.",
    });
  };

  const handlePublish = () => {
    if (!approvals.issuer || !approvals.counsel) {
      toast({
        title: "Approvals Missing",
        description: "Please secure all approvals before publishing.",
        variant: "destructive"
      });
      return;
    }

    const newLog = {
      id: auditLog.length + 1,
      timestamp: new Date().toLocaleString(),
      user: "Current User",
      destinations: Object.keys(destinations).filter(k => destinations[k as keyof typeof destinations]).map(k => k.replace(/([A-Z])/g, ' $1').trim()),
      hash: `Draft v${auditLog.length + 1}`
    };

    setAuditLog([newLog, ...auditLog]);
    
    toast({
      title: "Distribution Initiated",
      description: "Announcement package generated and logged.",
    });
  };

  const toggleApproval = (type: keyof typeof approvals) => {
    setApprovals(prev => ({ ...prev, [type]: !prev[type] }));
  };

  const toggleDestination = (type: keyof typeof destinations) => {
    setDestinations(prev => ({ ...prev, [type]: !prev[type] }));
  };

  return (
    <Layout>
      <div className="space-y-6 animate-in fade-in duration-500">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <Link href={`/deal/${dealId}/overview`} className="hover:text-primary">Project Titan</Link>
              <span>/</span>
              <span>Publish</span>
            </div>
            <h1 className="text-3xl font-serif font-bold text-primary tracking-tight">Distribution & Announcement</h1>
            <p className="text-muted-foreground mt-1">Package pricing updates and announcements for market distribution.</p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" className="gap-2" onClick={() => window.print()}>
              <Printer className="h-4 w-4" /> Print Summary
            </Button>
            <Button className="gap-2 bg-primary text-primary-foreground" onClick={handlePublish}>
              <Send className="h-4 w-4" /> Publish & Distribute
            </Button>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {/* Left Column: Configuration */}
          <div className="space-y-6 md:col-span-2">
            <Card className="border-border/60 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" /> Announcement Content
                </CardTitle>
                <CardDescription>Select template and customize the message.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-[200px]">
                    <Select value={templateType} onValueChange={(v: any) => setTemplateType(v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select template" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="short">Short Update (Bloomberg)</SelectItem>
                        <SelectItem value="long">Full Launch (Email/Press)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex gap-2 ml-auto">
                    <Button variant="outline" size="sm" onClick={handleCopy}>
                      <Copy className="h-4 w-4 mr-2" /> Copy
                    </Button>
                    <Button variant="outline" size="sm">
                      <Download className="h-4 w-4 mr-2" /> PDF
                    </Button>
                    <Button variant="outline" size="sm">
                      <Mail className="h-4 w-4 mr-2" /> Mailto
                    </Button>
                  </div>
                </div>
                
                <Textarea 
                  className="min-h-[300px] font-mono text-sm bg-secondary/10"
                  value={announcementText}
                  onChange={(e) => setAnnouncementText(e.target.value)}
                />
              </CardContent>
            </Card>

            <Card className="border-border/60 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="h-5 w-5 text-primary" /> Distribution Audit Log
                </CardTitle>
                <CardDescription>Record of previous announcements and drafts sent.</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Timestamp</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Destinations</TableHead>
                      <TableHead>Content Hash</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {auditLog.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="text-sm text-muted-foreground">{log.timestamp}</TableCell>
                        <TableCell className="font-medium">{log.user}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {log.destinations.map((d: string, i: number) => (
                              <Badge key={i} variant="outline" className="text-[10px] font-normal">{d}</Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">{log.hash}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Controls */}
          <div className="space-y-6">
            <Card className="border-l-4 border-l-blue-500 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <ShieldCheck className="h-5 w-5 text-blue-600" /> Approval Status
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <ApprovalItem 
                  label="Issuer Approval" 
                  checked={approvals.issuer} 
                  onChange={() => toggleApproval('issuer')}
                  subtext="CFO sign-off on pricing"
                />
                <ApprovalItem 
                  label="Counsel Approval" 
                  checked={approvals.counsel} 
                  onChange={() => toggleApproval('counsel')}
                  subtext="Legal review of terms"
                />
                <ApprovalItem 
                  label="Bookrunner Approval" 
                  checked={approvals.bookrunner} 
                  onChange={() => toggleApproval('bookrunner')}
                  subtext="Syndicate desk release"
                  locked
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Megaphone className="h-5 w-5 text-primary" /> Destinations
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <DestinationItem 
                    label="Debt Domain / VDR" 
                    checked={destinations.debtDomain}
                    onChange={() => toggleDestination('debtDomain')}
                  />
                  <DestinationItem 
                    label="Internal Email List" 
                    checked={destinations.internalEmail}
                    onChange={() => toggleDestination('internalEmail')}
                  />
                  <DestinationItem 
                    label="PitchBook / LCD" 
                    checked={destinations.pitchbook}
                    onChange={() => toggleDestination('pitchbook')}
                  />
                  <DestinationItem 
                    label="9fin" 
                    checked={destinations.nineFin}
                    onChange={() => toggleDestination('nineFin')}
                  />
                  <DestinationItem 
                    label="PR Newswire" 
                    checked={destinations.prNewswire}
                    onChange={() => toggleDestination('prNewswire')}
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-secondary/20 border-border/60">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Distribution Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <div className="flex justify-between">
                    <span>Recipients:</span>
                    <span className="font-medium text-foreground">145 Investors</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Platforms:</span>
                    <span className="font-medium text-foreground">
                      {Object.values(destinations).filter(Boolean).length} Selected
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Scheduled:</span>
                    <span className="font-medium text-foreground">Immediate</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
}

function ApprovalItem({ label, checked, onChange, subtext, locked }: { label: string; checked: boolean; onChange: () => void; subtext: string; locked?: boolean }) {
  return (
    <div className="flex items-start space-x-3 p-2 rounded hover:bg-secondary/50 transition-colors">
      <Checkbox 
        id={label} 
        checked={checked} 
        onCheckedChange={onChange}
        disabled={locked}
        className="mt-1"
      />
      <div className="grid gap-1.5 leading-none">
        <label
          htmlFor={label}
          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
        >
          {label}
        </label>
        <p className="text-xs text-muted-foreground">
          {subtext}
        </p>
      </div>
    </div>
  );
}

function DestinationItem({ label, checked, onChange }: { label: string; checked: boolean; onChange: () => void }) {
  return (
    <div className="flex items-center space-x-2">
      <Checkbox id={label} checked={checked} onCheckedChange={onChange} />
      <label
        htmlFor={label}
        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
      >
        {label}
      </label>
    </div>
  );
}
