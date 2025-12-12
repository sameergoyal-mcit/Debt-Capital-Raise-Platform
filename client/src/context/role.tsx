import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

export type Role = "issuer" | "bookrunner" | "investor";

type RoleCtx = {
  role: Role;
  setRole: (r: Role) => void;
};

const RoleContext = createContext<RoleCtx | null>(null);

const STORAGE_KEY = "capitalflow_role";

export function RoleProvider({ children }: { children: React.ReactNode }) {
  const [role, setRoleState] = useState<Role>("issuer");

  useEffect(() => {
    // Check URL params first (added back to support ?role= requirement)
    const params = new URLSearchParams(window.location.search);
    const urlRole = params.get("role") as Role | null;

    if (urlRole === "issuer" || urlRole === "bookrunner" || urlRole === "investor") {
      setRoleState(urlRole);
      window.localStorage.setItem(STORAGE_KEY, urlRole);
      return;
    }

    // Fallback to local storage
    const saved = window.localStorage.getItem(STORAGE_KEY) as Role | null;
    if (saved === "issuer" || saved === "bookrunner" || saved === "investor") {
      setRoleState(saved);
    }
  }, []);

  const setRole = (r: Role) => {
    setRoleState(r);
    window.localStorage.setItem(STORAGE_KEY, r);
    
    // Update URL if present to keep state consistent
    const url = new URL(window.location.href);
    if (url.searchParams.has("role")) {
      url.searchParams.set("role", r);
      window.history.replaceState({}, "", url.toString());
    }
  };

  const value = useMemo(() => ({ role, setRole }), [role]);

  return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>;
}

export function useRole() {
  const ctx = useContext(RoleContext);
  if (!ctx) throw new Error("useRole must be used within RoleProvider");
  return ctx;
}
