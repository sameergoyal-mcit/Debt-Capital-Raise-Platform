import { format } from "date-fns";

export function formatDateForFilename(date: Date = new Date()): string {
  return format(date, "yyyy-MM-dd_HH-mm");
}

export function slugify(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function formatCurrency(amount: number): string {
  if (amount >= 1_000_000_000) {
    return `$${(amount / 1_000_000_000).toFixed(1)}B`;
  }
  if (amount >= 1_000_000) {
    return `$${(amount / 1_000_000).toFixed(0)}M`;
  }
  if (amount >= 1_000) {
    return `$${(amount / 1_000).toFixed(0)}K`;
  }
  return `$${amount.toFixed(0)}`;
}

export function formatSpread(bps: number | null | undefined): string {
  if (bps === null || bps === undefined) return "-";
  return `S+${bps}`;
}

export function formatOid(oid: number | null | undefined): string {
  if (oid === null || oid === undefined) return "-";
  return oid.toFixed(2);
}
