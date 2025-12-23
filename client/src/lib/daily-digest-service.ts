import { getInvestorDeals, InvestorDealSummary } from "@/lib/investor-utils";
import { emailService } from "@/lib/email-service";
import { emailTemplates } from "@/lib/email-templates";
import { format, parseISO, isAfter, differenceInDays } from "date-fns";
import { mockDocuments, Document } from "@/data/documents";
import { mockQAs, QA } from "@/data/qa";

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
  async sendDailyDigests(currentUser: any, triggerForAll: boolean = false) {
    console.group(`📬 [Digest] Triggering Daily Digest`);
    
    if (triggerForAll) {
       // Mock Logic: Since we don't have a real DB of users, we'll simulate sending to a few "known" mock investors
       // in a real app, this would iterate over all users with role="Investor"
       const mockInvestors = [
           { name: "Mock BlackRock User", email: "investor@blackrock.com", lenderId: "1", role: "Investor" },
           { name: "Mock Apollo User", email: "investor@apollo.com", lenderId: "2", role: "Investor" }
       ];
       
       console.log(`Processing bulk digest for ${mockInvestors.length} mock investors...`);
       
       let sentCount = 0;
       for (const investor of mockInvestors) {
           const result = await this.sendDigestToInvestor(investor);
           if (result.success) sentCount++;
       }
       
       console.groupEnd();
       return { success: true, message: `Bulk digest complete. Sent ${sentCount} emails.` };
    } else {
        // Individual Trigger (for testing current user)
        if (currentUser?.role !== "Investor") {
          console.warn("⚠️ [Digest] Current user is not an investor. Skipping.");
          console.groupEnd();
          return { success: false, message: "Current user is not an investor." };
        }
        
        const result = await this.sendDigestToInvestor(currentUser);
        console.groupEnd();
        return result;
    }
  },

  async sendDigestToInvestor(user: any) {
    const lenderId = user.lenderId;
    if (!lenderId) return { success: false, message: "No lender ID found." };

    console.log(`Processing digest for ${user.email} (${lenderId})...`);

    // 1. Get Deals & Data
    const deals = getInvestorDeals(lenderId);
    
    if (deals.length === 0) {
      console.log(`No deals found for ${user.email}. Skipping.`);
      return { success: true, message: "No deals found." }; // Success because system worked, just nothing to send
    }

    // 2. Process each deal for updates
    const lastDigest = this.getLastDigestTime(lenderId);
    const digestDeals = deals.map(dealSummary => this.processDealForDigest(dealSummary, lastDigest, lenderId));

    // 3. Filter out deals with absolutely no relevant info
    const activeDeals = digestDeals.filter(d => 
        d.updates.documents.length > 0 || 
        d.updates.qa.length > 0 || 
        d.updates.deadlines.length > 0 || 
        d.actionRequired
    );

    if (activeDeals.length === 0) {
      console.log(`No updates for ${user.email}. Skipping.`);
      return { success: true, message: "No new updates." };
    }

    // 4. Generate Email
    const emailHtml = emailTemplates.dailyDigest(user.name, activeDeals);

    // 5. Send Email
    const success = await emailService.send({
      to: user.email,
      subject: `Daily Deal Update – ${format(new Date(), 'MMM d, yyyy')}`,
      html: emailHtml
    });

    // 6. Update timestamp
    if (success) {
      this.setLastDigestTime(lenderId);
    }
    
    return { success, message: "Digest sent." };
  },

  // Helper to format deal data for the template
  processDealForDigest(summary: InvestorDealSummary, lastDigest: Date, lenderId: string) {
    const { deal, invitation, stats } = summary;
    
    // A) Documents
    // Filter docs: updated > lastDigest AND visible to tier
    // Mock visibility rule: "legal" tier sees everything, "full" sees everything except some restricted categories (not implemented in mock data yet, assuming full access for now)
    // "early" tier might only see Teaser/NDA
    const relevantDocs = mockDocuments.filter(d => {
        if (d.dealId !== deal.id) return false;
        
        // Check date
        const updated = parseISO(d.lastUpdatedAt);
        if (!isAfter(updated, lastDigest)) return false;

        // Check tier visibility (mock logic)
        if (invitation.accessTier === "early" && d.category !== "Other") return false; // Early only sees basic
        // Assume full/legal see everything else for now in this mock
        return true;
    });

    const docUpdates = relevantDocs.map(d => {
        // Determine if New or Updated (mock: if created close to updated, it's new)
        const isNew = true; // In real app, check createdAt vs updatedAt
        return `${isNew ? "New" : "Updated"} ${d.category}: ${d.name}`;
    });

    // B) Q&A
    // Questions asked by THIS lender where answer updated > lastDigest
    const relevantQA = mockQAs.filter((qa: QA) => 
        qa.dealId === deal.id && 
        qa.askedByLenderId === lenderId && 
        qa.status === "Answered" &&
        isAfter(parseISO(qa.answeredAt || ""), lastDigest)
    );
    
    const qaUpdates = relevantQA.map(qa => `Answer received: "${qa.question.substring(0, 30)}..."`);

    // C) Deadlines
    const deadlines: string[] = [];
    if (stats.nextDeadlineLabel && stats.nextDeadlineDate) {
        const days = differenceInDays(parseISO(stats.nextDeadlineDate), new Date());
        if (days >= 0 && days <= 14) { // Only show if coming up soon
            deadlines.push(`${stats.nextDeadlineLabel} due in ${days} days (${format(parseISO(stats.nextDeadlineDate), 'MMM d')})`);
        }
    }

    return {
      dealName: deal.dealName,
      issuer: deal.sponsor,
      instrument: deal.instrument,
      updates: {
          documents: docUpdates,
          qa: qaUpdates,
          deadlines: deadlines
      },
      actionRequired: stats.actionRequired,
      link: `${window.location.origin}/investor/deal/${deal.id}`
    };
  }
};
