import { Deal } from "@/data/deals";
import { parseISO, addDays, isBefore, format } from "date-fns";

export type DeadlineType = "NDA" | "IOI" | "Commitment" | "Closing";

export interface DealDeadline {
  type: DeadlineType;
  label: string;
  date: string; // ISO string
  isOverdue: boolean;
  daysRemaining: number;
}

export const dealDeadlines = {
  getDeadlines(deal: Deal, ndaSignedAt?: string): DealDeadline[] {
    const deadlines: DealDeadline[] = [];
    const now = new Date();

    // 1. NDA Deadline
    // Logic: If not signed, deadline is Launch + 7 days (mock standard)
    // If signed, we don't usually show it as a "deadline" in the future list, but might want history.
    // Requirement says: "NDA deadline (if not signed)"
    if (!ndaSignedAt) {
      const ndaDate = addDays(parseISO(deal.launchDate), 7);
      deadlines.push({
        type: "NDA",
        label: "Sign NDA",
        date: ndaDate.toISOString(),
        isOverdue: isBefore(ndaDate, now),
        daysRemaining: Math.ceil((ndaDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      });
    }

    // 2. IOI Deadline
    if (deal.ioiDate) {
      const ioiDate = parseISO(deal.ioiDate);
      deadlines.push({
        type: "IOI",
        label: "IOI Submission",
        date: deal.ioiDate,
        isOverdue: isBefore(ioiDate, now),
        daysRemaining: Math.ceil((ioiDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      });
    }

    // 3. Commitment Deadline
    if (deal.commitmentDate) {
      const commDate = parseISO(deal.commitmentDate);
      deadlines.push({
        type: "Commitment",
        label: "Commitment Due",
        date: deal.commitmentDate,
        isOverdue: isBefore(commDate, now),
        daysRemaining: Math.ceil((commDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      });
    }

    // 4. Closing Date
    if (deal.closeDate) {
      const closeDate = parseISO(deal.closeDate);
      deadlines.push({
        type: "Closing",
        label: "Expected Close",
        date: deal.closeDate,
        isOverdue: isBefore(closeDate, now),
        daysRemaining: Math.ceil((closeDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      });
    }

    return deadlines.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  },

  getNextDeadline(deal: Deal, ndaSignedAt?: string): DealDeadline | null {
    const deadlines = this.getDeadlines(deal, ndaSignedAt);
    const upcoming = deadlines.filter(d => !d.isOverdue);
    return upcoming.length > 0 ? upcoming[0] : (deadlines[deadlines.length - 1] || null);
  }
};
