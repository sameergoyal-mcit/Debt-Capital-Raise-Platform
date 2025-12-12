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
import Timeline from "@/pages/timeline";
import Closing from "@/pages/closing";
import Analytics from "@/pages/analytics";
import Publish from "@/pages/publish";
import ViewerIndex from "@/pages/viewer/index";
import IssuerViewer from "@/pages/viewer/issuer";
import BookrunnerViewer from "@/pages/viewer/bookrunner";
import InvestorViewer from "@/pages/viewer/investor";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/deals" component={Deals} />
      <Route path="/deal/:id/overview" component={DealOverview} />
      <Route path="/deal/:id/book" component={InvestorBook} />
      <Route path="/deal/:id/documents" component={Documents} />
      <Route path="/deal/:id/qa" component={QACenter} />
      <Route path="/deal/:id/timeline" component={Timeline} />
      <Route path="/deal/:id/closing" component={Closing} />
      <Route path="/deal/:id/publish" component={Publish} />
      <Route path="/analytics" component={Analytics} />
      <Route path="/deal/:id/viewer" component={ViewerIndex} />
      <Route path="/deal/:id/viewer/issuer" component={IssuerViewer} />
      <Route path="/deal/:id/viewer/bookrunner" component={BookrunnerViewer} />
      <Route path="/deal/:id/viewer/investor" component={InvestorViewer} />
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
