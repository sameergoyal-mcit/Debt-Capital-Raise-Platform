import React from "react";
import { Link, useLocation } from "wouter";
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
  Megaphone
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { RoleSwitcher } from "@/components/role-switcher";

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const [location] = useLocation();
  const isDealWorkspace = location.startsWith("/deal/");
  
  // Extract deal ID from URL path: /deal/123/overview -> 123
  const dealIdMatch = location.match(/^\/deal\/([^/]+)/);
  const dealId = dealIdMatch?.[1];

  const isActive = (path: string) => location.startsWith(path);

  return (
    <div className="min-h-screen bg-background flex font-sans text-foreground">
      {/* Sidebar */}
      <aside className="w-64 bg-sidebar text-sidebar-foreground border-r border-sidebar-border hidden md:flex flex-col fixed h-full z-30">
        <div className="p-6">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 bg-sidebar-primary rounded-md flex items-center justify-center">
              <span className="font-bold text-lg text-white">C</span>
            </div>
            <span className="font-serif text-xl font-semibold tracking-tight">CapitalFlow</span>
          </div>
        </div>

        <nav className="flex-1 px-4 space-y-2 py-4">
          <NavItem href="/" icon={<LayoutDashboard size={20} />} label="Dashboard" active={location === "/"} />
          <NavItem href="/deals" icon={<Briefcase size={20} />} label="Deals" active={location === "/deals"} />
          <NavItem href="/analytics" icon={<PieChart size={20} />} label="Analytics" active={location === "/analytics"} />
          <NavItem href="/messages" icon={<MessageSquare size={20} />} label="Messages" active={location === "/messages"} />
          
          {isDealWorkspace && dealId && (
            <div className="mt-8 pt-4 border-t border-sidebar-border">
              <h4 className="px-4 text-xs font-semibold text-sidebar-foreground/50 uppercase tracking-wider mb-2">
                Current Deal
              </h4>
              <NavItem href={`/deal/${dealId}/overview`} icon={<LayoutDashboard size={20} />} label="Overview" active={isActive(`/deal/${dealId}/overview`)} />
              <NavItem href={`/deal/${dealId}/book`} icon={<Users size={20} />} label="Debt Investor Book" active={isActive(`/deal/${dealId}/book`)} />
              <NavItem href={`/deal/${dealId}/documents`} icon={<FileText size={20} />} label="Data Room & Docs" active={isActive(`/deal/${dealId}/documents`)} />
              <NavItem href={`/deal/${dealId}/qa`} icon={<HelpCircle size={20} />} label="Due Diligence Q&A" active={isActive(`/deal/${dealId}/qa`)} />
              <NavItem href={`/deal/${dealId}/timeline`} icon={<Clock size={20} />} label="Timeline" active={isActive(`/deal/${dealId}/timeline`)} />
              <NavItem href={`/deal/${dealId}/closing`} icon={<CheckSquare size={20} />} label="Closing Checklist" active={isActive(`/deal/${dealId}/closing`)} />
              <NavItem href={`/deal/${dealId}/publish`} icon={<Megaphone size={20} />} label="Publish & Announce" active={isActive(`/deal/${dealId}/publish`)} />
              <NavItem href={`/deal/${dealId}/viewer`} icon={<Briefcase size={20} />} label="Role Viewer" active={location.includes(`/deal/${dealId}/viewer`)} />
            </div>
          )}
        </nav>

        <div className="p-4 border-t border-sidebar-border">
          <NavItem href="/settings" icon={<Settings size={20} />} label="Settings" active={location === "/settings"} />
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 md:ml-64 flex flex-col min-h-screen transition-all duration-300 ease-in-out">
        {/* Header */}
        <header className="h-16 border-b border-border bg-background/80 backdrop-blur-md sticky top-0 z-20 flex items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" className="md:hidden">
              <Menu size={20} />
            </Button>
            <div className="relative w-64 hidden sm:block">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search deals, investors..." 
                className="pl-9 bg-secondary/50 border-transparent focus:bg-background focus:border-input transition-all"
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            {isDealWorkspace && (
              <div className="hidden md:block">
                <RoleSwitcher />
              </div>
            )}
            <Button variant="ghost" size="icon" className="relative text-muted-foreground hover:text-primary">
              <Bell size={20} />
              <span className="absolute top-2 right-2 h-2 w-2 bg-destructive rounded-full" />
            </Button>
            <div className="h-6 w-px bg-border mx-1" />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                  <Avatar className="h-8 w-8 border border-border">
                    <AvatarImage src="https://github.com/shadcn.png" alt="@shadcn" />
                    <AvatarFallback>AD</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">Alex Davis</p>
                    <p className="text-xs leading-none text-muted-foreground">
                      alex.davis@capitalflow.com
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>Profile</DropdownMenuItem>
                <DropdownMenuItem>Billing</DropdownMenuItem>
                <DropdownMenuItem>Settings</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive">Log out</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 p-6 md:p-8 overflow-auto">
          {children}
        </div>
      </main>
    </div>
  );
}

function NavItem({ href, icon, label, active }: { href: string; icon: React.ReactNode; label: string; active?: boolean }) {
  return (
    <Link 
      href={href} 
      className={cn(
        "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
        active 
          ? "bg-sidebar-accent text-white" 
          : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-white"
      )}
    >
      {icon}
      <span>{label}</span>
    </Link>
  );
}
