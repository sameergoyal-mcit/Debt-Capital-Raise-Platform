/**
 * React Query hooks for all API endpoints.
 * Provides typed data fetching with automatic caching and refetching.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, apiPost, apiPatch, apiDelete, apiPut } from "@/lib/api";
import type {
  Deal,
  Lender,
  Invitation,
  Document,
  QAItem,
  Commitment,
  Log,
  ClosingItem,
  SyndicateBookEntry,
  Indication,
  Organization,
  FinancingProposal,
  PriorQaItem,
} from "@shared/schema";

// ============================================
// DEALS
// ============================================

export function useDeals() {
  return useQuery({
    queryKey: ["deals"],
    queryFn: () => api<Deal[]>("/api/deals"),
  });
}

export function useDeal(dealId: string | undefined) {
  return useQuery({
    queryKey: ["deal", dealId],
    queryFn: () => api<Deal>(`/api/deals/${dealId}`),
    enabled: !!dealId,
  });
}

export function useCreateDeal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Deal>) => apiPost<Deal>("/api/deals", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deals"] });
    },
  });
}

export function useUpdateDeal(dealId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Deal>) => apiPatch<Deal>(`/api/deals/${dealId}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deals"] });
      queryClient.invalidateQueries({ queryKey: ["deal", dealId] });
    },
  });
}

// ============================================
// LENDERS
// ============================================

export function useLenders() {
  return useQuery({
    queryKey: ["lenders"],
    queryFn: () => api<Lender[]>("/api/lenders"),
  });
}

export function useLender(lenderId: string | undefined) {
  return useQuery({
    queryKey: ["lender", lenderId],
    queryFn: () => api<Lender>(`/api/lenders/${lenderId}`),
    enabled: !!lenderId,
  });
}

export function useLenderByEmail(email: string | undefined) {
  return useQuery({
    queryKey: ["lender-email", email],
    queryFn: () => api<Lender>(`/api/lenders/email/${encodeURIComponent(email!)}`),
    enabled: !!email,
  });
}

export function useCreateLender() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Lender>) => apiPost<Lender>("/api/lenders", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lenders"] });
    },
  });
}

// ============================================
// INVITATIONS
// ============================================

export function useInvitations(dealId: string | undefined) {
  return useQuery({
    queryKey: ["invitations", dealId],
    queryFn: () => api<(Invitation & { lender: Lender })[]>(`/api/deals/${dealId}/invitations`),
    enabled: !!dealId,
  });
}

export function useLenderInvitations(lenderId: string | undefined) {
  return useQuery({
    queryKey: ["lender-invitations", lenderId],
    queryFn: () => api<(Invitation & { deal: Deal })[]>(`/api/lenders/${lenderId}/invitations`),
    enabled: !!lenderId,
  });
}

export function useCreateInvitation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { dealId: string; lenderId: string; invitedBy: string; accessTier?: string; ndaRequired?: boolean }) =>
      apiPost<Invitation>("/api/invitations", data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["invitations", variables.dealId] });
      queryClient.invalidateQueries({ queryKey: ["syndicate-book", variables.dealId] });
    },
  });
}

export function useSignNda() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ dealId, lenderId }: { dealId: string; lenderId: string }) =>
      apiPost<Invitation>(`/api/invitations/${dealId}/${lenderId}/sign-nda`),
    onSuccess: (_, { dealId }) => {
      queryClient.invalidateQueries({ queryKey: ["invitations", dealId] });
    },
  });
}

export function useUpdateInvitationTier() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ dealId, lenderId, accessTier, changedBy }: { dealId: string; lenderId: string; accessTier: string; changedBy: string }) =>
      apiPatch<Invitation>(`/api/invitations/${dealId}/${lenderId}/tier`, { accessTier, changedBy }),
    onSuccess: (_, { dealId }) => {
      queryClient.invalidateQueries({ queryKey: ["invitations", dealId] });
    },
  });
}

// ============================================
// DOCUMENTS
// ============================================

export function useDocuments(dealId: string | undefined) {
  return useQuery({
    queryKey: ["documents", dealId],
    queryFn: () => api<Document[]>(`/api/deals/${dealId}/documents`),
    enabled: !!dealId,
  });
}

export function useCreateDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Document>) => apiPost<Document>("/api/documents", data),
    onSuccess: (doc) => {
      queryClient.invalidateQueries({ queryKey: ["documents", doc.dealId] });
    },
  });
}

// ============================================
// Q&A
// ============================================

export function useQA(dealId: string | undefined) {
  return useQuery({
    queryKey: ["qa", dealId],
    queryFn: () => api<(QAItem & { lender?: Lender })[]>(`/api/deals/${dealId}/qa`),
    enabled: !!dealId,
  });
}

export function useCreateQuestion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { dealId: string; lenderId: string; category: string; question: string }) =>
      apiPost<QAItem>("/api/qa", data),
    onSuccess: (_, { dealId }) => {
      queryClient.invalidateQueries({ queryKey: ["qa", dealId] });
    },
  });
}

export function useAnswerQuestion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, answer, dealId }: { id: string; answer: string; dealId: string }) =>
      apiPatch<QAItem>(`/api/qa/${id}/answer`, { answer }),
    onSuccess: (_, { dealId }) => {
      queryClient.invalidateQueries({ queryKey: ["qa", dealId] });
    },
  });
}

// ============================================
// PRIOR Q&A (Library)
// ============================================

export function usePriorQA(dealId: string | undefined) {
  return useQuery({
    queryKey: ["prior-qa", dealId],
    queryFn: () => api<PriorQaItem[]>(`/api/deals/${dealId}/prior-qa`),
    enabled: !!dealId,
  });
}

export function useImportPriorQA() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ dealId, items }: { dealId: string; items: Array<{ question: string; answer: string; topic?: string; sourceProcess?: string; shareable?: boolean }> }) =>
      apiPost<PriorQaItem[]>(`/api/deals/${dealId}/prior-qa/import`, { items }),
    onSuccess: (_, { dealId }) => {
      queryClient.invalidateQueries({ queryKey: ["prior-qa", dealId] });
    },
  });
}

export function useUpdatePriorQA() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dealId, ...data }: { id: string; dealId: string } & Partial<PriorQaItem>) =>
      apiPatch<PriorQaItem>(`/api/prior-qa/${id}`, data),
    onSuccess: (_, { dealId }) => {
      queryClient.invalidateQueries({ queryKey: ["prior-qa", dealId] });
    },
  });
}

export function useDeletePriorQA() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dealId }: { id: string; dealId: string }) =>
      apiDelete(`/api/prior-qa/${id}`),
    onSuccess: (_, { dealId }) => {
      queryClient.invalidateQueries({ queryKey: ["prior-qa", dealId] });
    },
  });
}

// ============================================
// COMMITMENTS
// ============================================

export function useCommitments(dealId: string | undefined) {
  return useQuery({
    queryKey: ["commitments", dealId],
    queryFn: () => api<(Commitment & { lender: Lender })[]>(`/api/deals/${dealId}/commitments`),
    enabled: !!dealId,
  });
}

export function useCreateCommitment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Commitment>) => apiPost<Commitment>("/api/commitments", data),
    onSuccess: (commitment) => {
      queryClient.invalidateQueries({ queryKey: ["commitments", commitment.dealId] });
    },
  });
}

// ============================================
// INDICATIONS (IOI)
// ============================================

export function useIndications(dealId: string | undefined) {
  return useQuery({
    queryKey: ["indications", dealId],
    queryFn: () => api<(Indication & { lender: Lender })[]>(`/api/deals/${dealId}/indications`),
    enabled: !!dealId,
  });
}

export function useMyIndication(dealId: string | undefined) {
  return useQuery({
    queryKey: ["my-indication", dealId],
    queryFn: () => api<Indication | null>(`/api/deals/${dealId}/indication`),
    enabled: !!dealId,
  });
}

export function useSubmitIndication() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ dealId, ...data }: { dealId: string; ioiAmount: number; currency?: string; termsJson: Record<string, any> }) =>
      apiPost<Indication>(`/api/deals/${dealId}/indication`, data),
    onSuccess: (_, { dealId }) => {
      queryClient.invalidateQueries({ queryKey: ["indications", dealId] });
      queryClient.invalidateQueries({ queryKey: ["my-indication", dealId] });
      queryClient.invalidateQueries({ queryKey: ["syndicate-book", dealId] });
    },
  });
}

export function useWithdrawIndication() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ dealId }: { dealId: string }) =>
      apiPost(`/api/deals/${dealId}/indication/withdraw`),
    onSuccess: (_, { dealId }) => {
      queryClient.invalidateQueries({ queryKey: ["indications", dealId] });
      queryClient.invalidateQueries({ queryKey: ["my-indication", dealId] });
      queryClient.invalidateQueries({ queryKey: ["syndicate-book", dealId] });
    },
  });
}

// ============================================
// SYNDICATE BOOK
// ============================================

export function useSyndicateBook(dealId: string | undefined) {
  return useQuery({
    queryKey: ["syndicate-book", dealId],
    queryFn: () => api<(SyndicateBookEntry & { lender: Lender })[]>(`/api/deals/${dealId}/syndicate-book`),
    enabled: !!dealId,
  });
}

export function useSyndicateBookEntry(entryId: string | undefined) {
  return useQuery({
    queryKey: ["syndicate-book-entry", entryId],
    queryFn: () => api<SyndicateBookEntry & { lender: Lender }>(`/api/syndicate-book/${entryId}`),
    enabled: !!entryId,
  });
}

interface SyndicateBookSummary {
  totalLenders: number;
  byStatus: Record<string, number>;
  totalIndicatedAmount: number;
  totalFirmAmount: number;
  totalAllocatedAmount: number;
}

export function useSyndicateBookSummary(dealId: string | undefined) {
  return useQuery({
    queryKey: ["syndicate-book-summary", dealId],
    queryFn: () => api<SyndicateBookSummary>(`/api/deals/${dealId}/syndicate-book/summary`),
    enabled: !!dealId,
  });
}

export function useCreateSyndicateBookEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { dealId: string; lenderId: string; status?: string }) =>
      apiPost<SyndicateBookEntry>("/api/syndicate-book", data),
    onSuccess: (_, { dealId }) => {
      queryClient.invalidateQueries({ queryKey: ["syndicate-book", dealId] });
      queryClient.invalidateQueries({ queryKey: ["syndicate-book-summary", dealId] });
    },
  });
}

export function useUpdateSyndicateBookEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dealId, ...data }: { id: string; dealId: string } & Partial<SyndicateBookEntry>) =>
      apiPatch<SyndicateBookEntry>(`/api/syndicate-book/${id}`, data),
    onSuccess: (_, { dealId }) => {
      queryClient.invalidateQueries({ queryKey: ["syndicate-book", dealId] });
      queryClient.invalidateQueries({ queryKey: ["syndicate-book-summary", dealId] });
    },
  });
}

export function useUpsertSyndicateBook() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ dealId, lenderId, ...data }: { dealId: string; lenderId: string } & Partial<SyndicateBookEntry>) =>
      apiPut<SyndicateBookEntry>(`/api/deals/${dealId}/syndicate-book/${lenderId}`, data),
    onSuccess: (_, { dealId }) => {
      queryClient.invalidateQueries({ queryKey: ["syndicate-book", dealId] });
      queryClient.invalidateQueries({ queryKey: ["syndicate-book-summary", dealId] });
    },
  });
}

// ============================================
// ENGAGEMENT ANALYTICS
// ============================================

interface EngagementAnalytics {
  summary: {
    totalLenders: number;
    activeLastWeek: number;
    documentViews: number;
    avgEngagementScore: number;
  };
  dailyActivity: Array<{
    date: string;
    views: number;
    downloads: number;
    uniqueLenders: number;
  }>;
  lenderEngagement: Array<{
    lenderId: string;
    lenderName: string;
    organization: string;
    totalActions: number;
    lastActivity: string;
    engagementScore: number;
  }>;
  documentPopularity: Array<{
    documentId: string;
    name: string;
    views: number;
    downloads: number;
  }>;
}

export function useEngagementAnalytics(dealId: string | undefined, days = 7) {
  return useQuery({
    queryKey: ["engagement-analytics", dealId, days],
    queryFn: () => api<EngagementAnalytics>(`/api/deals/${dealId}/engagement-analytics?days=${days}`),
    enabled: !!dealId,
  });
}

// ============================================
// CLOSING ITEMS
// ============================================

export function useClosingItems(dealId: string | undefined) {
  return useQuery({
    queryKey: ["closing-items", dealId],
    queryFn: () => api<ClosingItem[]>(`/api/deals/${dealId}/closing-items`),
    enabled: !!dealId,
  });
}

export function useClosingItem(itemId: string | undefined) {
  return useQuery({
    queryKey: ["closing-item", itemId],
    queryFn: () => api<ClosingItem>(`/api/closing-items/${itemId}`),
    enabled: !!itemId,
  });
}

export function useCreateClosingItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<ClosingItem>) => apiPost<ClosingItem>("/api/closing-items", data),
    onSuccess: (item) => {
      queryClient.invalidateQueries({ queryKey: ["closing-items", item.dealId] });
    },
  });
}

export function useUpdateClosingItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dealId, ...data }: { id: string; dealId: string } & Partial<ClosingItem>) =>
      apiPatch<ClosingItem>(`/api/closing-items/${id}`, data),
    onSuccess: (_, { dealId }) => {
      queryClient.invalidateQueries({ queryKey: ["closing-items", dealId] });
    },
  });
}

export function useDeleteClosingItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dealId }: { id: string; dealId: string }) =>
      apiDelete(`/api/closing-items/${id}`),
    onSuccess: (_, { dealId }) => {
      queryClient.invalidateQueries({ queryKey: ["closing-items", dealId] });
    },
  });
}

export function useApproveClosingItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dealId }: { id: string; dealId: string }) =>
      apiPost(`/api/closing-items/${id}/approve`),
    onSuccess: (_, { dealId }) => {
      queryClient.invalidateQueries({ queryKey: ["closing-items", dealId] });
    },
  });
}

// ============================================
// AUDIT LOGS
// ============================================

export function useLogs(dealId: string | undefined, limit = 50) {
  return useQuery({
    queryKey: ["logs", dealId, limit],
    queryFn: () => api<Log[]>(`/api/deals/${dealId}/logs?limit=${limit}`),
    enabled: !!dealId,
  });
}

export function useCreateLog() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Log>) => apiPost<Log>("/api/logs", data),
    onSuccess: (log) => {
      if (log.dealId) {
        queryClient.invalidateQueries({ queryKey: ["logs", log.dealId] });
      }
    },
  });
}

// ============================================
// ORGANIZATIONS
// ============================================

export function useOrganizations() {
  return useQuery({
    queryKey: ["organizations"],
    queryFn: () => api<Organization[]>("/api/organizations"),
  });
}

export function useBanks() {
  return useQuery({
    queryKey: ["organizations", "banks"],
    queryFn: () => api<Organization[]>("/api/organizations/banks"),
  });
}

export function useCreateOrganization() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Organization>) => apiPost<Organization>("/api/organizations", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["organizations"] });
    },
  });
}

// ============================================
// RFP / PROPOSALS
// ============================================

interface RfpData {
  deal: Deal;
  candidates: Array<{
    id: string;
    bankOrgId: string;
    status: string;
    viewedAt: string | null;
    bank: Organization;
  }>;
  proposals: Array<FinancingProposal & { bank: Organization }>;
}

export function useRfp(dealId: string | undefined) {
  return useQuery({
    queryKey: ["rfp", dealId],
    queryFn: () => api<RfpData>(`/api/deals/${dealId}/rfp`),
    enabled: !!dealId,
  });
}

interface ProposalData {
  deal: {
    id: string;
    dealName: string;
    borrowerName: string;
    sector: string;
    sponsor: string;
    facilityType: string;
    facilitySize: string;
    closeDate: string;
  };
  candidate: {
    status: string;
    viewedAt: string | null;
  };
  proposal: FinancingProposal | null;
}

export function useMyProposal(dealId: string | undefined) {
  return useQuery({
    queryKey: ["proposal", dealId],
    queryFn: () => api<ProposalData>(`/api/deals/${dealId}/proposal`),
    enabled: !!dealId,
  });
}

export function useInviteBank() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ dealId, bankOrgId }: { dealId: string; bankOrgId: string }) =>
      apiPost(`/api/deals/${dealId}/rfp/invite`, { bankOrgId }),
    onSuccess: (_, { dealId }) => {
      queryClient.invalidateQueries({ queryKey: ["rfp", dealId] });
    },
  });
}

export function useSaveProposal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ dealId, ...data }: { dealId: string } & Partial<FinancingProposal>) =>
      apiPost<FinancingProposal>(`/api/deals/${dealId}/proposals`, data),
    onSuccess: (_, { dealId }) => {
      queryClient.invalidateQueries({ queryKey: ["proposal", dealId] });
      queryClient.invalidateQueries({ queryKey: ["rfp", dealId] });
    },
  });
}

export function useSubmitProposal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ dealId }: { dealId: string }) =>
      apiPost(`/api/deals/${dealId}/proposals/submit`),
    onSuccess: (_, { dealId }) => {
      queryClient.invalidateQueries({ queryKey: ["proposal", dealId] });
      queryClient.invalidateQueries({ queryKey: ["rfp", dealId] });
    },
  });
}

export function useAwardMandate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ dealId, bankOrgId }: { dealId: string; bankOrgId: string }) =>
      apiPost(`/api/deals/${dealId}/rfp/award`, { bankOrgId }),
    onSuccess: (_, { dealId }) => {
      queryClient.invalidateQueries({ queryKey: ["rfp", dealId] });
      queryClient.invalidateQueries({ queryKey: ["deal", dealId] });
      queryClient.invalidateQueries({ queryKey: ["deals"] });
    },
  });
}

// ============================================
// FINANCIAL MODELS
// ============================================

interface DealModel {
  id: string;
  dealId: string;
  name: string;
  assumptions: {
    revenue: number;
    growthPercent: number;
    ebitdaMargin: number;
    leverageMultiple: number;
    interestRate: number;
    taxRate?: number;
    capexPercent?: number;
    amortizationPercent?: number;
    cashSweepPercent?: number;
  };
  isPublished: boolean;
  publishedAt: string | null;
  publishedBy: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export function useDealModels(dealId: string | undefined) {
  return useQuery({
    queryKey: ["deal-models", dealId],
    queryFn: () => api<DealModel[]>(`/api/deals/${dealId}/models`),
    enabled: !!dealId,
  });
}

export function useDealModel(modelId: string | undefined) {
  return useQuery({
    queryKey: ["deal-model", modelId],
    queryFn: () => api<DealModel>(`/api/deal-models/${modelId}`),
    enabled: !!modelId,
  });
}

export function useCreateDealModel() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<DealModel>) => apiPost<DealModel>("/api/deal-models", data),
    onSuccess: (model) => {
      queryClient.invalidateQueries({ queryKey: ["deal-models", model.dealId] });
    },
  });
}

export function usePublishDealModel() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dealId }: { id: string; dealId: string }) =>
      apiPost(`/api/deal-models/${id}/publish`),
    onSuccess: (_, { dealId }) => {
      queryClient.invalidateQueries({ queryKey: ["deal-models", dealId] });
    },
  });
}

// ============================================
// LEGAL / MASTER DOCUMENTS
// ============================================

interface MasterDocument {
  id: string;
  dealId: string;
  docKey: string;
  title: string;
  currentVersionId: string | null;
  currentVersion?: {
    id: string;
    versionNumber: number;
    filePath: string;
    createdAt: string;
  };
}

interface LenderMarkup {
  id: string;
  masterDocId: string;
  lenderId: string;
  filePath: string;
  status: string;
  notes: string | null;
  lender?: Lender;
  createdAt: string;
}

export function useMasterDocs(dealId: string | undefined) {
  return useQuery({
    queryKey: ["master-docs", dealId],
    queryFn: () => api<MasterDocument[]>(`/api/deals/${dealId}/master-docs`),
    enabled: !!dealId,
  });
}

export function useMasterDoc(dealId: string | undefined, docKey: string | undefined) {
  return useQuery({
    queryKey: ["master-doc", dealId, docKey],
    queryFn: () => api<{ masterDoc: MasterDocument; versions: any[]; markups: LenderMarkup[] }>(`/api/deals/${dealId}/master-docs/${docKey}`),
    enabled: !!dealId && !!docKey,
  });
}

export function useEnsureMasterDocs() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ dealId }: { dealId: string }) =>
      apiPost(`/api/deals/${dealId}/master-docs/ensure`),
    onSuccess: (_, { dealId }) => {
      queryClient.invalidateQueries({ queryKey: ["master-docs", dealId] });
    },
  });
}

// ============================================
// LENDER PROGRESS (EXECUTION)
// ============================================

interface LenderProgress {
  lenderId: string;
  lender: Lender;
  invitation?: Invitation;
  syndicateEntry?: SyndicateBookEntry;
  indication?: Indication;
  ndaSigned: boolean;
  ioiSubmitted: boolean;
  firmCommitted: boolean;
  allocated: boolean;
  documentsAccessed: number;
  lastActivity: string | null;
}

export function useLenderProgress(dealId: string | undefined) {
  return useQuery({
    queryKey: ["lender-progress", dealId],
    queryFn: () => api<LenderProgress[]>(`/api/deals/${dealId}/lender-progress`),
    enabled: !!dealId,
  });
}

// ============================================
// CREDIT SUMMARY
// ============================================

interface CreditSummary {
  deal: Deal;
  keyMetrics: {
    facilitySize: string;
    committed: string;
    percentCommitted: number;
    targetSize: string;
    spread: string;
    oid: string;
  };
}

export function useCreditSummary(dealId: string | undefined) {
  return useQuery({
    queryKey: ["credit-summary", dealId],
    queryFn: () => api<CreditSummary>(`/api/deals/${dealId}/credit-summary`),
    enabled: !!dealId,
  });
}

// ============================================
// CREDIT MEMO
// ============================================

export function useCreditMemo(dealId: string | undefined) {
  return useQuery({
    queryKey: ["credit-memo", dealId],
    queryFn: () => api<{ memo: string }>(`/api/deals/${dealId}/credit-memo`),
    enabled: !!dealId,
  });
}
