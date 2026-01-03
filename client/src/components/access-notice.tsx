import React, { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export function AccessNotice() {
  const [location] = useLocation();
  const [isVisible, setIsVisible] = useState(false);
  const [message, setMessage] = useState<{ title: string; description: string } | null>(null);

  useEffect(() => {
    // Parse query params manually since wouter doesn't provide a hook for it
    const searchParams = new URLSearchParams(window.location.search);
    const reason = searchParams.get("reason");
    const from = searchParams.get("from");

    if (reason) {
      if (reason === "unauthorized") {
        setMessage({
          title: "Access Restricted",
          description: "You don't have permission to access that page. You've been redirected to your dashboard.",
        });
      } else if (reason === "restricted") {
        setMessage({
          title: "Page Restricted",
          description: `The page you tried to access is restricted. Redirected to the investor portal${from ? ` from ${from}` : ""}.`,
        });
      }
      setIsVisible(true);
      
      // Clear the query params from URL without refreshing to avoid showing it again on refresh
      const newUrl = window.location.pathname;
      window.history.replaceState({}, document.title, newUrl);
      
      // Auto-dismiss after 6 seconds
      const timer = setTimeout(() => {
        setIsVisible(false);
      }, 6000);
      
      return () => clearTimeout(timer);
    }
  }, [location]);

  if (!isVisible || !message) return null;

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-md animate-in slide-in-from-top-2 fade-in">
      <Alert variant="destructive" className="bg-white border-l-4 border-l-red-500 shadow-lg pr-12">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>{message.title}</AlertTitle>
        <AlertDescription>
          {message.description}
        </AlertDescription>
        <Button 
          variant="ghost" 
          size="icon" 
          className="absolute top-2 right-2 h-6 w-6 text-muted-foreground hover:text-foreground"
          onClick={() => setIsVisible(false)}
        >
          <X className="h-4 w-4" />
        </Button>
      </Alert>
    </div>
  );
}
