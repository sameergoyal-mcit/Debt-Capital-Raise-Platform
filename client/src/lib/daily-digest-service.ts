import { getInvestorDeals, InvestorDealSummary } from "@/lib/investor-utils";
import { emailService } from "@/lib/email-service";
import { emailTemplates } from "@/lib/email-templates";
import { format } from "date-fns";

// Mock store for last digest timestamps (In a real app, this would be in the database)
// key: lenderId, value: ISO string
const lastDigestStore: Record<string, string> = {};

export const dailyDigestService = {
  
  // Set the last digest time for a lender
  setLastDigestTime(lenderId: string) {
    lastDigestStore[lenderId] = new Date().toISOString();
  },

  // Get the last digest time or default to 24 hours ago
  getLastDigestTime(lenderId: string): Date {
    const stored = lastDigestStore[lenderId];
    if (stored) return new Date(stored);
    
    // Default: Yesterday
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return yesterday;
  },

  // Main function to trigger digests
  async sendDailyDigests(currentUser: any) {
    if (currentUser?.role !== "Investor") {
      console.warn("⚠️ [Digest] Only investors can receive digests (mock restriction for testing)");
      // In production, this would loop through ALL investors. 
      // For this mock, we only send to the currently logged-in investor if they are an investor.
      if (!currentUser || currentUser.role !== "Investor") {
        return { success: false, message: "Current user is not an investor. Please log in as an investor to test." };
      }
    }

    const lenderId = currentUser.lenderId;
    if (!lenderId) return { success: false, message: "No lender ID found for user." };

    console.group(`📬 [Digest] Generating Daily Digest for ${currentUser.name} (${lenderId})`);

    // 1. Get Deals & Data
    const deals = getInvestorDeals(lenderId);
    
    if (deals.length === 0) {
      console.log("No deals found. Skipping digest.");
      console.groupEnd();
      return { success: true, message: "No deals found for this investor." };
    }

    // 2. Process each deal for updates
    const lastDigest = this.getLastDigestTime(lenderId);
    const digestDeals = deals.map(dealSummary => this.processDealForDigest(dealSummary, lastDigest));

    // 3. Filter out deals with absolutely no relevant info (optional, but good for noise reduction)
    // We'll keep them if they have active deadlines or actions, even if no "new" updates
    const activeDeals = digestDeals.filter(d => d.updates.length > 0 || d.actionRequired || d.hasDeadlines);

    if (activeDeals.length === 0) {
      console.log("No active updates or deadlines. Skipping digest.");
      console.groupEnd();
      return { success: true, message: "No new updates to report." };
    }

    // 4. Generate Email
    const emailHtml = emailTemplates.dailyDigest(currentUser.name, activeDeals);

    // 5. Send Email
    const success = await emailService.send({
      to: currentUser.email,
      subject: `Daily Deal Update – ${format(new Date(), 'MMM d, yyyy')}`,
      html: emailHtml
    });

    // 6. Update timestamp
    if (success) {
      this.setLastDigestTime(lenderId);
    }

    console.groupEnd();
    return { success, message: "Digest sent successfully." };
  },

  // Helper to format deal data for the template
  processDealForDigest(summary: InvestorDealSummary, lastDigest: Date) {
    const { deal, stats } = summary;
    const updates: string[] = [];

    // Check for updates
    if (stats.newDocsCount > 0) {
      updates.push(`📄 ${stats.newDocsCount} new documents uploaded`);
    }

    if (stats.openQACount > 0) {
      updates.push(`💬 ${stats.openQACount} new Q&A responses`);
    }

    // Deadlines
    if (stats.nextDeadlineLabel && stats.nextDeadlineDate) {
      const deadlineDate = new Date(stats.nextDeadlineDate);
      updates.push(`⏰ ${stats.nextDeadlineLabel}: ${format(deadlineDate, 'MMM d')}`);
    }

    return {
      dealName: deal.dealName,
      issuer: deal.sponsor, // Using sponsor as issuer proxy for now
      updates,
      actionRequired: stats.actionRequired,
      hasDeadlines: !!stats.nextDeadlineDate,
      link: `${window.location.origin}/investor/deal/${deal.id}` // Construct full link
    };
  }
};
