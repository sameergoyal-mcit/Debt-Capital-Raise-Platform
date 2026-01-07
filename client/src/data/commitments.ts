export interface Commitment {
  id: string;
  dealId: string;
  lenderId: string;
  lenderName: string;
  submittedAt: string; // ISO
  updatedAt?: string; // ISO
  status: "Draft" | "Submitted" | "Firm" | "Withdrawn";
  
  // Terms
  amount: number;
  ticketType: "indicative" | "firm";
  currency: string;
  
  // Pricing/Conditions
  pricingSpread?: number; // bps
  pricingOID?: number;
  feesUpfront?: number; // %
  
  conditions?: string;
  files?: string[];
}

const initialCommitments: Commitment[] = [
  {
    id: "c1",
    dealId: "101",
    lenderId: "1", // BlackRock
    lenderName: "BlackRock",
    submittedAt: new Date(Date.now() - 86400000 * 2).toISOString(), // 2 days ago
    status: "Submitted",
    amount: 25000000,
    ticketType: "indicative",
    currency: "USD",
    pricingSpread: 625,
    pricingOID: 98,
    feesUpfront: 0,
    conditions: "Subject to final IC approval and satisfactory legal review of EBITDA definitions."
  }
];

// Mock Store
let commitments = [...initialCommitments];

export function getCommitment(dealId: string, lenderId: string) {
  return commitments.find(c => c.dealId === dealId && c.lenderId === lenderId);
}

export function getAllCommitmentsForDeal(dealId: string) {
  return commitments.filter(c => c.dealId === dealId);
}

export function saveCommitment(commitment: Commitment) {
  const index = commitments.findIndex(c => c.id === commitment.id);
  if (index >= 0) {
    commitments[index] = commitment;
  } else {
    commitments.push(commitment);
  }
  return commitment;
}

export function withdrawCommitment(id: string) {
  const c = commitments.find(x => x.id === id);
  if (c) {
    c.status = "Withdrawn";
    c.updatedAt = new Date().toISOString();
  }
  return c;
}
