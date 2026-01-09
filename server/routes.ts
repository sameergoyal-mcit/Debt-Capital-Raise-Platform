import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertDealSchema, insertLenderSchema, insertInvitationSchema, insertDocumentSchema, insertCommitmentSchema, insertQAItemSchema, insertLogSchema } from "@shared/schema";
import { runCreditAnalysis } from "./lib/credit-engine";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // ========== DEALS ==========
  app.get("/api/deals", async (req, res) => {
    try {
      const deals = await storage.listDeals();
      res.json(deals);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/deals/:id", async (req, res) => {
    try {
      const deal = await storage.getDeal(req.params.id);
      if (!deal) {
        return res.status(404).json({ error: "Deal not found" });
      }
      res.json(deal);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/deals", async (req, res) => {
    try {
      const validated = insertDealSchema.parse(req.body);
      const deal = await storage.createDeal(validated);
      res.status(201).json(deal);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.patch("/api/deals/:id", async (req, res) => {
    try {
      const deal = await storage.updateDeal(req.params.id, req.body);
      if (!deal) {
        return res.status(404).json({ error: "Deal not found" });
      }
      res.json(deal);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ========== LENDERS ==========
  app.get("/api/lenders", async (req, res) => {
    try {
      const lenders = await storage.listLenders();
      res.json(lenders);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/lenders/:id", async (req, res) => {
    try {
      const lender = await storage.getLender(req.params.id);
      if (!lender) {
        return res.status(404).json({ error: "Lender not found" });
      }
      res.json(lender);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/lenders/email/:email", async (req, res) => {
    try {
      const lender = await storage.getLenderByEmail(req.params.email);
      if (!lender) {
        return res.status(404).json({ error: "Lender not found" });
      }
      res.json(lender);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/lenders", async (req, res) => {
    try {
      const validated = insertLenderSchema.parse(req.body);
      // Check if lender exists by email
      const existing = await storage.getLenderByEmail(validated.email);
      if (existing) {
        return res.json(existing);
      }
      const lender = await storage.createLender(validated);
      res.status(201).json(lender);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // ========== INVITATIONS ==========
  app.get("/api/deals/:dealId/invitations", async (req, res) => {
    try {
      const invitations = await storage.listInvitationsByDeal(req.params.dealId);
      res.json(invitations);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/lenders/:lenderId/invitations", async (req, res) => {
    try {
      const invitations = await storage.listInvitationsByLender(req.params.lenderId);
      res.json(invitations);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/invitations", async (req, res) => {
    try {
      const validated = insertInvitationSchema.parse(req.body);
      const invitation = await storage.createInvitation(validated);
      res.status(201).json(invitation);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post("/api/invitations/:dealId/:lenderId/sign-nda", async (req, res) => {
    try {
      const { dealId, lenderId } = req.params;
      const { signerEmail, ndaVersion } = req.body;
      const signerIp = req.ip || "unknown";
      
      const invitation = await storage.updateInvitationNdaSigned(dealId, lenderId, signerEmail, signerIp, ndaVersion);
      if (!invitation) {
        return res.status(404).json({ error: "Invitation not found" });
      }

      // Log the NDA signing
      await storage.createLog({
        dealId,
        lenderId,
        actorRole: "investor",
        actorEmail: signerEmail,
        action: "SIGN_NDA",
        metadata: { ndaVersion, ip: signerIp },
      });

      res.json(invitation);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/invitations/:dealId/:lenderId/tier", async (req, res) => {
    try {
      const { dealId, lenderId } = req.params;
      const { tier, changedBy } = req.body;
      
      const invitation = await storage.updateInvitationTier(dealId, lenderId, tier, changedBy);
      if (!invitation) {
        return res.status(404).json({ error: "Invitation not found" });
      }

      res.json(invitation);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ========== DOCUMENTS ==========
  app.get("/api/deals/:dealId/documents", async (req, res) => {
    try {
      const documents = await storage.listDocumentsByDeal(req.params.dealId);
      res.json(documents);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/documents", async (req, res) => {
    try {
      const validated = insertDocumentSchema.parse(req.body);
      const document = await storage.createDocument(validated);
      res.status(201).json(document);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // ========== COMMITMENTS ==========
  app.get("/api/deals/:dealId/commitments", async (req, res) => {
    try {
      const commitments = await storage.listCommitmentsByDeal(req.params.dealId);
      res.json(commitments);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/commitments", async (req, res) => {
    try {
      const validated = insertCommitmentSchema.parse(req.body);
      const commitment = await storage.createCommitment(validated);

      // Update deal committed amount
      const commitments = await storage.listCommitmentsByDeal(validated.dealId);
      const totalCommitted = commitments.reduce((sum, c) => sum + Number(c.amount), 0);
      await storage.updateDeal(validated.dealId, { committed: String(totalCommitted) });

      // Log the commitment submission
      await storage.createLog({
        dealId: validated.dealId,
        lenderId: validated.lenderId,
        actorRole: "investor",
        action: "SUBMIT_COMMITMENT",
        metadata: { amount: validated.amount, status: validated.status },
      });

      res.status(201).json(commitment);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // ========== Q&A ==========
  app.get("/api/deals/:dealId/qa", async (req, res) => {
    try {
      const qaItems = await storage.listQAByDeal(req.params.dealId);
      res.json(qaItems);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/qa", async (req, res) => {
    try {
      const validated = insertQAItemSchema.parse(req.body);
      const qaItem = await storage.createQA(validated);
      res.status(201).json(qaItem);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.patch("/api/qa/:id/answer", async (req, res) => {
    try {
      const { answer } = req.body;
      const qaItem = await storage.answerQA(req.params.id, answer);
      if (!qaItem) {
        return res.status(404).json({ error: "Q&A item not found" });
      }
      res.json(qaItem);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ========== AUDIT LOGS ==========
  app.get("/api/deals/:dealId/logs", async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      const logs = await storage.listLogsByDeal(req.params.dealId, limit);
      res.json(logs);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/logs", async (req, res) => {
    try {
      const validated = insertLogSchema.parse(req.body);
      const log = await storage.createLog(validated);
      res.status(201).json(log);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // ========== AUDIT LOG - Deal View ==========
  app.post("/api/deals/:dealId/view", async (req, res) => {
    try {
      const { lenderId, actorEmail } = req.body;
      await storage.createLog({
        dealId: req.params.dealId,
        lenderId,
        actorRole: "investor",
        actorEmail,
        action: "VIEW_DEAL",
        metadata: { timestamp: new Date().toISOString() },
      });
      res.status(201).json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ========== AUDIT LOG - Document Download ==========
  app.post("/api/documents/:documentId/download", async (req, res) => {
    try {
      const { dealId, lenderId, actorEmail, documentName } = req.body;
      await storage.createLog({
        dealId,
        lenderId,
        actorRole: "investor",
        actorEmail,
        action: "DOWNLOAD_DOC",
        metadata: { documentId: req.params.documentId, documentName },
      });
      res.status(201).json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ========== CREDIT ENGINE ==========
  app.get("/api/deals/:dealId/credit-summary", async (req, res) => {
    try {
      const deal = await storage.getDeal(req.params.dealId);
      if (!deal) {
        return res.status(404).json({ error: "Deal not found" });
      }

      // Calculate EBITDA estimate from facility size (assume 2.5x leverage at close)
      const estimatedEbitda = Number(deal.facilitySize) / 2.5;
      
      const assumptions = {
        initialDebt: Number(deal.facilitySize),
        ebitda: estimatedEbitda,
        interestRate: (deal.spreadLowBps + deal.spreadHighBps) / 2 / 100 + 5.5, // Assume SOFR ~5.5%
        mandatoryAmort: Number(deal.facilitySize) * 0.05, // 5% annual
        cashSweepPercent: 50,
      };

      const summary = runCreditAnalysis(assumptions, {
        committed: Number(deal.committed),
        targetSize: Number(deal.targetSize),
      });

      res.json(summary);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  return httpServer;
}
