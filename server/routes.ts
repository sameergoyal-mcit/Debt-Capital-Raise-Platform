import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { PDFDocument, rgb, degrees } from "pdf-lib";
import { storage } from "./storage";
import { insertDealSchema, insertLenderSchema, insertInvitationSchema, insertDocumentSchema, insertCommitmentSchema, insertQAItemSchema, insertLogSchema, insertDealModelSchema, insertClosingItemSchema, insertSyndicateBookSchema, insertIndicationSchema } from "@shared/schema";
import { runCreditModel, calculateQuickSummary, type CreditModelAssumptions } from "./lib/credit-engine";
import { z } from "zod";

// Import authentication and authorization middleware
import { requireAuth, requireRole, getSessionUser, type SessionUser } from "./auth";
import {
  requireDealAccess,
  requireNDA,
  checkNDA,
  requireDocAccess,
  filterDocumentsByTier,
  getLenderAccessContext,
  getLenderAccess,
  hasNDAWall,
} from "./middleware";
import { audit, auditLogFromRequest, AuditActions } from "./lib/audit";

// Internal-only middleware (for syndicate, analytics, etc.)
function ensureInternalOnly(req: Request, res: Response, next: NextFunction) {
  const user = req.user as SessionUser | undefined;
  if (!user) {
    return res.status(401).json({ error: "Authentication required", code: "UNAUTHORIZED" });
  }
  const role = user.role.toLowerCase();
  if (role === "lender" || role === "investor") {
    return res.status(403).json({
      error: "This resource is restricted to internal users only",
      code: "INTERNAL_ONLY"
    });
  }
  return next();
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // Auth routes are now handled by setupAuthRoutes in auth.ts

  // ========== DEALS ==========
  // List deals - returns deals based on user role
  app.get("/api/deals", requireAuth, async (req, res) => {
    try {
      const user = req.user as SessionUser;
      const role = user.role.toLowerCase();

      if (role === "bookrunner" || role === "issuer" || role === "sponsor") {
        // Internal users see all deals
        const deals = await storage.listDeals();
        return res.json(deals);
      }

      // Lenders see only deals they're invited to
      if (role === "lender" && user.lenderId) {
        const invitations = await storage.listInvitationsByLender(user.lenderId);
        const dealIds = invitations.map((inv) => inv.dealId);
        const allDeals = await storage.listDeals();
        const accessibleDeals = allDeals.filter((d) => dealIds.includes(d.id));
        return res.json(accessibleDeals);
      }

      return res.json([]);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get single deal - with NDA wall for lenders
  app.get("/api/deals/:id", requireAuth, requireDealAccess, checkNDA, async (req, res) => {
    try {
      const deal = (req as any).deal;
      const user = req.user as SessionUser;
      const role = user.role.toLowerCase();

      // Log view
      await audit.viewDeal(req, deal.id);

      // For lenders behind NDA wall, return teaser only
      if (role === "lender" && hasNDAWall(req)) {
        return res.json({
          id: deal.id,
          dealName: deal.dealName,
          borrowerName: deal.borrowerName,
          sector: deal.sector,
          sponsor: deal.sponsor,
          instrument: deal.instrument,
          facilityType: deal.facilityType,
          status: deal.status,
          launchDate: deal.launchDate,
          closeDate: deal.closeDate,
          hardCloseDate: deal.hardCloseDate,
          ndaRequired: deal.ndaRequired,
          _ndaWall: true,
          _message: "Sign NDA to access full deal information",
        });
      }

      res.json(deal);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Create deal - internal users only
  app.post("/api/deals", requireAuth, requireRole("bookrunner", "issuer", "sponsor"), async (req, res) => {
    try {
      const validated = insertDealSchema.parse(req.body);
      const deal = await storage.createDeal(validated);

      await auditLogFromRequest(req, AuditActions.CREATE_DEAL, {
        resourceType: "deal",
        resourceId: deal.id,
        dealId: deal.id,
      });

      res.status(201).json(deal);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Update deal - internal users only
  app.patch("/api/deals/:id", requireAuth, requireRole("bookrunner", "issuer", "sponsor"), requireDealAccess, async (req, res) => {
    try {
      const deal = await storage.updateDeal(req.params.id, req.body);
      if (!deal) {
        return res.status(404).json({ error: "Deal not found" });
      }

      await auditLogFromRequest(req, AuditActions.UPDATE_DEAL, {
        resourceType: "deal",
        resourceId: deal.id,
        dealId: deal.id,
      });

      res.json(deal);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ========== LENDERS ==========
  // List all lenders - internal users only
  app.get("/api/lenders", requireAuth, ensureInternalOnly, async (req, res) => {
    try {
      const lenders = await storage.listLenders();
      res.json(lenders);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get lender by ID - internal users only
  app.get("/api/lenders/:id", requireAuth, ensureInternalOnly, async (req, res) => {
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

  // Get lender by email - internal users only
  app.get("/api/lenders/email/:email", requireAuth, ensureInternalOnly, async (req, res) => {
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

  // Create lender - internal users only
  app.post("/api/lenders", requireAuth, ensureInternalOnly, async (req, res) => {
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
  // List invitations for a deal - internal users only
  app.get("/api/deals/:dealId/invitations", requireAuth, ensureInternalOnly, async (req, res) => {
    try {
      const invitations = await storage.listInvitationsByDeal(req.params.dealId);
      res.json(invitations);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // List invitations for a lender - lender can see own, internal sees all
  app.get("/api/lenders/:lenderId/invitations", requireAuth, async (req, res) => {
    try {
      const user = req.user as SessionUser;
      const requestedLenderId = req.params.lenderId;

      // Lenders can only see their own invitations
      if (user.role.toLowerCase() === "lender" && user.lenderId !== requestedLenderId) {
        return res.status(403).json({ error: "Access denied" });
      }

      const invitations = await storage.listInvitationsByLender(requestedLenderId);
      res.json(invitations);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Create invitation - internal users only
  app.post("/api/invitations", requireAuth, ensureInternalOnly, async (req, res) => {
    try {
      const validated = insertInvitationSchema.parse(req.body);
      const invitation = await storage.createInvitation(validated);

      await auditLogFromRequest(req, AuditActions.CREATE_INVITATION, {
        resourceType: "invitation",
        resourceId: invitation.id,
        dealId: invitation.dealId,
        lenderId: invitation.lenderId,
      });

      res.status(201).json(invitation);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Sign NDA - lenders only (no requireNDA since they're signing it)
  app.post("/api/invitations/:dealId/:lenderId/sign-nda", requireAuth, async (req, res) => {
    try {
      const { dealId, lenderId } = req.params;
      const user = req.user as SessionUser;

      // Lenders can only sign their own NDA
      if (user.role.toLowerCase() === "lender" && user.lenderId !== lenderId) {
        return res.status(403).json({ error: "Cannot sign NDA for another lender" });
      }

      const { signerEmail, ndaVersion } = req.body;
      const signerIp = req.ip || "unknown";

      const invitation = await storage.updateInvitationNdaSigned(dealId, lenderId, signerEmail || user.email, signerIp, ndaVersion);
      if (!invitation) {
        return res.status(404).json({ error: "Invitation not found" });
      }

      // Log the NDA signing
      await audit.signNDA(req, dealId, lenderId);

      res.json(invitation);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Update invitation tier - internal users only
  app.patch("/api/invitations/:dealId/:lenderId/tier", requireAuth, ensureInternalOnly, async (req, res) => {
    try {
      const { dealId, lenderId } = req.params;
      const { tier, changedBy } = req.body;
      const user = req.user as SessionUser;

      const invitation = await storage.updateInvitationTier(dealId, lenderId, tier, changedBy || user.email);
      if (!invitation) {
        return res.status(404).json({ error: "Invitation not found" });
      }

      await auditLogFromRequest(req, AuditActions.UPDATE_TIER, {
        resourceType: "invitation",
        dealId,
        lenderId,
        metadata: { newTier: tier },
      });

      res.json(invitation);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ========== DOCUMENTS ==========
  // List documents for a deal - filtered by NDA and tier for lenders
  app.get("/api/deals/:dealId/documents", requireAuth, requireDealAccess, checkNDA, async (req, res) => {
    try {
      const user = req.user as SessionUser;
      const role = user.role.toLowerCase();
      const dealId = req.params.dealId;

      const documents = await storage.listDocumentsByDeal(dealId);

      // Log document list view
      await auditLogFromRequest(req, AuditActions.LIST_DOCS, {
        resourceType: "document",
        dealId,
        metadata: { count: documents.length },
      });

      // Internal users see all documents
      if (role === "bookrunner" || role === "issuer" || role === "sponsor") {
        return res.json(documents);
      }

      // Lenders behind NDA wall see empty list
      if (role === "lender" && hasNDAWall(req)) {
        return res.json([]);
      }

      // Lenders with signed NDA see documents filtered by tier
      const lenderAccess = getLenderAccess(req);
      if (lenderAccess) {
        const filteredDocs = filterDocumentsByTier(documents, lenderAccess.accessTier);
        return res.json(filteredDocs);
      }

      return res.json([]);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Create document - internal users only
  app.post("/api/documents", requireAuth, ensureInternalOnly, async (req, res) => {
    try {
      const validated = insertDocumentSchema.parse(req.body);
      const document = await storage.createDocument(validated);

      await auditLogFromRequest(req, AuditActions.UPLOAD_DOC, {
        resourceType: "document",
        resourceId: document.id,
        dealId: document.dealId,
        metadata: { name: document.name },
      });

      res.status(201).json(document);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // ========== DOCUMENT DOWNLOAD WITH WATERMARKING ==========
  // Document download with proper auth, NDA, and tier checks
  app.get("/api/documents/:id/download", requireAuth, requireDocAccess, async (req, res) => {
    try {
      const document = (req as any).document;
      const user = req.user as SessionUser;

      // Get user email for watermarking
      const userEmail = user.email || "unknown@user.com";
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

        // Log the watermarked download
        await audit.watermarkStream(req, document.id, document.dealId, document.name);

        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", `attachment; filename="${document.name}"`);
        res.send(Buffer.from(pdfBytes));
      } else {
        // For non-PDF files, log and return simple response
        await audit.downloadDoc(req, document.id, document.dealId, document.name);

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
  // List commitments - internal users only
  app.get("/api/deals/:dealId/commitments", requireAuth, ensureInternalOnly, async (req, res) => {
    try {
      const commitments = await storage.listCommitmentsByDeal(req.params.dealId);
      res.json(commitments);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Create commitment - lenders only, requires NDA
  app.post("/api/commitments", requireAuth, async (req, res) => {
    try {
      const user = req.user as SessionUser;
      const validated = insertCommitmentSchema.parse(req.body);

      // Verify lender can only create for themselves
      if (user.role.toLowerCase() === "lender" && user.lenderId !== validated.lenderId) {
        return res.status(403).json({ error: "Cannot create commitment for another lender" });
      }

      const commitment = await storage.createCommitment(validated);

      // Update deal committed amount
      const commitments = await storage.listCommitmentsByDeal(validated.dealId);
      const totalCommitted = commitments.reduce((sum, c) => sum + Number(c.amount), 0);
      await storage.updateDeal(validated.dealId, { committed: String(totalCommitted) });

      // Log the commitment submission
      await auditLogFromRequest(req, AuditActions.SUBMIT_COMMITMENT, {
        resourceType: "commitment",
        resourceId: commitment.id,
        dealId: validated.dealId,
        lenderId: validated.lenderId,
        metadata: { amount: validated.amount, status: validated.status },
      });

      res.status(201).json(commitment);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // ========== Q&A ==========
  // List Q&A - lenders see own items only (no draft info), internal sees all
  app.get("/api/deals/:dealId/qa", requireAuth, requireDealAccess, checkNDA, async (req, res) => {
    try {
      const user = req.user as SessionUser;
      const role = user.role.toLowerCase();
      const dealId = req.params.dealId;

      // Log view
      await auditLogFromRequest(req, AuditActions.VIEW_QA, {
        resourceType: "qa",
        dealId,
      });

      const qaItems = await storage.listQAByDeal(dealId);

      // Internal users see all items including drafts
      if (role === "bookrunner" || role === "issuer" || role === "sponsor") {
        return res.json(qaItems);
      }

      // Lenders behind NDA wall see nothing
      if (role === "lender" && hasNDAWall(req)) {
        return res.json([]);
      }

      // Lenders see only their own items, without draft info
      if (role === "lender" && user.lenderId) {
        const filtered = qaItems
          .filter((item) => item.lenderId === user.lenderId)
          .map((item) => ({
            id: item.id,
            dealId: item.dealId,
            lenderId: item.lenderId,
            category: item.category,
            status: item.status,
            question: item.question,
            askedAt: item.askedAt,
            answer: item.status === "answered" ? item.answer : null,
            answeredAt: item.answeredAt,
            source: item.source,
            // Explicitly exclude draft fields
          }));
        return res.json(filtered);
      }

      return res.json([]);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Create Q&A question - lenders only, requires NDA
  app.post("/api/qa", requireAuth, requireRole("lender"), async (req, res) => {
    try {
      const user = req.user as SessionUser;
      const validated = insertQAItemSchema.parse(req.body);

      // Check NDA for lender
      if (!user.lenderId) {
        return res.status(403).json({ error: "Lender profile required" });
      }

      const accessContext = await getLenderAccessContext(req, validated.dealId);
      if (!accessContext) {
        return res.status(403).json({ error: "No invitation to this deal" });
      }
      if (accessContext.ndaWall) {
        return res.status(403).json({ error: "NDA required to submit questions", code: "NDA_REQUIRED" });
      }

      // Ensure lender can only create for themselves
      if (validated.lenderId && validated.lenderId !== user.lenderId) {
        return res.status(403).json({ error: "Cannot create Q&A for another lender" });
      }

      const qaItem = await storage.createQA({
        ...validated,
        lenderId: user.lenderId,
      });

      await audit.submitQA(req, validated.dealId, qaItem.id);

      res.status(201).json(qaItem);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Answer Q&A - internal users only
  app.patch("/api/qa/:id/answer", requireAuth, ensureInternalOnly, async (req, res) => {
    try {
      const { answer } = req.body;
      const qaItem = await storage.answerQA(req.params.id, answer);
      if (!qaItem) {
        return res.status(404).json({ error: "Q&A item not found" });
      }

      await audit.answerQA(req, qaItem.dealId, qaItem.id);

      res.json(qaItem);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ========== AUDIT LOGS ==========
  // View logs - internal users only
  app.get("/api/deals/:dealId/logs", requireAuth, ensureInternalOnly, async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      const logs = await storage.listLogsByDeal(req.params.dealId, limit);
      res.json(logs);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Create log - internal only (mostly used by server)
  app.post("/api/logs", requireAuth, ensureInternalOnly, async (req, res) => {
    try {
      const validated = insertLogSchema.parse(req.body);
      const log = await storage.createLog(validated);
      res.status(201).json(log);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // ========== AUDIT LOG - Deal View ==========
  // Deprecated: use GET /api/deals/:id which auto-logs
  app.post("/api/deals/:dealId/view", requireAuth, async (req, res) => {
    try {
      await audit.viewDeal(req, req.params.dealId);
      res.status(201).json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ========== AUDIT LOG - Document Download ==========
  // Deprecated: use GET /api/documents/:id/download which auto-logs
  app.post("/api/documents/:documentId/download", requireAuth, async (req, res) => {
    try {
      const { dealId, documentName } = req.body;
      await audit.downloadDoc(req, req.params.documentId, dealId, documentName);
      res.status(201).json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ========== CREDIT ENGINE - Quick Summary ==========
  app.get("/api/deals/:dealId/credit-summary", requireAuth, requireDealAccess, async (req, res) => {
    try {
      const deal = (req as any).deal;

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
  // Internal users only
  app.post("/api/deals/:dealId/reminders", requireAuth, ensureInternalOnly, async (req, res) => {
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
      await auditLogFromRequest(req, "SEND_REMINDER", {
        resourceType: "deal",
        resourceId: dealId,
        dealId,
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

  // ========== DEAL MODELS (Sandbox) ==========
  // List models - internal users only (lenders see published via documents)
  app.get("/api/deals/:dealId/models", requireAuth, ensureInternalOnly, async (req, res) => {
    try {
      const models = await storage.listDealModelsByDeal(req.params.dealId);
      res.json(models);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get model by ID - internal users only
  app.get("/api/deal-models/:id", requireAuth, ensureInternalOnly, async (req, res) => {
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

  // Create deal model - internal users only
  app.post("/api/deal-models", requireAuth, ensureInternalOnly, async (req, res) => {
    try {
      const user = req.user as SessionUser;
      const validated = insertDealModelSchema.parse(req.body);
      const model = await storage.createDealModel({
        ...validated,
        createdBy: user.id,
      });

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

  // Publish deal model - internal users only
  app.post("/api/deal-models/:id/publish", requireAuth, ensureInternalOnly, async (req, res) => {
    try {
      const model = await storage.getDealModel(req.params.id);
      if (!model) {
        return res.status(404).json({ error: "Model not found" });
      }

      const user = req.user as SessionUser;
      const publishedModel = await storage.publishDealModel(req.params.id, user.id);

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

  // Run credit model calculation - internal users only
  app.post("/api/deals/:dealId/calculate", requireAuth, ensureInternalOnly, async (req, res) => {
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
  // List closing items - internal users only
  app.get("/api/deals/:dealId/closing-items", requireAuth, ensureInternalOnly, async (req, res) => {
    try {
      const items = await storage.listClosingItemsByDeal(req.params.dealId);
      res.json(items);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get closing item by ID - internal users only
  app.get("/api/closing-items/:id", requireAuth, ensureInternalOnly, async (req, res) => {
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

  // Create closing item - internal users only
  app.post("/api/closing-items", requireAuth, ensureInternalOnly, async (req, res) => {
    try {
      const user = req.user as SessionUser;
      const validated = insertClosingItemSchema.parse(req.body);
      const item = await storage.createClosingItem({
        ...validated,
        createdBy: user.id,
      });

      // Log the creation
      await auditLogFromRequest(req, AuditActions.CREATE_CLOSING_ITEM, {
        resourceType: "closing_item",
        resourceId: item.id,
        dealId: validated.dealId,
        metadata: { description: validated.description, category: validated.category },
      });

      res.status(201).json(item);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Update closing item - internal users only
  app.patch("/api/closing-items/:id", requireAuth, ensureInternalOnly, async (req, res) => {
    try {
      const item = await storage.updateClosingItem(req.params.id, req.body);
      if (!item) {
        return res.status(404).json({ error: "Closing item not found" });
      }

      // Log status changes
      if (req.body.status) {
        await auditLogFromRequest(req, req.body.status === "approved" ? AuditActions.APPROVE_CLOSING_ITEM : AuditActions.UPDATE_CLOSING_ITEM, {
          resourceType: "closing_item",
          resourceId: item.id,
          dealId: item.dealId,
          metadata: { description: item.description, newStatus: req.body.status },
        });
      }

      res.json(item);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Delete closing item - internal users only
  app.delete("/api/closing-items/:id", requireAuth, ensureInternalOnly, async (req, res) => {
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
      await auditLogFromRequest(req, AuditActions.DELETE_CLOSING_ITEM, {
        resourceType: "closing_item",
        resourceId: req.params.id,
        dealId: item.dealId,
        metadata: { description: item.description },
      });

      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Upload document to fulfill a closing item - internal users only
  app.post("/api/closing-items/:id/upload", requireAuth, ensureInternalOnly, async (req, res) => {
    try {
      const user = req.user as SessionUser;
      const item = await storage.getClosingItem(req.params.id);
      if (!item) {
        return res.status(404).json({ error: "Closing item not found" });
      }

      const { fileId } = req.body;

      const updatedItem = await storage.updateClosingItem(req.params.id, {
        status: "uploaded",
        fileId,
        uploadedBy: user.id,
        uploadedAt: new Date(),
      });

      // Log the upload
      await auditLogFromRequest(req, AuditActions.UPLOAD_CLOSING_ITEM, {
        resourceType: "closing_item",
        resourceId: req.params.id,
        dealId: item.dealId,
        metadata: { description: item.description, fileId },
      });

      res.json(updatedItem);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Approve a closing item - internal users only
  app.post("/api/closing-items/:id/approve", requireAuth, ensureInternalOnly, async (req, res) => {
    try {
      const user = req.user as SessionUser;
      const item = await storage.getClosingItem(req.params.id);
      if (!item) {
        return res.status(404).json({ error: "Closing item not found" });
      }

      const updatedItem = await storage.updateClosingItem(req.params.id, {
        status: "approved",
        approvedBy: user.id,
        approvedAt: new Date(),
      });

      // Log the approval
      await auditLogFromRequest(req, AuditActions.APPROVE_CLOSING_ITEM, {
        resourceType: "closing_item",
        resourceId: req.params.id,
        dealId: item.dealId,
        metadata: { description: item.description },
      });

      res.json(updatedItem);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ========== SYNDICATE BOOK (Internal Only - Bookrunner/Issuer) ==========

  // Get syndicate book for a deal - internal users only
  app.get("/api/deals/:dealId/syndicate-book", requireAuth, ensureInternalOnly, async (req, res) => {
    try {
      const entries = await storage.listSyndicateBookByDeal(req.params.dealId);

      await auditLogFromRequest(req, AuditActions.VIEW_SYNDICATE, {
        resourceType: "syndicate_book",
        dealId: req.params.dealId,
      });

      res.json(entries);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get single syndicate book entry - internal users only
  app.get("/api/syndicate-book/:id", requireAuth, ensureInternalOnly, async (req, res) => {
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

  // Create syndicate book entry - internal users only
  app.post("/api/syndicate-book", requireAuth, ensureInternalOnly, async (req, res) => {
    try {
      const validated = insertSyndicateBookSchema.parse(req.body);
      const entry = await storage.createSyndicateBookEntry(validated);

      // Log the action
      await auditLogFromRequest(req, "CREATE_SYNDICATE_ENTRY", {
        resourceType: "syndicate_book",
        resourceId: entry.id,
        dealId: validated.dealId,
        metadata: { lenderId: validated.lenderId, status: validated.status },
      });

      res.status(201).json(entry);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Update syndicate book entry - internal users only
  app.patch("/api/syndicate-book/:id", requireAuth, ensureInternalOnly, async (req, res) => {
    try {
      const user = req.user as SessionUser;
      const entry = await storage.updateSyndicateBookEntry(req.params.id, {
        ...req.body,
        lastUpdatedBy: user.id,
      });
      if (!entry) {
        return res.status(404).json({ error: "Entry not found" });
      }

      // Log the update
      await auditLogFromRequest(req, AuditActions.UPDATE_SYNDICATE, {
        resourceType: "syndicate_book",
        resourceId: entry.id,
        dealId: entry.dealId,
        metadata: { lenderId: entry.lenderId, changes: req.body },
      });

      res.json(entry);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Upsert syndicate book entry (create or update) - internal users only
  app.put("/api/deals/:dealId/syndicate-book/:lenderId", requireAuth, ensureInternalOnly, async (req, res) => {
    try {
      const user = req.user as SessionUser;
      const { dealId, lenderId } = req.params;
      const entry = await storage.upsertSyndicateBookEntry(dealId, lenderId, {
        ...req.body,
        lastUpdatedBy: user.id,
      });

      // Log the upsert
      await auditLogFromRequest(req, AuditActions.UPDATE_SYNDICATE, {
        resourceType: "syndicate_book",
        resourceId: entry.id,
        dealId,
        lenderId,
        metadata: { changes: req.body },
      });

      res.json(entry);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get syndicate book summary/metrics for a deal - internal users only
  app.get("/api/deals/:dealId/syndicate-book/summary", requireAuth, ensureInternalOnly, async (req, res) => {
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
  app.get("/api/deals/:dealId/engagement-analytics", requireAuth, ensureInternalOnly, async (req, res) => {
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
  app.get("/api/deals/:dealId/credit-memo", requireAuth, requireDealAccess, checkNDA, async (req, res) => {
    try {
      const { dealId } = req.params;
      const user = req.user as SessionUser;
      const role = user.role.toLowerCase();
      const deal = (req as any).deal;

      // Get access context
      let accessTier: "early" | "full" | "legal" = "early";
      let lenderName = "Internal User";

      // For internal users, allow full access
      if (role === "bookrunner" || role === "issuer" || role === "sponsor") {
        accessTier = "legal";
      } else if (role === "lender" && user.lenderId) {
        // Check NDA wall for lenders
        if (hasNDAWall(req)) {
          return res.status(403).json({
            error: "NDA required",
            message: "Please sign the NDA to access the credit memo",
            code: "NDA_REQUIRED",
          });
        }

        const lenderAccess = getLenderAccess(req);
        if (lenderAccess) {
          accessTier = lenderAccess.accessTier;
        }

        const lender = await storage.getLender(user.lenderId);
        if (lender) {
          lenderName = `${lender.firstName} ${lender.lastName} (${lender.organization})`;
        }
      }

      // Get documents available at access tier
      const allDocs = await storage.listDocumentsByDeal(dealId);
      const accessibleDocs = filterDocumentsByTier(allDocs, accessTier);

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
      await auditLogFromRequest(req, "DOWNLOAD_CREDIT_MEMO", {
        resourceType: "deal",
        resourceId: dealId,
        dealId,
        metadata: { accessTier },
      });

      res.json(memoData);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ========== INDICATIONS (IOI) ==========

  // Helper: sync indication to syndicate book (updates IOI amount, status - does NOT overwrite banker fields)
  async function syncIndicationToSyndicateBook(
    dealId: string,
    lenderId: string,
    ioiAmount: string,
    status: string,
    userId?: string
  ) {
    const existing = await storage.getSyndicateBookEntryByDealAndLender(dealId, lenderId);

    // Determine syndicate book status based on indication status
    let syndicateStatus = "ioi_submitted";
    if (status === "withdrawn") {
      syndicateStatus = existing?.status === "invited" ? "invited" : "interested";
    }

    // Only update IOI-related fields; preserve banker-entered fields
    const updateFields: any = {
      indicatedAmount: status === "withdrawn" ? null : ioiAmount,
      lastUpdatedBy: userId || null,
    };

    // Only upgrade status, never downgrade (e.g., don't overwrite firm_committed with ioi_submitted)
    const statusOrder = ["invited", "interested", "ioi_submitted", "soft_circled", "firm_committed", "allocated", "declined"];
    const currentStatusIndex = statusOrder.indexOf(existing?.status || "invited");
    const newStatusIndex = statusOrder.indexOf(syndicateStatus);

    if (newStatusIndex > currentStatusIndex || status === "withdrawn") {
      updateFields.status = syndicateStatus;
    }

    await storage.upsertSyndicateBookEntry(dealId, lenderId, updateFields);
  }

  // GET /api/deals/:dealId/indication - Lender's own indication for this deal
  app.get("/api/deals/:dealId/indication", requireAuth, requireDealAccess, checkNDA, async (req, res) => {
    try {
      const { dealId } = req.params;
      const user = req.user as SessionUser;
      const role = user.role.toLowerCase();

      // Lenders can only see their own indication
      if (role === "lender") {
        if (!user.lenderId) {
          return res.status(400).json({ error: "Lender ID required" });
        }

        // Check NDA wall for lenders
        if (hasNDAWall(req)) {
          return res.status(403).json({
            error: "NDA signature required to view indication",
            code: "NDA_REQUIRED"
          });
        }

        const indication = await storage.getIndicationByDealAndLender(dealId, user.lenderId);
        return res.json(indication || null);
      }

      // Internal users can view any indication (via the plural endpoint)
      return res.status(400).json({ error: "Use /api/deals/:dealId/indications for internal users" });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // POST /api/deals/:dealId/indication - Submit or update indication (upsert)
  app.post("/api/deals/:dealId/indication", requireAuth, requireRole("lender"), requireDealAccess, checkNDA, async (req, res) => {
    try {
      const { dealId } = req.params;
      const user = req.user as SessionUser;

      if (!user.lenderId) {
        return res.status(400).json({ error: "Lender ID required" });
      }

      // Check NDA wall for lenders
      if (hasNDAWall(req)) {
        return res.status(403).json({
          error: "NDA signature required to submit indication",
          code: "NDA_REQUIRED"
        });
      }

      const { ioiAmount, termsJson, currency } = req.body;

      if (!ioiAmount || !termsJson) {
        return res.status(400).json({ error: "ioiAmount and termsJson are required" });
      }

      const existing = await storage.getIndicationByDealAndLender(dealId, user.lenderId);
      const isUpdate = !!existing;

      const indication = await storage.upsertIndication(dealId, user.lenderId, {
        submittedByUserId: user.id,
        ioiAmount,
        termsJson,
        currency: currency || "USD",
      });

      // Sync to syndicate book
      await syncIndicationToSyndicateBook(dealId, user.lenderId, ioiAmount, indication.status, user.id);

      // Log audit
      if (isUpdate) {
        await audit.submitIOI(req, dealId, indication.id, ioiAmount);
      } else {
        await auditLogFromRequest(req, AuditActions.UPDATE_IOI, {
          resourceType: "indication",
          resourceId: indication.id,
          dealId,
          lenderId: user.lenderId,
          metadata: {
            ioiAmount,
            currency: currency || "USD",
            isFirm: termsJson?.isFirm || false,
            spreadBps: termsJson?.spreadBps,
          },
        });
      }

      res.status(isUpdate ? 200 : 201).json(indication);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // POST /api/deals/:dealId/indication/withdraw - Withdraw indication
  app.post("/api/deals/:dealId/indication/withdraw", requireAuth, requireRole("lender"), async (req, res) => {
    try {
      const { dealId } = req.params;
      const user = req.user as SessionUser;

      if (!user.lenderId) {
        return res.status(400).json({ error: "Lender ID required" });
      }

      const indication = await storage.withdrawIndication(dealId, user.lenderId);

      if (!indication) {
        return res.status(404).json({ error: "No indication found to withdraw" });
      }

      // Sync to syndicate book
      await syncIndicationToSyndicateBook(dealId, user.lenderId, indication.ioiAmount, "withdrawn", user.id);

      // Log audit
      await audit.withdrawIOI(req, dealId, indication.id);

      res.json(indication);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // GET /api/deals/:dealId/indications - All indications for deal (issuer/bookrunner only)
  app.get("/api/deals/:dealId/indications", requireAuth, ensureInternalOnly, async (req, res) => {
    try {
      const { dealId } = req.params;

      const indications = await storage.listIndicationsByDeal(dealId);

      // Enrich with lender info
      const enrichedIndications = await Promise.all(
        indications.map(async (indication) => {
          const lender = await storage.getLender(indication.lenderId);
          return {
            ...indication,
            lender: lender ? {
              id: lender.id,
              firstName: lender.firstName,
              lastName: lender.lastName,
              organization: lender.organization,
              email: lender.email,
            } : null,
          };
        })
      );

      res.json(enrichedIndications);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  return httpServer;
}
