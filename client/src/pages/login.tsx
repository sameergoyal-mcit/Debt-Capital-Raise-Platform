import React, { useState } from "react";
import { useLocation } from "wouter";
import { useAuth, UserRole } from "@/context/auth-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { mockLenders } from "@/data/lenders";
import { ShieldCheck, Briefcase, Users } from "lucide-react";

export default function Login() {
  const { login, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [role, setRole] = useState<UserRole>("Bookrunner");
  const [selectedLender, setSelectedLender] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);

  // If already logged in, redirect
  if (isAuthenticated) {
    // This effect might run before redirect in context finishes, but context handles specific redirects.
    // For safety we can redirect to home or deals if they land here.
    // setLocation("/deals"); 
    // Commented out to prevent flicker/loops, user usually won't hit this if layout handles it well.
  }

  const handleLogin = () => {
    setIsLoading(true);
    // Simulate network delay
    setTimeout(() => {
      login(role, role === "Investor" ? selectedLender : undefined);
      setIsLoading(false);
    }, 800);
  };

  return (
    <div className="min-h-screen bg-secondary/30 flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center space-y-2">
           <div className="h-12 w-12 bg-primary rounded-lg flex items-center justify-center mx-auto mb-4">
              <span className="font-serif text-2xl font-bold text-white">C</span>
           </div>
           <h1 className="text-3xl font-serif font-bold text-primary">CapitalFlow</h1>
           <p className="text-muted-foreground">Private Credit Execution Platform</p>
        </div>

        <Card className="border-border/60 shadow-lg">
          <CardHeader>
            <CardTitle>Sign in to your account</CardTitle>
            <CardDescription>Select your role to access the workspace.</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="Bookrunner" onValueChange={(v) => setRole(v as UserRole)} className="w-full">
              <TabsList className="grid w-full grid-cols-3 mb-6">
                <TabsTrigger value="Bookrunner" className="text-xs">Bookrunner</TabsTrigger>
                <TabsTrigger value="Issuer" className="text-xs">Issuer</TabsTrigger>
                <TabsTrigger value="Investor" className="text-xs">Investor</TabsTrigger>
              </TabsList>

              <div className="space-y-4">
                 <div className="space-y-2">
                   <Label>Email Address</Label>
                   <Input 
                     type="email" 
                     placeholder="name@company.com" 
                     className="bg-background"
                     disabled 
                     value={
                       role === "Bookrunner" ? "sarah.jenkins@capitalflow.com" :
                       role === "Issuer" ? "cfo@titan-software.com" :
                       "investor@fund.com"
                     }
                   />
                 </div>

                 {role === "Investor" && (
                   <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                     <Label>Institution</Label>
                     <Select value={selectedLender} onValueChange={setSelectedLender}>
                       <SelectTrigger>
                         <SelectValue placeholder="Select your firm" />
                       </SelectTrigger>
                       <SelectContent>
                         {mockLenders.map(lender => (
                           <SelectItem key={lender.id} value={lender.id}>
                             {lender.name}
                           </SelectItem>
                         ))}
                       </SelectContent>
                     </Select>
                   </div>
                 )}

                 <div className="space-y-2">
                   <Label>Password</Label>
                   <Input type="password" value="password123" disabled />
                 </div>
              </div>
            </Tabs>
          </CardContent>
          <CardFooter>
            <Button 
              className="w-full bg-primary text-primary-foreground font-semibold h-11" 
              onClick={handleLogin}
              disabled={isLoading || (role === "Investor" && !selectedLender)}
            >
              {isLoading ? "Authenticating..." : `Sign in as ${role}`}
            </Button>
          </CardFooter>
        </Card>

        <div className="text-center text-xs text-muted-foreground">
          <p>Protected by industry standard encryption.</p>
          <p>Contact support@capitalflow.com for access.</p>
        </div>
      </div>
    </div>
  );
}
