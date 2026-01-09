import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import bcrypt from "bcryptjs";
import { storage } from "./storage";
import { insertDealSchema, insertLenderSchema, insertInvitationSchema, insertDocumentSchema, insertCommitmentSchema, insertQAItemSchema, insertLogSchema } from "@shared/schema";
import { runCreditModel, calculateQuickSummary, type CreditModelAssumptions } from "./lib/credit-engine";
import { z } from "zod";

// Authentication middleware (simplified for prototype - checks session/header)
function ensureAuthenticated(req: Request, res: Response, next: NextFunction) {
  // For prototype: check for user header or session
  const userId = req.headers["x-user-id"] as string;
  const userRole = req.headers["x-user-role"] as string;
  
  if (userId && userRole) {
    (req as any).user = { id: userId, role: userRole };
    return next();
  }
  
  // Allow unauthenticated access in development for demo purposes
  if (process.env.NODE_ENV !== "production") {
    (req as any).user = { id: "demo", role: "bookrunner" };
    return next();
  }
  
  return res.status(401).json({ error: "Authentication required" });
}

function ensureRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({ error: "Authentication required" });
    }
    if (!roles.includes(user.role)) {
      return res.status(403).json({ error: "Insufficient permissions" });
    }
    return next();
  };
}

// Middleware to check lender has invitation to deal
async function ensureLenderHasAccess(req: Request, res: Response, next: NextFunction) {
  const user = (req as any).user;
  const dealId = req.params.dealId || req.params.id;
  
  if (!user || !dealId) {
    return res.status(400).json({ error: "Missing user or deal ID" });
  }
  
  // Sponsors and bookrunners have full access
  if (["sponsor", "bookrunner", "issuer"].includes(user.role)) {
    return next();
  }
  
  // For lenders, check invitation exists
  if (user.role === "lender" && user.lenderId) {
    const invitation = await storage.getInvitation(dealId, user.lenderId);
    if (!invitation) {
      return res.status(403).json({ error: "No invitation to this deal" });
    }
    (req as any).invitation = invitation;
    return next();
  }
  
  // Allow in development mode
  if (process.env.NODE_ENV !== "production") {
    return next();
  }
  
  return res.status(403).json({ error: "Access denied" });
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // ========== AUTH ==========
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password, role } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ error: "Username and password required" });
      }
      
      let user = await storage.getUserByUsername(username);
      
      if (user) {
        // Verify password
        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) {
          return res.status(401).json({ error: "Invalid credentials" });
        }
      } else {
        // Create new user with hashed password
        const hashedPassword = await bcrypt.hash(password, 10);
        user = await storage.createUser({
          username,
          password: hashedPassword,
          email: `${username}@demo.com`,
          role: role || "lender",
        });
      }
      
      res.json({ 
        user: { id: user.id, username: user.username, role: user.role, email: user.email },
        message: "Login successful" 
      });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post("/api/auth/register", async (req, res) => {
    try {
      const { username, password, email, role } = req.body;
      
      if (!username || !password || !email) {
        return res.status(400).json({ error: "Username, password, and email required" });
      }
      
      const existing = await storage.getUserByUsername(username);
      if (existing) {
        return res.status(400).json({ error: "Username already exists" });
      }
      
      const hashedPassword = await bcrypt.hash(password, 10);
      const user = await storage.createUser({
        username,
        password: hashedPassword,
        email,
        role: role || "lender",
      });
      
      res.status(201).json({ 
        user: { id: user.id, username: user.username, role: user.role, email: user.email },
        message: "Registration successful" 
      });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get("/api/auth/me", ensureAuthenticated, async (req, res) => {
    const user = (req as any).user;
    res.json(user);
  });
  
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
        resourceId: invitation.id,
        resourceType: "invitation",
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
        resourceId: commitment.id,
        resourceType: "commitment",
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
        resourceId: req.params.dealId,
        resourceType: "deal",
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
        resourceId: req.params.documentId,
        resourceType: "document",
        metadata: { documentName },
      });
      res.status(201).json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ========== CREDIT ENGINE - Quick Summary ==========
  app.get("/api/deals/:dealId/credit-summary", async (req, res) => {
    try {
      const deal = await storage.getDeal(req.params.dealId);
      if (!deal) {
        return res.status(404).json({ error: "Deal not found" });
      }

      const summary = calculateQuickSummary({
        facilitySize: Number(deal.facilitySize),
        committed: Number(deal.committed),
        targetSize: Number(deal.targetSize),
        entryEbitda: deal.entryEbitda ? Number(deal.entryEbitda) : undefined,
        leverageMultiple: deal.leverageMultiple || undefined,
        interestRate: deal.interestRate || undefined,
      });

      res.json(summary);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ========== SEND REMINDERS ==========
  app.post("/api/deals/:dealId/reminders", async (req, res) => {
    try {
      const { dealId } = req.params;
      const { audience, subject, bodyText, recipientLenderIds } = req.body;

      const deal = await storage.getDeal(dealId);
      if (!deal) {
        return res.status(404).json({ error: "Deal not found" });
      }

      // Get invitations for this deal
      const invitations = await storage.listInvitationsByDeal(dealId);
      
      // Filter based on audience
      let recipients = invitations;
      switch (audience) {
        case "missing_nda":
          recipients = invitations.filter(inv => !inv.ndaSignedAt);
          break;
        case "no_commitment":
          const commitments = await storage.listCommitmentsByDeal(dealId);
          const committedLenderIds = new Set(commitments.map(c => c.lenderId));
          recipients = invitations.filter(inv => !committedLenderIds.has(inv.lenderId));
          break;
        case "unviewed_docs":
          recipients = invitations.filter(inv => inv.accessTier === "early");
          break;
        default:
          // all - keep all invitations
          break;
      }

      // If specific lender IDs provided, filter to those
      if (recipientLenderIds && recipientLenderIds.length > 0) {
        recipients = recipients.filter(inv => recipientLenderIds.includes(inv.lenderId));
      }

      // Log the reminder action
      await storage.createLog({
        dealId,
        actorRole: "bookrunner",
        action: "SEND_REMINDER",
        resourceType: "deal",
        resourceId: dealId,
        metadata: {
          audience,
          subject,
          recipientCount: recipients.length,
          sentAt: new Date().toISOString(),
        },
      });

      // In production, this would send actual emails
      // For now, we just return success with count
      res.json({
        success: true,
        sentCount: recipients.length,
        message: `Reminders sent to ${recipients.length} recipients`,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ========== CREDIT ENGINE - Full 5-Year Model ==========
  const creditModelSchema = z.object({
    revenue: z.number().positive(),
    ebitdaMargin: z.number().min(0).max(100),
    growthPercent: z.number().min(-50).max(100),
    taxRate: z.number().min(0).max(100),
    capexPercent: z.number().min(0).max(50),
    interestRate: z.number().min(0).max(30),
    amortizationPercent: z.number().min(0).max(20),
    initialDebt: z.number().positive(),
    cashSweepPercent: z.number().min(0).max(100).optional(),
  });

  app.post("/api/deals/:dealId/calculate", async (req, res) => {
    try {
      const deal = await storage.getDeal(req.params.dealId);
      if (!deal) {
        return res.status(404).json({ error: "Deal not found" });
      }

      // Validate and parse assumptions
      const assumptions = creditModelSchema.parse(req.body);

      // Run the 5-year credit model
      const result = runCreditModel(assumptions);

      res.json(result);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid assumptions", details: error.errors });
      }
      res.status(500).json({ error: error.message });
    }
  });

  return httpServer;
}
