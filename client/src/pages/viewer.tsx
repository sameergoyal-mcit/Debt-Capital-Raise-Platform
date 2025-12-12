import React from "react";
import { useRoute } from "wouter";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { 
  Shield, 
  Users, 
  Briefcase, 
  Lock, 
  Eye, 
  FileText, 
  Activity, 
  TrendingUp,
  AlertTriangle
} from "lucide-react";
import { mockDeals } from "@/data/deals";
import { RoleSwitcher } from "@/components/role-switcher";
import { useRole } from "@/context/role";

export default function Viewer() {
  const [, params] = useRoute("/deal/:id/viewer");
  const dealId = params?.id;
  const deal = mockDeals.find(d => d.id === dealId) || mockDeals[0];
  const { role } = useRole();

  return (
    <Layout>
      <div className="space-y-6 animate-in fade-in duration-500">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-3xl font-serif font-bold text-primary tracking-tight">Role Portal</h1>
              <Badge variant="outline" className="bg-secondary text-secondary-foreground">
                Current View: {role.charAt(0).toUpperCase() + role.slice(1)}
              </Badge>
            </div>
            <p className="text-muted-foreground">
              Demonstrating role-based access and views for {deal.dealName}.
            </p>
          </div>
          <div className="flex items-center gap-3">
             <RoleSwitcher />
          </div>
        </div>

        {/* Role Specific Content */}
        <div className="grid gap-6">
          
          {role === 'issuer' && <IssuerView deal={deal} />}
          {role === 'bookrunner' && <BookrunnerView deal={deal} />}
          {role === 'investor' && <InvestorView deal={deal} />}

        </div>
      </div>
    </Layout>
  );
}

function IssuerView({ deal }: { deal: any }) {
  return (
    <div className="space-y-6">
      <Alert className="bg-blue-50 border-blue-200 text-blue-800">
        <Briefcase className="h-4 w-4" />
        <AlertTitle>Issuer (Sponsor) View</AlertTitle>
        <AlertDescription>
          Focus on execution cost, speed, and covenant flexibility.
        </AlertDescription>
      </Alert>

      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader>
             <CardTitle className="text-base flex items-center gap-2">
               <TrendingUp className="h-4 w-4 text-primary" /> Cost of Capital
             </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
               <div>
                 <p className="text-xs text-muted-foreground uppercase">Est. All-In Yield</p>
                 <p className="text-2xl font-serif font-bold text-primary">11.25%</p>
               </div>
               <div>
                 <p className="text-xs text-muted-foreground uppercase">Pricing Sensitivity</p>
                 <p className="text-sm font-medium text-amber-600">+25 bps Flex = +$112k/yr</p>
               </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
             <CardTitle className="text-base flex items-center gap-2">
               <Activity className="h-4 w-4 text-primary" /> Pricing Pressure
             </CardTitle>
          </CardHeader>
          <CardContent>
             <div className="flex items-center gap-2 text-green-600 bg-green-50 p-3 rounded-md border border-green-100">
               <TrendingUp className="h-5 w-5" />
               <span className="font-bold">Tightening</span>
             </div>
             <p className="text-xs text-muted-foreground mt-2">
               Strong demand allows for potential reverse flex (-25 bps).
             </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
             <CardTitle className="text-base flex items-center gap-2">
               <Shield className="h-4 w-4 text-primary" /> Covenant Headroom
             </CardTitle>
          </CardHeader>
          <CardContent>
             <div className="space-y-3">
               <div className="flex justify-between text-sm">
                 <span className="text-muted-foreground">Leverage</span>
                 <span className="font-medium">4.50x / 4.75x Cap</span>
               </div>
               <Progress value={90} className="h-2" />
               <p className="text-xs text-amber-600 mt-1">Tight headroom in Year 1</p>
             </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function BookrunnerView({ deal }: { deal: any }) {
  return (
    <div className="space-y-6">
      <Alert className="bg-purple-50 border-purple-200 text-purple-800">
        <Shield className="h-4 w-4" />
        <AlertTitle>Bookrunner (Bank) View</AlertTitle>
        <AlertDescription>
          Focus on syndication, investor coverage, and allocation.
        </AlertDescription>
      </Alert>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="md:col-span-2">
          <CardHeader>
             <CardTitle className="text-base flex items-center gap-2">
               <Users className="h-4 w-4 text-primary" /> Investor Book Operations
             </CardTitle>
          </CardHeader>
          <CardContent>
             <div className="grid grid-cols-4 gap-4 text-center">
               <div className="p-4 bg-secondary/30 rounded-lg border border-border">
                 <p className="text-2xl font-bold">45</p>
                 <p className="text-xs text-muted-foreground">NDAs Signed</p>
               </div>
               <div className="p-4 bg-secondary/30 rounded-lg border border-border">
                 <p className="text-2xl font-bold">12</p>
                 <p className="text-xs text-muted-foreground">IOIs Received</p>
               </div>
               <div className="p-4 bg-secondary/30 rounded-lg border border-border">
                 <p className="text-2xl font-bold">8</p>
                 <p className="text-xs text-muted-foreground">Questions Pending</p>
               </div>
               <div className="p-4 bg-secondary/30 rounded-lg border border-border">
                 <p className="text-2xl font-bold">$32.5M</p>
                 <p className="text-xs text-muted-foreground">Total Soft Circle</p>
               </div>
             </div>
          </CardContent>
        </Card>

        <Card>
           <CardHeader>
             <CardTitle className="text-base">Lender Comments (Internal)</CardTitle>
           </CardHeader>
           <CardContent className="space-y-3">
             <div className="text-sm p-3 bg-yellow-50 border border-yellow-100 rounded-md">
               <span className="font-bold text-yellow-800">BlackRock:</span> "Concerned about customer concentration. Need mitigants."
             </div>
             <div className="text-sm p-3 bg-yellow-50 border border-yellow-100 rounded-md">
               <span className="font-bold text-yellow-800">Apollo:</span> "Will commit $10M if OID is 98.0."
             </div>
           </CardContent>
        </Card>

        <Card>
           <CardHeader>
             <CardTitle className="text-base">Allocation Prep</CardTitle>
           </CardHeader>
           <CardContent>
             <Button className="w-full" variant="outline">
                <FileText className="mr-2 h-4 w-4" /> Generate Allocation Grid
             </Button>
           </CardContent>
        </Card>
      </div>
    </div>
  )
}

function InvestorView({ deal }: { deal: any }) {
  return (
    <div className="space-y-6">
      <Alert className="bg-green-50 border-green-200 text-green-800">
        <Users className="h-4 w-4" />
        <AlertTitle>Investor (Lender) View</AlertTitle>
        <AlertDescription>
          Restricted view. Only sees public info, own commitment, and diligence materials.
        </AlertDescription>
      </Alert>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
           <CardHeader>
             <CardTitle className="text-base flex items-center gap-2">
               <Lock className="h-4 w-4 text-primary" /> Confidential Information
             </CardTitle>
           </CardHeader>
           <CardContent className="space-y-4">
             <div className="flex justify-between items-center p-3 bg-secondary/20 rounded-lg border border-border">
               <span className="text-sm font-medium">Confidential Information Memo</span>
               <Button size="sm" variant="outline">Download</Button>
             </div>
             <div className="flex justify-between items-center p-3 bg-secondary/20 rounded-lg border border-border">
               <span className="text-sm font-medium">Financial Model (v3)</span>
               <Button size="sm" variant="outline">Download</Button>
             </div>
           </CardContent>
        </Card>

        <Card>
           <CardHeader>
             <CardTitle className="text-base flex items-center gap-2">
               <FileText className="h-4 w-4 text-primary" /> Submit Commitment
             </CardTitle>
           </CardHeader>
           <CardContent className="space-y-4">
              <Button className="w-full bg-green-600 hover:bg-green-700">
                Submit IOI
              </Button>
              <p className="text-xs text-center text-muted-foreground">
                Deadline: July 10, 2025
              </p>
           </CardContent>
        </Card>
        
        <Card className="md:col-span-2 opacity-50 border-dashed">
           <CardHeader>
             <CardTitle className="text-base flex items-center gap-2 text-muted-foreground">
               <Eye className="h-4 w-4" /> Other Investors Hidden
             </CardTitle>
           </CardHeader>
           <CardContent>
             <p className="text-sm text-muted-foreground text-center py-4">
               You cannot view other lenders' commitments or comments in this process.
             </p>
           </CardContent>
        </Card>
      </div>
    </div>
  )
}
