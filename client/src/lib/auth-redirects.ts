import { UserRole } from "@/context/auth-context";

export function getUnauthorizedRedirect(role: UserRole) {
  if (role === "Investor") return "/investor";
  return "/deals";
}

export function getInvestorDealRedirect(dealId: string) {
  return `/investor/deal/${dealId}`;
}

export function getRedirectWithReason(path: string, reason: "unauthorized" | "restricted", from?: string) {
  const params = new URLSearchParams();
  params.set("reason", reason);
  if (from) params.set("from", from);
  return `${path}?${params.toString()}`;
}
