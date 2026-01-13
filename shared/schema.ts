import { sql } from "drizzle-orm";
import { pgTable, text, varchar, numeric, boolean, timestamp, integer, jsonb, real, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Organizations Table - Banks, Issuers, Lenders, Law Firms
export const organizations = pgTable("organizations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  orgType: text("org_type").notNull(), // issuer, bank, lender, law_firm
  logoUrl: text("logo_url"),
  website: text("website"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertOrganizationSchema = createInsertSchema(organizations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertOrganization = z.infer<typeof insertOrganizationSchema>;
export type Organization = typeof organizations.$inferSelect;

// Users Table (for authentication)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email").notNull().unique(),
  role: text("role").notNull().default("lender"), // issuer, bookrunner, lender
  organizationId: varchar("organization_id").references(() => organizations.id),
  fundName: text("fund_name"),
  isAccredited: boolean("is_accredited").default(false),
  firstName: text("first_name"),
  lastName: text("last_name"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Deals Table
export const deals = pgTable("deals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  dealName: text("deal_name").notNull(),
  borrowerName: text("borrower_name").notNull(),
  sector: text("sector").notNull(),
  sponsor: text("sponsor").notNull(),
  sponsorId: varchar("sponsor_id").references(() => users.id),
  // RFP/Mandate tracking
  mandatedBankOrgId: varchar("mandated_bank_org_id").references(() => organizations.id), // Awarded bank after RFP
  bookrunnerUserId: varchar("bookrunner_user_id").references(() => users.id), // Primary contact user from awarded bank
  instrument: text("instrument").notNull(),
  facilityType: text("facility_type").notNull(),
  facilitySize: numeric("facility_size").notNull(),
  currency: text("currency").notNull().default("USD"),
  stage: text("stage").notNull().default("Pre-Launch"), // Pre-Launch, Structuring, Marketing, Documentation, Closing
  status: text("status").notNull().default("rfp_stage"), // rfp_stage, live_syndication, closed, paused
  targetSize: numeric("target_size").notNull(),
  committed: numeric("committed").notNull().default("0"),
  pricingBenchmark: text("pricing_benchmark").notNull().default("SOFR"),
  spreadLowBps: integer("spread_low_bps").notNull(),
  spreadHighBps: integer("spread_high_bps").notNull(),
  oid: numeric("oid").notNull(),
  feesPct: numeric("fees_pct").notNull(),
  closeDate: text("close_date").notNull(),
  hardCloseDate: text("hard_close_date"),
  launchDate: text("launch_date").notNull(),
  ndaTemplateId: text("nda_template_id").default("nda_std_v1"),
  ndaRequired: boolean("nda_required").default(true),
  // Financial modeling fields
  entryEbitda: numeric("entry_ebitda"),
  leverageMultiple: real("leverage_multiple"),
  interestRate: real("interest_rate"),
  revenueGrowth: real("revenue_growth"),
  capexPercent: real("capex_percent"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertDealSchema = createInsertSchema(deals).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertDeal = z.infer<typeof insertDealSchema>;
export type Deal = typeof deals.$inferSelect;

// Lenders Table
export const lenders = pgTable("lenders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").notNull().unique(),
  organization: text("organization").notNull(),
  fundType: text("fund_type"),
  title: text("title"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertLenderSchema = createInsertSchema(lenders).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertLender = z.infer<typeof insertLenderSchema>;
export type Lender = typeof lenders.$inferSelect;

// Invitations Table
export const invitations = pgTable("invitations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  dealId: varchar("deal_id").notNull().references(() => deals.id),
  lenderId: varchar("lender_id").notNull().references(() => lenders.id),
  token: varchar("token").default(sql`gen_random_uuid()`),
  accessTier: text("access_tier").notNull().default("early"), // early, full, legal
  ndaRequired: boolean("nda_required").notNull().default(true),
  ndaSignedAt: timestamp("nda_signed_at"),
  ndaVersion: text("nda_version"),
  signerEmail: text("signer_email"),
  signerIp: text("signer_ip"),
  invitedAt: timestamp("invited_at").defaultNow().notNull(),
  invitedBy: text("invited_by").notNull(),
  accessGranted: boolean("access_granted").notNull().default(false),
  tierHistory: jsonb("tier_history").$type<Array<{tier: string, changedBy: string, changedAt: string}>>(),
});

export const insertInvitationSchema = createInsertSchema(invitations).omit({
  id: true,
  invitedAt: true,
  token: true,
});
export type InsertInvitation = z.infer<typeof insertInvitationSchema>;
export type Invitation = typeof invitations.$inferSelect;

// Documents Table
export const documents = pgTable("documents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  dealId: varchar("deal_id").notNull().references(() => deals.id),
  category: text("category").notNull(),
  type: text("type").notNull(),
  name: text("name").notNull(),
  version: integer("version").notNull().default(1),
  visibilityTier: text("visibility_tier").notNull().default("early"),
  fileUrl: text("file_url"),
  fileKey: text("file_key"),
  changeSummary: text("change_summary"),
  isAutomated: boolean("is_automated").default(false),
  uploadedAt: timestamp("uploaded_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertDocumentSchema = createInsertSchema(documents).omit({
  id: true,
  uploadedAt: true,
  updatedAt: true,
});
export type InsertDocument = z.infer<typeof insertDocumentSchema>;
export type Document = typeof documents.$inferSelect;

// Commitments Table
export const commitments = pgTable("commitments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  dealId: varchar("deal_id").notNull().references(() => deals.id),
  lenderId: varchar("lender_id").notNull().references(() => lenders.id),
  status: text("status").notNull().default("submitted"),
  amount: numeric("amount").notNull(),
  spread: integer("spread"),
  oid: numeric("oid"),
  conditions: text("conditions"),
  payloadJson: jsonb("payload_json").$type<Record<string, any>>(),
  submittedAt: timestamp("submitted_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertCommitmentSchema = createInsertSchema(commitments).omit({
  id: true,
  submittedAt: true,
  updatedAt: true,
});
export type InsertCommitment = z.infer<typeof insertCommitmentSchema>;
export type Commitment = typeof commitments.$inferSelect;

// Q&A Items Table
export const qaItems = pgTable("qa_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  dealId: varchar("deal_id").notNull().references(() => deals.id),
  lenderId: varchar("lender_id").references(() => lenders.id),
  category: text("category").notNull(),
  status: text("status").notNull().default("open"),
  question: text("question").notNull(),
  askedAt: timestamp("asked_at").defaultNow().notNull(),
  answer: text("answer"),
  answeredAt: timestamp("answered_at"),
  source: text("source").notNull().default("qa"),
});

export const insertQAItemSchema = createInsertSchema(qaItems).omit({
  id: true,
  askedAt: true,
});
export type InsertQAItem = z.infer<typeof insertQAItemSchema>;
export type QAItem = typeof qaItems.$inferSelect;

// Audit Logs Table
export const logs = pgTable("logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  dealId: varchar("deal_id").references(() => deals.id),
  lenderId: varchar("lender_id").references(() => lenders.id),
  userId: varchar("user_id").references(() => users.id),
  actorRole: text("actor_role").notNull(),
  actorEmail: text("actor_email"),
  action: text("action").notNull(), // view_deal, download_doc, sign_nda, submit_commitment
  resourceId: varchar("resource_id"),
  resourceType: text("resource_type"),
  metadata: jsonb("metadata").$type<Record<string, any>>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertLogSchema = createInsertSchema(logs).omit({
  id: true,
  createdAt: true,
});
export type InsertLog = z.infer<typeof insertLogSchema>;
export type Log = typeof logs.$inferSelect;

// Sessions table for Passport.js session storage
export const sessions = pgTable("sessions", {
  sid: varchar("sid").primaryKey(),
  sess: jsonb("sess").notNull(),
  expire: timestamp("expire").notNull(),
});

// Deal Models Table - for storing sandbox financial model assumptions
export const dealModels = pgTable("deal_models", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  dealId: varchar("deal_id").notNull().references(() => deals.id),
  name: text("name").notNull().default("Financial Model"),
  assumptions: jsonb("assumptions").$type<{
    revenue: number;
    growthPercent: number;
    ebitdaMargin: number;
    leverageMultiple: number;
    interestRate: number;
    taxRate?: number;
    capexPercent?: number;
    amortizationPercent?: number;
    cashSweepPercent?: number;
  }>().notNull(),
  isPublished: boolean("is_published").default(false),
  publishedAt: timestamp("published_at"),
  publishedBy: varchar("published_by").references(() => users.id),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertDealModelSchema = createInsertSchema(dealModels).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertDealModel = z.infer<typeof insertDealModelSchema>;
export type DealModel = typeof dealModels.$inferSelect;

// Closing Items Table - Conditions Precedent for deal closing
export const closingItems = pgTable("closing_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  dealId: varchar("deal_id").notNull().references(() => deals.id),
  description: text("description").notNull(), // e.g. "Insurance Cert", "Legal Opinion"
  status: text("status").notNull().default("pending"), // pending, uploaded, approved
  fileId: varchar("file_id").references(() => documents.id), // optional linked document
  category: text("category").notNull().default("general"), // legal, financial, insurance, compliance, other
  requiredBy: text("required_by"), // Who requires this item (e.g. "Agent", "Lender Group")
  dueDate: text("due_date"),
  notes: text("notes"),
  uploadedBy: varchar("uploaded_by").references(() => users.id),
  uploadedAt: timestamp("uploaded_at"),
  approvedBy: varchar("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at"),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertClosingItemSchema = createInsertSchema(closingItems).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertClosingItem = z.infer<typeof insertClosingItemSchema>;
export type ClosingItem = typeof closingItems.$inferSelect;

// Syndicate Book Table - Internal tracking for bookrunners/issuers
export const syndicateBook = pgTable("syndicate_book", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  dealId: varchar("deal_id").notNull().references(() => deals.id),
  lenderId: varchar("lender_id").notNull().references(() => lenders.id),
  status: text("status").notNull().default("invited"), // pitching, invited, interested, ioi_submitted, soft_circled, firm_committed, allocated, declined
  indicatedAmount: numeric("indicated_amount"), // IOI amount
  firmCommitmentAmount: numeric("firm_commitment_amount"), // Firm commitment amount
  allocatedAmount: numeric("allocated_amount"), // Final allocation
  spreadBps: integer("spread_bps"), // Spread in basis points
  internalNotes: text("internal_notes"), // Private notes (never shown to investors)
  lastUpdatedBy: varchar("last_updated_by").references(() => users.id),
  lastUpdatedAt: timestamp("last_updated_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertSyndicateBookSchema = createInsertSchema(syndicateBook).omit({
  id: true,
  createdAt: true,
  lastUpdatedAt: true,
});
export type InsertSyndicateBook = z.infer<typeof insertSyndicateBookSchema>;
export type SyndicateBookEntry = typeof syndicateBook.$inferSelect;

// Indications Table - IOI submissions by lenders
export const indications = pgTable("indications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  dealId: varchar("deal_id").notNull().references(() => deals.id),
  lenderId: varchar("lender_id").notNull().references(() => lenders.id),
  submittedByUserId: varchar("submitted_by_user_id").notNull().references(() => users.id),
  ioiAmount: numeric("ioi_amount").notNull(),
  currency: text("currency").notNull().default("USD"),
  termsJson: jsonb("terms_json").$type<{
    spreadBps?: number;
    oid?: number;
    fees?: number;
    tenorMonths?: number;
    amortization?: string;
    covenantsNotes?: string;
    conditions?: string;
    comments?: string;
    isFirm?: boolean;
  }>().notNull(),
  status: text("status").notNull().default("submitted"), // submitted, updated, withdrawn
  submittedAt: timestamp("submitted_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertIndicationSchema = createInsertSchema(indications).omit({
  id: true,
  submittedAt: true,
  updatedAt: true,
});
export type InsertIndication = z.infer<typeof insertIndicationSchema>;
export type Indication = typeof indications.$inferSelect;

// Master Documents Table - Legal negotiation documents (Financing Grid, Term Sheet, Credit Agreement)
export const masterDocuments = pgTable("master_documents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  dealId: varchar("deal_id").notNull().references(() => deals.id),
  docKey: text("doc_key").notNull(), // "financing_grid" | "term_sheet" | "credit_agreement"
  title: text("title").notNull(),
  currentVersionId: varchar("current_version_id"),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertMasterDocumentSchema = createInsertSchema(masterDocuments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertMasterDocument = z.infer<typeof insertMasterDocumentSchema>;
export type MasterDocument = typeof masterDocuments.$inferSelect;

// Document Versions Table - Version history for master documents
export const documentVersions = pgTable("document_versions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  masterDocId: varchar("master_doc_id").notNull().references(() => masterDocuments.id),
  versionNumber: integer("version_number").notNull().default(1),
  filePath: text("file_path").notNull(),
  mimeType: text("mime_type"),
  uploadedBy: varchar("uploaded_by").references(() => users.id),
  changeSummary: text("change_summary"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertDocumentVersionSchema = createInsertSchema(documentVersions).omit({
  id: true,
  createdAt: true,
});
export type InsertDocumentVersion = z.infer<typeof insertDocumentVersionSchema>;
export type DocumentVersion = typeof documentVersions.$inferSelect;

// Lender Markups Table - Lender counsel submissions for master documents
export const lenderMarkups = pgTable("lender_markups", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  masterDocId: varchar("master_doc_id").notNull().references(() => masterDocuments.id),
  lenderId: varchar("lender_id").notNull().references(() => lenders.id),
  filePath: text("file_path").notNull(),
  mimeType: text("mime_type"),
  uploadedByUserId: varchar("uploaded_by_user_id").references(() => users.id),
  status: text("status").notNull().default("uploaded"), // uploaded, reviewing, incorporated, rejected
  incorporatedVersionId: varchar("incorporated_version_id").references(() => documentVersions.id),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertLenderMarkupSchema = createInsertSchema(lenderMarkups).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertLenderMarkup = z.infer<typeof insertLenderMarkupSchema>;
export type LenderMarkup = typeof lenderMarkups.$inferSelect;

// Bookrunner Candidates Table - Banks invited to RFP/Beauty Contest
export const bookrunnerCandidates = pgTable("bookrunner_candidates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  dealId: varchar("deal_id").notNull().references(() => deals.id),
  bankOrgId: varchar("bank_org_id").notNull().references(() => organizations.id), // Bank organization
  invitedByUserId: varchar("invited_by_user_id").references(() => users.id),
  status: text("status").notNull().default("invited"), // invited, viewed, drafting, submitted, declined, mandated
  viewedAt: timestamp("viewed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  unique("bookrunner_candidates_deal_bank_unique").on(table.dealId, table.bankOrgId),
]);

export const insertBookrunnerCandidateSchema = createInsertSchema(bookrunnerCandidates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertBookrunnerCandidate = z.infer<typeof insertBookrunnerCandidateSchema>;
export type BookrunnerCandidate = typeof bookrunnerCandidates.$inferSelect;

// Financing Proposals Table - RFP/Pre-launch proposals from candidate banks
export const financingProposals = pgTable("financing_proposals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  dealId: varchar("deal_id").notNull().references(() => deals.id),
  bankOrgId: varchar("bank_org_id").notNull().references(() => organizations.id), // The bank organization submitting
  submittedByUserId: varchar("submitted_by_user_id").references(() => users.id),
  status: text("status").notNull().default("draft"), // draft, submitted, selected, withdrawn
  // Financing Grid Fields
  leverageSenior: numeric("leverage_senior"), // Senior leverage multiple (e.g., 4.5x)
  leverageTotal: numeric("leverage_total"), // Total leverage multiple (e.g., 5.5x)
  interestMarginBps: integer("interest_margin_bps"), // Spread in basis points (e.g., 450 = L+450bps)
  oidBps: integer("oid_bps"), // Original Issue Discount in basis points (e.g., 200 = 2%)
  upfrontFeeBps: integer("upfront_fee_bps"), // Arrangement/underwriting fee in bps
  tenorYears: numeric("tenor_years"), // Loan tenor in years (e.g., 7)
  amortization: text("amortization"), // Amortization schedule description
  covenantsNotes: text("covenants_notes"), // Key covenants summary
  conditionsNotes: text("conditions_notes"), // Conditions precedent notes
  freeformNotes: text("freeform_notes"), // Additional notes/comments
  submittedAt: timestamp("submitted_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  unique("financing_proposals_deal_bank_unique").on(table.dealId, table.bankOrgId),
]);

export const insertFinancingProposalSchema = createInsertSchema(financingProposals).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertFinancingProposal = z.infer<typeof insertFinancingProposalSchema>;
export type FinancingProposal = typeof financingProposals.$inferSelect;

// Prior Q&A Items Table - Curated Q&A from prior financing processes
export const priorQaItems = pgTable("prior_qa_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  dealId: varchar("deal_id").notNull().references(() => deals.id),
  uploadedDocumentId: varchar("uploaded_document_id").references(() => documents.id), // Source document
  question: text("question").notNull(),
  answer: text("answer").notNull(),
  topic: text("topic"), // Optional categorization (e.g., "Financials", "Legal", "Operations")
  sourceProcess: text("source_process"), // e.g., "2023 Financing", "Q2 2024 Refinancing"
  shareable: boolean("shareable").notNull().default(true), // Whether lenders can see this item
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertPriorQaItemSchema = createInsertSchema(priorQaItems).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertPriorQaItem = z.infer<typeof insertPriorQaItemSchema>;
export type PriorQaItem = typeof priorQaItems.$inferSelect;
