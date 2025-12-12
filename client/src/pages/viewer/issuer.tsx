import React from "react";
import { Link } from "wouter";
import { RoleSwitcher } from "@/components/role-switcher";

export default function IssuerViewer(props: any) {
  const dealId = props?.params?.id;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Issuer View</h1>
          <p className="text-sm text-slate-500">
            Sponsor control room: pricing, execution risk, covenants, actions.
          </p>
        </div>
        <RoleSwitcher />
      </div>

      {/* Top KPI row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Kpi title="Committed vs Target" value="$180M / $250M" meta="72% subscribed" />
        <Kpi title="Pricing Guidance" value="SOFR + 475–500" meta="OID 98.0 • Fees 2.0%" />
        <Kpi title="Est. All-In Yield" value="10.4% – 10.8%" meta="+25 bps = +$0.6M/yr" />
        <Kpi title="Days to Close" value="9" meta="Hard close Apr 30" />
      </div>

      {/* Execution + risk */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card title="Pricing Pressure">
          <div className="text-sm text-slate-700">
            Signal: <span className="font-semibold">Stable</span>
          </div>
          <div className="text-xs text-slate-500 mt-2">
            Based on demand distribution and time-to-close.
          </div>
        </Card>

        <Card title="Covenant Headroom at Close">
          <ul className="text-sm text-slate-700 space-y-2">
            <li>Max Leverage: 4.50x • Pro Forma: 4.05x • <b>Headroom 0.45x</b></li>
            <li>Min ICR: 2.00x • Pro Forma: 2.35x • <b>Headroom 0.35x</b></li>
          </ul>
        </Card>

        <Card title="Issuer Actions (Today)">
          <ul className="text-sm text-slate-700 space-y-2">
            <li>
              Approve updated pricing guidance
              <div className="text-xs text-slate-500">Delay may reduce top-lender allocation priority.</div>
            </li>
            <li>
              Respond to lender diligence on revenue recognition
              <div className="text-xs text-slate-500">Needed to convert IOIs → firm bids.</div>
            </li>
          </ul>
        </Card>
      </div>

      {/* Quick links */}
      <div className="flex flex-wrap gap-3">
        <Link href={`/deal/${dealId}/overview`} className="text-sm text-sky-700 hover:underline">
          Open Deal Overview
        </Link>
        <Link href={`/deal/${dealId}/documents`} className="text-sm text-sky-700 hover:underline">
          Documents & Legal
        </Link>
        <Link href={`/deal/${dealId}/qa`} className="text-sm text-sky-700 hover:underline">
          Q&A Center
        </Link>
        <Link href={`/deal/${dealId}/viewer/bookrunner`} className="text-sm text-sky-700 hover:underline">
          Switch to Bookrunner View
        </Link>
      </div>
    </div>
  );
}

function Kpi({ title, value, meta }: { title: string; value: string; meta: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="text-xs uppercase tracking-wide text-slate-500">{title}</div>
      <div className="mt-2 text-2xl font-semibold text-slate-900">{value}</div>
      <div className="mt-1 text-xs text-slate-500">{meta}</div>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="text-sm font-semibold text-slate-900">{title}</div>
      <div className="mt-3">{children}</div>
    </div>
  );
}
