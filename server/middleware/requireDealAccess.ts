import type { Request, Response, NextFunction } from "express";
import { storage } from "../storage";
import type { SessionUser } from "../auth";

/**
 * Middleware to verify user has access to a specific deal
 *
 * Access rules:
 * - sponsor/issuer: must be deal.sponsorId owner
 * - bookrunner: allowed access to all deals (MVP simplification)
 * - lender: must have an invitation for the deal
 */
export function requireDealAccess(req: Request, res: Response, next: NextFunction) {
  (async () => {
    try {
      const user = req.user as SessionUser;

      if (!user) {
        return res.status(401).json({
          error: "Authentication required",
          code: "UNAUTHORIZED"
        });
      }

      // Get deal ID from route params (support both :id and :dealId)
      const dealId = req.params.id || req.params.dealId;

      if (!dealId) {
        return res.status(400).json({
          error: "Deal ID required",
          code: "BAD_REQUEST"
        });
      }

      // Fetch the deal
      const deal = await storage.getDeal(dealId);

      if (!deal) {
        return res.status(404).json({
          error: "Deal not found",
          code: "NOT_FOUND"
        });
      }

      // Store deal on request for downstream use
      (req as any).deal = deal;

      const userRole = user.role.toLowerCase();

      // Bookrunner has access to all deals (MVP)
      if (userRole === "bookrunner") {
        return next();
      }

      // Sponsor/Issuer must own the deal
      if (userRole === "sponsor" || userRole === "issuer") {
        if (deal.sponsorId === user.id) {
          return next();
        }
        return res.status(403).json({
          error: "You do not have access to this deal",
          code: "FORBIDDEN"
        });
      }

      // Lender must have an invitation
      if (userRole === "lender") {
        if (!user.lenderId) {
          return res.status(403).json({
            error: "Lender profile not found",
            code: "LENDER_NOT_FOUND"
          });
        }

        const invitation = await storage.getInvitation(dealId, user.lenderId);

        if (!invitation) {
          return res.status(403).json({
            error: "You are not invited to this deal",
            code: "NO_INVITATION"
          });
        }

        // Store invitation on request for downstream use
        (req as any).invitation = invitation;

        return next();
      }

      // Unknown role - deny access
      return res.status(403).json({
        error: "Access denied",
        code: "FORBIDDEN"
      });

    } catch (error: any) {
      console.error("requireDealAccess error:", error);
      return res.status(500).json({
        error: "Internal server error",
        code: "SERVER_ERROR"
      });
    }
  })();
}

/**
 * Helper to get deal access context from request
 */
export interface DealAccessContext {
  deal: any;
  invitation?: any;
  isOwner: boolean;
  isBookrunner: boolean;
  isLender: boolean;
}

export function getDealAccessContext(req: Request): DealAccessContext | null {
  const user = req.user as SessionUser;
  const deal = (req as any).deal;
  const invitation = (req as any).invitation;

  if (!user || !deal) return null;

  const userRole = user.role.toLowerCase();

  return {
    deal,
    invitation,
    isOwner: userRole === "sponsor" || userRole === "issuer",
    isBookrunner: userRole === "bookrunner",
    isLender: userRole === "lender",
  };
}
