import React, { useState, useRef, useEffect } from "react";
import { useAuth } from "@/context/auth-context";
import { getInvitation, signNDA } from "@/data/invitations";
import { mockDeals } from "@/data/deals";
import { getNDATemplate } from "@/data/nda-templates";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ShieldAlert, FileText, Lock, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";
import { emailService } from "@/lib/email-service";
import { emailTemplates } from "@/lib/email-templates";
import { config } from "@/lib/config";

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
  const [canAgree, setCanAgree] = useState(false); // Only enable checkbox after scrolling
  const [forceUpdate, setForceUpdate] = useState(0); // To trigger re-render after sign
  const [isRedirecting, setIsRedirecting] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // If not an investor, pass through (internal users bypass NDA)
  if (!user || user.role !== "Investor" || !user.lenderId) {
    return <>{children}</>;
  }

  const invitation = getInvitation(dealId, user.lenderId);
  const deal = mockDeals.find(d => d.id === dealId);
  const template = deal?.ndaTemplateId ? getNDATemplate(deal.ndaTemplateId) : getNDATemplate("nda_std_v1");

  // Handle scroll detection
  const handleScroll = () => {
    if (scrollRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
      // Allow 10px buffer
      if (scrollTop + clientHeight >= scrollHeight - 10) {
        setCanAgree(true);
      }
    }
  };

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

  // Version check logic could go here:
  // if (invitation.ndaSignedAt && invitation.ndaVersion !== template?.version) { ... require re-sign ... }
  // For now, simple check if signedAt exists.

  // If NDA required and not signed
  if (invitation.ndaRequired && !invitation.ndaSignedAt) {
    const handleSign = async () => {
      // Logic for internal signing
      if (!config.useDocuSign) {
        if (!agreed) return;
        
        const ip = "192.168.1." + Math.floor(Math.random() * 255); // Mock IP
        const email = user.email || "investor@fund.com";
        const version = template?.version || "1.0";

        const success = signNDA(dealId, user.lenderId!, version, email, ip);
        if (success) {
          toast({
            title: "NDA Signed",
            description: `You agreed to v${version} of the NDA. Access granted.`,
          });

          // Send Email Notification
          await emailService.send({
            to: "deal-team@capitalflow.com",
            subject: `NDA Signed: ${deal?.dealName || dealId} - ${user.name || email}`,
            html: emailTemplates.ndaSigned(deal?.dealName || dealId, user.name || email)
          });

          setForceUpdate(prev => prev + 1);
        }
      }
    };

    // Placeholder for DocuSign Redirect
    const handleDocuSignRedirect = () => {
      setIsRedirecting(true);
      
      // Simulate external redirect and callback
      setTimeout(() => {
        // In a real app, this would be a callback route (e.g., /auth/docusign/callback)
        // Here we just mock the success immediately for demo purposes
        const ip = "192.168.1." + Math.floor(Math.random() * 255); 
        const email = user.email || "investor@fund.com";
        const version = template?.version || "1.0";
        
        signNDA(dealId, user.lenderId!, version, email, ip);
        
        toast({
          title: "DocuSign Envelope Completed",
          description: "We received confirmation from DocuSign. Access granted.",
        });

        // Send Email Notification
        emailService.send({
          to: "deal-team@capitalflow.com",
          subject: `NDA Signed (DocuSign): ${deal?.dealName || dealId} - ${user.name || email}`,
          html: emailTemplates.ndaSigned(deal?.dealName || dealId, user.name || email)
        });

        setIsRedirecting(false);
        setForceUpdate(prev => prev + 1);
      }, 3000);
    };

    if (config.useDocuSign) {
      if (isRedirecting) {
        return (
          <div className="flex flex-col items-center justify-center min-h-[60vh] p-4 animate-in fade-in duration-500">
            <Card className="max-w-md w-full border-blue-200 shadow-lg bg-blue-50/10">
              <CardHeader className="text-center pb-8">
                <div className="mx-auto bg-blue-100 p-4 rounded-full w-fit mb-4 animate-pulse">
                   <ExternalLink className="h-8 w-8 text-blue-600" />
                </div>
                <CardTitle className="text-xl font-serif">Connecting to DocuSign...</CardTitle>
                <CardDescription>
                  Please complete the electronic signature process in the new window.
                </CardDescription>
              </CardHeader>
              <CardContent className="text-center text-sm text-muted-foreground pb-8">
                Waiting for confirmation...
              </CardContent>
            </Card>
          </div>
        );
      }

      return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] p-4 animate-in fade-in duration-500">
          <Card className="max-w-lg w-full border-blue-200 shadow-lg">
             <CardHeader className="text-center border-b border-border/50 pb-6">
               <div className="mx-auto bg-blue-50 p-4 rounded-full w-fit mb-4 ring-1 ring-blue-100">
                  <FileText className="h-8 w-8 text-blue-600" />
               </div>
               <CardTitle className="text-2xl font-serif">{title}</CardTitle>
               <CardDescription className="text-base">
                 This deal requires a secure signature via DocuSign.
               </CardDescription>
             </CardHeader>
             <CardContent className="space-y-6 pt-6 text-center">
               <p className="text-sm text-muted-foreground">
                 Click the button below to be redirected to our secure DocuSign envelope. 
                 Once you have signed the NDA, you will be automatically returned to the Virtual Data Room.
               </p>
               <div className="bg-secondary/20 p-4 rounded text-xs text-left border border-border">
                 <p className="font-semibold mb-1">Document:</p>
                 <p>{template?.name || "Standard Private Credit NDA"}</p>
                 <p className="mt-2 font-semibold mb-1">Signer:</p>
                 <p>{user.name || user.email} (on behalf of Lender)</p>
               </div>
             </CardContent>
             <CardFooter className="bg-secondary/10 border-t pt-6">
               <Button className="w-full h-11 text-base bg-[#005cb9] hover:bg-[#00448a]" onClick={handleDocuSignRedirect}>
                 <ExternalLink className="mr-2 h-4 w-4" /> Continue to DocuSign
               </Button>
             </CardFooter>
          </Card>
        </div>
      );
    }

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
             {template && (
               <div className="mt-2 text-xs text-muted-foreground bg-secondary/50 py-1 px-2 rounded-full inline-block">
                 Using template: <span className="font-medium text-foreground">{template.name} (v{template.version})</span>
               </div>
             )}
           </CardHeader>
           <CardContent className="space-y-6 pt-6">
             <div 
               className="bg-secondary/30 p-4 rounded-md border border-border text-sm leading-relaxed h-64 overflow-y-auto font-mono text-muted-foreground relative"
               onScroll={handleScroll}
               ref={scrollRef}
             >
               <div className="whitespace-pre-wrap">
                 {template?.bodyText || "NDA content not available."}
               </div>
               {/* Spacer to ensure scroll triggers */}
               <div className="h-4"></div>
             </div>

             <div className="flex items-start space-x-3 pt-2">
               <Checkbox 
                  id="nda-agree" 
                  checked={agreed} 
                  onCheckedChange={(c) => setAgreed(!!c)} 
                  disabled={!canAgree}
               />
               <div className="grid gap-1.5 leading-none">
                 <Label
                   htmlFor="nda-agree"
                   className={`text-sm font-medium leading-none ${!canAgree ? 'text-muted-foreground' : ''}`}
                 >
                   I agree to the terms of the Non-Disclosure Agreement
                 </Label>
                 {!canAgree ? (
                   <p className="text-xs text-amber-600">
                     Please scroll to the bottom of the document to agree.
                   </p>
                 ) : (
                   <p className="text-xs text-muted-foreground">
                     By checking this box, you execute this agreement electronically.
                     <br/>
                     <span className="text-[10px] opacity-70">Logged as: {user.email || "investor@fund.com"} • IP: Recorded</span>
                   </p>
                 )}
               </div>
             </div>
           </CardContent>
           <CardFooter className="bg-secondary/10 border-t pt-6">
             <Button className="w-full h-11 text-base" onClick={handleSign} disabled={!agreed || !canAgree}>
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
