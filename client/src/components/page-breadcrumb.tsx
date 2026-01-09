import React from "react";
import { Link, useRoute } from "wouter";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Home, ChevronRight } from "lucide-react";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface PageBreadcrumbProps {
  items: BreadcrumbItem[];
  showHome?: boolean;
}

export function PageBreadcrumb({ items, showHome = true }: PageBreadcrumbProps) {
  return (
    <Breadcrumb className="mb-4">
      <BreadcrumbList>
        {showHome && (
          <>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href="/" className="flex items-center gap-1 text-muted-foreground hover:text-foreground">
                  <Home className="h-3.5 w-3.5" />
                </Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator>
              <ChevronRight className="h-3.5 w-3.5" />
            </BreadcrumbSeparator>
          </>
        )}

        {items.map((item, index) => {
          const isLast = index === items.length - 1;

          return (
            <React.Fragment key={index}>
              <BreadcrumbItem>
                {isLast || !item.href ? (
                  <BreadcrumbPage className="font-medium">{item.label}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink asChild>
                    <Link href={item.href} className="text-muted-foreground hover:text-foreground">
                      {item.label}
                    </Link>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
              {!isLast && (
                <BreadcrumbSeparator>
                  <ChevronRight className="h-3.5 w-3.5" />
                </BreadcrumbSeparator>
              )}
            </React.Fragment>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}

// Pre-built breadcrumb for deal pages
interface DealBreadcrumbProps {
  dealId: string;
  dealName: string;
  currentPage?: string;
}

export function DealBreadcrumb({ dealId, dealName, currentPage }: DealBreadcrumbProps) {
  const items: BreadcrumbItem[] = [
    { label: "Deals", href: "/deals" },
    { label: dealName, href: `/deal/${dealId}/overview` },
  ];

  if (currentPage) {
    items.push({ label: currentPage });
  }

  return <PageBreadcrumb items={items} />;
}

// Auto-detect breadcrumb based on current route
export function AutoBreadcrumb() {
  const [matchDeals] = useRoute("/deals");
  const [matchDealOverview, dealParams] = useRoute("/deal/:id/overview");
  const [matchDealDocs, docsParams] = useRoute("/deal/:id/documents");
  const [matchDealQA, qaParams] = useRoute("/deal/:id/qa");
  const [matchDealMessages, msgParams] = useRoute("/deal/:id/messages");
  const [matchDealCommitment, commitParams] = useRoute("/deal/:id/commitment");
  const [matchDealClosing, closingParams] = useRoute("/deal/:id/closing");
  const [matchDealAudit, auditParams] = useRoute("/deal/:id/audit-trail");
  const [matchModel] = useRoute("/deal/:id/model");
  const [matchCalendar] = useRoute("/calendar");
  const [matchAnalytics] = useRoute("/analytics");
  const [matchMessages] = useRoute("/messages");

  // No breadcrumb for home page
  if (!matchDeals && !matchDealOverview && !matchDealDocs && !matchDealQA &&
      !matchDealMessages && !matchDealCommitment && !matchDealClosing &&
      !matchDealAudit && !matchModel && !matchCalendar && !matchAnalytics && !matchMessages) {
    return null;
  }

  let items: BreadcrumbItem[] = [];

  if (matchDeals) {
    items = [{ label: "Deals" }];
  } else if (matchDealOverview) {
    items = [{ label: "Deals", href: "/deals" }, { label: "Deal Overview" }];
  } else if (matchDealDocs) {
    items = [{ label: "Deals", href: "/deals" }, { label: "Documents" }];
  } else if (matchDealQA) {
    items = [{ label: "Deals", href: "/deals" }, { label: "Q&A" }];
  } else if (matchDealMessages) {
    items = [{ label: "Deals", href: "/deals" }, { label: "Messages" }];
  } else if (matchDealCommitment) {
    items = [{ label: "Deals", href: "/deals" }, { label: "Commitment" }];
  } else if (matchDealClosing) {
    items = [{ label: "Deals", href: "/deals" }, { label: "Closing" }];
  } else if (matchDealAudit) {
    items = [{ label: "Deals", href: "/deals" }, { label: "Audit Trail" }];
  } else if (matchModel) {
    items = [{ label: "Deals", href: "/deals" }, { label: "Financial Model" }];
  } else if (matchCalendar) {
    items = [{ label: "Calendar" }];
  } else if (matchAnalytics) {
    items = [{ label: "Analytics" }];
  } else if (matchMessages) {
    items = [{ label: "Messages" }];
  }

  if (items.length === 0) return null;

  return <PageBreadcrumb items={items} />;
}
