import bcrypt from "bcryptjs";
import { storage } from "./storage";
import type { InsertDeal, InsertLender, InsertInvitation, InsertDocument, InsertQAItem, InsertCommitment, InsertUser } from "@shared/schema";

export async function seedIfEmpty() {
  // Check if data already exists
  const existingDeals = await storage.listDeals();
  if (existingDeals.length > 0) {
    console.log("Database already seeded, skipping...");
    return;
  }

  console.log("Seeding database with demo data...");

  // Hash demo password
  const hashedPassword = await bcrypt.hash("demo123", 10);

  // Create demo users
  const demoUsers: InsertUser[] = [
    {
      username: "bookrunner",
      password: hashedPassword,
      email: "bookrunner@demo.com",
      role: "bookrunner",
      firstName: "John",
      lastName: "Smith",
    },
    {
      username: "sponsor",
      password: hashedPassword,
      email: "sponsor@demo.com",
      role: "sponsor",
      fundName: "Vista Equity Partners",
      firstName: "Jane",
      lastName: "Doe",
    },
    {
      username: "lender",
      password: hashedPassword,
      email: "lender@apollocredit.com",
      role: "lender",
      fundName: "Apollo Credit",
      isAccredited: true,
      firstName: "Sarah",
      lastName: "Chen",
    },
  ];

  const createdUsers = await Promise.all(demoUsers.map(u => storage.createUser(u)));

  // Create Deals
  const deal1: InsertDeal = {
    dealName: "Project Titan",
    borrowerName: "Titan Software Inc.",
    sector: "Enterprise SaaS",
    sponsor: "Vista Equity Partners",
    sponsorId: createdUsers[1].id,
    instrument: "Senior Secured Term Loan",
    facilityType: "First Lien",
    facilitySize: "450000000",
    currency: "USD",
    stage: "Bookbuilding",
    status: "Active",
    targetSize: "450000000",
    committed: "325000000",
    pricingBenchmark: "SOFR",
    spreadLowBps: 625,
    spreadHighBps: 650,
    oid: "98.0",
    feesPct: "2.0",
    closeDate: "2026-02-28",
    hardCloseDate: "2026-03-05",
    launchDate: "2026-01-15",
    ndaTemplateId: "nda_std_v1",
    ndaRequired: true,
    entryEbitda: "180000000",
    leverageMultiple: 2.5,
    interestRate: 11.5,
    revenueGrowth: 8.0,
    capexPercent: 5.0,
  };

  const deal2: InsertDeal = {
    dealName: "Project Nova",
    borrowerName: "Nova Healthcare Services",
    sector: "Healthcare",
    sponsor: "KKR",
    instrument: "Unitranche",
    facilityType: "Unitranche",
    facilitySize: "300000000",
    currency: "USD",
    stage: "Marketing",
    status: "Active",
    targetSize: "300000000",
    committed: "180000000",
    pricingBenchmark: "SOFR",
    spreadLowBps: 550,
    spreadHighBps: 575,
    oid: "99.0",
    feesPct: "1.5",
    closeDate: "2026-03-31",
    launchDate: "2026-01-20",
    ndaTemplateId: "nda_std_v1",
    ndaRequired: true,
    entryEbitda: "120000000",
    leverageMultiple: 2.5,
    interestRate: 10.5,
    revenueGrowth: 6.0,
    capexPercent: 4.0,
  };

  const createdDeal1 = await storage.createDeal(deal1);
  const createdDeal2 = await storage.createDeal(deal2);

  // Create Lenders
  const lenders: InsertLender[] = [
    {
      userId: createdUsers[2].id,
      firstName: "Sarah",
      lastName: "Chen",
      email: "sarah.chen@apollocredit.com",
      organization: "Apollo Credit",
      fundType: "Direct Lending",
      title: "Managing Director",
    },
    {
      firstName: "Michael",
      lastName: "Rodriguez",
      email: "m.rodriguez@arescapital.com",
      organization: "Ares Capital",
      fundType: "BDC",
      title: "Senior Vice President",
    },
    {
      firstName: "Emily",
      lastName: "Thompson",
      email: "ethompson@blackrock.com",
      organization: "BlackRock Private Credit",
      fundType: "Direct Lending",
      title: "Portfolio Manager",
    },
    {
      firstName: "David",
      lastName: "Kim",
      email: "dkim@oaktreecapital.com",
      organization: "Oaktree Capital",
      fundType: "Opportunistic Credit",
      title: "Director",
    },
    {
      firstName: "Jessica",
      lastName: "Martinez",
      email: "jmartinez@carlyle.com",
      organization: "Carlyle Global Credit",
      fundType: "Direct Lending",
      title: "Vice President",
    },
    {
      firstName: "James",
      lastName: "Wilson",
      email: "jwilson@kkrcredit.com",
      organization: "KKR Credit",
      fundType: "Direct Lending",
      title: "Associate",
    },
  ];

  const createdLenders = await Promise.all(lenders.map(l => storage.createLender(l)));

  // Create Invitations for Deal 1
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const fiveDaysAgo = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000);
  const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
  const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);

  const invitations: InsertInvitation[] = [
    {
      dealId: createdDeal1.id,
      lenderId: createdLenders[0].id,
      accessTier: "full",
      ndaRequired: true,
      ndaSignedAt: fiveDaysAgo,
      ndaVersion: "1.0",
      signerEmail: createdLenders[0].email,
      signerIp: "192.168.1.10",
      invitedBy: "bookrunner@example.com",
      accessGranted: true,
      tierHistory: [
        { tier: "early", changedBy: "bookrunner@example.com", changedAt: sevenDaysAgo.toISOString() },
        { tier: "full", changedBy: "bookrunner@example.com", changedAt: threeDaysAgo.toISOString() },
      ],
    },
    {
      dealId: createdDeal1.id,
      lenderId: createdLenders[1].id,
      accessTier: "full",
      ndaRequired: true,
      ndaSignedAt: threeDaysAgo,
      ndaVersion: "1.0",
      signerEmail: createdLenders[1].email,
      signerIp: "192.168.1.11",
      invitedBy: "bookrunner@example.com",
      accessGranted: true,
    },
    {
      dealId: createdDeal1.id,
      lenderId: createdLenders[2].id,
      accessTier: "early",
      ndaRequired: true,
      ndaSignedAt: twoDaysAgo,
      ndaVersion: "1.0",
      signerEmail: createdLenders[2].email,
      signerIp: "192.168.1.12",
      invitedBy: "bookrunner@example.com",
      accessGranted: true,
    },
    {
      dealId: createdDeal1.id,
      lenderId: createdLenders[3].id,
      accessTier: "early",
      ndaRequired: true,
      invitedBy: "bookrunner@example.com",
      accessGranted: false,
    },
    {
      dealId: createdDeal1.id,
      lenderId: createdLenders[4].id,
      accessTier: "legal",
      ndaRequired: true,
      ndaSignedAt: fiveDaysAgo,
      ndaVersion: "1.0",
      signerEmail: createdLenders[4].email,
      signerIp: "192.168.1.13",
      invitedBy: "bookrunner@example.com",
      accessGranted: true,
    },
  ];

  await Promise.all(invitations.map(inv => storage.createInvitation(inv)));

  // Create Documents for Deal 1
  const documents: InsertDocument[] = [
    {
      dealId: createdDeal1.id,
      category: "Lender Presentation",
      type: "Financial",
      name: "Lender Presentation - Titan Software",
      version: 2,
      visibilityTier: "early",
      fileUrl: "/docs/titan-lender-presentation-v2.pdf",
      changeSummary: "Updated Q4 2025 financials and added covenant headroom analysis",
    },
    {
      dealId: createdDeal1.id,
      category: "Supplemental",
      type: "Financial",
      name: "Management Presentation",
      version: 1,
      visibilityTier: "full",
      fileUrl: "/docs/titan-mgmt-presentation.pdf",
    },
    {
      dealId: createdDeal1.id,
      category: "KYC & Compliance",
      type: "Legal",
      name: "KYC Package",
      version: 1,
      visibilityTier: "full",
      fileUrl: "/docs/titan-kyc-package.pdf",
    },
    {
      dealId: createdDeal1.id,
      category: "Lender Paydown Model",
      type: "Model",
      name: "Debt Paydown Model",
      version: 1,
      visibilityTier: "full",
      fileUrl: "/docs/titan-paydown-model.xlsx",
    },
    {
      dealId: createdDeal1.id,
      category: "Legal",
      type: "Legal",
      name: "Credit Agreement Draft",
      version: 3,
      visibilityTier: "legal",
      fileUrl: "/docs/titan-credit-agreement-v3.pdf",
      changeSummary: "Updated financial covenants and added springing maintenance test",
    },
  ];

  await Promise.all(documents.map(doc => storage.createDocument(doc)));

  // Create Q&A Items
  const qaItems: InsertQAItem[] = [
    {
      dealId: createdDeal1.id,
      lenderId: createdLenders[0].id,
      category: "Financial",
      status: "answered",
      question: "Can you provide details on the Q4 2025 revenue churn rate?",
      answer: "Q4 2025 gross churn was 8.2% annualized, consistent with prior quarters. Net revenue retention remains at 112%.",
      answeredAt: twoDaysAgo,
    },
    {
      dealId: createdDeal1.id,
      lenderId: createdLenders[1].id,
      category: "Legal",
      status: "answered",
      question: "What is the proposed leverage covenant step-down schedule?",
      answer: "Year 1: 5.5x, Year 2: 5.0x, Year 3: 4.5x. Covenant is tested quarterly on a trailing 12-month basis.",
      answeredAt: threeDaysAgo,
    },
    {
      dealId: createdDeal1.id,
      lenderId: createdLenders[2].id,
      category: "Structure",
      status: "open",
      question: "Will there be a cash sweep mechanism in the credit agreement?",
    },
  ];

  await Promise.all(qaItems.map(qa => storage.createQA(qa)));

  // Create Commitments
  const commitments: InsertCommitment[] = [
    {
      dealId: createdDeal1.id,
      lenderId: createdLenders[0].id,
      status: "firm",
      amount: "75000000",
      spread: 625,
      oid: "98.0",
      payloadJson: { conditions: "Credit committee approved" },
    },
    {
      dealId: createdDeal1.id,
      lenderId: createdLenders[1].id,
      status: "submitted",
      amount: "100000000",
      spread: 637,
      oid: "98.0",
      payloadJson: { conditions: "Pending final IC approval" },
    },
    {
      dealId: createdDeal1.id,
      lenderId: createdLenders[4].id,
      status: "firm",
      amount: "150000000",
      spread: 625,
      oid: "98.0",
      payloadJson: { conditions: "None" },
    },
  ];

  await Promise.all(commitments.map(c => storage.createCommitment(c)));

  // Create Audit Logs
  await storage.createLog({
    dealId: createdDeal1.id,
    lenderId: createdLenders[0].id,
    actorRole: "investor",
    actorEmail: createdLenders[0].email,
    action: "SIGN_NDA",
    resourceType: "invitation",
    metadata: { ndaVersion: "1.0", ip: "192.168.1.10" },
  });

  await storage.createLog({
    dealId: createdDeal1.id,
    lenderId: createdLenders[0].id,
    actorRole: "investor",
    actorEmail: createdLenders[0].email,
    action: "VIEW_DEAL",
    resourceId: createdDeal1.id,
    resourceType: "deal",
    metadata: { timestamp: threeDaysAgo.toISOString() },
  });

  await storage.createLog({
    dealId: createdDeal1.id,
    lenderId: createdLenders[1].id,
    actorRole: "investor",
    actorEmail: createdLenders[1].email,
    action: "DOWNLOAD_DOC",
    resourceType: "document",
    metadata: { documentName: "Lender Presentation - Titan Software" },
  });

  await storage.createLog({
    dealId: createdDeal1.id,
    lenderId: createdLenders[0].id,
    actorRole: "investor",
    actorEmail: createdLenders[0].email,
    action: "SUBMIT_COMMITMENT",
    resourceType: "commitment",
    metadata: { amount: "75000000", status: "firm" },
  });

  console.log("Database seeded successfully!");
  console.log(`Created ${createdUsers.length} users, ${createdLenders.length} lenders and 2 deals with documents, Q&A, and commitments.`);
}
