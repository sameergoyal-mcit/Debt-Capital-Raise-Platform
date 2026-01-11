import type { Request, Response, NextFunction } from "express";
import { storage } from "../storage";
import type { SessionUser } from "../auth";
import { getLenderAccessContext, type LenderAccessContext } from "./requireNDA";

/**
 * Document visibility tiers and what they can access:
 * - early: lender_presentation, supplemental, teaser
 * - full: early + paydown_model, kyc, financial_model
 * - legal: full + legal docs (credit agreement, etc.)
 */
const TIER_HIERARCHY: Record<string, string[]> = {
  early: ["early", "teaser"],
  full: ["early", "teaser", "full"],
  legal: ["early", "teaser", "full", "legal"],
};

/**
 * Check if a document tier is accessible given user's access tier
 */
export function canAccessDocTier(
  userTier: "early" | "full" | "legal",
  docTier: string
): boolean {
  const allowedTiers = TIER_HIERARCHY[userTier] || TIER_HIERARCHY["early"];
  return allowedTiers.includes(docTier.toLowerCase());
}

/**
 * Middleware to check document access based on tier
 * Should be used after requireDealAccess and requireNDA
 *
 * For document download routes, this checks:
 * 1. User must be authenticated
 * 2. User must have deal access
 * 3. Lenders must have NDA signed
 * 4. Document tier must be within user's access tier
 */
export function requireDocAccess(req: Request, res: Response, next: NextFunction) {
  (async () => {
    try {
      const user = req.user as SessionUser;

      if (!user) {
        return res.status(401).json({
          error: "Authentication required",
          code: "UNAUTHORIZED"
        });
      }

      // Get document ID from route params
      const documentId = req.params.documentId || req.params.id;

      if (!documentId) {
        return res.status(400).json({
          error: "Document ID required",
          code: "BAD_REQUEST"
        });
      }

      // Fetch the document
      const document = await storage.getDocument(documentId);

      if (!document) {
        return res.status(404).json({
          error: "Document not found",
          code: "NOT_FOUND"
        });
      }

      // Store document on request
      (req as any).document = document;

      const userRole = user.role.toLowerCase();

      // Bookrunner and issuer have full access
      if (userRole === "bookrunner" || userRole === "issuer" || userRole === "sponsor") {
        return next();
      }

      // Lender access checks
      if (userRole === "lender") {
        if (!user.lenderId) {
          return res.status(403).json({
            error: "Lender profile not found",
            code: "LENDER_NOT_FOUND"
          });
        }

        // Check invitation and NDA
        const accessContext = await getLenderAccessContext(req, document.dealId);

        if (!accessContext) {
          return res.status(403).json({
            error: "You are not invited to this deal",
            code: "NO_INVITATION"
          });
        }

        // Store access context
        (req as any).lenderAccess = accessContext;

        // Check NDA wall
        if (accessContext.ndaWall) {
          return res.status(403).json({
            error: "NDA signature required to download documents",
            code: "NDA_REQUIRED",
            ndaRequired: true,
          });
        }

        // Check tier access
        const docTier = (document.visibilityTier || "early").toLowerCase();
        const userTier = accessContext.accessTier;

        if (!canAccessDocTier(userTier, docTier)) {
          return res.status(403).json({
            error: `Your access tier (${userTier}) does not permit viewing ${docTier} documents`,
            code: "INSUFFICIENT_TIER",
            requiredTier: docTier,
            userTier: userTier,
          });
        }

        return next();
      }

      // Unknown role - deny access
      return res.status(403).json({
        error: "Access denied",
        code: "FORBIDDEN"
      });

    } catch (error: any) {
      console.error("requireDocAccess error:", error);
      return res.status(500).json({
        error: "Internal server error",
        code: "SERVER_ERROR"
      });
    }
  })();
}

/**
 * Filter documents list based on user's access tier
 * Returns only documents the user is allowed to see
 */
export function filterDocumentsByTier(
  documents: any[],
  accessTier: "early" | "full" | "legal"
): any[] {
  return documents.filter((doc) => {
    const docTier = (doc.visibilityTier || "early").toLowerCase();
    return canAccessDocTier(accessTier, docTier);
  });
}
