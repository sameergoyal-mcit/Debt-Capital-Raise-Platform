import { formatISO, subDays } from "date-fns";

export interface Invitation {
  dealId: string;
  lenderId: string;
  invitedBy: string;
  invitedAt: string; // ISO date
  ndaRequired: boolean;
  ndaSignedAt?: string; // ISO date
  accessGranted: boolean;
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
    accessGranted: true
  },
  {
    dealId: "101",
    lenderId: "2", // Apollo
    invitedBy: "Sarah Jenkins",
    invitedAt: formatISO(subDays(new Date(), 4)),
    ndaRequired: true,
    accessGranted: false // Hasn't signed NDA yet
  },
  {
    dealId: "101",
    lenderId: "3", // Oak Hill
    invitedBy: "Michael Ross",
    invitedAt: formatISO(subDays(new Date(), 3)),
    ndaRequired: true,
    ndaSignedAt: formatISO(subDays(new Date(), 1)),
    accessGranted: true
  },
  {
    dealId: "102",
    lenderId: "1", // BlackRock
    invitedBy: "Sarah Jenkins",
    invitedAt: formatISO(subDays(new Date(), 10)),
    ndaRequired: true,
    ndaSignedAt: formatISO(subDays(new Date(), 9)),
    accessGranted: true
  }
];

// Mock in-memory store
let invitations = [...initialInvitations];

export function getInvitation(dealId: string, lenderId: string) {
  return invitations.find(i => i.dealId === dealId && i.lenderId === lenderId);
}

export function signNDA(dealId: string, lenderId: string) {
  const invite = getInvitation(dealId, lenderId);
  if (invite) {
    invite.ndaSignedAt = new Date().toISOString();
    invite.accessGranted = true;
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
