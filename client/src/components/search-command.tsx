import React, { useState, useEffect, useMemo } from "react";
import { useLocation } from "wouter";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import {
  Briefcase,
  FileText,
  Users,
  MessageSquare,
  Calculator,
  Calendar,
  Settings,
  Search,
  ArrowRight,
  Clock,
  Landmark,
} from "lucide-react";
import { mockDeals } from "@/data/deals";
import { useAuth } from "@/context/auth-context";
import { can } from "@/lib/capabilities";

interface SearchResult {
  id: string;
  title: string;
  description?: string;
  type: "deal" | "document" | "lender" | "action" | "page";
  href: string;
  icon?: React.ReactNode;
  badge?: string;
}

// Quick actions for power users
const quickActions: SearchResult[] = [
  {
    id: "new-deal",
    title: "Create New Deal",
    description: "Start a new deal from scratch",
    type: "action",
    href: "/deals?new=true",
    icon: <Briefcase className="h-4 w-4" />,
  },
  {
    id: "financial-model",
    title: "Open Financial Model",
    description: "Build debt paydown projections",
    type: "page",
    href: "/deal/101/model",
    icon: <Calculator className="h-4 w-4" />,
  },
  {
    id: "calendar",
    title: "View Calendar",
    description: "Deal timelines and deadlines",
    type: "page",
    href: "/deal/101/calendar",
    icon: <Calendar className="h-4 w-4" />,
  },
];

// Navigation pages
const pages: SearchResult[] = [
  {
    id: "deals",
    title: "All Deals",
    description: "View and manage deals",
    type: "page",
    href: "/deals",
    icon: <Briefcase className="h-4 w-4" />,
  },
  {
    id: "analytics",
    title: "Analytics Dashboard",
    description: "Portfolio analytics and insights",
    type: "page",
    href: "/analytics",
    icon: <Calculator className="h-4 w-4" />,
  },
  {
    id: "messages",
    title: "Messages",
    description: "View all messages",
    type: "page",
    href: "/messages",
    icon: <MessageSquare className="h-4 w-4" />,
  },
];

interface SearchCommandProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function SearchCommand({ open: controlledOpen, onOpenChange }: SearchCommandProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [, navigate] = useLocation();
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const { user } = useAuth();

  const isOpen = controlledOpen !== undefined ? controlledOpen : open;
  const setIsOpen = onOpenChange || setOpen;

  // Load recent searches from localStorage
  useEffect(() => {
    const stored = localStorage.getItem("recentSearches");
    if (stored) {
      try {
        setRecentSearches(JSON.parse(stored));
      } catch {
        // Ignore parse errors
      }
    }
  }, []);

  // Keyboard shortcut
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setIsOpen(!isOpen);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [isOpen, setIsOpen]);

  // Search deals
  const dealResults = useMemo<SearchResult[]>(() => {
    if (!search) return [];

    const searchLower = search.toLowerCase();
    return mockDeals
      .filter(
        (deal) =>
          deal.dealName.toLowerCase().includes(searchLower) ||
          deal.borrowerName.toLowerCase().includes(searchLower) ||
          deal.sector.toLowerCase().includes(searchLower) ||
          deal.sponsor.toLowerCase().includes(searchLower)
      )
      .slice(0, 5)
      .map((deal) => ({
        id: deal.id,
        title: deal.dealName,
        description: `${deal.borrowerName} • ${deal.sector}`,
        type: "deal" as const,
        href: `/deal/${deal.id}/overview`,
        icon: <Briefcase className="h-4 w-4" />,
        badge: deal.stage,
      }));
  }, [search]);

  // Filter actions and pages based on user capabilities
  const filteredActions = useMemo(() => {
    // Filter out actions the user doesn't have permission for
    const permittedActions = quickActions.filter((action) => {
      if (action.id === "new-deal" && !can(user?.role).createDeal) {
        return false;
      }
      return true;
    });

    if (!search) return permittedActions;
    const searchLower = search.toLowerCase();
    return permittedActions.filter(
      (action) =>
        action.title.toLowerCase().includes(searchLower) ||
        action.description?.toLowerCase().includes(searchLower)
    );
  }, [search, user?.role]);

  const filteredPages = useMemo(() => {
    if (!search) return pages;
    const searchLower = search.toLowerCase();
    return pages.filter(
      (page) =>
        page.title.toLowerCase().includes(searchLower) ||
        page.description?.toLowerCase().includes(searchLower)
    );
  }, [search]);

  const handleSelect = (result: SearchResult) => {
    // Add to recent searches
    if (search && !recentSearches.includes(search)) {
      const newRecent = [search, ...recentSearches.slice(0, 4)];
      setRecentSearches(newRecent);
      localStorage.setItem("recentSearches", JSON.stringify(newRecent));
    }

    setIsOpen(false);
    setSearch("");
    navigate(result.href);
  };

  const clearRecentSearches = () => {
    setRecentSearches([]);
    localStorage.removeItem("recentSearches");
  };

  return (
    <CommandDialog open={isOpen} onOpenChange={setIsOpen}>
      <Command className="rounded-lg border shadow-md">
        <CommandInput
          placeholder="Search deals, documents, or type a command..."
          value={search}
          onValueChange={setSearch}
        />
        <CommandList>
          <CommandEmpty>
            <div className="flex flex-col items-center justify-center py-6 text-muted-foreground">
              <Search className="h-8 w-8 mb-2 opacity-50" />
              <p>No results found for "{search}"</p>
              <p className="text-sm">Try searching for a deal name or action</p>
            </div>
          </CommandEmpty>

          {/* Recent Searches */}
          {!search && recentSearches.length > 0 && (
            <CommandGroup heading="Recent Searches">
              {recentSearches.map((term, i) => (
                <CommandItem
                  key={`recent-${i}`}
                  onSelect={() => setSearch(term)}
                  className="flex items-center gap-2"
                >
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>{term}</span>
                </CommandItem>
              ))}
              <CommandItem
                onSelect={clearRecentSearches}
                className="text-muted-foreground text-sm"
              >
                Clear recent searches
              </CommandItem>
            </CommandGroup>
          )}

          {/* Deal Results */}
          {dealResults.length > 0 && (
            <>
              <CommandSeparator />
              <CommandGroup heading="Deals">
                {dealResults.map((result) => (
                  <CommandItem
                    key={result.id}
                    onSelect={() => handleSelect(result)}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      {result.icon}
                      <div>
                        <div className="font-medium">{result.title}</div>
                        <div className="text-sm text-muted-foreground">{result.description}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {result.badge && (
                        <Badge variant="outline" className="text-xs">
                          {result.badge}
                        </Badge>
                      )}
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}

          {/* Quick Actions */}
          {filteredActions.length > 0 && (
            <>
              <CommandSeparator />
              <CommandGroup heading="Quick Actions">
                {filteredActions.map((action) => (
                  <CommandItem
                    key={action.id}
                    onSelect={() => handleSelect(action)}
                    className="flex items-center gap-3"
                  >
                    {action.icon}
                    <div>
                      <div className="font-medium">{action.title}</div>
                      <div className="text-sm text-muted-foreground">{action.description}</div>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}

          {/* Navigation Pages */}
          {filteredPages.length > 0 && (
            <>
              <CommandSeparator />
              <CommandGroup heading="Pages">
                {filteredPages.map((page) => (
                  <CommandItem
                    key={page.id}
                    onSelect={() => handleSelect(page)}
                    className="flex items-center gap-3"
                  >
                    {page.icon}
                    <div>
                      <div className="font-medium">{page.title}</div>
                      <div className="text-sm text-muted-foreground">{page.description}</div>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}

          {/* Keyboard shortcut hint */}
          <div className="p-2 border-t text-xs text-muted-foreground flex items-center justify-between">
            <div className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs">↑↓</kbd>
              <span>to navigate</span>
            </div>
            <div className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs">↵</kbd>
              <span>to select</span>
            </div>
            <div className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs">esc</kbd>
              <span>to close</span>
            </div>
          </div>
        </CommandList>
      </Command>
    </CommandDialog>
  );
}

// Trigger button component for use in header
export function SearchTrigger({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 px-3 py-1.5 rounded-md border bg-muted/50 hover:bg-muted transition-colors text-sm text-muted-foreground"
    >
      <Search className="h-4 w-4" />
      <span className="hidden md:inline">Search...</span>
      <kbd className="hidden md:inline-flex h-5 items-center gap-1 rounded border bg-background px-1.5 font-mono text-xs">
        <span className="text-xs">⌘</span>K
      </kbd>
    </button>
  );
}
