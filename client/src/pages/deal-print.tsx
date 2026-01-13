import React, { useEffect } from "react";
import { useRoute } from "wouter";
import { useDeal, useInvitations, useLenders } from "@/hooks/api-hooks";
import { format } from "date-fns";

export default function DealPrint() {
  const [, params] = useRoute("/deal/:id/print");
  const dealId = params?.id || "1";
  const { data: deal } = useDeal(dealId);
  const { data: invitations = [] } = useInvitations(dealId);
  const { data: lenders = [] } = useLenders();

  useEffect(() => {
    const timer = setTimeout(() => {
      window.print();
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  const signedCount = invitations.filter(i => i.ndaSignedAt).length;
  const committedPct = deal.committedPct || 0;
  const totalCommitted = deal.committed || 0;

  return (
    <div className="print-container p-8 max-w-4xl mx-auto bg-white text-black min-h-screen">
      <style>{`
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .no-print { display: none !important; }
        }
        .print-container { font-family: 'Inter', system-ui, sans-serif; }
        table { border-collapse: collapse; width: 100%; }
        th, td { border: 1px solid #e5e7eb; padding: 8px 12px; text-align: left; }
        th { background: #f9fafb; font-weight: 600; }
      `}</style>
      
      <div className="no-print mb-4 p-3 bg-amber-50 border border-amber-200 rounded text-sm text-amber-800">
        Print dialog will open automatically. You can also press Ctrl+P / Cmd+P to print.
      </div>

      <header className="border-b-2 border-gray-800 pb-4 mb-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{deal.dealName}</h1>
            <p className="text-gray-600 mt-1">{deal.borrowerName} • {deal.sector}</p>
          </div>
          <div className="text-right text-sm text-gray-500">
            <p>Engagement Summary</p>
            <p>{format(new Date(), "MMMM d, yyyy")}</p>
          </div>
        </div>
      </header>

      <section className="mb-8">
        <h2 className="text-lg font-semibold mb-3 text-gray-800 border-b pb-2">Deal Overview</h2>
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-gray-500">Facility Size</p>
            <p className="font-semibold">${(deal.facilitySize / 1_000_000).toFixed(1)}M</p>
          </div>
          <div>
            <p className="text-gray-500">Instrument</p>
            <p className="font-semibold">{deal.instrument}</p>
          </div>
          <div>
            <p className="text-gray-500">Facility Type</p>
            <p className="font-semibold">{deal.facilityType}</p>
          </div>
          <div>
            <p className="text-gray-500">Spread</p>
            <p className="font-semibold">S+{deal.pricing.spreadLowBps}-{deal.pricing.spreadHighBps} bps</p>
          </div>
          <div>
            <p className="text-gray-500">OID</p>
            <p className="font-semibold">{deal.pricing.oid?.toFixed(2) || "N/A"}</p>
          </div>
          <div>
            <p className="text-gray-500">Stage</p>
            <p className="font-semibold">{deal.stage}</p>
          </div>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-semibold mb-3 text-gray-800 border-b pb-2">Execution Heatmap</h2>
        <div className="grid grid-cols-4 gap-4 text-sm text-center">
          <div className="bg-gray-50 p-4 rounded">
            <p className="text-2xl font-bold text-blue-600">{invitations.length}</p>
            <p className="text-gray-600 text-xs mt-1">Invited</p>
          </div>
          <div className="bg-gray-50 p-4 rounded">
            <p className="text-2xl font-bold text-green-600">{signedCount}</p>
            <p className="text-gray-600 text-xs mt-1">NDA Signed</p>
          </div>
          <div className="bg-gray-50 p-4 rounded">
            <p className="text-2xl font-bold text-purple-600">{(committedPct * 100).toFixed(0)}%</p>
            <p className="text-gray-600 text-xs mt-1">Committed</p>
          </div>
          <div className="bg-gray-50 p-4 rounded">
            <p className="text-2xl font-bold text-amber-600">${(totalCommitted / 1_000_000).toFixed(1)}M</p>
            <p className="text-gray-600 text-xs mt-1">Total Committed</p>
          </div>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-semibold mb-3 text-gray-800 border-b pb-2">Key Dates</h2>
        <table className="text-sm">
          <thead>
            <tr>
              <th>Milestone</th>
              <th>Date</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Launch Date</td>
              <td>{deal.launchDate || "TBD"}</td>
              <td>{deal.launchDate && new Date(deal.launchDate) < new Date() ? "Completed" : "Pending"}</td>
            </tr>
            <tr>
              <td>Soft Close</td>
              <td>{format(new Date(deal.closeDate), "MMM d, yyyy")}</td>
              <td>{new Date(deal.closeDate) < new Date() ? "Completed" : "Upcoming"}</td>
            </tr>
            <tr>
              <td>Hard Close</td>
              <td>{deal.hardCloseDate ? format(new Date(deal.hardCloseDate), "MMM d, yyyy") : "TBD"}</td>
              <td>Pending</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-semibold mb-3 text-gray-800 border-b pb-2">Lender Summary</h2>
        <table className="text-sm">
          <thead>
            <tr>
              <th>Organization</th>
              <th>NDA Status</th>
              <th>Tier</th>
              <th>Access</th>
            </tr>
          </thead>
          <tbody>
            {invitations.slice(0, 10).map(inv => {
              const lender = mockLenders.find(l => l.id === inv.lenderId);
              const ndaStatus = inv.ndaSignedAt ? "Signed" : (inv.ndaRequired ? "Pending" : "Not Required");
              return (
                <tr key={inv.lenderId}>
                  <td>{lender?.name || inv.lenderId}</td>
                  <td>{ndaStatus}</td>
                  <td>{inv.accessTier.toUpperCase()}</td>
                  <td>{inv.accessGranted ? "Yes" : "No"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {invitations.length > 10 && (
          <p className="text-xs text-gray-500 mt-2">Showing first 10 of {invitations.length} lenders</p>
        )}
      </section>

      <footer className="mt-12 pt-4 border-t text-xs text-gray-500 text-center">
        <p>Generated by CapitalFlow • {format(new Date(), "MMMM d, yyyy 'at' h:mm a")}</p>
        <p className="mt-1">Confidential - For Internal Use Only</p>
      </footer>
    </div>
  );
}
