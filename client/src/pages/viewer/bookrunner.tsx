import React from "react";
import { useRoute } from "wouter";
import { Layout } from "@/components/layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { mockDeals } from "@/data/deals";
import { RoleSwitcher } from "@/components/role-switcher";
import { useRole } from "@/context/role";
import { Shield, Users, FileText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function BookrunnerViewer() {
  const [, params] = useRoute("/deal/:id/viewer/bookrunner");
  const dealId = params?.id;
  const deal = mockDeals.find(d => d.id === dealId) || mockDeals[0];
  const { setRole } = useRole();

  // Force role to bookrunner when visiting this route
  React.useEffect(() => {
    setRole("bookrunner");
  }, [setRole]);

  return (
    <Layout>
      <div className="space-y-6 animate-in fade-in duration-500">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-3xl font-serif font-bold text-primary tracking-tight">Role Portal</h1>
              <Badge variant="outline" className="bg-secondary text-secondary-foreground">
                Current View: Bookrunner
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
      </div>
    </Layout>
  );
}
