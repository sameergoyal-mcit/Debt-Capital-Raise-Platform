// Re-export all middleware
export { requireDealAccess, getDealAccessContext, type DealAccessContext } from "./requireDealAccess";
export {
  requireNDA,
  checkNDA,
  getLenderAccessContext,
  getLenderAccess,
  hasNDAWall,
  type LenderAccessContext,
} from "./requireNDA";
export { requireDocAccess, filterDocumentsByTier, canAccessDocTier } from "./requireDocAccess";

// Re-export auth middleware
export { requireAuth, requireRole, getSessionUser, type SessionUser } from "../auth";
