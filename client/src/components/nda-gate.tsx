import React, { useState } from "react";
import { useAuth } from "@/context/auth-context";
import { getInvitation, signNDA } from "@/data/invitations";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ShieldAlert, FileText, Lock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface NDAGateProps {
  dealId: string;
  children: React.ReactNode;
  title?: string;
  description?: string;
}

export function NDAGate({ dealId, children, title = "Confidential Information", description = "Access Restricted" }: NDAGateProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [agreed, setAgreed] = useState(false);
  const [forceUpdate, setForceUpdate] = useState(0); // To trigger re-render after sign

  // If not an investor, pass through (internal users bypass NDA)
  if (!user || user.role !== "Investor" || !user.lenderId) {
    return <>{children}</>;
  }

  const invitation = getInvitation(dealId, user.lenderId);

  // If no invitation found, deny access completely
  if (!invitation) {
    return (
      <Card className="max-w-md mx-auto mt-12 border-destructive/20 bg-destructive/5">
        <CardHeader className="text-center">
          <div className="mx-auto bg-destructive/10 p-3 rounded-full w-fit mb-4">
             <ShieldAlert className="h-8 w-8 text-destructive" />
          </div>
          <CardTitle className="text-destructive">Access Denied</CardTitle>
          <CardDescription>
            You do not have an active invitation for this deal.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center text-sm text-muted-foreground">
          Please contact the deal administrator if you believe this is an error.
        </CardContent>
      </Card>
    );
  }

  // If NDA required and not signed
  if (invitation.ndaRequired && !invitation.ndaSignedAt) {
    const handleSign = () => {
      if (!agreed) return;
      
      const success = signNDA(dealId, user.lenderId!);
      if (success) {
        toast({
          title: "NDA Signed",
          description: "You now have access to the data room.",
        });
        setForceUpdate(prev => prev + 1);
      }
    };

    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-4 animate-in fade-in duration-500">
        <Card className="max-w-lg w-full border-amber-200 shadow-lg">
           <CardHeader className="text-center border-b border-border/50 pb-6">
             <div className="mx-auto bg-amber-50 p-4 rounded-full w-fit mb-4 ring-1 ring-amber-100">
                <Lock className="h-8 w-8 text-amber-600" />
             </div>
             <CardTitle className="text-2xl font-serif">{title}</CardTitle>
             <CardDescription className="text-base">
               {description} - Non-Disclosure Agreement Required
             </CardDescription>
           </CardHeader>
           <CardContent className="space-y-6 pt-6">
             <div className="bg-secondary/30 p-4 rounded-md border border-border text-sm leading-relaxed h-48 overflow-y-auto font-mono text-muted-foreground">
               <p className="mb-2"><strong>CONFIDENTIALITY AGREEMENT</strong></p>
               <p className="mb-2">By accessing these materials, you agree to keep all information confidential and use it solely for the purpose of evaluating the potential transaction.</p>
               <p className="mb-2">1. <strong>Confidential Information.</strong> "Confidential Information" means all non-public information concerning the Company...</p>
               <p className="mb-2">2. <strong>Use of Information.</strong> Recipient agrees to use Confidential Information solely for the Purpose...</p>
               <p className="mb-2">3. <strong>Term.</strong> This agreement shall remain in effect for a period of two (2) years...</p>
               <p>...</p>
             </div>

             <div className="flex items-start space-x-3 pt-2">
               <Checkbox id="nda-agree" checked={agreed} onCheckedChange={(c) => setAgreed(!!c)} />
               <div className="grid gap-1.5 leading-none">
                 <Label
                   htmlFor="nda-agree"
                   className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                 >
                   I agree to the terms of the Non-Disclosure Agreement
                 </Label>
                 <p className="text-xs text-muted-foreground">
                   By checking this box, you execute this agreement electronically.
                 </p>
               </div>
             </div>
           </CardContent>
           <CardFooter className="bg-secondary/10 border-t pt-6">
             <Button className="w-full h-11 text-base" onClick={handleSign} disabled={!agreed}>
               <FileText className="mr-2 h-4 w-4" /> Sign NDA & Enter Data Room
             </Button>
           </CardFooter>
        </Card>
      </div>
    );
  }

  // If Access granted (or NDA signed), render children
  if (invitation.accessGranted) {
    return <>{children}</>;
  }

  // Fallback if access denied but NDA logic passed (e.g. revoked)
   return (
      <Card className="max-w-md mx-auto mt-12 border-destructive/20 bg-destructive/5">
        <CardHeader className="text-center">
          <CardTitle className="text-destructive">Access Revoked</CardTitle>
          <CardDescription>
            Your access to this deal has been revoked.
          </CardDescription>
        </CardHeader>
      </Card>
    );
}
