import React, { useState } from "react";
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
  Download,
  Plus,
  FileText
} from "lucide-react";
import { mockDeals } from "@/data/deals";
import { mockClosingItems, ClosingItem, mockDocuments } from "@/data/documents";
import { useAuth } from "@/context/auth-context";
import { useToast } from "@/hooks/use-toast";
import { downloadCSV, downloadPlaceholderDoc } from "@/lib/download";
import { AddChecklistItemModal, ChecklistItem } from "@/components/add-checklist-item-modal";

export default function Closing() {
  const [, params] = useRoute("/deal/:id/closing");
  const dealId = params?.id || "101";
  const deal = mockDeals.find(d => d.id === dealId) || mockDeals[0];
  const { user } = useAuth();
  const { toast } = useToast();
  const [isAddItemOpen, setIsAddItemOpen] = useState(false);
  const [customItems, setCustomItems] = useState<ChecklistItem[]>([]);
  
  const userRole = user?.role?.toLowerCase();
  const isInternal = userRole === "bookrunner" || userRole === "issuer";
  const dealDocs = mockDocuments.filter(d => d.dealId === dealId);

  const handleExportCPs = () => {
    const allItems = [...mockClosingItems, ...customItems.map(c => ({
      id: c.id,
      item: c.name,
      category: c.section.includes("Legal") ? "Legal" as const : c.section.includes("Financial") ? "Financial" as const : "Operational" as const,
      owner: c.ownerRole || "TBD",
      status: c.status === "COMPLETE" ? "Completed" as const : c.status === "IN_PROGRESS" ? "In Progress" as const : "Pending" as const,
      dueDate: "",
    }))];
    
    const headers = ["Item", "Category", "Owner", "Status", "Due Date"];
    const rows = allItems.map(item => [item.item, item.category, item.owner, item.status, item.dueDate || ""]);
    downloadCSV(`${deal.dealName}_closing_checklist.csv`, headers, rows);
    toast({ title: "Export Complete", description: `Exported ${allItems.length} checklist items.` });
  };

  const handleAddItem = (item: Omit<ChecklistItem, "id" | "createdAt">) => {
    const newItem: ChecklistItem = {
      ...item,
      id: `custom-${Date.now()}`,
      createdAt: new Date().toISOString()
    };
    setCustomItems(prev => [...prev, newItem]);
  };

  const legalItems = mockClosingItems.filter(i => i.category === "Legal");
  const financialItems = mockClosingItems.filter(i => i.category === "Financial");
  const operationalItems = mockClosingItems.filter(i => i.category === "Operational");

  const completedCount = mockClosingItems.filter(i => i.status === "Completed").length;
  const totalCount = mockClosingItems.length;
  const progress = Math.round((completedCount / totalCount) * 100);

  return (
    <Layout>
      <div className="space-y-6 animate-in fade-in duration-500">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-semibold text-primary tracking-tight">Closing Checklist</h1>
              <Badge variant="outline" className="bg-purple-50 border-purple-200 text-purple-700">
                Target: {new Date(deal.closeDate).toLocaleDateString()}
              </Badge>
            </div>
            <p className="text-muted-foreground">Manage conditions precedent (CPs) and funding requirements.</p>
          </div>
          <div className="flex items-center gap-3">
             {isInternal && (
               <Button variant="outline" className="gap-2" onClick={() => setIsAddItemOpen(true)} data-testid="button-add-checklist-item">
                 <Plus className="h-4 w-4" /> Add Item
               </Button>
             )}
             <Button variant="outline" className="gap-2" onClick={handleExportCPs} data-testid="button-export-cp">
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
                  <span className="text-sm font-medium text-muted-foreground">{completedCount}/{totalCount} Completed</span>
                </div>
              </CardHeader>
              <CardContent>
                <Progress value={progress} className="h-3 bg-secondary" />
                <div className="grid grid-cols-3 gap-4 mt-6 text-center">
                   <div>
                     <p className="text-2xl font-bold text-primary">{mockClosingItems.filter(i => i.category === "Legal" && i.status !== "Completed").length}</p>
                     <p className="text-xs text-muted-foreground uppercase tracking-wide">Legal CPs</p>
                   </div>
                   <div>
                     <p className="text-2xl font-bold text-primary">{mockClosingItems.filter(i => i.category === "Financial" && i.status !== "Completed").length}</p>
                     <p className="text-xs text-muted-foreground uppercase tracking-wide">Financial CPs</p>
                   </div>
                   <div>
                     <p className="text-2xl font-bold text-primary">{mockClosingItems.filter(i => i.category === "Operational" && i.status !== "Completed").length}</p>
                     <p className="text-xs text-muted-foreground uppercase tracking-wide">Ops Outstanding</p>
                   </div>
                </div>
              </CardContent>
            </Card>

            {/* Checklist Groups */}
            <div className="space-y-4">
              <ChecklistGroup 
                title="Legal Documentation" 
                icon={<Scale className="h-5 w-5 text-blue-600" />}
                items={legalItems}
              />

              <ChecklistGroup 
                title="Financial & Funding" 
                icon={<Banknote className="h-5 w-5 text-green-600" />}
                items={financialItems}
              />

              <ChecklistGroup 
                title="Diligence & Compliance" 
                icon={<FileCheck className="h-5 w-5 text-purple-600" />}
                items={operationalItems}
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
                 {mockClosingItems.filter(i => i.status !== "Completed").slice(0, 3).map(item => (
                   <div key={item.id} className="flex items-start gap-2 text-sm">
                     <Checkbox id={item.id} />
                     <div className="grid gap-1.5 leading-none">
                       <label htmlFor={item.id} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                         {item.item}
                       </label>
                       <p className="text-xs text-muted-foreground">Owner: {item.owner}</p>
                     </div>
                   </div>
                 ))}
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
      {/* Add Checklist Item Modal */}
      <AddChecklistItemModal
        isOpen={isAddItemOpen}
        onClose={() => setIsAddItemOpen(false)}
        onAdd={handleAddItem}
        dealId={dealId}
        existingDocuments={dealDocs}
      />
    </Layout>
  );
}

function ChecklistGroup({ title, icon, items }: { title: string, icon: React.ReactNode, items: ClosingItem[] }) {
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
               <div className={`h-5 w-5 rounded-full flex items-center justify-center border ${item.status === 'Completed' ? 'bg-green-100 border-green-200 text-green-700' : 'border-muted-foreground/30'}`}>
                 {item.status === 'Completed' && <CheckSquare className="h-3 w-3" />}
               </div>
               <span className={`text-sm ${item.status === 'Completed' ? 'text-muted-foreground line-through' : 'font-medium'}`}>
                 {item.item}
               </span>
            </div>
            {item.owner && (
              <Badge variant="outline" className="text-[10px] font-normal text-muted-foreground">
                {item.owner}
              </Badge>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
