import React, { createContext, useContext, useState, useEffect } from "react";
import { useLocation } from "wouter";

export type UserRole = "issuer" | "bookrunner" | "investor";

interface RoleContextType {
  role: UserRole;
  setRole: (role: UserRole) => void;
}

const RoleContext = createContext<RoleContextType | undefined>(undefined);

export function RoleProvider({ children }: { children: React.ReactNode }) {
  const [role, setRoleState] = useState<UserRole>("issuer");
  const [location] = useLocation();

  useEffect(() => {
    // 1. Check URL search params
    const searchParams = new URLSearchParams(window.location.search);
    const roleParam = searchParams.get("role") as UserRole;
    
    if (roleParam && ["issuer", "bookrunner", "investor"].includes(roleParam)) {
      setRoleState(roleParam);
      localStorage.setItem("capitalflow_role", roleParam);
    } else {
      // 2. Check localStorage
      const storedRole = localStorage.getItem("capitalflow_role") as UserRole;
      if (storedRole && ["issuer", "bookrunner", "investor"].includes(storedRole)) {
        setRoleState(storedRole);
      }
    }
  }, [location]); // Re-check on location change if needed, though mostly on mount or query param change

  const setRole = (newRole: UserRole) => {
    setRoleState(newRole);
    localStorage.setItem("capitalflow_role", newRole);
    
    // Update URL query param to reflect change (optional but good for sharing)
    const url = new URL(window.location.href);
    url.searchParams.set("role", newRole);
    window.history.pushState({}, "", url.toString());
  };

  return (
    <RoleContext.Provider value={{ role, setRole }}>
      {children}
    </RoleContext.Provider>
  );
}

export function useRole() {
  const context = useContext(RoleContext);
  if (context === undefined) {
    throw new Error("useRole must be used within a RoleProvider");
  }
  return context;
}
