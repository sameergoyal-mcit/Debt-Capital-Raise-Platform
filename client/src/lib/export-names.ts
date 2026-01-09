import { formatDateForFilename, slugify } from "./format";

export type ArtifactType =
  | "DealSummary"
  | "IOIReport"
  | "TermsReport"
  | "Engagement"
  | "QA"
  | "Documents"
  | "Timeline"
  | "Calendar"
  | "AuditLog"
  | "Commitments";

export function buildExportFilename(
  dealName: string,
  artifactType: ArtifactType,
  ext: "csv" | "ics" | "txt" | "pdf" = "csv"
): string {
  const slug = slugify(dealName);
  const timestamp = formatDateForFilename();
  return `${slug}-${artifactType}-${timestamp}.${ext}`;
}
