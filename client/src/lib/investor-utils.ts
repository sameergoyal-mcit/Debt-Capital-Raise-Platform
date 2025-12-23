import { mockDeals, Deal } from "@/data/deals";
import { getInvitation, Invitation } from "@/data/invitations";
import { mockDocuments } from "@/data/documents";
import { mockQAs, QA } from "@/data/qa";
import { parseISO, isAfter, isBefore, addDays, differenceInDays } from "date-fns";

export interface InvestorDealSummary {
  deal: Deal;
  invitation: Invitation;
  stats: {
    newDocsCount: number;
    openQACount: number;
    nextDeadlineLabel: string | null;
    nextDeadlineDate: string | null;
    actionRequired: "Sign NDA" | "Review Docs" | "Submit Commitment" | "Q&A Response" | null;
  };
}

export function getInvestorDeals(lenderId: string): InvestorDealSummary[] {
  // 1. Get all invitations for this lender
  const dealsWithInvites = mockDeals
    .map(deal => {
      const invite = getInvitation(deal.id, lenderId);
      return { deal, invite };
    })
    .filter(item => !!item.invite) as { deal: Deal, invite: Invitation }[];

  // 2. Compute stats for each deal
  return dealsWithInvites.map(({ deal, invite }) => {
    const stats = computeDealStats(deal, invite, lenderId);
    return { deal, invitation: invite, stats };
  });
}

export function getInvestorDeal(dealId: string, lenderId: string): InvestorDealSummary | null {
  const deal = mockDeals.find(d => d.id === dealId);
  const invite = getInvitation(dealId, lenderId);

  if (!deal || !invite) return null;

  return {
    deal,
    invitation: invite,
    stats: computeDealStats(deal, invite, lenderId)
  };
}

function computeDealStats(deal: Deal, invite: Invitation, lenderId: string) {
  const now = new Date();
  
  // New Docs Count (mock logic: docs updated in last 7 days)
  const newDocsCount = mockDocuments.filter(d => {
    if (d.dealId !== deal.id) return false;
    // Simple logic: if updated in last 7 days
    const updated = parseISO(d.lastUpdatedAt);
    return differenceInDays(now, updated) < 7;
  }).length;

  // Open Q&A Count (questions by this lender with answers)
  const openQACount = mockQAs.filter((qa: QA) => 
    qa.dealId === deal.id && 
    qa.askedByLenderId === lenderId && 
    qa.status === "Answered"
  ).length;

  // Next Deadline Logic
  let nextDeadlineLabel = null;
  let nextDeadlineDate = null;
  
  // Check NDA
  if (invite.ndaRequired && !invite.ndaSignedAt) {
    nextDeadlineLabel = "Sign NDA";
    // Assuming NDA should be signed ASAP, no specific hard date in mock, 
    // but we could use a default "Launch + 7 days"
    nextDeadlineDate = addDays(parseISO(deal.launchDate), 7).toISOString();
  } 
  // Check IOI
  else if (deal.ioiDate && isBefore(now, parseISO(deal.ioiDate))) {
    nextDeadlineLabel = "IOI Deadline";
    nextDeadlineDate = deal.ioiDate;
  }
  // Check Commitment
  else if (deal.commitmentDate && isBefore(now, parseISO(deal.commitmentDate))) {
    nextDeadlineLabel = "Commitment Deadline";
    nextDeadlineDate = deal.commitmentDate;
  }
  else {
    nextDeadlineLabel = "Expected Close";
    nextDeadlineDate = deal.closeDate;
  }

  // Action Required Logic (Priority Order)
  let actionRequired: "Sign NDA" | "Review Docs" | "Submit Commitment" | "Q&A Response" | null = null;

  if (invite.ndaRequired && !invite.ndaSignedAt) {
    actionRequired = "Sign NDA";
  } else if (deal.commitmentDate && isBefore(now, parseISO(deal.commitmentDate)) && differenceInDays(parseISO(deal.commitmentDate), now) < 5) {
     // Mock check: if close to deadline and not submitted (we don't have commitment store here easily, assuming not submitted if close)
     actionRequired = "Submit Commitment";
  } else if (openQACount > 0) {
    actionRequired = "Q&A Response";
  } else if (newDocsCount > 0) {
    actionRequired = "Review Docs";
  }

  return {
    newDocsCount,
    openQACount,
    nextDeadlineLabel,
    nextDeadlineDate,
    actionRequired
  };
}
