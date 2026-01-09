import { drizzle } from "drizzle-orm/node-postgres";
import { eq, and, desc } from "drizzle-orm";
import pg from "pg";
import * as schema from "@shared/schema";
import type {
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
} from "@shared/schema";

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL!,
});

const db = drizzle(pool, { schema });

export interface IStorage {
  // Deals
  listDeals(): Promise<Deal[]>;
  getDeal(id: string): Promise<Deal | undefined>;
  createDeal(deal: InsertDeal): Promise<Deal>;
  updateDeal(id: string, deal: Partial<InsertDeal>): Promise<Deal | undefined>;

  // Lenders
  listLenders(): Promise<Lender[]>;
  getLender(id: string): Promise<Lender | undefined>;
  getLenderByEmail(email: string): Promise<Lender | undefined>;
  createLender(lender: InsertLender): Promise<Lender>;
  updateLender(id: string, lender: Partial<InsertLender>): Promise<Lender | undefined>;

  // Invitations
  listInvitationsByDeal(dealId: string): Promise<Invitation[]>;
  listInvitationsByLender(lenderId: string): Promise<Invitation[]>;
  getInvitation(dealId: string, lenderId: string): Promise<Invitation | undefined>;
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
}

export class DrizzleStorage implements IStorage {
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

  async createInvitation(invitation: InsertInvitation): Promise<Invitation> {
    const results = await db.insert(schema.invitations).values(invitation).returning();
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
}

export const storage = new DrizzleStorage();
