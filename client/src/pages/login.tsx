import React, { useState, useEffect } from "react";
import { useAuth, UserRole } from "@/context/auth-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { mockLenders } from "@/data/lenders";

export default function Login() {
  const { login, loginAsRole, isAuthenticated, isLoading: authLoading } = useAuth();
  const [role, setRole] = useState<UserRole>("Bookrunner");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("demo123");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Update default email when role changes
  useEffect(() => {
    if (role === "Bookrunner") setEmail("sarah.jenkins@capitalflow.com");
    else if (role === "Issuer") setEmail("cfo@titan-software.com");
    else setEmail("investor@fund.com");
    setError(null);
  }, [role]);

  // If already logged in, redirect
  if (isAuthenticated) {
    // handled by context
  }

  const handleLogin = async () => {
    setIsLoading(true);
    setError(null);

    // Attempt to guess lender from email for demo
    let lenderId: string | undefined;

    if (role === "Investor") {
      const emailDomain = email.toLowerCase().split('@')[1] || email.toLowerCase();
      const matchedLender = mockLenders.find(l =>
        emailDomain.includes(l.name.toLowerCase().split(' ')[0]) ||
        email.toLowerCase().includes(l.name.toLowerCase().replace(/\s/g, ""))
      );

      lenderId = matchedLender?.id;

      if (!lenderId) {
        if (email.includes("blackrock")) lenderId = "1";
        else if (email.includes("apollo")) lenderId = "2";
        else if (email.includes("oak")) lenderId = "3";
      }
    }

    // Try real login first
    const result = await login({ email, password });

    if (!result.success) {
      // Fall back to demo mode
      await loginAsRole(role, lenderId);
    }

    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-secondary/30 flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center space-y-2">
           <div className="h-12 w-12 bg-primary rounded-lg flex items-center justify-center mx-auto mb-4">
              <span className="font-serif text-2xl font-bold text-white">C</span>
           </div>
           <h1 className="text-3xl font-serif font-bold text-primary">CapitalFlow</h1>
           <p className="text-muted-foreground">Debt Capital Platform</p>
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
                     disabled={role !== "Investor"} // Only allow editing for Investor to test the "guessing" feature
                     value={email}
                     onChange={(e) => setEmail(e.target.value)}
                   />
                   {role === "Investor" && (
                     <p className="text-[10px] text-muted-foreground">
                       Try: <em>investor@blackrock.com</em> or <em>investor@apollo.com</em>
                     </p>
                   )}
                 </div>

                 <div className="space-y-2">
                   <Label>Password</Label>
                   <Input
                     type="password"
                     value={password}
                     onChange={(e) => setPassword(e.target.value)}
                     className="bg-background"
                   />
                 </div>

                 {error && (
                   <p className="text-sm text-destructive">{error}</p>
                 )}
              </div>
            </Tabs>
          </CardContent>
          <CardFooter>
            <Button 
              className="w-full bg-primary text-primary-foreground font-semibold h-11" 
              onClick={handleLogin}
              disabled={isLoading}
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
