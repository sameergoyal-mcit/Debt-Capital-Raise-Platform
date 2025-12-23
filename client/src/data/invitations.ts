import { formatISO, subDays } from "date-fns";

export interface Invitation {
  dealId: string;
  lenderId: string;
  invitedBy: string;
  invitedAt: string; // ISO date
  ndaRequired: boolean;
  ndaSignedAt?: string; // ISO date
  accessGranted: boolean;
  ndaVersion?: string;
  signerEmail?: string;
  signerIp?: string;
  accessTier: "early" | "full" | "legal";
  tierHistory?: { tier: string; changedAt: string; changedBy: string }[];
}

// Initial seed data
const initialInvitations: Invitation[] = [
  {
    dealId: "101",
    lenderId: "1", // BlackRock
    invitedBy: "Sarah Jenkins",
    invitedAt: formatISO(subDays(new Date(), 5)),
    ndaRequired: true,
    ndaSignedAt: formatISO(subDays(new Date(), 2)),
    accessGranted: true,
    ndaVersion: "1.0",
    signerEmail: "investor@blackrock.com",
    signerIp: "192.168.1.101",
    accessTier: "full",
    tierHistory: [
      { tier: "early", changedAt: formatISO(subDays(new Date(), 5)), changedBy: "System" },
      { tier: "full", changedAt: formatISO(subDays(new Date(), 2)), changedBy: "Sarah Jenkins" }
    ]
  },
  {
    dealId: "101",
    lenderId: "2", // Apollo
    invitedBy: "Sarah Jenkins",
    invitedAt: formatISO(subDays(new Date(), 4)),
    ndaRequired: true,
    accessGranted: false, // Hasn't signed NDA yet
    accessTier: "early",
    tierHistory: [
      { tier: "early", changedAt: formatISO(subDays(new Date(), 4)), changedBy: "System" }
    ]
  },
  {
    dealId: "101",
    lenderId: "3", // Oak Hill
    invitedBy: "Michael Ross",
    invitedAt: formatISO(subDays(new Date(), 3)),
    ndaRequired: true,
    ndaSignedAt: formatISO(subDays(new Date(), 1)),
    accessGranted: true,
    ndaVersion: "1.0",
    signerEmail: "investor@oakhill.com",
    signerIp: "192.168.1.103",
    accessTier: "legal",
    tierHistory: [
      { tier: "early", changedAt: formatISO(subDays(new Date(), 3)), changedBy: "System" },
      { tier: "full", changedAt: formatISO(subDays(new Date(), 1)), changedBy: "Michael Ross" },
      { tier: "legal", changedAt: formatISO(new Date()), changedBy: "Michael Ross" }
    ]
  },
  {
    dealId: "102",
    lenderId: "1", // BlackRock
    invitedBy: "Sarah Jenkins",
    invitedAt: formatISO(subDays(new Date(), 10)),
    ndaRequired: true,
    ndaSignedAt: formatISO(subDays(new Date(), 9)),
    accessGranted: true,
    ndaVersion: "1.0",
    signerEmail: "investor@blackrock.com",
    signerIp: "192.168.1.101",
    accessTier: "early"
  }
];

// Mock in-memory store
let invitations = [...initialInvitations];

export function getInvitation(dealId: string, lenderId: string) {
  return invitations.find(i => i.dealId === dealId && i.lenderId === lenderId);
}

export function updateAccessTier(dealId: string, lenderId: string, tier: "early" | "full" | "legal") {
  const invite = getInvitation(dealId, lenderId);
  if (invite) {
    invite.accessTier = tier;
    if (!invite.tierHistory) invite.tierHistory = [];
    invite.tierHistory.push({
      tier,
      changedAt: new Date().toISOString(),
      changedBy: "CurrentUser" // Mock user
    });
    return true;
  }
  return false;
}

export function signNDA(dealId: string, lenderId: string, version: string = "1.0", email?: string, ip?: string) {
  const invite = getInvitation(dealId, lenderId);
  if (invite) {
    invite.ndaSignedAt = new Date().toISOString();
    invite.accessGranted = true;
    invite.ndaVersion = version;
    invite.signerEmail = email;
    invite.signerIp = ip || "127.0.0.1";
    return true;
  }
  return false;
}

export function grantAccess(dealId: string, lenderId: string) {
  const invite = getInvitation(dealId, lenderId);
  if (invite) {
    invite.accessGranted = true;
    return true;
  }
  return false;
}

export function revokeAccess(dealId: string, lenderId: string) {
    const invite = getInvitation(dealId, lenderId);
    if (invite) {
      invite.accessGranted = false;
      return true;
    }
    return false;
}

export function createInvitation(invitation: Invitation) {
    invitations.push(invitation);
    return invitation;
}

export function getDealInvitations(dealId: string) {
    return invitations.filter(i => i.dealId === dealId);
}

export function getLenderInvitations(lenderId: string) {
    return invitations.filter(i => i.lenderId === lenderId);
}
