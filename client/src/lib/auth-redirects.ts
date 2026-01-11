export function getUnauthorizedRedirect(role?: string) {
  if (!role) return "/login";
  const normalizedRole = role.toLowerCase();
  if (normalizedRole === "investor" || normalizedRole === "lender") return "/investor";
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
