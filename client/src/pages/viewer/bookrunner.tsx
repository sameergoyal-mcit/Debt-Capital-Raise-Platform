import React from "react";
import { RoleSwitcher } from "@/components/role-switcher";

export default function BookrunnerViewer(props: any) {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Bookrunner View</h1>
          <p className="text-sm text-slate-500">
            Operations view: outreach, investor book, next actions, allocation readiness.
          </p>
        </div>
        <RoleSwitcher />
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="text-sm font-semibold text-slate-900">Investor Book (Stub)</div>
        <div className="text-sm text-slate-600 mt-2">
          Populate this table with lender status (NDA, IOI, firm), ticket range, pricing, owner, last contact.
        </div>
      </div>
    </div>
  );
}
