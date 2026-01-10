import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import bcrypt from "bcryptjs";
import { PDFDocument, rgb, degrees } from "pdf-lib";
import { storage } from "./storage";
import { insertDealSchema, insertLenderSchema, insertInvitationSchema, insertDocumentSchema, insertCommitmentSchema, insertQAItemSchema, insertLogSchema, insertDealModelSchema, insertClosingItemSchema, insertSyndicateBookSchema } from "@shared/schema";
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
        metadata: { ndaVersion, ip: signerIp } as Record<string, any>,
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

  // ========== DOCUMENT DOWNLOAD WITH WATERMARKING ==========
  app.get("/api/documents/:id/download", async (req, res) => {
    try {
      const document = await storage.getDocument(req.params.id);
      if (!document) {
        return res.status(404).json({ error: "Document not found" });
      }

      // Get user info from headers for watermarking
      const userEmail = req.headers["x-user-email"] as string || "unknown@user.com";
      const currentDate = new Date().toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });

      // For demo purposes, we'll create a simple watermarked PDF
      // In production, you would fetch the actual file and watermark it
      const isPdf = document.name.toLowerCase().endsWith(".pdf");

      if (isPdf) {
        // Create a sample PDF with watermark for demonstration
        // In production, you would load the actual PDF file
        const pdfDoc = await PDFDocument.create();
        const page = pdfDoc.addPage([612, 792]); // Letter size

        // Add watermark text diagonally across every page
        const watermarkText = `CONFIDENTIAL - ${userEmail} - ${currentDate}`;

        // Draw the watermark diagonally
        page.drawText(watermarkText, {
          x: 50,
          y: 400,
          size: 24,
          color: rgb(1, 0, 0), // Red color
          opacity: 0.3,
          rotate: degrees(45),
        });

        // Add a second watermark for more coverage
        page.drawText(watermarkText, {
          x: 150,
          y: 200,
          size: 24,
          color: rgb(1, 0, 0),
          opacity: 0.3,
          rotate: degrees(45),
        });

        // Add sample content
        page.drawText(`Document: ${document.name}`, {
          x: 50,
          y: 700,
          size: 16,
          color: rgb(0, 0, 0),
        });

        page.drawText(`Category: ${document.category}`, {
          x: 50,
          y: 670,
          size: 12,
          color: rgb(0.3, 0.3, 0.3),
        });

        page.drawText("This is a watermarked document preview.", {
          x: 50,
          y: 620,
          size: 12,
          color: rgb(0, 0, 0),
        });

        const pdfBytes = await pdfDoc.save();

        // Log the download
        const lenderId = req.headers["x-lender-id"] as string;
        const dealId = document.dealId;
        await storage.createLog({
          dealId,
          lenderId,
          actorRole: "investor",
          actorEmail: userEmail,
          action: "DOWNLOAD_WATERMARKED_DOC",
          resourceId: document.id,
          resourceType: "document",
          metadata: { documentName: document.name, watermarked: true } as Record<string, any>,
        });

        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", `attachment; filename="${document.name}"`);
        res.send(Buffer.from(pdfBytes));
      } else {
        // For non-PDF files, return a simple response
        res.json({
          message: "Download initiated",
          document: document.name,
          watermarkApplied: false
        });
      }
    } catch (error: any) {
      res.status(500).json({ error: error.message });
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
        metadata: { amount: validated.amount, status: validated.status } as Record<string, any>,
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
        metadata: { timestamp: new Date().toISOString() } as Record<string, any>,
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
        } as Record<string, any>,
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

  // ========== DEAL MODELS (Sandbox) ==========
  app.get("/api/deals/:dealId/models", async (req, res) => {
    try {
      const models = await storage.listDealModelsByDeal(req.params.dealId);
      res.json(models);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/deal-models/:id", async (req, res) => {
    try {
      const model = await storage.getDealModel(req.params.id);
      if (!model) {
        return res.status(404).json({ error: "Model not found" });
      }
      res.json(model);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/deal-models", async (req, res) => {
    try {
      const validated = insertDealModelSchema.parse(req.body);
      const model = await storage.createDealModel(validated);
      
      if (validated.isPublished) {
        await storage.createDocument({
          dealId: validated.dealId,
          category: "Lender Paydown Model",
          type: "interactive_model",
          name: validated.name || "Financial Model",
          visibilityTier: "full",
          fileKey: `model:${model.id}`,
          isAutomated: true,
        });
      }
      
      res.status(201).json(model);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post("/api/deal-models/:id/publish", async (req, res) => {
    try {
      const model = await storage.getDealModel(req.params.id);
      if (!model) {
        return res.status(404).json({ error: "Model not found" });
      }
      
      const user = (req as any).user;
      const publishedModel = await storage.publishDealModel(req.params.id, user?.id || "system");
      
      await storage.createDocument({
        dealId: model.dealId,
        category: "Lender Paydown Model",
        type: "interactive_model",
        name: model.name || "Financial Model",
        visibilityTier: "full",
        fileKey: `model:${req.params.id}`,
        isAutomated: true,
      });
      
      res.json(publishedModel);
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

  // ========== CLOSING ITEMS (Conditions Precedent) ==========
  app.get("/api/deals/:dealId/closing-items", async (req, res) => {
    try {
      const items = await storage.listClosingItemsByDeal(req.params.dealId);
      res.json(items);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/closing-items/:id", async (req, res) => {
    try {
      const item = await storage.getClosingItem(req.params.id);
      if (!item) {
        return res.status(404).json({ error: "Closing item not found" });
      }
      res.json(item);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/closing-items", async (req, res) => {
    try {
      const validated = insertClosingItemSchema.parse(req.body);
      const item = await storage.createClosingItem(validated);

      // Log the creation
      await storage.createLog({
        dealId: validated.dealId,
        actorRole: req.headers["x-user-role"] as string || "bookrunner",
        actorEmail: req.headers["x-user-email"] as string,
        action: "CREATE_CLOSING_ITEM",
        resourceId: item.id,
        resourceType: "closing_item",
        metadata: { description: validated.description, category: validated.category } as Record<string, any>,
      });

      res.status(201).json(item);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.patch("/api/closing-items/:id", async (req, res) => {
    try {
      const item = await storage.updateClosingItem(req.params.id, req.body);
      if (!item) {
        return res.status(404).json({ error: "Closing item not found" });
      }

      // Log status changes
      if (req.body.status) {
        await storage.createLog({
          dealId: item.dealId,
          actorRole: req.headers["x-user-role"] as string || "bookrunner",
          actorEmail: req.headers["x-user-email"] as string,
          action: req.body.status === "approved" ? "APPROVE_CLOSING_ITEM" : "UPDATE_CLOSING_ITEM",
          resourceId: item.id,
          resourceType: "closing_item",
          metadata: { description: item.description, newStatus: req.body.status } as Record<string, any>,
        });
      }

      res.json(item);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/closing-items/:id", async (req, res) => {
    try {
      const item = await storage.getClosingItem(req.params.id);
      if (!item) {
        return res.status(404).json({ error: "Closing item not found" });
      }

      const deleted = await storage.deleteClosingItem(req.params.id);
      if (!deleted) {
        return res.status(500).json({ error: "Failed to delete closing item" });
      }

      // Log the deletion
      await storage.createLog({
        dealId: item.dealId,
        actorRole: req.headers["x-user-role"] as string || "bookrunner",
        actorEmail: req.headers["x-user-email"] as string,
        action: "DELETE_CLOSING_ITEM",
        resourceId: req.params.id,
        resourceType: "closing_item",
        metadata: { description: item.description } as Record<string, any>,
      });

      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Upload document to fulfill a closing item
  app.post("/api/closing-items/:id/upload", async (req, res) => {
    try {
      const item = await storage.getClosingItem(req.params.id);
      if (!item) {
        return res.status(404).json({ error: "Closing item not found" });
      }

      const { fileId } = req.body;
      const userId = req.headers["x-user-id"] as string;

      const updatedItem = await storage.updateClosingItem(req.params.id, {
        status: "uploaded",
        fileId,
        uploadedBy: userId,
        uploadedAt: new Date(),
      });

      // Log the upload
      await storage.createLog({
        dealId: item.dealId,
        actorRole: req.headers["x-user-role"] as string || "lender",
        actorEmail: req.headers["x-user-email"] as string,
        action: "UPLOAD_CLOSING_ITEM",
        resourceId: req.params.id,
        resourceType: "closing_item",
        metadata: { description: item.description, fileId } as Record<string, any>,
      });

      res.json(updatedItem);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Approve a closing item
  app.post("/api/closing-items/:id/approve", async (req, res) => {
    try {
      const item = await storage.getClosingItem(req.params.id);
      if (!item) {
        return res.status(404).json({ error: "Closing item not found" });
      }

      const userId = req.headers["x-user-id"] as string;

      const updatedItem = await storage.updateClosingItem(req.params.id, {
        status: "approved",
        approvedBy: userId,
        approvedAt: new Date(),
      });

      // Log the approval
      await storage.createLog({
        dealId: item.dealId,
        actorRole: req.headers["x-user-role"] as string || "bookrunner",
        actorEmail: req.headers["x-user-email"] as string,
        action: "APPROVE_CLOSING_ITEM",
        resourceId: req.params.id,
        resourceType: "closing_item",
        metadata: { description: item.description } as Record<string, any>,
      });

      res.json(updatedItem);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ========== SYNDICATE BOOK (Internal Only - Bookrunner/Issuer) ==========

  // Middleware to ensure only internal users can access syndicate book
  const ensureInternalOnly = (req: Request, res: Response, next: NextFunction) => {
    const userRole = req.headers["x-user-role"] as string;
    if (!userRole || userRole.toLowerCase() === "investor" || userRole.toLowerCase() === "lender") {
      return res.status(403).json({ error: "Access denied. Internal users only." });
    }
    return next();
  };

  // Get syndicate book for a deal
  app.get("/api/deals/:dealId/syndicate-book", ensureInternalOnly, async (req, res) => {
    try {
      const entries = await storage.listSyndicateBookByDeal(req.params.dealId);
      res.json(entries);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get single syndicate book entry
  app.get("/api/syndicate-book/:id", ensureInternalOnly, async (req, res) => {
    try {
      const entry = await storage.getSyndicateBookEntry(req.params.id);
      if (!entry) {
        return res.status(404).json({ error: "Entry not found" });
      }
      res.json(entry);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Create syndicate book entry
  app.post("/api/syndicate-book", ensureInternalOnly, async (req, res) => {
    try {
      const validated = insertSyndicateBookSchema.parse(req.body);
      const entry = await storage.createSyndicateBookEntry(validated);

      // Log the action
      await storage.createLog({
        dealId: validated.dealId,
        actorRole: req.headers["x-user-role"] as string || "bookrunner",
        actorEmail: req.headers["x-user-email"] as string,
        action: "CREATE_SYNDICATE_ENTRY",
        resourceId: entry.id,
        resourceType: "syndicate_book",
        metadata: { lenderId: validated.lenderId, status: validated.status } as Record<string, any>,
      });

      res.status(201).json(entry);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Update syndicate book entry
  app.patch("/api/syndicate-book/:id", ensureInternalOnly, async (req, res) => {
    try {
      const entry = await storage.updateSyndicateBookEntry(req.params.id, {
        ...req.body,
        lastUpdatedBy: req.headers["x-user-id"] as string,
      });
      if (!entry) {
        return res.status(404).json({ error: "Entry not found" });
      }

      // Log the update
      await storage.createLog({
        dealId: entry.dealId,
        actorRole: req.headers["x-user-role"] as string || "bookrunner",
        actorEmail: req.headers["x-user-email"] as string,
        action: "UPDATE_SYNDICATE_ENTRY",
        resourceId: entry.id,
        resourceType: "syndicate_book",
        metadata: { lenderId: entry.lenderId, changes: req.body } as Record<string, any>,
      });

      res.json(entry);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Upsert syndicate book entry (create or update)
  app.put("/api/deals/:dealId/syndicate-book/:lenderId", ensureInternalOnly, async (req, res) => {
    try {
      const { dealId, lenderId } = req.params;
      const entry = await storage.upsertSyndicateBookEntry(dealId, lenderId, {
        ...req.body,
        lastUpdatedBy: req.headers["x-user-id"] as string,
      });

      // Log the upsert
      await storage.createLog({
        dealId,
        actorRole: req.headers["x-user-role"] as string || "bookrunner",
        actorEmail: req.headers["x-user-email"] as string,
        action: "UPSERT_SYNDICATE_ENTRY",
        resourceId: entry.id,
        resourceType: "syndicate_book",
        metadata: { lenderId, changes: req.body } as Record<string, any>,
      });

      res.json(entry);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get syndicate book summary/metrics for a deal
  app.get("/api/deals/:dealId/syndicate-book/summary", ensureInternalOnly, async (req, res) => {
    try {
      const entries = await storage.listSyndicateBookByDeal(req.params.dealId);
      const deal = await storage.getDeal(req.params.dealId);

      if (!deal) {
        return res.status(404).json({ error: "Deal not found" });
      }

      const targetRaise = Number(deal.targetSize) || 0;

      // Calculate metrics
      const indicated = entries
        .filter(e => ["ioi_submitted", "soft_circled", "firm_committed", "allocated"].includes(e.status))
        .reduce((sum, e) => sum + (Number(e.indicatedAmount) || 0), 0);

      const softCircled = entries
        .filter(e => e.status === "soft_circled")
        .reduce((sum, e) => sum + (Number(e.indicatedAmount) || 0), 0);

      const firmCommitments = entries
        .filter(e => ["firm_committed", "allocated"].includes(e.status))
        .reduce((sum, e) => sum + (Number(e.firmCommitmentAmount) || 0), 0);

      const allocated = entries
        .filter(e => e.status === "allocated")
        .reduce((sum, e) => sum + (Number(e.allocatedAmount) || 0), 0);

      const progressPercent = targetRaise > 0 ? Math.min(100, Math.round((firmCommitments / targetRaise) * 100)) : 0;

      res.json({
        targetRaise,
        indicated,
        softCircled,
        firmCommitments,
        allocated,
        progressPercent,
        lenderCount: entries.length,
        statusBreakdown: {
          invited: entries.filter(e => e.status === "invited").length,
          interested: entries.filter(e => e.status === "interested").length,
          ioi_submitted: entries.filter(e => e.status === "ioi_submitted").length,
          soft_circled: entries.filter(e => e.status === "soft_circled").length,
          firm_committed: entries.filter(e => e.status === "firm_committed").length,
          allocated: entries.filter(e => e.status === "allocated").length,
          declined: entries.filter(e => e.status === "declined").length,
        },
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ========== ENGAGEMENT ANALYTICS (Internal Only - Issuer/Bookrunner) ==========

  // Get engagement analytics for a deal
  // Only accessible by internal users (issuer/bookrunner)
  app.get("/api/deals/:dealId/engagement-analytics", ensureInternalOnly, async (req, res) => {
    try {
      const { dealId } = req.params;
      const days = parseInt(req.query.days as string) || 7;
      const showTopLenders = req.query.showTopLenders === "true";
      const anonymize = req.query.anonymize === "true";

      // Get deal to verify it exists
      const deal = await storage.getDeal(dealId);

      // If deal not found, return mock demo data for prototype purposes
      if (!deal) {
        // Generate mock analytics for demo
        const mockTrend = [];
        for (let i = days - 1; i >= 0; i--) {
          const d = new Date();
          d.setDate(d.getDate() - i);
          mockTrend.push({
            date: d.toISOString().split('T')[0],
            count: Math.floor(Math.random() * 15) + 2
          });
        }

        return res.json({
          dealId,
          dealName: "Demo Deal",
          period: `Last ${days} days`,
          summary: {
            totalActivity: mockTrend.reduce((sum, d) => sum + d.count, 0),
            avgDailyActivity: Math.round(mockTrend.reduce((sum, d) => sum + d.count, 0) / days),
            documentViews: 47,
            uniqueDocuments: 8
          },
          documentViews: [
            { documentId: "doc1", documentName: "Confidential IM", viewCount: 18 },
            { documentId: "doc2", documentName: "Financial Model", viewCount: 14 },
            { documentId: "doc3", documentName: "Term Sheet", viewCount: 9 },
            { documentId: "doc4", documentName: "Due Diligence Report", viewCount: 4 },
            { documentId: "doc5", documentName: "Legal Docs", viewCount: 2 }
          ],
          engagementByTier: [
            { tier: "early", count: 28 },
            { tier: "full", count: 45 },
            { tier: "legal", count: 12 }
          ],
          activityTrend: mockTrend,
          topLenders: showTopLenders ? [
            { lenderId: "l1", lenderName: anonymize ? "Lender 1" : "BlackRock", activityCount: 24 },
            { lenderId: "l2", lenderName: anonymize ? "Lender 2" : "Apollo", activityCount: 18 },
            { lenderId: "l3", lenderName: anonymize ? "Lender 3" : "Ares", activityCount: 15 }
          ] : [],
          recentActivity: [
            { id: "a1", action: "view_document", description: "A lender viewed Confidential IM", timestamp: new Date().toISOString(), resourceType: "document", resourceId: "doc1" },
            { id: "a2", action: "download_doc", description: "A lender downloaded Financial Model", timestamp: new Date(Date.now() - 3600000).toISOString(), resourceType: "document", resourceId: "doc2" },
            { id: "a3", action: "sign_nda", description: "A lender signed NDA", timestamp: new Date(Date.now() - 7200000).toISOString(), resourceType: "nda", resourceId: "nda1" },
            { id: "a4", action: "ask_question", description: "A lender asked a question", timestamp: new Date(Date.now() - 10800000).toISOString(), resourceType: "qa", resourceId: "q1" },
            { id: "a5", action: "view_document", description: "A lender viewed Term Sheet", timestamp: new Date(Date.now() - 14400000).toISOString(), resourceType: "document", resourceId: "doc3" }
          ],
          generatedAt: new Date().toISOString()
        });
      }

      // Get analytics data
      const analytics = await storage.getEngagementAnalytics(dealId, days);

      // Anonymize lender names if requested
      const topLenders = showTopLenders
        ? analytics.topLenders.map((lender, index) => ({
            ...lender,
            lenderName: anonymize ? `Lender ${index + 1}` : lender.lenderName,
            lenderId: anonymize ? `lender_${index + 1}` : lender.lenderId
          }))
        : [];

      // Format recent activity with human-readable descriptions
      const recentActivity = analytics.recentActivity.map(log => {
        let description = "";
        const lenderLabel = anonymize && log.lenderId
          ? "A lender"
          : (log.metadata as any)?.lenderName || "Unknown";

        switch (log.action) {
          case "view_document":
          case "download_doc":
            description = `${lenderLabel} viewed ${(log.metadata as any)?.documentName || "a document"}`;
            break;
          case "sign_nda":
            description = `${lenderLabel} signed NDA`;
            break;
          case "submit_commitment":
            description = `${lenderLabel} submitted commitment`;
            break;
          case "ask_question":
            description = `${lenderLabel} asked a question`;
            break;
          case "download_credit_memo":
            description = `${lenderLabel} downloaded credit memo`;
            break;
          default:
            description = `${lenderLabel} - ${log.action.replace(/_/g, " ")}`;
        }

        return {
          id: log.id,
          action: log.action,
          description,
          timestamp: log.createdAt,
          resourceType: log.resourceType,
          resourceId: log.resourceId
        };
      });

      // Calculate summary stats
      const totalActivity = analytics.activityTrend.reduce((sum, day) => sum + day.count, 0);
      const avgDailyActivity = Math.round(totalActivity / days);

      res.json({
        dealId,
        dealName: deal.dealName,
        period: `Last ${days} days`,
        summary: {
          totalActivity,
          avgDailyActivity,
          documentViews: analytics.documentViews.reduce((sum, d) => sum + d.viewCount, 0),
          uniqueDocuments: analytics.documentViews.length
        },
        documentViews: analytics.documentViews,
        engagementByTier: analytics.engagementByTier,
        activityTrend: analytics.activityTrend,
        topLenders,
        recentActivity,
        generatedAt: new Date().toISOString()
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ========== CREDIT MEMO (Investor Access) ==========

  // Generate credit memo for a lender
  // This endpoint verifies access and generates memo data
  app.get("/api/deals/:dealId/credit-memo", async (req, res) => {
    try {
      const { dealId } = req.params;
      const lenderId = req.headers["x-lender-id"] as string;
      const userRole = req.headers["x-user-role"] as string;

      // Get deal
      const deal = await storage.getDeal(dealId);
      if (!deal) {
        return res.status(404).json({ error: "Deal not found" });
      }

      // Get invitation to check access
      let accessTier = "early";
      let ndaSigned = false;
      let lenderName = "Lender";

      if (lenderId) {
        const invitation = await storage.getInvitation(dealId, lenderId);
        if (!invitation) {
          return res.status(403).json({ error: "No invitation to this deal" });
        }
        accessTier = invitation.accessTier || "early";
        ndaSigned = !invitation.ndaRequired || !!invitation.ndaSignedAt;

        const lender = await storage.getLender(lenderId);
        if (lender) {
          lenderName = `${lender.firstName} ${lender.lastName} (${lender.organization})`;
        }
      }

      // For internal users, allow full access
      if (userRole && ["bookrunner", "issuer", "sponsor"].includes(userRole.toLowerCase())) {
        accessTier = "legal";
        ndaSigned = true;
      }

      // Check NDA status
      if (!ndaSigned) {
        return res.status(403).json({
          error: "NDA required",
          message: "Please sign the NDA to access the credit memo"
        });
      }

      // Get documents available at access tier
      const allDocs = await storage.listDocuments(dealId);
      const tierOrder: Record<string, number> = { early: 1, full: 2, legal: 3 };
      const userTierLevel = tierOrder[accessTier] || 1;

      const accessibleDocs = allDocs.filter(doc => {
        const docTierLevel = tierOrder[doc.visibilityTier || "early"] || 1;
        return docTierLevel <= userTierLevel;
      });

      // Build memo metadata
      const memoData = {
        deal: {
          id: deal.id,
          dealName: deal.dealName,
          borrowerName: deal.borrowerName,
          sponsor: deal.sponsor,
          sector: deal.sector,
          instrument: deal.instrument,
          facilityType: deal.facilityType,
          facilitySize: Number(deal.facilitySize),
          currency: deal.currency,
          stage: deal.stage,
          targetSize: Number(deal.targetSize),
          committed: Number(deal.committed),
          pricing: {
            benchmark: deal.pricingBenchmark,
            spreadLowBps: deal.spreadLowBps,
            spreadHighBps: deal.spreadHighBps,
            oid: Number(deal.oid),
            feesPct: Number(deal.feesPct),
          },
          launchDate: deal.launchDate,
          closeDate: deal.closeDate,
          hardCloseDate: deal.hardCloseDate,
        },
        accessTier,
        lenderName,
        documents: accessibleDocs.map(doc => ({
          id: doc.id,
          name: doc.name,
          category: doc.category,
          version: doc.version,
          visibilityTier: doc.visibilityTier,
        })),
        generatedAt: new Date().toISOString(),
      };

      // Log access
      await storage.createLog({
        dealId,
        lenderId: lenderId || null,
        actorRole: userRole || "lender",
        actorEmail: null,
        action: "download_credit_memo",
        resourceId: dealId,
        resourceType: "deal",
        metadata: { accessTier } as Record<string, any>,
      });

      res.json(memoData);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  return httpServer;
}
