import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { PDFDocument, rgb, degrees } from "pdf-lib";
import { storage } from "./storage";
import { insertDealSchema, insertLenderSchema, insertInvitationSchema, insertDocumentSchema, insertCommitmentSchema, insertQAItemSchema, insertLogSchema, insertDealModelSchema, insertClosingItemSchema, insertSyndicateBookSchema, insertIndicationSchema, insertFinancingProposalSchema } from "@shared/schema";
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
      const user = req.user as SessionUser;
      const validated = insertInvitationSchema.parse(req.body);
      const invitation = await storage.createInvitation(validated);

      // Create syndicate book entry with 'invited' status
      await storage.upsertSyndicateBookEntry(invitation.dealId, invitation.lenderId, {
        status: 'invited',
        lastUpdatedBy: user.id,
      });

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

      // If deal not found, return 404
      if (!deal) {
        return res.status(404).json({ error: "Deal not found" });
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
          case "VIEW_DOC":
          case "DOWNLOAD_DOC":
          case "WATERMARK_STREAM":
            description = `${lenderLabel} viewed ${(log.metadata as any)?.documentName || "a document"}`;
            break;
          case "SIGN_NDA":
            description = `${lenderLabel} signed NDA`;
            break;
          case "SUBMIT_COMMITMENT":
            description = `${lenderLabel} submitted commitment`;
            break;
          case "SUBMIT_QA":
            description = `${lenderLabel} asked a question`;
            break;
          case "SUBMIT_IOI":
          case "UPDATE_IOI":
            description = `${lenderLabel} submitted indication of interest`;
            break;
          default:
            description = `${lenderLabel} - ${log.action.replace(/_/g, " ").toLowerCase()}`;
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

  // ========== ORGANIZATIONS ==========

  // GET /api/organizations - List all organizations
  app.get("/api/organizations", requireAuth, async (req, res) => {
    try {
      const organizations = await storage.listOrganizations();
      res.json(organizations);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // GET /api/organizations/banks - List bank organizations
  app.get("/api/organizations/banks", requireAuth, async (req, res) => {
    try {
      const banks = await storage.listOrganizationsByType("bank");
      res.json(banks);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // POST /api/organizations - Create organization
  app.post("/api/organizations", requireAuth, ensureInternalOnly, async (req, res) => {
    try {
      const validated = z.object({
        name: z.string().min(1),
        orgType: z.enum(["issuer", "bank", "lender", "law_firm"]),
        logoUrl: z.string().optional(),
        website: z.string().optional(),
      }).parse(req.body);

      const org = await storage.createOrganization(validated);
      res.status(201).json(org);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // ========== RFP / BEAUTY CONTEST ==========

  // Middleware: Check if user is a bank candidate for this deal
  async function requireBankCandidate(req: Request, res: Response, next: NextFunction) {
    const user = req.user as SessionUser | undefined;
    if (!user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const { dealId } = req.params;
    if (!dealId) {
      return res.status(400).json({ error: "Deal ID required" });
    }

    // Get user's organization
    if (!user.organizationId) {
      return res.status(403).json({ error: "User must belong to an organization" });
    }

    // Check if org is a bank
    const org = await storage.getOrganization(user.organizationId);
    if (!org || org.orgType !== "bank") {
      return res.status(403).json({ error: "Only bank users can access RFP proposals" });
    }

    // Check if bank is a candidate for this deal
    const candidate = await storage.getCandidateByDealAndBank(dealId, user.organizationId);
    if (!candidate) {
      return res.status(403).json({ error: "Your bank is not invited to this RFP" });
    }

    // Attach candidate info to request
    (req as any).bankCandidate = candidate;
    (req as any).bankOrgId = user.organizationId;
    (req as any).bankOrg = org;
    next();
  }

  // Middleware: Check RFP access (issuer OR invited bank)
  async function requireRfpAccess(req: Request, res: Response, next: NextFunction) {
    const user = req.user as SessionUser | undefined;
    if (!user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const { dealId } = req.params;
    const role = user.role.toLowerCase();

    // Issuers have full RFP access
    if (role === "issuer" || role === "sponsor") {
      return next();
    }

    // Bookrunners (banks) need to check if they're candidates
    if (role === "bookrunner" && user.organizationId) {
      const candidate = await storage.getCandidateByDealAndBank(dealId, user.organizationId);
      if (candidate) {
        (req as any).bankCandidate = candidate;
        (req as any).bankOrgId = user.organizationId;
        return next();
      }
    }

    return res.status(403).json({ error: "Access denied to this RFP" });
  }

  // GET /api/deals/:dealId/rfp - RFP dashboard
  app.get("/api/deals/:dealId/rfp", requireAuth, requireRfpAccess, async (req, res) => {
    try {
      const { dealId } = req.params;
      const user = req.user as SessionUser;
      const role = user.role.toLowerCase();
      const bankOrgId = (req as any).bankOrgId;

      const deal = await storage.getDeal(dealId);
      if (!deal) {
        return res.status(404).json({ error: "Deal not found" });
      }

      // For issuers: return all candidates and proposals summary
      if (role === "issuer" || role === "sponsor") {
        const candidates = await storage.listCandidatesByDeal(dealId);
        const proposals = await storage.listProposalsByDeal(dealId);

        // Enrich candidates with org info and proposal status
        const enrichedCandidates = await Promise.all(
          candidates.map(async (c) => {
            const org = await storage.getOrganization(c.bankOrgId);
            const proposal = proposals.find(p => p.bankOrgId === c.bankOrgId);
            return {
              ...c,
              bankName: org?.name || "Unknown",
              hasProposal: !!proposal,
              proposalStatus: proposal?.status || null,
            };
          })
        );

        return res.json({
          deal: {
            id: deal.id,
            dealName: deal.dealName,
            borrowerName: deal.borrowerName,
            status: deal.status,
            mandatedBankOrgId: deal.mandatedBankOrgId,
          },
          candidates: enrichedCandidates,
          proposalCount: proposals.filter(p => p.status === "submitted").length,
        });
      }

      // For bank candidates: return deal teaser + their own candidate/proposal
      const candidate = (req as any).bankCandidate;
      const proposal = await storage.getProposalByDealAndBank(dealId, bankOrgId);

      // Mark as viewed if first access
      if (candidate.status === "invited") {
        await storage.setCandidateStatus(dealId, bankOrgId, "viewed");
        await auditLogFromRequest(req, "VIEW_RFP", {
          resourceType: "deal",
          resourceId: dealId,
          dealId,
          metadata: { bankOrgId },
        });
      }

      return res.json({
        deal: {
          id: deal.id,
          dealName: deal.dealName,
          borrowerName: deal.borrowerName,
          sector: deal.sector,
          sponsor: deal.sponsor,
          facilityType: deal.facilityType,
          facilitySize: deal.facilitySize,
          status: deal.status,
          closeDate: deal.closeDate,
        },
        candidate: {
          status: candidate.status,
          viewedAt: candidate.viewedAt,
        },
        proposal: proposal || null,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // POST /api/deals/:dealId/rfp/invite - Invite banks to RFP (issuer only)
  app.post("/api/deals/:dealId/rfp/invite", requireAuth, requireRole("issuer", "sponsor"), async (req, res) => {
    try {
      const { dealId } = req.params;
      const user = req.user as SessionUser;
      const { bankOrgIds } = req.body;

      if (!Array.isArray(bankOrgIds) || bankOrgIds.length === 0) {
        return res.status(400).json({ error: "bankOrgIds array is required" });
      }

      const deal = await storage.getDeal(dealId);
      if (!deal) {
        return res.status(404).json({ error: "Deal not found" });
      }

      if (deal.status !== "rfp_stage") {
        return res.status(400).json({ error: "Deal must be in RFP stage to invite banks" });
      }

      const invited = [];
      for (const bankOrgId of bankOrgIds) {
        // Verify it's a bank org
        const org = await storage.getOrganization(bankOrgId);
        if (!org || org.orgType !== "bank") {
          continue; // Skip non-bank orgs
        }

        // Check if already invited
        const existing = await storage.getCandidateByDealAndBank(dealId, bankOrgId);
        if (existing) {
          invited.push({ bankOrgId, status: "already_invited" });
          continue;
        }

        // Create candidate
        await storage.createCandidate({
          dealId,
          bankOrgId,
          invitedByUserId: user.id,
          status: "invited",
        });

        invited.push({ bankOrgId, status: "invited" });
      }

      await auditLogFromRequest(req, "INVITE_BANK_RFP", {
        resourceType: "deal",
        resourceId: dealId,
        dealId,
        metadata: { bankOrgIds, invitedBy: user.id },
      });

      res.json({ success: true, invited });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // GET /api/deals/:dealId/proposals - List proposals (issuer: all, bank: own only)
  app.get("/api/deals/:dealId/proposals", requireAuth, requireRfpAccess, async (req, res) => {
    try {
      const { dealId } = req.params;
      const user = req.user as SessionUser;
      const role = user.role.toLowerCase();
      const bankOrgId = (req as any).bankOrgId;

      // Issuers see all proposals
      if (role === "issuer" || role === "sponsor") {
        const proposals = await storage.listProposalsByDeal(dealId);

        // Enrich with bank info
        const enrichedProposals = await Promise.all(
          proposals.map(async (proposal) => {
            const org = await storage.getOrganization(proposal.bankOrgId);
            const submitter = proposal.submittedByUserId
              ? await storage.getUser(proposal.submittedByUserId)
              : null;
            return {
              ...proposal,
              bankName: org?.name || "Unknown",
              submittedByName: submitter ? `${submitter.firstName} ${submitter.lastName}` : null,
            };
          })
        );

        return res.json(enrichedProposals);
      }

      // Bank candidates see only their own
      const proposal = await storage.getProposalByDealAndBank(dealId, bankOrgId);
      return res.json(proposal ? [proposal] : []);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // GET /api/deals/:dealId/proposals/compare - Compare all submitted proposals (issuer only)
  app.get("/api/deals/:dealId/proposals/compare", requireAuth, requireRole("issuer", "sponsor"), async (req, res) => {
    try {
      const { dealId } = req.params;
      const proposals = await storage.listProposalsByDeal(dealId);
      const submittedProposals = proposals.filter(p => p.status === "submitted" || p.status === "selected");

      // Enrich with bank info and calculate all-in cost
      const enrichedProposals = await Promise.all(
        submittedProposals.map(async (proposal) => {
          const org = await storage.getOrganization(proposal.bankOrgId);

          // Calculate all-in yield: margin + (OID + upfront fee) / tenor
          const margin = proposal.interestMarginBps || 0;
          const oid = proposal.oidBps || 0;
          const fee = proposal.upfrontFeeBps || 0;
          const tenor = proposal.tenorYears ? parseFloat(proposal.tenorYears) : 0;
          const allInBps = tenor > 0
            ? Math.round(margin + (oid + fee) / tenor)
            : margin;

          return {
            ...proposal,
            bankName: org?.name || "Unknown",
            allInBps,
          };
        })
      );

      // Sort by all-in cost (lowest first)
      enrichedProposals.sort((a, b) => a.allInBps - b.allInBps);

      res.json(enrichedProposals);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // POST /api/deals/:dealId/proposals - Create/update proposal (bank candidate only)
  app.post("/api/deals/:dealId/proposals", requireAuth, requireBankCandidate, async (req, res) => {
    try {
      const { dealId } = req.params;
      const user = req.user as SessionUser;
      const bankOrgId = (req as any).bankOrgId;

      // Check if deal is in RFP stage
      const deal = await storage.getDeal(dealId);
      if (!deal) {
        return res.status(404).json({ error: "Deal not found" });
      }
      if (deal.status !== "rfp_stage") {
        return res.status(400).json({ error: "Deal is not in RFP stage" });
      }

      // Check for existing proposal
      const existing = await storage.getProposalByDealAndBank(dealId, bankOrgId);
      if (existing) {
        // Update existing proposal (only if still draft)
        if (existing.status !== "draft") {
          return res.status(400).json({ error: "Cannot modify submitted proposal" });
        }
        const validated = insertFinancingProposalSchema.partial().parse(req.body);
        const updated = await storage.updateProposal(existing.id, validated);

        await storage.setCandidateStatus(dealId, bankOrgId, "drafting");

        await auditLogFromRequest(req, "SAVE_PROPOSAL_DRAFT", {
          resourceType: "financing_proposal",
          resourceId: existing.id,
          dealId,
          metadata: { bankOrgId },
        });

        return res.json(updated);
      }

      // Create new proposal
      const validated = insertFinancingProposalSchema.parse({
        ...req.body,
        dealId,
        bankOrgId,
        submittedByUserId: user.id,
        status: "draft",
      });

      const proposal = await storage.createProposal(validated);
      await storage.setCandidateStatus(dealId, bankOrgId, "drafting");

      await auditLogFromRequest(req, "SAVE_PROPOSAL_DRAFT", {
        resourceType: "financing_proposal",
        resourceId: proposal.id,
        dealId,
        metadata: { bankOrgId },
      });

      res.status(201).json(proposal);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // POST /api/deals/:dealId/proposals/submit - Submit proposal (bank candidate only)
  app.post("/api/deals/:dealId/proposals/submit", requireAuth, requireBankCandidate, async (req, res) => {
    try {
      const { dealId } = req.params;
      const user = req.user as SessionUser;
      const bankOrgId = (req as any).bankOrgId;

      const proposal = await storage.getProposalByDealAndBank(dealId, bankOrgId);
      if (!proposal) {
        return res.status(404).json({ error: "No proposal found. Save a draft first." });
      }

      if (proposal.status !== "draft") {
        return res.status(400).json({ error: "Proposal already submitted" });
      }

      const updated = await storage.submitProposal(proposal.id);
      await storage.setCandidateStatus(dealId, bankOrgId, "submitted");

      await auditLogFromRequest(req, "SUBMIT_PROPOSAL", {
        resourceType: "financing_proposal",
        resourceId: proposal.id,
        dealId,
        metadata: { bankOrgId },
      });

      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // POST /api/deals/:dealId/rfp/award - Award mandate (issuer only)
  app.post("/api/deals/:dealId/rfp/award", requireAuth, requireRole("issuer", "sponsor"), async (req, res) => {
    try {
      const { dealId } = req.params;
      const user = req.user as SessionUser;
      const { bankOrgId } = req.body;

      if (!bankOrgId) {
        return res.status(400).json({ error: "bankOrgId is required" });
      }

      const deal = await storage.getDeal(dealId);
      if (!deal) {
        return res.status(404).json({ error: "Deal not found" });
      }

      if (deal.status !== "rfp_stage") {
        return res.status(400).json({ error: "Deal is not in RFP stage" });
      }

      // Verify bank is a candidate with submitted proposal
      const candidate = await storage.getCandidateByDealAndBank(dealId, bankOrgId);
      if (!candidate) {
        return res.status(400).json({ error: "Bank is not a candidate for this deal" });
      }

      const proposal = await storage.getProposalByDealAndBank(dealId, bankOrgId);
      if (!proposal || proposal.status !== "submitted") {
        return res.status(400).json({ error: "Bank has not submitted a proposal" });
      }

      // Award mandate
      const updatedDeal = await storage.awardMandate(dealId, bankOrgId);

      await auditLogFromRequest(req, "AWARD_MANDATE", {
        resourceType: "deal",
        resourceId: dealId,
        dealId,
        metadata: { bankOrgId, awardedBy: user.id },
      });

      res.json({
        success: true,
        message: "Mandate awarded successfully",
        deal: updatedDeal,
      });
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

  // ========== MASTER DOCUMENTS (Legal Negotiation) ==========

  // Helper: check if lender has legal tier access
  async function hasLegalTierAccess(req: Request, dealId: string): Promise<boolean> {
    const user = req.user as SessionUser;
    if (!user) return false;

    const role = user.role.toLowerCase();
    // Internal users always have access
    if (role === "bookrunner" || role === "issuer" || role === "sponsor") {
      return true;
    }

    // Lenders need legal tier
    if ((role === "lender" || role === "investor") && user.lenderId) {
      const invitation = await storage.getInvitation(dealId, user.lenderId);
      return invitation?.accessTier === "legal" && !!invitation?.ndaSignedAt;
    }

    return false;
  }

  // GET /api/deals/:dealId/master-docs - List master docs (internal only)
  app.get("/api/deals/:dealId/master-docs", requireAuth, ensureInternalOnly, async (req, res) => {
    try {
      const { dealId } = req.params;
      const masterDocs = await storage.listMasterDocsByDeal(dealId);

      // Enrich with version and markup counts
      const enrichedDocs = await Promise.all(
        masterDocs.map(async (doc) => {
          const versions = await storage.listVersionsByMasterDoc(doc.id);
          const markups = await storage.listMarkupsByMasterDoc(doc.id);

          return {
            ...doc,
            versionCount: versions.length,
            currentVersionNumber: versions.length > 0 ? versions[0].versionNumber : 0,
            markupCounts: {
              total: markups.length,
              uploaded: markups.filter(m => m.status === "uploaded").length,
              reviewing: markups.filter(m => m.status === "reviewing").length,
              incorporated: markups.filter(m => m.status === "incorporated").length,
              rejected: markups.filter(m => m.status === "rejected").length,
            },
          };
        })
      );

      res.json(enrichedDocs);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // POST /api/deals/:dealId/master-docs/ensure - Ensure 3 master docs exist (internal only)
  app.post("/api/deals/:dealId/master-docs/ensure", requireAuth, ensureInternalOnly, async (req, res) => {
    try {
      const { dealId } = req.params;
      const user = req.user as SessionUser;

      const masterDocs = await storage.ensureMasterDocsForDeal(dealId, user.id);
      res.json(masterDocs);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // GET /api/deals/:dealId/master-docs/:docKey - Get master doc with versions and markups
  // Internal users see all markups; lenders with legal tier see only their own
  app.get("/api/deals/:dealId/master-docs/:docKey", requireAuth, async (req, res) => {
    try {
      const { dealId, docKey } = req.params;
      const user = req.user as SessionUser;
      const role = user.role.toLowerCase();

      // Check access
      const hasAccess = await hasLegalTierAccess(req, dealId);
      if (!hasAccess) {
        return res.status(403).json({
          error: "Legal tier access required",
          code: "LEGAL_TIER_REQUIRED"
        });
      }

      const masterDoc = await storage.getMasterDocByKey(dealId, docKey);
      if (!masterDoc) {
        return res.status(404).json({ error: "Master document not found" });
      }

      // Get versions
      const versions = await storage.listVersionsByMasterDoc(masterDoc.id);

      // Get markups - filter for lenders
      let markups = await storage.listMarkupsByMasterDoc(masterDoc.id);
      const isInternal = role === "bookrunner" || role === "issuer" || role === "sponsor";

      if (!isInternal && user.lenderId) {
        // Lenders see only their own markups
        markups = markups.filter(m => m.lenderId === user.lenderId);
      }

      // Enrich markups with lender info for internal users
      const enrichedMarkups = isInternal
        ? await Promise.all(
            markups.map(async (markup) => {
              const lender = await storage.getLender(markup.lenderId);
              return {
                ...markup,
                lender: lender ? {
                  id: lender.id,
                  firstName: lender.firstName,
                  lastName: lender.lastName,
                  organization: lender.organization,
                } : null,
              };
            })
          )
        : markups;

      // Log view
      await audit.viewNegotiationDoc(req, dealId, docKey);

      res.json({
        ...masterDoc,
        versions,
        markups: enrichedMarkups,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // POST /api/deals/:dealId/master-docs/:docKey/versions - Upload new master version (internal only)
  app.post("/api/deals/:dealId/master-docs/:docKey/versions", requireAuth, ensureInternalOnly, async (req, res) => {
    try {
      const { dealId, docKey } = req.params;
      const user = req.user as SessionUser;
      const { filePath, mimeType, changeSummary } = req.body;

      if (!filePath) {
        return res.status(400).json({ error: "filePath is required" });
      }

      // Get or create master doc
      let masterDoc = await storage.getMasterDocByKey(dealId, docKey);
      if (!masterDoc) {
        // Auto-create if missing
        const docs = await storage.ensureMasterDocsForDeal(dealId, user.id);
        masterDoc = docs.find(d => d.docKey === docKey);
        if (!masterDoc) {
          return res.status(400).json({ error: "Invalid docKey" });
        }
      }

      // Create version
      const version = await storage.createDocumentVersion({
        masterDocId: masterDoc.id,
        filePath,
        mimeType,
        uploadedBy: user.id,
        changeSummary,
      });

      // Log audit
      await audit.uploadMasterVersion(req, dealId, version.id, docKey, version.versionNumber);

      res.status(201).json(version);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // POST /api/deals/:dealId/master-docs/:docKey/markups - Submit lender markup (legal tier lenders only)
  app.post("/api/deals/:dealId/master-docs/:docKey/markups", requireAuth, async (req, res) => {
    try {
      const { dealId, docKey } = req.params;
      const user = req.user as SessionUser;
      const role = user.role.toLowerCase();

      // Only lenders can submit markups
      if (role !== "lender" && role !== "investor") {
        return res.status(403).json({ error: "Only lenders can submit markups" });
      }

      if (!user.lenderId) {
        return res.status(400).json({ error: "Lender ID required" });
      }

      // Check legal tier access
      const hasAccess = await hasLegalTierAccess(req, dealId);
      if (!hasAccess) {
        return res.status(403).json({
          error: "Legal tier access required to submit markups",
          code: "LEGAL_TIER_REQUIRED"
        });
      }

      const { filePath, mimeType, notes } = req.body;

      if (!filePath) {
        return res.status(400).json({ error: "filePath is required" });
      }

      const masterDoc = await storage.getMasterDocByKey(dealId, docKey);
      if (!masterDoc) {
        return res.status(404).json({ error: "Master document not found" });
      }

      // Create markup
      const markup = await storage.createLenderMarkup({
        masterDocId: masterDoc.id,
        lenderId: user.lenderId,
        filePath,
        mimeType,
        uploadedByUserId: user.id,
        notes,
      });

      // Log audit
      await audit.uploadLenderMarkup(req, dealId, markup.id, docKey, user.lenderId);

      res.status(201).json(markup);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // PATCH /api/markups/:markupId - Review markup (internal only)
  app.patch("/api/markups/:markupId", requireAuth, ensureInternalOnly, async (req, res) => {
    try {
      const { markupId } = req.params;
      const { status, notes, incorporatedVersionId } = req.body;

      const existingMarkup = await storage.getLenderMarkup(markupId);
      if (!existingMarkup) {
        return res.status(404).json({ error: "Markup not found" });
      }

      const updated = await storage.updateLenderMarkup(markupId, {
        status,
        notes,
        incorporatedVersionId,
      });

      // Get master doc for deal ID
      const masterDoc = await storage.getMasterDoc(existingMarkup.masterDocId);
      if (masterDoc) {
        await audit.reviewMarkup(req, masterDoc.dealId, markupId, status);
      }

      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // GET /api/deals/:dealId/lender-progress - Enhanced lender progress with markup status (internal only)
  app.get("/api/deals/:dealId/lender-progress", requireAuth, ensureInternalOnly, async (req, res) => {
    try {
      const { dealId } = req.params;

      // Get invitations for this deal
      const invitations = await storage.listInvitationsByDeal(dealId);

      // Get master docs
      const masterDocs = await storage.listMasterDocsByDeal(dealId);

      // Get Q&A counts
      const qaItems = await storage.listQAByDeal(dealId);

      // Get syndicate book for IOI status
      const syndicateEntries = await storage.listSyndicateBookByDeal(dealId);

      // Get all logs for the deal (for activity tracking)
      const allLogs = await storage.listLogsByDeal(dealId, 1000);

      // Get total document count for the deal
      const allDocuments = await storage.listDocumentsByDeal(dealId);
      const totalDocuments = allDocuments.length;

      // Document view action types
      const docViewActions = ['DOWNLOAD_DOC', 'VIEW_DOC', 'WATERMARK_STREAM'];

      // Build progress data
      const lenderProgress = await Promise.all(
        invitations.map(async (inv) => {
          const lender = await storage.getLender(inv.lenderId);
          if (!lender) return null;

          // Get markup status for each doc
          const markupStatus: Record<string, { count: number; pending: number }> = {};
          for (const doc of masterDocs) {
            const markups = await storage.listMarkupsByLender(doc.id, inv.lenderId);
            markupStatus[doc.docKey] = {
              count: markups.length,
              pending: markups.filter(m => m.status === "uploaded" || m.status === "reviewing").length,
            };
          }

          // Get Q&A count for this lender
          const lenderQAItems = qaItems.filter(q => q.lenderId === inv.lenderId);
          const openQACount = lenderQAItems.filter(q => q.status === "open").length;

          // Get syndicate entry for IOI status
          const syndicateEntry = syndicateEntries.find(e => e.lenderId === inv.lenderId);

          // Get lender's activity from logs
          const lenderLogs = allLogs.filter(log => log.lenderId === inv.lenderId);

          // Get documents viewed (unique document IDs from view/download actions)
          const viewedDocIds = new Set(
            lenderLogs
              .filter(log => docViewActions.includes(log.action) && log.resourceId)
              .map(log => log.resourceId)
          );
          const documentsViewed = viewedDocIds.size;

          // Get last activity timestamp from logs (most recent)
          const lastActivityLog = lenderLogs.length > 0 ? lenderLogs[0] : null;
          const lastActivity = lastActivityLog?.createdAt || inv.ndaSignedAt || inv.invitedAt;

          return {
            lenderId: inv.lenderId,
            lenderName: lender.organization,
            contactName: `${lender.firstName} ${lender.lastName}`,
            email: lender.email,
            ndaStatus: inv.ndaSignedAt ? "signed" : "pending",
            ndaSignedAt: inv.ndaSignedAt,
            accessTier: inv.accessTier,
            ioiStatus: syndicateEntry?.status || "invited",
            ioiAmount: syndicateEntry?.indicatedAmount || null,
            markupStatus,
            openQACount,
            lastActivity,
            documentsViewed,
          };
        })
      );

      // Filter out null entries
      const validProgress = lenderProgress.filter(p => p !== null);

      res.json({
        lenders: validProgress,
        masterDocs: masterDocs.map(d => ({ docKey: d.docKey, title: d.title })),
        totalDocuments,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  return httpServer;
}
