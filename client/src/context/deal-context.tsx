import React, { createContext, useContext, useMemo, ReactNode } from "react";
import { useAuth } from "@/context/auth-context";
import { mockDeals, Deal, computeDealRisk } from "@/data/deals";
import { getInvitation, Invitation } from "@/data/invitations";
import { dealDeadlines, DealDeadline } from "@/lib/deal-deadlines";
import { can, Capabilities } from "@/lib/capabilities";

interface DealContextValue {
  deal: Deal | null;
  invitation: Invitation | null;
  deadlines: DealDeadline[];
  nextDeadline: DealDeadline | null;
  risk: ReturnType<typeof computeDealRisk> | null;
  permissions: Capabilities | null;
  isNdaSigned: boolean;
  accessTier: "early" | "full" | "legal" | null;
  isLoading: boolean;
}

const DealContext = createContext<DealContextValue | null>(null);

interface DealProviderProps {
  dealId: string;
  children: ReactNode;
}

export function DealProvider({ dealId, children }: DealProviderProps) {
  const { user } = useAuth();

  const value = useMemo<DealContextValue>(() => {
    const deal = mockDeals.find(d => d.id === dealId) || null;
    
    if (!deal || !user) {
      return {
        deal: null,
        invitation: null,
        deadlines: [],
        nextDeadline: null,
        risk: null,
        permissions: null,
        isNdaSigned: false,
        accessTier: null,
        isLoading: false
      };
    }

    const invitation = user.lenderId ? getInvitation(dealId, user.lenderId) || null : null;
    const isNdaSigned = !invitation?.ndaRequired || !!invitation?.ndaSignedAt;
    const accessTier = invitation?.accessTier || null;
    const deadlines = dealDeadlines.getDeadlines(deal, invitation?.ndaSignedAt);
    const nextDeadline = dealDeadlines.getNextDeadline(deal, invitation?.ndaSignedAt);
    const risk = computeDealRisk(deal);
    const permissions = can(user.role);

    return {
      deal,
      invitation,
      deadlines,
      nextDeadline,
      risk,
      permissions,
      isNdaSigned,
      accessTier,
      isLoading: false
    };
  }, [dealId, user]);

  return (
    <DealContext.Provider value={value}>
      {children}
    </DealContext.Provider>
  );
}

export function useDeal() {
  const context = useContext(DealContext);
  if (!context) {
    throw new Error("useDeal must be used within a DealProvider");
  }
  return context;
}

export function useDealOptional() {
  return useContext(DealContext);
}
