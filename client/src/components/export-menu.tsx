import React from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Download, FileSpreadsheet, FileText, Printer } from "lucide-react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

// Extend jsPDF type for autoTable
interface jsPDFWithAutoTable extends jsPDF {
  lastAutoTable?: {
    finalY: number;
  };
}

interface ExportData {
  headers: string[];
  rows: (string | number)[][];
}

interface ExportMenuProps {
  data: ExportData;
  filename?: string;
  title?: string;
  subtitle?: string;
}

// Utility function to convert data to CSV
function convertToCSV(data: ExportData): string {
  const escapeCell = (cell: string | number) => {
    const str = String(cell);
    if (str.includes(",") || str.includes('"') || str.includes("\n")) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const headerRow = data.headers.map(escapeCell).join(",");
  const dataRows = data.rows.map((row) => row.map(escapeCell).join(","));

  return [headerRow, ...dataRows].join("\n");
}

// Utility function to trigger download
function downloadFile(content: string | Blob, filename: string, mimeType: string) {
  const blob = content instanceof Blob ? content : new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function ExportMenu({
  data,
  filename = "export",
  title = "Export",
  subtitle,
}: ExportMenuProps) {
  const handleExportCSV = () => {
    const csv = convertToCSV(data);
    downloadFile(csv, `${filename}.csv`, "text/csv;charset=utf-8;");
  };

  const handleExportPDF = () => {
    const doc: jsPDFWithAutoTable = new jsPDF();

    // Add title
    doc.setFontSize(18);
    doc.text(title, 14, 22);

    if (subtitle) {
      doc.setFontSize(11);
      doc.setTextColor(100);
      doc.text(subtitle, 14, 30);
    }

    // Add timestamp
    doc.setFontSize(10);
    doc.setTextColor(150);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, subtitle ? 38 : 30);

    // Add table
    autoTable(doc, {
      head: [data.headers],
      body: data.rows.map((row) => row.map(String)),
      startY: subtitle ? 45 : 38,
      styles: {
        fontSize: 9,
        cellPadding: 3,
      },
      headStyles: {
        fillColor: [59, 130, 246],
        textColor: 255,
        fontStyle: "bold",
      },
      alternateRowStyles: {
        fillColor: [249, 250, 251],
      },
    });

    // Add footer
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text(
        `Page ${i} of ${pageCount}`,
        doc.internal.pageSize.getWidth() / 2,
        doc.internal.pageSize.getHeight() - 10,
        { align: "center" }
      );
    }

    doc.save(`${filename}.pdf`);
  };

  const handlePrint = () => {
    // Create a printable HTML table
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${title}</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 20px; }
            h1 { font-size: 24px; margin-bottom: 8px; }
            .subtitle { color: #666; margin-bottom: 16px; }
            .timestamp { color: #999; font-size: 12px; margin-bottom: 24px; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #3b82f6; color: white; }
            tr:nth-child(even) { background-color: #f9fafb; }
            @media print {
              body { padding: 0; }
              button { display: none; }
            }
          </style>
        </head>
        <body>
          <h1>${title}</h1>
          ${subtitle ? `<div class="subtitle">${subtitle}</div>` : ""}
          <div class="timestamp">Generated: ${new Date().toLocaleString()}</div>
          <table>
            <thead>
              <tr>
                ${data.headers.map((h) => `<th>${h}</th>`).join("")}
              </tr>
            </thead>
            <tbody>
              ${data.rows
                .map(
                  (row) =>
                    `<tr>${row.map((cell) => `<td>${cell}</td>`).join("")}</tr>`
                )
                .join("")}
            </tbody>
          </table>
          <script>
            window.onload = function() { window.print(); }
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <Download className="h-4 w-4 mr-2" />
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel>Export Data</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleExportCSV}>
          <FileSpreadsheet className="h-4 w-4 mr-2" />
          Download CSV
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleExportPDF}>
          <FileText className="h-4 w-4 mr-2" />
          Download PDF
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handlePrint}>
          <Printer className="h-4 w-4 mr-2" />
          Print
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// Specialized export for financial projections
interface FinancialProjection {
  year: number;
  label: string;
  revenue: number;
  ebitda: number;
  fcf: number;
  debt: number;
  leverage: number;
  dscr: number;
}

interface FinancialExportMenuProps {
  projections: FinancialProjection[];
  dealName?: string;
}

export function FinancialExportMenu({ projections, dealName = "Financial Model" }: FinancialExportMenuProps) {
  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);

  const data: ExportData = {
    headers: ["Period", "Revenue", "EBITDA", "FCF", "Debt", "Leverage", "DSCR"],
    rows: projections.map((p) => [
      p.label,
      formatCurrency(p.revenue),
      formatCurrency(p.ebitda),
      formatCurrency(p.fcf),
      formatCurrency(p.debt),
      `${p.leverage.toFixed(2)}x`,
      `${p.dscr.toFixed(2)}x`,
    ]),
  };

  return (
    <ExportMenu
      data={data}
      filename={`${dealName.replace(/\s+/g, "_")}_Financial_Model`}
      title={`${dealName} - Financial Projections`}
      subtitle="5-Year Debt Paydown Model"
    />
  );
}

// Specialized export for deal summary
interface DealSummary {
  label: string;
  value: string | number;
}

interface DealExportMenuProps {
  summary: DealSummary[];
  dealName: string;
}

export function DealExportMenu({ summary, dealName }: DealExportMenuProps) {
  const data: ExportData = {
    headers: ["Metric", "Value"],
    rows: summary.map((s) => [s.label, String(s.value)]),
  };

  return (
    <ExportMenu
      data={data}
      filename={`${dealName.replace(/\s+/g, "_")}_Summary`}
      title={`${dealName} - Deal Summary`}
      subtitle="Executive Overview"
    />
  );
}
