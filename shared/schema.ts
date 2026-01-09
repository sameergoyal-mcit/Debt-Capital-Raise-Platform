import { sql } from "drizzle-orm";
import { pgTable, text, varchar, numeric, boolean, timestamp, integer, jsonb, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users Table (for authentication)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email").notNull().unique(),
  role: text("role").notNull().default("lender"), // sponsor, lender, borrower, bookrunner
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
  instrument: text("instrument").notNull(),
  facilityType: text("facility_type").notNull(),
  facilitySize: numeric("facility_size").notNull(),
  currency: text("currency").notNull().default("USD"),
  stage: text("stage").notNull(),
  status: text("status").notNull(), // live, closed, paused
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
