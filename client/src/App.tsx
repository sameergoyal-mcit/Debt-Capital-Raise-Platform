import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth, UserRole } from "@/context/auth-context";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import Login from "@/pages/login";
import DealOverview from "@/pages/deal-overview";
import Deals from "@/pages/deals";
import InvestorBook from "@/pages/investor-book";
import Documents from "@/pages/documents";
import QACenter from "@/pages/qa";
import Timeline from "@/pages/timeline";
import Closing from "@/pages/closing";
import Analytics from "@/pages/analytics";
import Publish from "@/pages/publish";
import SubmitCommitment from "@/pages/commitment";
import ViewerIndex from "@/pages/viewer/index";
import IssuerViewer from "@/pages/viewer/issuer";
import BookrunnerViewer from "@/pages/viewer/bookrunner";
import InvestorViewer from "@/pages/viewer/investor";

// Protected Route Wrapper
function ProtectedRoute({ 
  component: Component, 
  allowedRoles 
}: { 
  component: React.ComponentType<any>, 
  allowedRoles?: UserRole[] 
}) {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Redirect to="/login" />;
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    // Redirect investors to their safe landing page if they try to access restricted pages
    if (user.role === "Investor") {
       // Ideally redirect to the first deal they have access to, or a generic "my deals" page
       // For now, redirect to the first available deal's docs
       return <Redirect to={`/deal/${user.dealAccess?.[0] || '101'}/documents`} />;
    }
    return <Redirect to="/" />;
  }

  return <Component />;
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      
      {/* Public / Landing */}
      <Route path="/">
         <ProtectedRoute component={Home} allowedRoles={["Issuer", "Bookrunner"]} />
      </Route>

      {/* Main Deals List - Filtered inside the page for investors if needed, or restricted */}
      <Route path="/deals">
        <ProtectedRoute component={Deals} allowedRoles={["Issuer", "Bookrunner"]} />
      </Route>

      {/* Analytics - Internal Only */}
      <Route path="/analytics">
        <ProtectedRoute component={Analytics} allowedRoles={["Issuer", "Bookrunner"]} />
      </Route>

      {/* Deal Workspace Pages */}
      <Route path="/deal/:id/overview">
        <ProtectedRoute component={DealOverview} allowedRoles={["Issuer", "Bookrunner"]} />
      </Route>
      
      <Route path="/deal/:id/book">
        <ProtectedRoute component={InvestorBook} allowedRoles={["Issuer", "Bookrunner"]} />
      </Route>

      <Route path="/deal/:id/documents">
        <ProtectedRoute component={Documents} allowedRoles={["Issuer", "Bookrunner", "Investor"]} />
      </Route>

      <Route path="/deal/:id/qa">
        <ProtectedRoute component={QACenter} allowedRoles={["Issuer", "Bookrunner", "Investor"]} />
      </Route>

      <Route path="/deal/:id/timeline">
        <ProtectedRoute component={Timeline} allowedRoles={["Issuer", "Bookrunner", "Investor"]} />
      </Route>

      <Route path="/deal/:id/commitment">
        <ProtectedRoute component={SubmitCommitment} allowedRoles={["Investor"]} />
      </Route>

      <Route path="/deal/:id/closing">
        <ProtectedRoute component={Closing} allowedRoles={["Issuer", "Bookrunner"]} />
      </Route>

      <Route path="/deal/:id/publish">
        <ProtectedRoute component={Publish} allowedRoles={["Bookrunner"]} />
      </Route>

      {/* Viewer Pages - Keep accessible for demo purposes or restrict */}
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
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
