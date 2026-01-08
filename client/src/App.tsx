import { Switch, Route, Redirect, useLocation } from "wouter";
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
import CalendarPage from "@/pages/calendar";
import Closing from "@/pages/closing";
import Analytics from "@/pages/analytics";
import Publish from "@/pages/publish";
import SubmitCommitment from "@/pages/commitment";
import InvestorDashboard from "@/pages/investor-dashboard";
import InvestorDealHome from "@/pages/investor-deal-home";
import ViewerIndex from "@/pages/viewer/index";
import IssuerViewer from "@/pages/viewer/issuer";
import BookrunnerViewer from "@/pages/viewer/bookrunner";
import InvestorViewer from "@/pages/viewer/investor";
import Settings from "@/pages/settings";
import MessagesPage from "@/pages/messages";
import DealMessagesPage from "@/pages/deal-messages";
import { getUnauthorizedRedirect, getInvestorDealRedirect, getRedirectWithReason } from "@/lib/auth-redirects";

// Protected Route Wrapper
function ProtectedRoute({ 
  component: Component, 
  allowedRoles 
}: { 
  component: React.ComponentType<any>, 
  allowedRoles?: UserRole[] 
}) {
  const { user, isAuthenticated } = useAuth();
  const [location] = useLocation();

  if (!isAuthenticated) {
    return <Redirect to="/login" />;
  }

  // 1. Extract Deal ID from URL if present
  // Matches /deal/:id/... or /investor/deal/:id
  const dealMatch = location.match(/\/deal\/([^\/]+)/) || location.match(/\/investor\/deal\/([^\/]+)/);
  const dealId = dealMatch ? dealMatch[1] : null;

  // 2. Check Deal Access for Investors
  if (user?.role === "Investor" && dealId) {
    // If user has no deal access list or deal is not in list
    if (!user.dealAccess || !user.dealAccess.includes(dealId)) {
      // Redirect to dashboard with "unauthorized" reason
      return <Redirect to={getRedirectWithReason("/investor", "unauthorized", location)} />;
    }
  }

  // 3. Check Role Access
  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    // Redirect logic for unauthorized role access
    if (user.role === "Investor") {
       // If they tried to access a deal page they have access to (checked above), 
       // but the specific PAGE is restricted (e.g. /deal/123/book),
       // redirect them to the investor-safe deal home.
       if (dealId) {
         return <Redirect to={getRedirectWithReason(getInvestorDealRedirect(dealId), "restricted", location)} />;
       }
       return <Redirect to={getRedirectWithReason("/investor", "unauthorized", location)} />;
    }
    return <Redirect to={getRedirectWithReason("/deals", "unauthorized", location)} />;
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

      {/* Investor Specific Routes */}
      <Route path="/investor">
         <ProtectedRoute component={InvestorDashboard} allowedRoles={["Investor"]} />
      </Route>
      
      <Route path="/investor/deal/:id">
         <ProtectedRoute component={InvestorDealHome} allowedRoles={["Investor"]} />
      </Route>

      {/* Main Deals List */}
      <Route path="/deals">
        <ProtectedRoute component={Deals} allowedRoles={["Issuer", "Bookrunner"]} />
      </Route>

      {/* Analytics - Internal Only */}
      <Route path="/analytics">
        <ProtectedRoute component={Analytics} allowedRoles={["Issuer", "Bookrunner"]} />
      </Route>

      <Route path="/messages">
        <ProtectedRoute component={MessagesPage} allowedRoles={["Issuer", "Bookrunner", "Investor"]} />
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

      <Route path="/deal/:id/messages">
        <ProtectedRoute component={DealMessagesPage} allowedRoles={["Issuer", "Bookrunner", "Investor"]} />
      </Route>

      <Route path="/deal/:id/qa">
        <ProtectedRoute component={QACenter} allowedRoles={["Issuer", "Bookrunner", "Investor"]} />
      </Route>

      <Route path="/deal/:id/timeline">
        <ProtectedRoute component={Timeline} allowedRoles={["Issuer", "Bookrunner", "Investor"]} />
      </Route>

      <Route path="/deal/:id/calendar">
        <ProtectedRoute component={CalendarPage} allowedRoles={["Issuer", "Bookrunner", "Investor"]} />
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

      {/* Viewer Pages */}
      <Route path="/deal/:id/viewer">
         <ProtectedRoute component={ViewerIndex} allowedRoles={["Issuer", "Bookrunner"]} />
      </Route>
      <Route path="/deal/:id/viewer/issuer">
         <ProtectedRoute component={IssuerViewer} allowedRoles={["Issuer", "Bookrunner"]} />
      </Route>
      <Route path="/deal/:id/viewer/bookrunner">
         <ProtectedRoute component={BookrunnerViewer} allowedRoles={["Issuer", "Bookrunner"]} />
      </Route>
      <Route path="/deal/:id/viewer/investor">
         <ProtectedRoute component={InvestorViewer} allowedRoles={["Issuer", "Bookrunner"]} />
      </Route>

      {/* Settings & Tools */}
      <Route path="/settings">
         <ProtectedRoute component={Settings} allowedRoles={["Issuer", "Bookrunner", "Investor"]} />
      </Route>

      {/* Catch-all for truly 404 routes or fallthrough */}
      <Route>
        {/* Only show NotFound if we really fell through everything else */}
        <NotFound />
      </Route>
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
