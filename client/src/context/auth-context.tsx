import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";

// User role type - matches server roles (case insensitive)
export type UserRole = "lender" | "bookrunner" | "issuer" | "sponsor" | "Issuer" | "Bookrunner" | "Investor";

export interface User {
  id: string;
  email: string;
  role: string;
  lenderId?: string;
  firstName?: string;
  lastName?: string;
  // Computed/backwards compatible properties
  name?: string;
  dealAccess?: string[];
}

interface LoginCredentials {
  email: string;
  password: string;
}

interface RegisterData {
  email: string;
  password: string;
  role?: string;
  firstName?: string;
  lastName?: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<{ success: boolean; error?: string }>;
  loginAsRole: (role: string, lenderId?: string) => void; // Keep for demo purposes
  logout: () => Promise<void>;
  register: (data: RegisterData) => Promise<{ success: boolean; error?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Transform server user to client User with computed properties
function transformUser(serverUser: any): User {
  const firstName = serverUser.firstName || "";
  const lastName = serverUser.lastName || "";
  const name = firstName && lastName
    ? `${firstName} ${lastName}`
    : serverUser.email.split("@")[0];

  return {
    ...serverUser,
    name,
    // Default deal access based on role
    dealAccess: serverUser.dealAccess || (
      serverUser.role.toLowerCase() === "lender"
        ? [] // Lenders get deals from invitations
        : ["101", "102", "103"] // Internal users see all deals
    ),
  };
}

// Fetch current user from session
async function fetchCurrentUser(): Promise<User | null> {
  const response = await fetch("/api/auth/me", {
    credentials: "include",
  });

  if (response.status === 401) {
    return null;
  }

  if (!response.ok) {
    throw new Error("Failed to fetch user");
  }

  const serverUser = await response.json();
  return transformUser(serverUser);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  // Use React Query to fetch current user
  const { data: user, isLoading, refetch } = useQuery({
    queryKey: ["auth", "me"],
    queryFn: fetchCurrentUser,
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: true,
  });

  // Login with email/password
  const login = useCallback(async (credentials: LoginCredentials): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(credentials),
      });

      const data = await response.json();

      if (!response.ok) {
        return { success: false, error: data.error || "Login failed" };
      }

      // Transform and cache user data
      const transformedUser = transformUser(data.user);
      queryClient.setQueryData(["auth", "me"], transformedUser);

      // Redirect based on role
      const userRole = data.user.role.toLowerCase();
      if (userRole === "lender") {
        setLocation("/investor");
      } else {
        setLocation("/deals");
      }

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message || "Login failed" };
    }
  }, [queryClient, setLocation]);

  // Demo login (for demo purposes - creates a mock session)
  const loginAsRole = useCallback(async (role: string, lenderId?: string): Promise<void> => {
    // For demo, use hardcoded credentials based on role
    let email = "";
    let name = "";
    let password = "demo123"; // Demo password

    const normalizedRole = role.toLowerCase();

    if (normalizedRole === "issuer") {
      email = "cfo@titan-software.com";
      name = "David Miller (CFO)";
    } else if (normalizedRole === "bookrunner") {
      email = "sarah.jenkins@capitalflow.com";
      name = "Sarah Jenkins";
    } else if (normalizedRole === "lender" || normalizedRole === "investor") {
      email = lenderId ? `investor-${lenderId}@fund.com` : "investor@fund.com";
      name = "Investor Representative";
    } else if (normalizedRole === "sponsor") {
      email = "sponsor@capitalflow.com";
      name = "Sponsor Representative";
    }

    // Try to login first
    const result = await login({ email, password });

    if (!result.success) {
      // Fallback for demo: store in localStorage and navigate
      const mockUser: User = {
        id: "demo-" + normalizedRole,
        email,
        role: normalizedRole,
        name,
        lenderId: normalizedRole === "lender" || normalizedRole === "investor" ? lenderId : undefined,
        dealAccess: normalizedRole === "lender" || normalizedRole === "investor"
          ? ["101"]
          : ["101", "102", "103"],
      };
      localStorage.setItem("capitalflow_demo_user", JSON.stringify(mockUser));
      queryClient.setQueryData(["auth", "me"], mockUser);

      if (normalizedRole === "lender" || normalizedRole === "investor") {
        setLocation("/investor");
      } else {
        setLocation("/deals");
      }
    }
  }, [login, queryClient, setLocation]);

  // Logout
  const logout = useCallback(async (): Promise<void> => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
    } catch (error) {
      console.error("Logout error:", error);
    }

    // Clear query cache and demo storage
    localStorage.removeItem("capitalflow_demo_user");
    queryClient.setQueryData(["auth", "me"], null);
    queryClient.invalidateQueries({ queryKey: ["auth", "me"] });

    setLocation("/login");
  }, [queryClient, setLocation]);

  // Register new user
  const register = useCallback(async (data: RegisterData): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        return { success: false, error: result.error || "Registration failed" };
      }

      // Auto login after registration
      return login({ email: data.email, password: data.password });
    } catch (error: any) {
      return { success: false, error: error.message || "Registration failed" };
    }
  }, [login]);

  // Check for demo user in localStorage on mount (fallback for demo)
  useEffect(() => {
    if (!isLoading && !user) {
      const demoUser = localStorage.getItem("capitalflow_demo_user");
      if (demoUser) {
        queryClient.setQueryData(["auth", "me"], JSON.parse(demoUser));
      }
    }
  }, [isLoading, user, queryClient]);

  return (
    <AuthContext.Provider
      value={{
        user: user || null,
        isAuthenticated: !!user,
        isLoading,
        login,
        loginAsRole,
        logout,
        register,
      }}
    >
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

// Hook to require authentication
export function useRequireAuth(redirectTo: string = "/login") {
  const { user, isAuthenticated, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      setLocation(redirectTo);
    }
  }, [isLoading, isAuthenticated, redirectTo, setLocation]);

  return { user, isLoading, isAuthenticated };
}

// Hook to check if user has required role
export function useRequireRole(allowedRoles: string[], redirectTo: string = "/unauthorized") {
  const { user, isLoading, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && isAuthenticated && user) {
      const userRole = user.role.toLowerCase();
      const normalizedAllowed = allowedRoles.map(r => r.toLowerCase());

      if (!normalizedAllowed.includes(userRole)) {
        setLocation(redirectTo);
      }
    }
  }, [isLoading, isAuthenticated, user, allowedRoles, redirectTo, setLocation]);

  return { user, isLoading, hasAccess: user && allowedRoles.map(r => r.toLowerCase()).includes(user.role.toLowerCase()) };
}
