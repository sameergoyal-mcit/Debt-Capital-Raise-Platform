import React, { createContext, useContext, useState, useEffect } from "react";
import { useLocation } from "wouter";
import { mockLenders } from "@/data/lenders";

export type UserRole = "Issuer" | "Bookrunner" | "Investor";

export interface User {
  email: string;
  name: string;
  role: UserRole;
  lenderId?: string; // Only for Investor
  dealAccess?: string[]; // IDs of deals they can access
}

interface AuthContextType {
  user: User | null;
  login: (role: UserRole, lenderId?: string) => void;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [, setLocation] = useLocation();

  useEffect(() => {
    // Check localStorage on mount
    const storedUser = localStorage.getItem("capitalflow_user");
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  const login = (role: UserRole, lenderId?: string) => {
    let newUser: User;
    
    if (role === "Issuer") {
      newUser = {
        email: "cfo@titan-software.com",
        name: "David Miller (CFO)",
        role: "Issuer",
        dealAccess: ["101"] // Titan deal
      };
    } else if (role === "Bookrunner") {
      newUser = {
        email: "sarah.jenkins@capitalflow.com",
        name: "Sarah Jenkins",
        role: "Bookrunner",
        dealAccess: ["101", "102", "103"] // All deals
      };
    } else {
      // Investor
      const lender = lenderId ? mockLenders.find(l => l.id === lenderId) : null;
      newUser = {
        email: lender ? `investor@${lender.name.toLowerCase().replace(/\s/g, "")}.com` : "investor@fund.com",
        name: lender ? `${lender.name} Rep` : "Investor Representative", 
        role: "Investor",
        lenderId: lenderId,
        dealAccess: ["101"] // Assume access to Titan for demo
      };
    }

    setUser(newUser);
    localStorage.setItem("capitalflow_user", JSON.stringify(newUser));

    // Redirect logic
    if (role === "Investor") {
       setLocation("/deal/101/overview");
    } else {
       setLocation("/deals");
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("capitalflow_user");
    setLocation("/login");
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
