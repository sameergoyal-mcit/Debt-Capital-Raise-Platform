import React from "react";
import { useRoute } from "wouter";
import { Layout } from "@/components/layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useDeal } from "@/hooks/api-hooks";
import { RoleSwitcher } from "@/components/role-switcher";
import { useRole } from "@/context/role";
import { Users, Lock, FileText, Eye } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function InvestorViewer() {
  const [, params] = useRoute("/deal/:id/viewer/investor");
  const dealId = params?.id || "1";
  const { data: deal } = useDeal(dealId);
  const { setRole } = useRole();

  // Force role to investor when visiting this route
  React.useEffect(() => {
    setRole("investor");
  }, [setRole]);

  return (
    <Layout>
      <div className="space-y-6 animate-in fade-in duration-500">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-3xl font-serif font-bold text-primary tracking-tight">Role Portal</h1>
              <Badge variant="outline" className="bg-secondary text-secondary-foreground">
                Current View: Investor
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
      </div>
    </Layout>
  );
}
