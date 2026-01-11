import type { Request, Response, NextFunction } from "express";
import { storage } from "../storage";
import type { SessionUser } from "../auth";

/**
 * Lender access context with NDA status
 */
export interface LenderAccessContext {
  ndaSigned: boolean;
  ndaRequired: boolean;
  accessTier: "early" | "full" | "legal";
  ndaWall: boolean;
  invitation: any;
}

/**
 * Get lender access context for a deal
 * This can be called manually in routes that need NDA info without blocking
 */
export async function getLenderAccessContext(
  req: Request,
  dealId: string
): Promise<LenderAccessContext | null> {
  const user = req.user as SessionUser;

  if (!user || user.role.toLowerCase() !== "lender") {
    return null;
  }

  if (!user.lenderId) {
    return null;
  }

  // Try to get invitation from request first (if requireDealAccess already ran)
  let invitation = (req as any).invitation;

  if (!invitation) {
    invitation = await storage.getInvitation(dealId, user.lenderId);
  }

  if (!invitation) {
    return null;
  }

  const ndaRequired = invitation.ndaRequired !== false; // Default to true
  const ndaSigned = !!invitation.ndaSignedAt;
  const ndaWall = ndaRequired && !ndaSigned;

  return {
    ndaSigned,
    ndaRequired,
    accessTier: (invitation.accessTier || "early") as "early" | "full" | "legal",
    ndaWall,
    invitation,
  };
}

/**
 * Middleware that blocks access if NDA is required but not signed
 * Only applies to lender role - other roles pass through
 *
 * Use this for endpoints that REQUIRE NDA to be signed
 */
export function requireNDA(req: Request, res: Response, next: NextFunction) {
  (async () => {
    try {
      const user = req.user as SessionUser;

      if (!user) {
        return res.status(401).json({
          error: "Authentication required",
          code: "UNAUTHORIZED"
        });
      }

      // Non-lenders bypass NDA check
      const userRole = user.role.toLowerCase();
      if (userRole !== "lender") {
        return next();
      }

      // Get deal ID from route params
      const dealId = req.params.id || req.params.dealId;

      if (!dealId) {
        return res.status(400).json({
          error: "Deal ID required",
          code: "BAD_REQUEST"
        });
      }

      const accessContext = await getLenderAccessContext(req, dealId);

      if (!accessContext) {
        return res.status(403).json({
          error: "You are not invited to this deal",
          code: "NO_INVITATION"
        });
      }

      // Store access context on request
      (req as any).lenderAccess = accessContext;

      if (accessContext.ndaWall) {
        return res.status(403).json({
          error: "NDA signature required to access this resource",
          code: "NDA_REQUIRED",
          ndaRequired: true,
        });
      }

      return next();

    } catch (error: any) {
      console.error("requireNDA error:", error);
      return res.status(500).json({
        error: "Internal server error",
        code: "SERVER_ERROR"
      });
    }
  })();
}

/**
 * Middleware that sets NDA context but does NOT block access
 * Use this for endpoints that can return limited data behind NDA wall
 */
export function checkNDA(req: Request, res: Response, next: NextFunction) {
  (async () => {
    try {
      const user = req.user as SessionUser;

      if (!user) {
        return next();
      }

      // Non-lenders bypass NDA check
      const userRole = user.role.toLowerCase();
      if (userRole !== "lender") {
        return next();
      }

      // Get deal ID from route params
      const dealId = req.params.id || req.params.dealId;

      if (!dealId) {
        return next();
      }

      const accessContext = await getLenderAccessContext(req, dealId);

      if (accessContext) {
        (req as any).lenderAccess = accessContext;
      }

      return next();

    } catch (error: any) {
      console.error("checkNDA error:", error);
      return next();
    }
  })();
}

/**
 * Helper to check if request has NDA wall active
 */
export function hasNDAWall(req: Request): boolean {
  const lenderAccess = (req as any).lenderAccess as LenderAccessContext | undefined;
  return lenderAccess?.ndaWall === true;
}

/**
 * Helper to get lender access context from request
 */
export function getLenderAccess(req: Request): LenderAccessContext | undefined {
  return (req as any).lenderAccess;
}
