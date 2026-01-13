import type { Request } from "express";
import { storage } from "../storage";
import type { SessionUser } from "../auth";

/**
 * Standard audit action types
 */
export const AuditActions = {
  // Auth actions
  AUTH_LOGIN: "AUTH_LOGIN",
  AUTH_LOGOUT: "AUTH_LOGOUT",
  AUTH_REGISTER: "AUTH_REGISTER",

  // Deal actions
  VIEW_DEAL: "VIEW_DEAL",
  CREATE_DEAL: "CREATE_DEAL",
  UPDATE_DEAL: "UPDATE_DEAL",

  // Document actions
  LIST_DOCS: "LIST_DOCS",
  VIEW_DOC: "VIEW_DOC",
  DOWNLOAD_DOC: "DOWNLOAD_DOC",
  UPLOAD_DOC: "UPLOAD_DOC",
  WATERMARK_STREAM: "WATERMARK_STREAM",

  // NDA actions
  SIGN_NDA: "SIGN_NDA",

  // Q&A actions
  SUBMIT_QA: "SUBMIT_QA",
  ANSWER_QA: "ANSWER_QA",
  VIEW_QA: "VIEW_QA",

  // IOI actions
  SUBMIT_IOI: "SUBMIT_IOI",
  UPDATE_IOI: "UPDATE_IOI",
  WITHDRAW_IOI: "WITHDRAW_IOI",

  // Commitment actions
  SUBMIT_COMMITMENT: "SUBMIT_COMMITMENT",

  // Syndicate actions
  VIEW_SYNDICATE: "VIEW_SYNDICATE",
  UPDATE_SYNDICATE: "UPDATE_SYNDICATE",

  // Invitation actions
  CREATE_INVITATION: "CREATE_INVITATION",
  UPDATE_TIER: "UPDATE_TIER",

  // Closing items actions
  CREATE_CLOSING_ITEM: "CREATE_CLOSING_ITEM",
  UPDATE_CLOSING_ITEM: "UPDATE_CLOSING_ITEM",
  DELETE_CLOSING_ITEM: "DELETE_CLOSING_ITEM",
  UPLOAD_CLOSING_ITEM: "UPLOAD_CLOSING_ITEM",
  APPROVE_CLOSING_ITEM: "APPROVE_CLOSING_ITEM",

  // Legal Negotiation actions
  UPLOAD_MASTER_VERSION: "UPLOAD_MASTER_VERSION",
  UPLOAD_LENDER_MARKUP: "UPLOAD_LENDER_MARKUP",
  REVIEW_MARKUP: "REVIEW_MARKUP",
  VIEW_NEGOTIATION_DOC: "VIEW_NEGOTIATION_DOC",
} as const;

export type AuditAction = (typeof AuditActions)[keyof typeof AuditActions];

/**
 * Audit log parameters
 */
export interface AuditLogParams {
  userId?: string | null;
  dealId?: string | null;
  lenderId?: string | null;
  action: AuditAction | string;
  resourceType?: string;
  resourceId?: string | null;
  metadata?: Record<string, any>;
}

/**
 * Create an audit log entry
 */
export async function auditLog(params: AuditLogParams): Promise<void> {
  try {
    await storage.createLog({
      userId: params.userId || null,
      dealId: params.dealId || null,
      lenderId: params.lenderId || null,
      actorRole: "system",
      actorEmail: null,
      action: params.action,
      resourceType: params.resourceType || null,
      resourceId: params.resourceId || null,
      metadata: params.metadata || null,
    });
  } catch (error) {
    console.error("Failed to create audit log:", error);
    // Don't throw - audit logging should not break the main operation
  }
}

/**
 * Create audit log from request context
 */
export async function auditLogFromRequest(
  req: Request,
  action: AuditAction | string,
  params?: {
    resourceType?: string;
    resourceId?: string | null;
    metadata?: Record<string, any>;
    dealId?: string | null;
    lenderId?: string | null;
  }
): Promise<void> {
  try {
    const user = req.user as SessionUser | undefined;
    const deal = (req as any).deal;

    await storage.createLog({
      userId: user?.id || null,
      dealId: params?.dealId ?? deal?.id ?? null,
      lenderId: params?.lenderId ?? user?.lenderId ?? null,
      actorRole: user?.role || "anonymous",
      actorEmail: user?.email || null,
      action,
      resourceType: params?.resourceType || null,
      resourceId: params?.resourceId || null,
      metadata: {
        ...params?.metadata,
        ip: req.ip,
        userAgent: req.headers["user-agent"],
      } as Record<string, any>,
    });
  } catch (error) {
    console.error("Failed to create audit log:", error);
    // Don't throw - audit logging should not break the main operation
  }
}

/**
 * Convenience functions for common audit actions
 */
export const audit = {
  async viewDeal(req: Request, dealId: string): Promise<void> {
    await auditLogFromRequest(req, AuditActions.VIEW_DEAL, {
      resourceType: "deal",
      resourceId: dealId,
      dealId,
    });
  },

  async downloadDoc(
    req: Request,
    documentId: string,
    dealId: string,
    documentName?: string
  ): Promise<void> {
    await auditLogFromRequest(req, AuditActions.DOWNLOAD_DOC, {
      resourceType: "document",
      resourceId: documentId,
      dealId,
      metadata: { documentName },
    });
  },

  async watermarkStream(
    req: Request,
    documentId: string,
    dealId: string,
    documentName?: string
  ): Promise<void> {
    await auditLogFromRequest(req, AuditActions.WATERMARK_STREAM, {
      resourceType: "document",
      resourceId: documentId,
      dealId,
      metadata: { documentName, watermarked: true },
    });
  },

  async signNDA(req: Request, dealId: string, lenderId: string): Promise<void> {
    await auditLogFromRequest(req, AuditActions.SIGN_NDA, {
      resourceType: "invitation",
      dealId,
      lenderId,
      metadata: { ndaSigned: true },
    });
  },

  async submitQA(req: Request, dealId: string, qaId: string): Promise<void> {
    await auditLogFromRequest(req, AuditActions.SUBMIT_QA, {
      resourceType: "qa",
      resourceId: qaId,
      dealId,
    });
  },

  async answerQA(req: Request, dealId: string, qaId: string): Promise<void> {
    await auditLogFromRequest(req, AuditActions.ANSWER_QA, {
      resourceType: "qa",
      resourceId: qaId,
      dealId,
    });
  },

  async submitIOI(
    req: Request,
    dealId: string,
    indicationId: string,
    amount: string
  ): Promise<void> {
    await auditLogFromRequest(req, AuditActions.SUBMIT_IOI, {
      resourceType: "indication",
      resourceId: indicationId,
      dealId,
      metadata: { amount },
    });
  },

  async withdrawIOI(
    req: Request,
    dealId: string,
    indicationId: string
  ): Promise<void> {
    await auditLogFromRequest(req, AuditActions.WITHDRAW_IOI, {
      resourceType: "indication",
      resourceId: indicationId,
      dealId,
    });
  },

  async uploadMasterVersion(
    req: Request,
    dealId: string,
    versionId: string,
    docKey: string,
    versionNumber: number
  ): Promise<void> {
    await auditLogFromRequest(req, AuditActions.UPLOAD_MASTER_VERSION, {
      resourceType: "document_version",
      resourceId: versionId,
      dealId,
      metadata: { docKey, versionNumber },
    });
  },

  async uploadLenderMarkup(
    req: Request,
    dealId: string,
    markupId: string,
    docKey: string,
    lenderId: string
  ): Promise<void> {
    await auditLogFromRequest(req, AuditActions.UPLOAD_LENDER_MARKUP, {
      resourceType: "lender_markup",
      resourceId: markupId,
      dealId,
      lenderId,
      metadata: { docKey },
    });
  },

  async reviewMarkup(
    req: Request,
    dealId: string,
    markupId: string,
    newStatus: string
  ): Promise<void> {
    await auditLogFromRequest(req, AuditActions.REVIEW_MARKUP, {
      resourceType: "lender_markup",
      resourceId: markupId,
      dealId,
      metadata: { newStatus },
    });
  },

  async viewNegotiationDoc(
    req: Request,
    dealId: string,
    docKey: string
  ): Promise<void> {
    await auditLogFromRequest(req, AuditActions.VIEW_NEGOTIATION_DOC, {
      resourceType: "master_document",
      dealId,
      metadata: { docKey },
    });
  },
};
