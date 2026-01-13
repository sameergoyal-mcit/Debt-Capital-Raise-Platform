import React, { createContext, useContext, ReactNode } from "react";
import { useAuth } from "@/context/auth-context";
import { useDeal as useDealApi, useLenderInvitations } from "@/hooks/api-hooks";
import { enrichDeal, computeDealRisk, type EnrichedDeal } from "@/lib/deal-utils";
import { dealDeadlines, DealDeadline } from "@/lib/deal-deadlines";
import { can, Capabilities } from "@/lib/capabilities";
import type { Deal, Invitation } from "@shared/schema";

interface DealContextValue {
  deal: EnrichedDeal | null;
  rawDeal: Deal | null;
  invitation: Invitation | null;
  deadlines: DealDeadline[];
  nextDeadline: DealDeadline | null;
  risk: ReturnType<typeof computeDealRisk> | null;
  permissions: Capabilities | null;
  isNdaSigned: boolean;
  accessTier: "early" | "full" | "legal" | null;
  isLoading: boolean;
  error: Error | null;
}

const DealContext = createContext<DealContextValue | null>(null);

interface DealProviderProps {
  dealId: string;
  children: ReactNode;
}

export function DealProvider({ dealId, children }: DealProviderProps) {
  const { user } = useAuth();

  // Fetch deal data from API
  const {
    data: rawDeal,
    isLoading: dealLoading,
    error: dealError
  } = useDealApi(dealId);

  // Fetch lender invitations if user is a lender
  const {
    data: invitations,
    isLoading: invitationsLoading
  } = useLenderInvitations(user?.lenderId);

  // Find invitation for this deal
  const invitation = invitations?.find(inv => inv.dealId === dealId) || null;

  // Compute derived values
  const isLoading = dealLoading || (user?.lenderId && invitationsLoading);
  const deal = rawDeal ? enrichDeal(rawDeal) : null;
  const isNdaSigned = !invitation?.ndaRequired || !!invitation?.ndaSignedAt;
  const accessTier = (invitation?.accessTier as "early" | "full" | "legal") || null;

  // Deal deadlines - pass enriched deal with proper types
  const deadlines = deal
    ? dealDeadlines.getDeadlines(
        {
          ...deal,
          launchDate: deal.launchDate,
          closeDate: deal.closeDate,
          hardCloseDate: deal.hardCloseDate || undefined,
        },
        invitation?.ndaSignedAt ? new Date(invitation.ndaSignedAt).toISOString() : undefined
      )
    : [];

  const nextDeadline = deal
    ? dealDeadlines.getNextDeadline(
        {
          ...deal,
          launchDate: deal.launchDate,
          closeDate: deal.closeDate,
          hardCloseDate: deal.hardCloseDate || undefined,
        },
        invitation?.ndaSignedAt ? new Date(invitation.ndaSignedAt).toISOString() : undefined
      )
    : null;

  const risk = deal ? computeDealRisk(deal) : null;
  const permissions = user ? can(user.role) : null;

  const value: DealContextValue = {
    deal,
    rawDeal: rawDeal || null,
    invitation,
    deadlines,
    nextDeadline,
    risk,
    permissions,
    isNdaSigned,
    accessTier,
    isLoading: !!isLoading,
    error: dealError as Error | null,
  };

  return (
    <DealContext.Provider value={value}>
      {children}
    </DealContext.Provider>
  );
}

export function useDealContext() {
  const context = useContext(DealContext);
  if (!context) {
    throw new Error("useDealContext must be used within a DealProvider");
  }
  return context;
}

export function useDealContextOptional() {
  return useContext(DealContext);
}

// Legacy alias for backwards compatibility
export { useDealContext as useDeal };
