import { drizzle } from "drizzle-orm/node-postgres";
import { eq, and, desc, gte } from "drizzle-orm";
import pg from "pg";
import * as schema from "@shared/schema";
import type {
  User,
  InsertUser,
  Deal,
  InsertDeal,
  Lender,
  InsertLender,
  Invitation,
  InsertInvitation,
  Document,
  InsertDocument,
  Commitment,
  InsertCommitment,
  QAItem,
  InsertQAItem,
  Log,
  InsertLog,
  DealModel,
  InsertDealModel,
  ClosingItem,
  InsertClosingItem,
  SyndicateBookEntry,
  InsertSyndicateBook,
  Indication,
  InsertIndication,
  MasterDocument,
  InsertMasterDocument,
  DocumentVersion,
  InsertDocumentVersion,
  LenderMarkup,
  InsertLenderMarkup,
  FinancingProposal,
  InsertFinancingProposal,
  Organization,
  InsertOrganization,
  BookrunnerCandidate,
  InsertBookrunnerCandidate,
  PriorQaItem,
  InsertPriorQaItem,
} from "@shared/schema";

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL!,
});

export const db = drizzle(pool, { schema });

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Deals
  listDeals(): Promise<Deal[]>;
  getDeal(id: string): Promise<Deal | undefined>;
  createDeal(deal: InsertDeal): Promise<Deal>;
  updateDeal(id: string, deal: Partial<InsertDeal>): Promise<Deal | undefined>;

  // Lenders
  listLenders(): Promise<Lender[]>;
  getLender(id: string): Promise<Lender | undefined>;
  getLenderByEmail(email: string): Promise<Lender | undefined>;
  getLenderByUserId(userId: string): Promise<Lender | undefined>;
  createLender(lender: InsertLender): Promise<Lender>;
  updateLender(id: string, lender: Partial<InsertLender>): Promise<Lender | undefined>;

  // Invitations
  listInvitationsByDeal(dealId: string): Promise<Invitation[]>;
  listInvitationsByLender(lenderId: string): Promise<Invitation[]>;
  getInvitation(dealId: string, lenderId: string): Promise<Invitation | undefined>;
  getInvitationByToken(token: string): Promise<Invitation | undefined>;
  createInvitation(invitation: InsertInvitation): Promise<Invitation>;
  updateInvitationNdaSigned(dealId: string, lenderId: string, signerEmail: string, signerIp: string, ndaVersion: string): Promise<Invitation | undefined>;
  updateInvitationTier(dealId: string, lenderId: string, newTier: string, changedBy: string): Promise<Invitation | undefined>;

  // Documents
  listDocumentsByDeal(dealId: string): Promise<Document[]>;
  getDocument(id: string): Promise<Document | undefined>;
  createDocument(document: InsertDocument): Promise<Document>;
  updateDocument(id: string, document: Partial<InsertDocument>): Promise<Document | undefined>;

  // Commitments
  listCommitmentsByDeal(dealId: string): Promise<Commitment[]>;
  getCommitmentByDealAndLender(dealId: string, lenderId: string): Promise<Commitment | undefined>;
  createCommitment(commitment: InsertCommitment): Promise<Commitment>;
  updateCommitment(id: string, commitment: Partial<InsertCommitment>): Promise<Commitment | undefined>;

  // Q&A
  listQAByDeal(dealId: string): Promise<QAItem[]>;
  getQAItem(id: string): Promise<QAItem | undefined>;
  createQA(qa: InsertQAItem): Promise<QAItem>;
  answerQA(id: string, answer: string): Promise<QAItem | undefined>;

  // Audit Logs
  createLog(log: InsertLog): Promise<Log>;
  listLogsByDeal(dealId: string, limit?: number): Promise<Log[]>;
  getEngagementAnalytics(dealId: string, days?: number): Promise<{
    documentViews: { documentId: string; documentName: string; viewCount: number }[];
    engagementByTier: { tier: string; count: number }[];
    activityTrend: { date: string; count: number }[];
    topLenders: { lenderId: string; lenderName: string; activityCount: number }[];
    recentActivity: Log[];
  }>;

  // Deal Models
  listDealModelsByDeal(dealId: string): Promise<DealModel[]>;
  getDealModel(id: string): Promise<DealModel | undefined>;
  createDealModel(model: InsertDealModel): Promise<DealModel>;
  updateDealModel(id: string, model: Partial<InsertDealModel>): Promise<DealModel | undefined>;
  publishDealModel(id: string, userId: string): Promise<DealModel | undefined>;

  // Closing Items
  listClosingItemsByDeal(dealId: string): Promise<ClosingItem[]>;
  getClosingItem(id: string): Promise<ClosingItem | undefined>;
  createClosingItem(item: InsertClosingItem): Promise<ClosingItem>;
  updateClosingItem(id: string, item: Partial<InsertClosingItem>): Promise<ClosingItem | undefined>;
  deleteClosingItem(id: string): Promise<boolean>;

  // Syndicate Book
  listSyndicateBookByDeal(dealId: string): Promise<SyndicateBookEntry[]>;
  getSyndicateBookEntry(id: string): Promise<SyndicateBookEntry | undefined>;
  getSyndicateBookEntryByDealAndLender(dealId: string, lenderId: string): Promise<SyndicateBookEntry | undefined>;
  createSyndicateBookEntry(entry: InsertSyndicateBook): Promise<SyndicateBookEntry>;
  updateSyndicateBookEntry(id: string, entry: Partial<InsertSyndicateBook>): Promise<SyndicateBookEntry | undefined>;
  upsertSyndicateBookEntry(dealId: string, lenderId: string, entry: Partial<InsertSyndicateBook>): Promise<SyndicateBookEntry>;

  // Indications (IOI)
  getIndicationByDealAndLender(dealId: string, lenderId: string): Promise<Indication | undefined>;
  listIndicationsByDeal(dealId: string): Promise<Indication[]>;
  upsertIndication(dealId: string, lenderId: string, indication: Partial<InsertIndication>): Promise<Indication>;
  withdrawIndication(dealId: string, lenderId: string): Promise<Indication | undefined>;

  // Master Documents (Legal Negotiation)
  listMasterDocsByDeal(dealId: string): Promise<MasterDocument[]>;
  getMasterDoc(id: string): Promise<MasterDocument | undefined>;
  getMasterDocByKey(dealId: string, docKey: string): Promise<MasterDocument | undefined>;
  createMasterDoc(doc: InsertMasterDocument): Promise<MasterDocument>;
  updateMasterDoc(id: string, doc: Partial<InsertMasterDocument>): Promise<MasterDocument | undefined>;
  ensureMasterDocsForDeal(dealId: string, userId?: string): Promise<MasterDocument[]>;

  // Document Versions
  listVersionsByMasterDoc(masterDocId: string): Promise<DocumentVersion[]>;
  getDocumentVersion(id: string): Promise<DocumentVersion | undefined>;
  createDocumentVersion(version: InsertDocumentVersion): Promise<DocumentVersion>;

  // Lender Markups
  listMarkupsByMasterDoc(masterDocId: string): Promise<LenderMarkup[]>;
  listMarkupsByLender(masterDocId: string, lenderId: string): Promise<LenderMarkup[]>;
  getLenderMarkup(id: string): Promise<LenderMarkup | undefined>;
  createLenderMarkup(markup: InsertLenderMarkup): Promise<LenderMarkup>;
  updateLenderMarkup(id: string, markup: Partial<InsertLenderMarkup>): Promise<LenderMarkup | undefined>;

  // Organizations
  listOrganizations(): Promise<Organization[]>;
  listOrganizationsByType(orgType: string): Promise<Organization[]>;
  getOrganization(id: string): Promise<Organization | undefined>;
  getOrganizationByName(name: string): Promise<Organization | undefined>;
  createOrganization(org: InsertOrganization): Promise<Organization>;
  updateOrganization(id: string, org: Partial<InsertOrganization>): Promise<Organization | undefined>;

  // Bookrunner Candidates (RFP invitations)
  listCandidatesByDeal(dealId: string): Promise<BookrunnerCandidate[]>;
  getCandidateByDealAndBank(dealId: string, bankOrgId: string): Promise<BookrunnerCandidate | undefined>;
  createCandidate(candidate: InsertBookrunnerCandidate): Promise<BookrunnerCandidate>;
  updateCandidate(id: string, candidate: Partial<InsertBookrunnerCandidate>): Promise<BookrunnerCandidate | undefined>;
  setCandidateStatus(dealId: string, bankOrgId: string, status: string): Promise<BookrunnerCandidate | undefined>;

  // Financing Proposals (RFP)
  listProposalsByDeal(dealId: string): Promise<FinancingProposal[]>;
  getProposal(id: string): Promise<FinancingProposal | undefined>;
  getProposalByDealAndBank(dealId: string, bankOrgId: string): Promise<FinancingProposal | undefined>;
  createProposal(proposal: InsertFinancingProposal): Promise<FinancingProposal>;
  updateProposal(id: string, proposal: Partial<InsertFinancingProposal>): Promise<FinancingProposal | undefined>;
  submitProposal(id: string): Promise<FinancingProposal | undefined>;
  selectProposal(id: string): Promise<FinancingProposal | undefined>;
  withdrawProposal(id: string): Promise<FinancingProposal | undefined>;

  // Award mandate
  awardMandate(dealId: string, winnerBankOrgId: string): Promise<Deal | undefined>;

  // Prior Q&A Items
  listPriorQaByDeal(dealId: string, shareableOnly?: boolean): Promise<PriorQaItem[]>;
  getPriorQaItem(id: string): Promise<PriorQaItem | undefined>;
  createPriorQaItem(item: InsertPriorQaItem): Promise<PriorQaItem>;
  createPriorQaItems(items: InsertPriorQaItem[]): Promise<PriorQaItem[]>;
  updatePriorQaItem(id: string, item: Partial<InsertPriorQaItem>): Promise<PriorQaItem | undefined>;
  deletePriorQaItem(id: string): Promise<boolean>;
}

export class DrizzleStorage implements IStorage {
  // Users
  async getUser(id: string): Promise<User | undefined> {
    const results = await db.select().from(schema.users).where(eq(schema.users.id, id));
    return results[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const results = await db.select().from(schema.users).where(eq(schema.users.username, username));
    return results[0];
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const results = await db.select().from(schema.users).where(eq(schema.users.email, email));
    return results[0];
  }

  async createUser(user: InsertUser): Promise<User> {
    const results = await db.insert(schema.users).values(user).returning();
    return results[0];
  }

  // Deals
  async listDeals(): Promise<Deal[]> {
    return db.select().from(schema.deals).orderBy(desc(schema.deals.updatedAt));
  }

  async getDeal(id: string): Promise<Deal | undefined> {
    const results = await db.select().from(schema.deals).where(eq(schema.deals.id, id));
    return results[0];
  }

  async createDeal(deal: InsertDeal): Promise<Deal> {
    const results = await db.insert(schema.deals).values(deal).returning();
    return results[0];
  }

  async updateDeal(id: string, deal: Partial<InsertDeal>): Promise<Deal | undefined> {
    const results = await db
      .update(schema.deals)
      .set({ ...deal, updatedAt: new Date() })
      .where(eq(schema.deals.id, id))
      .returning();
    return results[0];
  }

  // Lenders
  async listLenders(): Promise<Lender[]> {
    return db.select().from(schema.lenders).orderBy(schema.lenders.organization);
  }

  async getLender(id: string): Promise<Lender | undefined> {
    const results = await db.select().from(schema.lenders).where(eq(schema.lenders.id, id));
    return results[0];
  }

  async getLenderByEmail(email: string): Promise<Lender | undefined> {
    const results = await db.select().from(schema.lenders).where(eq(schema.lenders.email, email));
    return results[0];
  }

  async getLenderByUserId(userId: string): Promise<Lender | undefined> {
    const results = await db.select().from(schema.lenders).where(eq(schema.lenders.userId, userId));
    return results[0];
  }

  async createLender(lender: InsertLender): Promise<Lender> {
    const results = await db.insert(schema.lenders).values(lender).returning();
    return results[0];
  }

  async updateLender(id: string, lender: Partial<InsertLender>): Promise<Lender | undefined> {
    const results = await db
      .update(schema.lenders)
      .set({ ...lender, updatedAt: new Date() })
      .where(eq(schema.lenders.id, id))
      .returning();
    return results[0];
  }

  // Invitations
  async listInvitationsByDeal(dealId: string): Promise<Invitation[]> {
    return db.select().from(schema.invitations).where(eq(schema.invitations.dealId, dealId));
  }

  async listInvitationsByLender(lenderId: string): Promise<Invitation[]> {
    return db.select().from(schema.invitations).where(eq(schema.invitations.lenderId, lenderId));
  }

  async getInvitation(dealId: string, lenderId: string): Promise<Invitation | undefined> {
    const results = await db
      .select()
      .from(schema.invitations)
      .where(and(eq(schema.invitations.dealId, dealId), eq(schema.invitations.lenderId, lenderId)));
    return results[0];
  }

  async getInvitationByToken(token: string): Promise<Invitation | undefined> {
    const results = await db.select().from(schema.invitations).where(eq(schema.invitations.token, token));
    return results[0];
  }

  async createInvitation(invitation: InsertInvitation): Promise<Invitation> {
    // Cast to any to work around Drizzle type inference issues with jsonb fields
    const results = await db.insert(schema.invitations).values(invitation as any).returning();
    return results[0];
  }

  async updateInvitationNdaSigned(
    dealId: string,
    lenderId: string,
    signerEmail: string,
    signerIp: string,
    ndaVersion: string
  ): Promise<Invitation | undefined> {
    const results = await db
      .update(schema.invitations)
      .set({
        ndaSignedAt: new Date(),
        signerEmail,
        signerIp,
        ndaVersion,
        accessGranted: true,
      })
      .where(and(eq(schema.invitations.dealId, dealId), eq(schema.invitations.lenderId, lenderId)))
      .returning();
    return results[0];
  }

  async updateInvitationTier(
    dealId: string,
    lenderId: string,
    newTier: string,
    changedBy: string
  ): Promise<Invitation | undefined> {
    const existing = await this.getInvitation(dealId, lenderId);
    if (!existing) return undefined;

    const tierHistory = existing.tierHistory || [];
    tierHistory.push({
      tier: newTier,
      changedBy,
      changedAt: new Date().toISOString(),
    });

    const results = await db
      .update(schema.invitations)
      .set({ accessTier: newTier, tierHistory })
      .where(and(eq(schema.invitations.dealId, dealId), eq(schema.invitations.lenderId, lenderId)))
      .returning();
    return results[0];
  }

  // Documents
  async listDocumentsByDeal(dealId: string): Promise<Document[]> {
    return db.select().from(schema.documents).where(eq(schema.documents.dealId, dealId)).orderBy(desc(schema.documents.uploadedAt));
  }

  async getDocument(id: string): Promise<Document | undefined> {
    const results = await db.select().from(schema.documents).where(eq(schema.documents.id, id));
    return results[0];
  }

  async createDocument(document: InsertDocument): Promise<Document> {
    const results = await db.insert(schema.documents).values(document).returning();
    return results[0];
  }

  async updateDocument(id: string, document: Partial<InsertDocument>): Promise<Document | undefined> {
    const results = await db
      .update(schema.documents)
      .set({ ...document, updatedAt: new Date() })
      .where(eq(schema.documents.id, id))
      .returning();
    return results[0];
  }

  // Commitments
  async listCommitmentsByDeal(dealId: string): Promise<Commitment[]> {
    return db.select().from(schema.commitments).where(eq(schema.commitments.dealId, dealId)).orderBy(desc(schema.commitments.submittedAt));
  }

  async getCommitmentByDealAndLender(dealId: string, lenderId: string): Promise<Commitment | undefined> {
    const results = await db
      .select()
      .from(schema.commitments)
      .where(and(eq(schema.commitments.dealId, dealId), eq(schema.commitments.lenderId, lenderId)));
    return results[0];
  }

  async createCommitment(commitment: InsertCommitment): Promise<Commitment> {
    const results = await db.insert(schema.commitments).values(commitment).returning();
    return results[0];
  }

  async updateCommitment(id: string, commitment: Partial<InsertCommitment>): Promise<Commitment | undefined> {
    const results = await db
      .update(schema.commitments)
      .set({ ...commitment, updatedAt: new Date() })
      .where(eq(schema.commitments.id, id))
      .returning();
    return results[0];
  }

  // Q&A
  async listQAByDeal(dealId: string): Promise<QAItem[]> {
    return db.select().from(schema.qaItems).where(eq(schema.qaItems.dealId, dealId)).orderBy(desc(schema.qaItems.askedAt));
  }

  async getQAItem(id: string): Promise<QAItem | undefined> {
    const results = await db.select().from(schema.qaItems).where(eq(schema.qaItems.id, id));
    return results[0];
  }

  async createQA(qa: InsertQAItem): Promise<QAItem> {
    const results = await db.insert(schema.qaItems).values(qa).returning();
    return results[0];
  }

  async answerQA(id: string, answer: string): Promise<QAItem | undefined> {
    const results = await db
      .update(schema.qaItems)
      .set({ answer, answeredAt: new Date(), status: "answered" })
      .where(eq(schema.qaItems.id, id))
      .returning();
    return results[0];
  }

  // Audit Logs
  async createLog(log: InsertLog): Promise<Log> {
    const results = await db.insert(schema.logs).values(log).returning();
    return results[0];
  }

  async listLogsByDeal(dealId: string, limit: number = 50): Promise<Log[]> {
    return db
      .select()
      .from(schema.logs)
      .where(eq(schema.logs.dealId, dealId))
      .orderBy(desc(schema.logs.createdAt))
      .limit(limit);
  }

  async getEngagementAnalytics(dealId: string, days: number = 7): Promise<{
    documentViews: { documentId: string; documentName: string; viewCount: number }[];
    engagementByTier: { tier: string; count: number }[];
    activityTrend: { date: string; count: number }[];
    topLenders: { lenderId: string; lenderName: string; activityCount: number }[];
    recentActivity: Log[];
  }> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    // Get all logs for the deal within the time range
    const logs = await db
      .select()
      .from(schema.logs)
      .where(
        and(
          eq(schema.logs.dealId, dealId),
          gte(schema.logs.createdAt, cutoffDate)
        )
      )
      .orderBy(desc(schema.logs.createdAt));

    // Document views aggregation - match AuditActions constants (uppercase)
    const docViewsMap = new Map<string, { documentId: string; documentName: string; viewCount: number }>();
    logs.filter(l => l.action === 'DOWNLOAD_DOC' || l.action === 'VIEW_DOC' || l.action === 'WATERMARK_STREAM').forEach(log => {
      const docId = log.resourceId || 'unknown';
      const docName = (log.metadata as any)?.documentName || docId;
      const existing = docViewsMap.get(docId);
      if (existing) {
        existing.viewCount++;
      } else {
        docViewsMap.set(docId, { documentId: docId, documentName: docName, viewCount: 1 });
      }
    });
    const documentViews = Array.from(docViewsMap.values())
      .sort((a, b) => b.viewCount - a.viewCount)
      .slice(0, 5);

    // Engagement by tier
    const tierMap = new Map<string, number>();
    for (const log of logs) {
      const tier = (log.metadata as any)?.accessTier || 'unknown';
      tierMap.set(tier, (tierMap.get(tier) || 0) + 1);
    }
    const engagementByTier = Array.from(tierMap.entries()).map(([tier, count]) => ({ tier, count }));

    // Activity trend (group by date)
    const trendMap = new Map<string, number>();
    for (let i = 0; i < days; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      trendMap.set(dateStr, 0);
    }
    logs.forEach(log => {
      const dateStr = log.createdAt.toISOString().split('T')[0];
      if (trendMap.has(dateStr)) {
        trendMap.set(dateStr, (trendMap.get(dateStr) || 0) + 1);
      }
    });
    const activityTrend = Array.from(trendMap.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Top lenders by activity (limit to 3)
    const lenderActivityMap = new Map<string, number>();
    logs.filter(l => l.lenderId).forEach(log => {
      const lenderId = log.lenderId!;
      lenderActivityMap.set(lenderId, (lenderActivityMap.get(lenderId) || 0) + 1);
    });

    const topLenderIds = Array.from(lenderActivityMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);

    const topLenders: { lenderId: string; lenderName: string; activityCount: number }[] = [];
    for (const [lenderId, count] of topLenderIds) {
      const lender = await this.getLender(lenderId);
      topLenders.push({
        lenderId,
        lenderName: lender ? `${lender.firstName} ${lender.lastName}` : 'Unknown',
        activityCount: count
      });
    }

    // Recent activity (last 10)
    const recentActivity = logs.slice(0, 10);

    return {
      documentViews,
      engagementByTier,
      activityTrend,
      topLenders,
      recentActivity
    };
  }

  // Deal Models
  async listDealModelsByDeal(dealId: string): Promise<DealModel[]> {
    return db
      .select()
      .from(schema.dealModels)
      .where(eq(schema.dealModels.dealId, dealId))
      .orderBy(desc(schema.dealModels.createdAt));
  }

  async getDealModel(id: string): Promise<DealModel | undefined> {
    const results = await db.select().from(schema.dealModels).where(eq(schema.dealModels.id, id));
    return results[0];
  }

  async createDealModel(model: InsertDealModel): Promise<DealModel> {
    // Cast to any to work around Drizzle type inference issues with jsonb fields
    const results = await db.insert(schema.dealModels).values(model as any).returning();
    return results[0];
  }

  async updateDealModel(id: string, model: Partial<InsertDealModel>): Promise<DealModel | undefined> {
    // Cast to any to work around Drizzle type inference issues with jsonb fields
    const results = await db
      .update(schema.dealModels)
      .set({ ...model, updatedAt: new Date() } as any)
      .where(eq(schema.dealModels.id, id))
      .returning();
    return results[0];
  }

  async publishDealModel(id: string, userId: string): Promise<DealModel | undefined> {
    const results = await db
      .update(schema.dealModels)
      .set({ isPublished: true, publishedAt: new Date(), publishedBy: userId, updatedAt: new Date() })
      .where(eq(schema.dealModels.id, id))
      .returning();
    return results[0];
  }

  // Closing Items
  async listClosingItemsByDeal(dealId: string): Promise<ClosingItem[]> {
    return db
      .select()
      .from(schema.closingItems)
      .where(eq(schema.closingItems.dealId, dealId))
      .orderBy(schema.closingItems.createdAt);
  }

  async getClosingItem(id: string): Promise<ClosingItem | undefined> {
    const results = await db.select().from(schema.closingItems).where(eq(schema.closingItems.id, id));
    return results[0];
  }

  async createClosingItem(item: InsertClosingItem): Promise<ClosingItem> {
    const results = await db.insert(schema.closingItems).values(item).returning();
    return results[0];
  }

  async updateClosingItem(id: string, item: Partial<InsertClosingItem>): Promise<ClosingItem | undefined> {
    const results = await db
      .update(schema.closingItems)
      .set({ ...item, updatedAt: new Date() })
      .where(eq(schema.closingItems.id, id))
      .returning();
    return results[0];
  }

  async deleteClosingItem(id: string): Promise<boolean> {
    const results = await db
      .delete(schema.closingItems)
      .where(eq(schema.closingItems.id, id))
      .returning();
    return results.length > 0;
  }

  // Syndicate Book
  async listSyndicateBookByDeal(dealId: string): Promise<SyndicateBookEntry[]> {
    return db
      .select()
      .from(schema.syndicateBook)
      .where(eq(schema.syndicateBook.dealId, dealId))
      .orderBy(desc(schema.syndicateBook.lastUpdatedAt));
  }

  async getSyndicateBookEntry(id: string): Promise<SyndicateBookEntry | undefined> {
    const results = await db.select().from(schema.syndicateBook).where(eq(schema.syndicateBook.id, id));
    return results[0];
  }

  async getSyndicateBookEntryByDealAndLender(dealId: string, lenderId: string): Promise<SyndicateBookEntry | undefined> {
    const results = await db
      .select()
      .from(schema.syndicateBook)
      .where(and(eq(schema.syndicateBook.dealId, dealId), eq(schema.syndicateBook.lenderId, lenderId)));
    return results[0];
  }

  async createSyndicateBookEntry(entry: InsertSyndicateBook): Promise<SyndicateBookEntry> {
    const results = await db.insert(schema.syndicateBook).values(entry).returning();
    return results[0];
  }

  async updateSyndicateBookEntry(id: string, entry: Partial<InsertSyndicateBook>): Promise<SyndicateBookEntry | undefined> {
    const results = await db
      .update(schema.syndicateBook)
      .set({ ...entry, lastUpdatedAt: new Date() })
      .where(eq(schema.syndicateBook.id, id))
      .returning();
    return results[0];
  }

  async upsertSyndicateBookEntry(dealId: string, lenderId: string, entry: Partial<InsertSyndicateBook>): Promise<SyndicateBookEntry> {
    const existing = await this.getSyndicateBookEntryByDealAndLender(dealId, lenderId);
    if (existing) {
      const updated = await this.updateSyndicateBookEntry(existing.id, entry);
      return updated!;
    } else {
      return this.createSyndicateBookEntry({
        dealId,
        lenderId,
        status: entry.status || "invited",
        ...entry,
      } as InsertSyndicateBook);
    }
  }

  // Indications (IOI)
  async getIndicationByDealAndLender(dealId: string, lenderId: string): Promise<Indication | undefined> {
    const results = await db
      .select()
      .from(schema.indications)
      .where(and(eq(schema.indications.dealId, dealId), eq(schema.indications.lenderId, lenderId)));
    return results[0];
  }

  async listIndicationsByDeal(dealId: string): Promise<Indication[]> {
    return db
      .select()
      .from(schema.indications)
      .where(eq(schema.indications.dealId, dealId))
      .orderBy(desc(schema.indications.submittedAt));
  }

  async upsertIndication(dealId: string, lenderId: string, indication: Partial<InsertIndication>): Promise<Indication> {
    const existing = await this.getIndicationByDealAndLender(dealId, lenderId);
    if (existing) {
      // Update existing indication - cast to any to handle jsonb field type inference issues
      const results = await db
        .update(schema.indications)
        .set({
          ioiAmount: indication.ioiAmount,
          currency: indication.currency,
          termsJson: indication.termsJson,
          submittedByUserId: indication.submittedByUserId,
          status: "updated",
          updatedAt: new Date(),
        } as any)
        .where(eq(schema.indications.id, existing.id))
        .returning();
      return results[0];
    } else {
      // Create new indication
      const results = await db
        .insert(schema.indications)
        .values({
          dealId,
          lenderId,
          status: "submitted",
          ...indication,
        } as any)
        .returning();
      return results[0];
    }
  }

  async withdrawIndication(dealId: string, lenderId: string): Promise<Indication | undefined> {
    const existing = await this.getIndicationByDealAndLender(dealId, lenderId);
    if (!existing) return undefined;

    const results = await db
      .update(schema.indications)
      .set({
        status: "withdrawn",
        updatedAt: new Date(),
      })
      .where(eq(schema.indications.id, existing.id))
      .returning();
    return results[0];
  }

  // Master Documents (Legal Negotiation)
  async listMasterDocsByDeal(dealId: string): Promise<MasterDocument[]> {
    return db
      .select()
      .from(schema.masterDocuments)
      .where(eq(schema.masterDocuments.dealId, dealId))
      .orderBy(schema.masterDocuments.docKey);
  }

  async getMasterDoc(id: string): Promise<MasterDocument | undefined> {
    const results = await db.select().from(schema.masterDocuments).where(eq(schema.masterDocuments.id, id));
    return results[0];
  }

  async getMasterDocByKey(dealId: string, docKey: string): Promise<MasterDocument | undefined> {
    const results = await db
      .select()
      .from(schema.masterDocuments)
      .where(and(eq(schema.masterDocuments.dealId, dealId), eq(schema.masterDocuments.docKey, docKey)));
    return results[0];
  }

  async createMasterDoc(doc: InsertMasterDocument): Promise<MasterDocument> {
    const results = await db.insert(schema.masterDocuments).values(doc).returning();
    return results[0];
  }

  async updateMasterDoc(id: string, doc: Partial<InsertMasterDocument>): Promise<MasterDocument | undefined> {
    const results = await db
      .update(schema.masterDocuments)
      .set({ ...doc, updatedAt: new Date() })
      .where(eq(schema.masterDocuments.id, id))
      .returning();
    return results[0];
  }

  async ensureMasterDocsForDeal(dealId: string, userId?: string): Promise<MasterDocument[]> {
    const existing = await this.listMasterDocsByDeal(dealId);

    const docKeys = [
      { key: "financing_grid", title: "Financing Grid" },
      { key: "term_sheet", title: "Term Sheet" },
      { key: "credit_agreement", title: "Credit Agreement" },
    ];

    const existingKeys = new Set(existing.map(d => d.docKey));
    const toCreate = docKeys.filter(d => !existingKeys.has(d.key));

    for (const doc of toCreate) {
      await this.createMasterDoc({
        dealId,
        docKey: doc.key,
        title: doc.title,
        createdBy: userId,
      });
    }

    return this.listMasterDocsByDeal(dealId);
  }

  // Document Versions
  async listVersionsByMasterDoc(masterDocId: string): Promise<DocumentVersion[]> {
    return db
      .select()
      .from(schema.documentVersions)
      .where(eq(schema.documentVersions.masterDocId, masterDocId))
      .orderBy(desc(schema.documentVersions.versionNumber));
  }

  async getDocumentVersion(id: string): Promise<DocumentVersion | undefined> {
    const results = await db.select().from(schema.documentVersions).where(eq(schema.documentVersions.id, id));
    return results[0];
  }

  async createDocumentVersion(version: InsertDocumentVersion): Promise<DocumentVersion> {
    // Auto-increment version number
    const existing = await this.listVersionsByMasterDoc(version.masterDocId);
    const nextVersion = existing.length > 0 ? Math.max(...existing.map(v => v.versionNumber)) + 1 : 1;

    const results = await db
      .insert(schema.documentVersions)
      .values({ ...version, versionNumber: nextVersion })
      .returning();

    // Update master doc's currentVersionId
    await this.updateMasterDoc(version.masterDocId, { currentVersionId: results[0].id });

    return results[0];
  }

  // Lender Markups
  async listMarkupsByMasterDoc(masterDocId: string): Promise<LenderMarkup[]> {
    return db
      .select()
      .from(schema.lenderMarkups)
      .where(eq(schema.lenderMarkups.masterDocId, masterDocId))
      .orderBy(desc(schema.lenderMarkups.createdAt));
  }

  async listMarkupsByLender(masterDocId: string, lenderId: string): Promise<LenderMarkup[]> {
    return db
      .select()
      .from(schema.lenderMarkups)
      .where(and(eq(schema.lenderMarkups.masterDocId, masterDocId), eq(schema.lenderMarkups.lenderId, lenderId)))
      .orderBy(desc(schema.lenderMarkups.createdAt));
  }

  async getLenderMarkup(id: string): Promise<LenderMarkup | undefined> {
    const results = await db.select().from(schema.lenderMarkups).where(eq(schema.lenderMarkups.id, id));
    return results[0];
  }

  async createLenderMarkup(markup: InsertLenderMarkup): Promise<LenderMarkup> {
    const results = await db.insert(schema.lenderMarkups).values(markup).returning();
    return results[0];
  }

  async updateLenderMarkup(id: string, markup: Partial<InsertLenderMarkup>): Promise<LenderMarkup | undefined> {
    const results = await db
      .update(schema.lenderMarkups)
      .set({ ...markup, updatedAt: new Date() })
      .where(eq(schema.lenderMarkups.id, id))
      .returning();
    return results[0];
  }

  // Organizations
  async listOrganizations(): Promise<Organization[]> {
    return db.select().from(schema.organizations).orderBy(schema.organizations.name);
  }

  async listOrganizationsByType(orgType: string): Promise<Organization[]> {
    return db
      .select()
      .from(schema.organizations)
      .where(eq(schema.organizations.orgType, orgType))
      .orderBy(schema.organizations.name);
  }

  async getOrganization(id: string): Promise<Organization | undefined> {
    const results = await db.select().from(schema.organizations).where(eq(schema.organizations.id, id));
    return results[0];
  }

  async getOrganizationByName(name: string): Promise<Organization | undefined> {
    const results = await db.select().from(schema.organizations).where(eq(schema.organizations.name, name));
    return results[0];
  }

  async createOrganization(org: InsertOrganization): Promise<Organization> {
    const results = await db.insert(schema.organizations).values(org).returning();
    return results[0];
  }

  async updateOrganization(id: string, org: Partial<InsertOrganization>): Promise<Organization | undefined> {
    const results = await db
      .update(schema.organizations)
      .set({ ...org, updatedAt: new Date() })
      .where(eq(schema.organizations.id, id))
      .returning();
    return results[0];
  }

  // Bookrunner Candidates (RFP invitations)
  async listCandidatesByDeal(dealId: string): Promise<BookrunnerCandidate[]> {
    return db
      .select()
      .from(schema.bookrunnerCandidates)
      .where(eq(schema.bookrunnerCandidates.dealId, dealId))
      .orderBy(desc(schema.bookrunnerCandidates.createdAt));
  }

  async getCandidateByDealAndBank(dealId: string, bankOrgId: string): Promise<BookrunnerCandidate | undefined> {
    const results = await db
      .select()
      .from(schema.bookrunnerCandidates)
      .where(and(
        eq(schema.bookrunnerCandidates.dealId, dealId),
        eq(schema.bookrunnerCandidates.bankOrgId, bankOrgId)
      ));
    return results[0];
  }

  async createCandidate(candidate: InsertBookrunnerCandidate): Promise<BookrunnerCandidate> {
    const results = await db.insert(schema.bookrunnerCandidates).values(candidate).returning();
    return results[0];
  }

  async updateCandidate(id: string, candidate: Partial<InsertBookrunnerCandidate>): Promise<BookrunnerCandidate | undefined> {
    const results = await db
      .update(schema.bookrunnerCandidates)
      .set({ ...candidate, updatedAt: new Date() })
      .where(eq(schema.bookrunnerCandidates.id, id))
      .returning();
    return results[0];
  }

  async setCandidateStatus(dealId: string, bankOrgId: string, status: string): Promise<BookrunnerCandidate | undefined> {
    const results = await db
      .update(schema.bookrunnerCandidates)
      .set({ status, updatedAt: new Date() })
      .where(and(
        eq(schema.bookrunnerCandidates.dealId, dealId),
        eq(schema.bookrunnerCandidates.bankOrgId, bankOrgId)
      ))
      .returning();
    return results[0];
  }

  // Financing Proposals (RFP)
  async listProposalsByDeal(dealId: string): Promise<FinancingProposal[]> {
    return db
      .select()
      .from(schema.financingProposals)
      .where(eq(schema.financingProposals.dealId, dealId))
      .orderBy(desc(schema.financingProposals.submittedAt));
  }

  async getProposal(id: string): Promise<FinancingProposal | undefined> {
    const results = await db.select().from(schema.financingProposals).where(eq(schema.financingProposals.id, id));
    return results[0];
  }

  async getProposalByDealAndBank(dealId: string, bankOrgId: string): Promise<FinancingProposal | undefined> {
    const results = await db
      .select()
      .from(schema.financingProposals)
      .where(and(eq(schema.financingProposals.dealId, dealId), eq(schema.financingProposals.bankOrgId, bankOrgId)));
    return results[0];
  }

  async createProposal(proposal: InsertFinancingProposal): Promise<FinancingProposal> {
    const results = await db.insert(schema.financingProposals).values(proposal).returning();
    return results[0];
  }

  async updateProposal(id: string, proposal: Partial<InsertFinancingProposal>): Promise<FinancingProposal | undefined> {
    const results = await db
      .update(schema.financingProposals)
      .set({ ...proposal, updatedAt: new Date() })
      .where(eq(schema.financingProposals.id, id))
      .returning();
    return results[0];
  }

  async submitProposal(id: string): Promise<FinancingProposal | undefined> {
    const results = await db
      .update(schema.financingProposals)
      .set({ status: 'submitted', submittedAt: new Date(), updatedAt: new Date() })
      .where(eq(schema.financingProposals.id, id))
      .returning();
    return results[0];
  }

  async selectProposal(id: string): Promise<FinancingProposal | undefined> {
    const results = await db
      .update(schema.financingProposals)
      .set({ status: 'selected', updatedAt: new Date() })
      .where(eq(schema.financingProposals.id, id))
      .returning();
    return results[0];
  }

  async withdrawProposal(id: string): Promise<FinancingProposal | undefined> {
    const results = await db
      .update(schema.financingProposals)
      .set({ status: 'withdrawn', updatedAt: new Date() })
      .where(eq(schema.financingProposals.id, id))
      .returning();
    return results[0];
  }

  // Award mandate - sets winner and transitions deal to live_syndication
  async awardMandate(dealId: string, winnerBankOrgId: string): Promise<Deal | undefined> {
    // Get the winning proposal
    const winningProposal = await this.getProposalByDealAndBank(dealId, winnerBankOrgId);
    if (winningProposal) {
      await this.selectProposal(winningProposal.id);
    }

    // Set winning candidate to mandated, others to declined
    const candidates = await this.listCandidatesByDeal(dealId);
    for (const candidate of candidates) {
      if (candidate.bankOrgId === winnerBankOrgId) {
        await this.setCandidateStatus(dealId, candidate.bankOrgId, 'mandated');
      } else {
        await this.setCandidateStatus(dealId, candidate.bankOrgId, 'declined');
      }
    }

    // Update deal
    const results = await db
      .update(schema.deals)
      .set({
        mandatedBankOrgId: winnerBankOrgId,
        status: 'live_syndication',
        stage: 'Structuring',
        updatedAt: new Date(),
      })
      .where(eq(schema.deals.id, dealId))
      .returning();

    return results[0];
  }

  // Prior Q&A Items
  async listPriorQaByDeal(dealId: string, shareableOnly: boolean = false): Promise<PriorQaItem[]> {
    if (shareableOnly) {
      return db
        .select()
        .from(schema.priorQaItems)
        .where(and(
          eq(schema.priorQaItems.dealId, dealId),
          eq(schema.priorQaItems.shareable, true)
        ))
        .orderBy(desc(schema.priorQaItems.createdAt));
    }
    return db
      .select()
      .from(schema.priorQaItems)
      .where(eq(schema.priorQaItems.dealId, dealId))
      .orderBy(desc(schema.priorQaItems.createdAt));
  }

  async getPriorQaItem(id: string): Promise<PriorQaItem | undefined> {
    const results = await db
      .select()
      .from(schema.priorQaItems)
      .where(eq(schema.priorQaItems.id, id));
    return results[0];
  }

  async createPriorQaItem(item: InsertPriorQaItem): Promise<PriorQaItem> {
    const results = await db
      .insert(schema.priorQaItems)
      .values(item)
      .returning();
    return results[0];
  }

  async createPriorQaItems(items: InsertPriorQaItem[]): Promise<PriorQaItem[]> {
    if (items.length === 0) return [];
    const results = await db
      .insert(schema.priorQaItems)
      .values(items)
      .returning();
    return results;
  }

  async updatePriorQaItem(id: string, item: Partial<InsertPriorQaItem>): Promise<PriorQaItem | undefined> {
    const results = await db
      .update(schema.priorQaItems)
      .set({ ...item, updatedAt: new Date() })
      .where(eq(schema.priorQaItems.id, id))
      .returning();
    return results[0];
  }

  async deletePriorQaItem(id: string): Promise<boolean> {
    const results = await db
      .delete(schema.priorQaItems)
      .where(eq(schema.priorQaItems.id, id))
      .returning();
    return results.length > 0;
  }
}

export const storage = new DrizzleStorage();
