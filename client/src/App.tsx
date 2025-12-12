import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import DealOverview from "@/pages/deal-overview";
import Deals from "@/pages/deals";
import InvestorBook from "@/pages/investor-book";
import Documents from "@/pages/documents";
import QACenter from "@/pages/qa";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/deals" component={Deals} />
      <Route path="/deal/:id/overview" component={DealOverview} />
      <Route path="/deal/:id/book" component={InvestorBook} />
      <Route path="/deal/:id/documents" component={Documents} />
      <Route path="/deal/:id/qa" component={QACenter} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
