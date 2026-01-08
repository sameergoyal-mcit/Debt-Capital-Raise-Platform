import { mockDeals, Deal } from "@/data/deals";
import { getInvitation, Invitation } from "@/data/invitations";
import { mockDocuments } from "@/data/documents";
import { getQAs, QAItem } from "@/data/qa";
import { parseISO, isAfter, differenceInDays } from "date-fns";
import { dealDeadlines } from "@/lib/deal-deadlines";

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
  
  // New Docs Count 
  // Logic: Updated in last 7 days AND visible based on tier
  const newDocsCount = mockDocuments.filter(d => {
    if (d.dealId !== deal.id) return false;
    
    // Tier check (mock)
    if (invite.accessTier === "early" && d.category !== "Lender Presentation" && d.category !== "Other") return false;

    const updated = parseISO(d.lastUpdatedAt);
    return differenceInDays(now, updated) < 7;
  }).length;

  // Open Q&A Count (Unanswered questions asked by this lender, OR active threads)
  // Requirement: "reflect unanswered questions... not Answered"
  // Use getQAs helper
  const openQACount = getQAs(deal.id, lenderId).filter(qa => 
    qa.status !== "answered" && qa.status !== "closed"
  ).length;

  // Next Deadline Logic using centralized helper
  const nextDeadline = dealDeadlines.getNextDeadline(deal, invite.ndaSignedAt);
  const nextDeadlineLabel = nextDeadline ? nextDeadline.label : null;
  const nextDeadlineDate = nextDeadline ? nextDeadline.date : null;

  // Action Required Logic (Priority Order)
  let actionRequired: "Sign NDA" | "Review Docs" | "Submit Commitment" | "Q&A Response" | null = null;

  if (invite.ndaRequired && !invite.ndaSignedAt) {
    actionRequired = "Sign NDA";
  } else {
      // Check commitment window
      const commitmentDue = dealDeadlines.getDeadlines(deal).find(d => d.type === "Commitment");
      if (commitmentDue && !commitmentDue.isOverdue && commitmentDue.daysRemaining <= 5) {
          // In a real app we'd check if they already submitted. Assuming "no" for mock if strict check not possible easily
          actionRequired = "Submit Commitment";
      } else if (newDocsCount > 0) {
        actionRequired = "Review Docs";
      } else if (openQACount > 0) {
        // If I have open questions, maybe I'm waiting? 
        // Or if the requirement meant "Questions needing MY response", then logic would differ.
        // But typically "Action Required" -> "Q&A Response" implies *I* need to respond.
        // If "openQACount" is "My Unanswered Questions", that's not an action for me, that's waiting.
        // Let's assume for this mock that if there are open threads, it's an "action" to follow up.
        // OR better: If there are NEW answers (which we tracked in digest), that's an action.
        // Let's stick to the previous logic but with the new count definition or fallback.
        // Re-reading point 4: "openQACount should reflect unanswered... not Answered".
        // If I asked a question and it's unanswered, do I have an action? No, I'm waiting.
        // Maybe "Action Required" should be triggered if there are ANSWERED questions I haven't seen?
        // Let's rely on "Review Docs" as the primary "Review" action and "Sign NDA" / "Submit" as primary transactional actions.
        // For Q&A, if the user explicitly asked for "Q&A response" as an action:
        // "Q&A Response" action usually implies the investor has been asked a clarification.
        // Mock data doesn't support "Questions asked TO investor".
        // I will demote Q&A from "Action Required" unless specifically actionable.
        // But strictly following instruction "actionRequired should prioritize... > Q&A response"
        // I'll leave it last.
        // If Open Q&A > 0 (meaning I have pending questions), it's arguably "Active Diligence".
        // Let's keep it but maybe it's less "Required" and more "Status".
        // Actually, let's look at the instruction again: "add answeredSinceLastSeenCount if needed for notifications".
        // Maybe "Q&A Response" refers to when *answers* come in.
        // For now, I'll link it to open threads as a placeholder for "Active Q&A".
        // Wait, I'll stick to the safe path: If I have unanswered questions, I might need to clarify them.
         actionRequired = "Q&A Response"; 
      }
  }

  return {
    newDocsCount,
    openQACount,
    nextDeadlineLabel,
    nextDeadlineDate,
    actionRequired
  };
}
