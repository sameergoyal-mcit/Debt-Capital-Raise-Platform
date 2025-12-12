import React from "react";
import { useRoute } from "wouter";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  CheckSquare, 
  FileSignature, 
  Banknote, 
  Scale, 
  AlertCircle,
  FileCheck,
  Download
} from "lucide-react";
import { mockDeals } from "@/data/deals";
import { RoleSwitcher } from "@/components/role-switcher";

export default function Closing() {
  const [, params] = useRoute("/deal/:id/closing");
  const dealId = params?.id;
  const deal = mockDeals.find(d => d.id === dealId) || mockDeals[0];

  return (
    <Layout>
      <div className="space-y-6 animate-in fade-in duration-500">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-3xl font-serif font-bold text-primary tracking-tight">Closing Checklist</h1>
              <Badge variant="outline" className="bg-purple-50 border-purple-200 text-purple-700">
                Target: {new Date(deal.closeDate).toLocaleDateString()}
              </Badge>
            </div>
            <p className="text-muted-foreground">Manage conditions precedent (CPs) and funding requirements.</p>
          </div>
          <div className="flex items-center gap-3">
             <RoleSwitcher />
             <Button variant="outline" className="gap-2">
               <Download className="h-4 w-4" /> Export CP List
             </Button>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <div className="md:col-span-2 space-y-6">
            {/* CP Progress */}
            <Card className="border-border/60 shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle>Conditions Precedent Progress</CardTitle>
                  <span className="text-sm font-medium text-muted-foreground">18/24 Completed</span>
                </div>
              </CardHeader>
              <CardContent>
                <Progress value={75} className="h-3 bg-secondary" />
                <div className="grid grid-cols-3 gap-4 mt-6 text-center">
                   <div>
                     <p className="text-2xl font-bold text-primary">4</p>
                     <p className="text-xs text-muted-foreground uppercase tracking-wide">Legal CPs</p>
                   </div>
                   <div>
                     <p className="text-2xl font-bold text-primary">2</p>
                     <p className="text-xs text-muted-foreground uppercase tracking-wide">Financial CPs</p>
                   </div>
                   <div>
                     <p className="text-2xl font-bold text-primary">0</p>
                     <p className="text-xs text-muted-foreground uppercase tracking-wide">KYC Outstanding</p>
                   </div>
                </div>
              </CardContent>
            </Card>

            {/* Checklist Groups */}
            <div className="space-y-4">
              <ChecklistGroup 
                title="Legal Documentation" 
                icon={<Scale className="h-5 w-5 text-blue-600" />}
                items={[
                  { label: "Credit Agreement - Execution Version", status: "completed" },
                  { label: "Intercreditor Agreement", status: "completed" },
                  { label: "Security Agreement", status: "completed" },
                  { label: "Legal Opinions", status: "pending", assignee: "Latham & Watkins" },
                  { label: "Corporate Resolutions", status: "pending", assignee: "Borrower Counsel" },
                ]}
              />

              <ChecklistGroup 
                title="Financial & Funding" 
                icon={<Banknote className="h-5 w-5 text-green-600" />}
                items={[
                  { label: "Funds Flow Memorandum", status: "completed" },
                  { label: "Borrowing Notice", status: "completed" },
                  { label: "Solvency Certificate", status: "pending", assignee: "CFO" },
                  { label: "Wire Instructions Verification", status: "completed" },
                ]}
              />

              <ChecklistGroup 
                title="Diligence & Compliance" 
                icon={<FileCheck className="h-5 w-5 text-purple-600" />}
                items={[
                  { label: "KYC / PATRIOT Act Compliance", status: "completed" },
                  { label: "Insurance Certificates", status: "completed" },
                  { label: "Good Standing Certificates", status: "completed" },
                  { label: "Bring-Down Certificate", status: "pending", assignee: "Company" },
                ]}
              />
            </div>
          </div>

          <div className="space-y-6">
             <Card className="border-l-4 border-l-red-500 shadow-sm bg-red-50/10">
               <CardHeader className="pb-2">
                 <CardTitle className="flex items-center gap-2 text-red-700 text-base">
                   <AlertCircle className="h-5 w-5" /> Outstanding Items
                 </CardTitle>
               </CardHeader>
               <CardContent className="space-y-3">
                 <div className="flex items-start gap-2 text-sm">
                   <Checkbox id="item1" />
                   <div className="grid gap-1.5 leading-none">
                     <label htmlFor="item1" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                       Legal Opinions
                     </label>
                     <p className="text-xs text-muted-foreground">Waiting on Borrower Counsel final review.</p>
                   </div>
                 </div>
                 <div className="flex items-start gap-2 text-sm">
                   <Checkbox id="item2" />
                   <div className="grid gap-1.5 leading-none">
                     <label htmlFor="item2" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                       Solvency Certificate
                     </label>
                     <p className="text-xs text-muted-foreground">Requires Board signature.</p>
                   </div>
                 </div>
               </CardContent>
             </Card>

             <Card className="shadow-sm border-border/60">
               <CardHeader>
                 <CardTitle className="text-base">Closing Team</CardTitle>
               </CardHeader>
               <CardContent className="space-y-4">
                 <div className="flex items-center gap-3">
                   <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-xs">LW</div>
                   <div>
                     <p className="text-sm font-medium">Latham & Watkins</p>
                     <p className="text-xs text-muted-foreground">Lender Counsel</p>
                   </div>
                 </div>
                 <div className="flex items-center gap-3">
                   <div className="h-8 w-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-700 font-bold text-xs">KC</div>
                   <div>
                     <p className="text-sm font-medium">Kirkland & Ellis</p>
                     <p className="text-xs text-muted-foreground">Borrower Counsel</p>
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

function ChecklistGroup({ title, icon, items }: { title: string, icon: React.ReactNode, items: any[] }) {
  return (
    <Card className="border-border/60 shadow-sm">
      <CardHeader className="py-3 border-b border-border/50 bg-secondary/20">
        <CardTitle className="flex items-center gap-2 text-base">
          {icon} {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4 space-y-2">
        {items.map((item, idx) => (
          <div key={idx} className="flex items-center justify-between py-2 border-b border-border/40 last:border-0 last:pb-0">
            <div className="flex items-center gap-3">
               <div className={`h-5 w-5 rounded-full flex items-center justify-center border ${item.status === 'completed' ? 'bg-green-100 border-green-200 text-green-700' : 'border-muted-foreground/30'}`}>
                 {item.status === 'completed' && <CheckSquare className="h-3 w-3" />}
               </div>
               <span className={`text-sm ${item.status === 'completed' ? 'text-muted-foreground line-through' : 'font-medium'}`}>
                 {item.label}
               </span>
            </div>
            {item.assignee && (
              <Badge variant="outline" className="text-[10px] font-normal text-muted-foreground">
                {item.assignee}
              </Badge>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
