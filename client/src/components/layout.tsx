import React, { useState } from "react";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/context/auth-context";
import {
  LayoutDashboard,
  Briefcase,
  PieChart,
  MessageSquare,
  Settings,
  Search,
  Bell,
  Menu,
  FileText,
  Users,
  CheckSquare,
  Clock,
  HelpCircle,
  Megaphone,
  LogOut,
  PenTool,
  FlaskConical,
  Calculator,
  X,
  BookOpen,
  Scale,
  UserCheck,
  Trophy
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SearchCommand, SearchTrigger } from "@/components/search-command";
import { NotificationCenter } from "@/components/notification-center";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { mockDeals } from "@/data/deals";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const [location, navigate] = useLocation();
  const { user, logout } = useAuth();
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Safe extraction of deal ID
  const dealIdMatch = location.match(/^\/(?:deal|investor\/deal)\/([^/]+)/);
  const dealId = dealIdMatch?.[1];
  const isDealWorkspace = !!dealId;
  const currentDeal = dealId ? mockDeals.find(d => d.id === dealId) : null;

  // Fetch real deal data for stage-aware navigation
  const { data: dealData } = useQuery<{ status: string; mandatedBankOrgId: string | null }>({
    queryKey: ["deal-nav", dealId],
    queryFn: async () => {
      const res = await fetch(`/api/deals/${dealId}`, { credentials: "include" });
      if (!res.ok) return { status: "live_syndication", mandatedBankOrgId: null };
      const data = await res.json();
      return { status: data.status || "live_syndication", mandatedBankOrgId: data.mandatedBankOrgId };
    },
    enabled: !!dealId,
    staleTime: 30000, // Cache for 30 seconds
  });

  const isRfpStage = dealData?.status === "rfp_stage";
  const isLiveSyndication = !isRfpStage;

  const isActive = (path: string) => location.startsWith(path);

  // Determine Nav Items based on Role (case-insensitive comparison)
  const userRole = user?.role?.toLowerCase();
  const isInvestor = userRole === "investor" || userRole === "lender";
  const isInternal = userRole === "bookrunner" || userRole === "issuer";
  const isBank = userRole === "bank";

  // Shared sidebar content component
  const SidebarContent = ({ onNavClick }: { onNavClick?: () => void }) => (
    <>
      <nav className="flex-1 px-4 space-y-2 py-4">
        {/* Main Navigation */}
        {!isInvestor && (
          <>
            <NavItem href="/" icon={<LayoutDashboard size={18} />} label="Dashboard" active={location === "/"} onClick={onNavClick} />
            <NavItem href="/deals" icon={<Briefcase size={18} />} label="Deals" active={location === "/deals"} onClick={onNavClick} />
            <NavItem href="/analytics" icon={<PieChart size={18} />} label="Analytics" active={location === "/analytics"} onClick={onNavClick} />
          </>
        )}

        {isInvestor && !isDealWorkspace && (
          <NavItem href="/investor" icon={<LayoutDashboard size={18} />} label="Lender Dashboard" active={location === "/investor"} onClick={onNavClick} />
        )}

        {/* Bank users - show deals they're invited to */}
        {isBank && !isDealWorkspace && (
          <NavItem href="/deals" icon={<Briefcase size={18} />} label="RFP Invitations" active={location === "/deals"} onClick={onNavClick} />
        )}

        {isDealWorkspace && dealId && (
          <div className={`mt-${isInvestor ? '2' : '8'} pt-4 border-t border-sidebar-border`}>
            <div className="px-4 mb-4">
              <h4 className="text-xs font-semibold text-sidebar-foreground/50 uppercase tracking-wider mb-1">
                {currentDeal ? currentDeal.dealName : "Deal Workspace"}
              </h4>
              {isInvestor && <Badge variant="outline" className="text-[10px] text-sidebar-foreground/70 border-sidebar-foreground/20">Lender Portal</Badge>}
            </div>

            {isInvestor && (
              <NavItem href={`/investor/deal/${dealId}`} icon={<LayoutDashboard size={18} />} label="Deal Home" active={isActive(`/investor/deal/${dealId}`)} onClick={onNavClick} />
            )}

            {isInternal && (
              <NavItem href={`/deal/${dealId}/overview`} icon={<LayoutDashboard size={18} />} label="Overview" active={isActive(`/deal/${dealId}/overview`)} onClick={onNavClick} />
            )}

            {/* Bank users see their proposal submission page */}
            {isBank && (
              <NavItem href={`/deal/${dealId}/proposal`} icon={<Trophy size={18} />} label="Submit Proposal" active={isActive(`/deal/${dealId}/proposal`)} onClick={onNavClick} />
            )}

            {/* RFP / Beauty Contest - shown in RFP stage, or as history in live syndication */}
            {isInternal && (
              <NavItem
                href={`/deal/${dealId}/rfp`}
                icon={<Trophy size={18} />}
                label={isRfpStage ? "RFP / Beauty Contest" : "RFP History"}
                active={isActive(`/deal/${dealId}/rfp`)}
                onClick={onNavClick}
              />
            )}

            <NavItem href={`/deal/${dealId}/timeline`} icon={<Clock size={18} />} label="Timeline" active={isActive(`/deal/${dealId}/timeline`)} onClick={onNavClick} />

            {/* Lender-oriented tabs - only shown in live syndication */}
            {isInternal && isLiveSyndication && (
              <>
                <NavItem href={`/deal/${dealId}/book`} icon={<Users size={18} />} label="Lender Book" active={isActive(`/deal/${dealId}/book`)} onClick={onNavClick} />
                <NavItem href={`/deal/${dealId}/syndicate-book`} icon={<BookOpen size={18} />} label="Syndicate Book" active={isActive(`/deal/${dealId}/syndicate-book`)} onClick={onNavClick} />
              </>
            )}

            {/* Q&A - only shown in live syndication for investors */}
            {isLiveSyndication && (
              <NavItem href={`/deal/${dealId}/qa`} icon={<HelpCircle size={18} />} label="Lender Q&A" active={isActive(`/deal/${dealId}/qa`)} onClick={onNavClick} />
            )}
            <NavItem href={`/deal/${dealId}/documents`} icon={<FileText size={18} />} label="Data Room & Docs" active={isActive(`/deal/${dealId}/documents`)} onClick={onNavClick} />
            <NavItem href={`/deal/${dealId}/messages`} icon={<MessageSquare size={18} />} label="Messages" active={isActive(`/deal/${dealId}/messages`)} onClick={onNavClick} />

            {isInvestor && (
              <NavItem href={`/deal/${dealId}/commitment`} icon={<PenTool size={18} />} label="Submit Indication" active={isActive(`/deal/${dealId}/commitment`)} onClick={onNavClick} />
            )}

            {isInternal && (
              <>
                {/* Modeling Section */}
                <div className="mt-6 pt-4 border-t border-sidebar-border/50">
                  <h4 className="px-3 mb-2 text-[10px] font-semibold text-sidebar-foreground/40 uppercase tracking-wider">
                    Modeling
                  </h4>
                  <NavItem href={`/deal/${dealId}/model`} icon={<Calculator size={18} />} label="Financial Model" active={isActive(`/deal/${dealId}/model`)} onClick={onNavClick} />
                </div>

                {/* Execution Section - only shown in live syndication */}
                {isLiveSyndication && (
                  <div className="mt-6 pt-4 border-t border-sidebar-border/50">
                    <h4 className="px-3 mb-2 text-[10px] font-semibold text-sidebar-foreground/40 uppercase tracking-wider">
                      Execution
                    </h4>
                    <NavItem href={`/deal/${dealId}/execution/lenders`} icon={<UserCheck size={18} />} label="Lender Progress" active={isActive(`/deal/${dealId}/execution/lenders`)} onClick={onNavClick} />
                    <NavItem href={`/deal/${dealId}/legal/negotiation`} icon={<Scale size={18} />} label="Legal Workspace" active={isActive(`/deal/${dealId}/legal`)} onClick={onNavClick} />
                  </div>
                )}

                {/* Actions Section - only shown in live syndication */}
                {isLiveSyndication && (
                  <div className="mt-6 pt-4 border-t border-sidebar-border/50">
                    <h4 className="px-3 mb-2 text-[10px] font-semibold text-sidebar-foreground/40 uppercase tracking-wider">
                      Actions
                    </h4>
                    <NavItem href={`/deal/${dealId}/closing`} icon={<CheckSquare size={18} />} label="Closing Checklist" active={isActive(`/deal/${dealId}/closing`)} onClick={onNavClick} />
                    <NavItem href={`/deal/${dealId}/publish`} icon={<Megaphone size={18} />} label="Publish Deal" active={isActive(`/deal/${dealId}/publish`)} onClick={onNavClick} />
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </nav>

      <div className="p-4 border-t border-sidebar-border">
        <NavItem href="/settings" icon={<Settings size={18} />} label="Settings" active={location === "/settings"} onClick={onNavClick} />
      </div>
    </>
  );

  // Logo component
  const Logo = () => (
    <div className="p-6">
      <div className="flex items-center gap-2">
        <div className="h-8 w-8 bg-sidebar-primary rounded-md flex items-center justify-center">
          <span className="font-bold text-lg text-white">C</span>
        </div>
        <span className="font-serif text-xl font-semibold tracking-tight">CapitalFlow</span>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background flex font-sans text-foreground">
      {/* Desktop Sidebar */}
      <aside className="w-64 bg-sidebar text-sidebar-foreground border-r border-sidebar-border hidden md:flex flex-col fixed h-full z-30">
        <Logo />
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar Sheet */}
      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetContent side="left" className="w-64 p-0 bg-sidebar text-sidebar-foreground border-sidebar-border">
          <Logo />
          <SidebarContent onNavClick={() => setMobileMenuOpen(false)} />
        </SheetContent>
      </Sheet>

      {/* Main Content */}
      <main className="flex-1 md:ml-64 flex flex-col min-h-screen transition-all duration-300 ease-in-out">
        {/* Header */}
        <header className="h-16 border-b border-border bg-background/80 backdrop-blur-md sticky top-0 z-20 flex items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-2 sm:gap-4">
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setMobileMenuOpen(true)}
            >
              <Menu size={18} />
            </Button>
            <div className="hidden sm:block">
              <SearchTrigger onClick={() => setSearchOpen(true)} />
            </div>
            {/* Mobile search button */}
            <Button
              variant="ghost"
              size="icon"
              className="sm:hidden"
              onClick={() => setSearchOpen(true)}
            >
              <Search size={18} />
            </Button>
          </div>

          <div className="flex items-center gap-4">
            <NotificationCenter onNavigate={navigate} />
            <div className="h-6 w-px bg-border mx-1" />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                  <Avatar className="h-8 w-8 border border-border">
                    <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${user?.name || 'AD'}`} alt={user?.name} />
                    <AvatarFallback>{user?.name?.substring(0,2).toUpperCase() || "AD"}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{user?.name || "Guest User"}</p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {user?.email || "guest@capitalflow.com"}
                    </p>
                    <Badge variant="outline" className="mt-2 w-fit text-[10px]">{user?.role || "Visitor"}</Badge>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>Profile</DropdownMenuItem>
                <DropdownMenuItem>Billing</DropdownMenuItem>
                <DropdownMenuItem>Settings</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive cursor-pointer" onClick={logout}>
                   <LogOut className="mr-2 h-4 w-4" /> Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 p-6 md:p-8 overflow-auto">
          {children}
        </div>
      </main>

      {/* Global Search Command Palette */}
      <SearchCommand open={searchOpen} onOpenChange={setSearchOpen} />
    </div>
  );
}

function NavItem({ href, icon, label, active, onClick }: { href: string; icon: React.ReactNode; label: string; active?: boolean; onClick?: () => void }) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
        active
          ? "bg-sidebar-accent text-white"
          : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-white"
      )}
      onClick={onClick}
    >
      {icon}
      <span>{label}</span>
    </Link>
  );
}
