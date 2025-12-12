import React from "react";
import { useRole, Role } from "@/context/role";
import { useLocation } from "wouter";

const options: { key: Role; label: string }[] = [
  { key: "issuer", label: "Issuer (PE)" },
  { key: "bookrunner", label: "Bookrunner (IB)" },
  { key: "investor", label: "Debt Investor" },
];

export function RoleSwitcher() {
  const { role, setRole } = useRole();
  const [location, setLocation] = useLocation();

  const handleRoleChange = (newRole: Role) => {
    setRole(newRole);
    // If we are in the viewer pages, also navigate to the correct route
    if (location.includes("/viewer")) {
      const dealIdMatch = location.match(/\/deal\/([^/]+)/);
      const dealId = dealIdMatch ? dealIdMatch[1] : "101"; // Fallback
      setLocation(`/deal/${dealId}/viewer/${newRole}`);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-slate-500">View as</span>
      <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1">
        {options.map((o) => (
          <button
            key={o.key}
            onClick={() => handleRoleChange(o.key)}
            className={[
              "px-3 py-1.5 text-sm rounded-md transition",
              role === o.key
                ? "bg-slate-900 text-white"
                : "text-slate-700 hover:bg-slate-100",
            ].join(" ")}
            type="button"
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}
