import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  FileText,
  Download,
  Clock,
  User,
  ArrowRight,
  GitBranch,
  Eye,
  RotateCcw,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";

export interface DocumentVersion {
  id: string;
  version: number;
  filename: string;
  uploadedAt: Date;
  uploadedBy: string;
  fileSize: number;
  changeSummary?: string;
  isCurrentVersion: boolean;
}

interface DocumentVersionsProps {
  documentId: string;
  documentName: string;
  versions: DocumentVersion[];
  onDownload?: (versionId: string) => void;
  onRestore?: (versionId: string) => void;
  onPreview?: (versionId: string) => void;
}

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export function DocumentVersions({
  documentId,
  documentName,
  versions,
  onDownload,
  onRestore,
  onPreview,
}: DocumentVersionsProps) {
  const [expandedVersion, setExpandedVersion] = useState<string | null>(null);

  const sortedVersions = [...versions].sort((a, b) => b.version - a.version);
  const currentVersion = sortedVersions.find((v) => v.isCurrentVersion);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GitBranch className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-base">Version History</CardTitle>
          </div>
          <Badge variant="outline" className="text-xs">
            {versions.length} version{versions.length !== 1 ? "s" : ""}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[300px] pr-4">
          <div className="space-y-2">
            {sortedVersions.map((version, index) => (
              <div
                key={version.id}
                className={`relative border rounded-lg p-3 transition-colors ${
                  version.isCurrentVersion
                    ? "border-primary bg-primary/5"
                    : "border-border hover:bg-muted/50"
                }`}
              >
                {/* Version connector line */}
                {index < sortedVersions.length - 1 && (
                  <div className="absolute left-6 -bottom-4 w-0.5 h-4 bg-muted" />
                )}

                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div
                      className={`flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center ${
                        version.isCurrentVersion
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      <span className="text-sm font-medium">v{version.version}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm truncate">
                          {version.filename}
                        </span>
                        {version.isCurrentVersion && (
                          <Badge className="text-xs px-1.5 py-0">Current</Badge>
                        )}
                      </div>
                      {version.changeSummary && (
                        <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                          {version.changeSummary}
                        </p>
                      )}
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {version.uploadedBy}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDistanceToNow(version.uploadedAt, { addSuffix: true })}
                        </span>
                        <span>{formatFileSize(version.fileSize)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    {onPreview && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => onPreview(version.id)}
                        title="Preview"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    )}
                    {onDownload && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => onDownload(version.id)}
                        title="Download"
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    )}
                    {!version.isCurrentVersion && onRestore && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => onRestore(version.id)}
                        title="Restore this version"
                      >
                        <RotateCcw className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

// Compact version for inline display
interface DocumentVersionBadgeProps {
  currentVersion: number;
  totalVersions: number;
  versions: DocumentVersion[];
  onDownload?: (versionId: string) => void;
}

export function DocumentVersionBadge({
  currentVersion,
  totalVersions,
  versions,
  onDownload,
}: DocumentVersionBadgeProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-6 px-2 text-xs gap-1">
          <GitBranch className="h-3 w-3" />
          v{currentVersion}
          {totalVersions > 1 && (
            <span className="text-muted-foreground">({totalVersions})</span>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Version History</DialogTitle>
          <DialogDescription>
            View all versions of this document
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[400px]">
          <div className="space-y-3">
            {versions
              .sort((a, b) => b.version - a.version)
              .map((version) => (
                <div
                  key={version.id}
                  className={`flex items-center justify-between p-3 rounded-lg border ${
                    version.isCurrentVersion ? "border-primary bg-primary/5" : ""
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Badge
                      variant={version.isCurrentVersion ? "default" : "outline"}
                      className="text-xs"
                    >
                      v{version.version}
                    </Badge>
                    <div>
                      <p className="text-sm font-medium">{version.filename}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(version.uploadedAt, "MMM d, yyyy")} by{" "}
                        {version.uploadedBy}
                      </p>
                    </div>
                  </div>
                  {onDownload && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDownload(version.id)}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

// Mock data generator for demo
export function generateMockVersions(documentName: string): DocumentVersion[] {
  const baseDate = new Date();
  return [
    {
      id: "v3",
      version: 3,
      filename: `${documentName}_v3.pdf`,
      uploadedAt: new Date(baseDate.getTime() - 1000 * 60 * 60 * 2),
      uploadedBy: "John Smith",
      fileSize: 2456000,
      changeSummary: "Updated financial projections and added Q3 actuals",
      isCurrentVersion: true,
    },
    {
      id: "v2",
      version: 2,
      filename: `${documentName}_v2.pdf`,
      uploadedAt: new Date(baseDate.getTime() - 1000 * 60 * 60 * 24 * 3),
      uploadedBy: "Jane Doe",
      fileSize: 2234000,
      changeSummary: "Incorporated feedback from legal review",
      isCurrentVersion: false,
    },
    {
      id: "v1",
      version: 1,
      filename: `${documentName}_v1.pdf`,
      uploadedAt: new Date(baseDate.getTime() - 1000 * 60 * 60 * 24 * 7),
      uploadedBy: "John Smith",
      fileSize: 2100000,
      changeSummary: "Initial upload",
      isCurrentVersion: false,
    },
  ];
}
