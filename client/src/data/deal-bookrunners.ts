export type BookrunnerRole = "lead" | "co-manager";

export interface DealBookrunner {
  dealId: string;
  bookrunnerId: string;
  role: BookrunnerRole;
  invitedAt: string;
  invitedBy: string;
}

// Mock data for existing deal-bookrunner relationships
export const mockDealBookrunners: DealBookrunner[] = [
  {
    dealId: "101",
    bookrunnerId: "br-1",
    role: "lead",
    invitedAt: "2025-05-01T10:00:00Z",
    invitedBy: "cfo@titan-software.com",
  },
  {
    dealId: "101",
    bookrunnerId: "br-5",
    role: "co-manager",
    invitedAt: "2025-05-02T14:30:00Z",
    invitedBy: "cfo@titan-software.com",
  },
  {
    dealId: "102",
    bookrunnerId: "br-2",
    role: "lead",
    invitedAt: "2025-04-15T09:00:00Z",
    invitedBy: "cfo@meridian.com",
  },
];

// Helper function to add a bookrunner to a deal
export function addDealBookrunner(
  dealId: string,
  bookrunnerId: string,
  role: BookrunnerRole,
  invitedBy: string
): DealBookrunner {
  const newRelationship: DealBookrunner = {
    dealId,
    bookrunnerId,
    role,
    invitedAt: new Date().toISOString(),
    invitedBy,
  };
  mockDealBookrunners.push(newRelationship);
  return newRelationship;
}

// Helper function to get bookrunners for a deal
export function getDealBookrunners(dealId: string): DealBookrunner[] {
  return mockDealBookrunners.filter((db) => db.dealId === dealId);
}

// Helper function to check if a deal has a lead bookrunner
export function hasLeadBookrunner(dealId: string): boolean {
  return mockDealBookrunners.some(
    (db) => db.dealId === dealId && db.role === "lead"
  );
}
