import type { Express, Request, Response, NextFunction } from "express";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import bcrypt from "bcryptjs";
import pg from "pg";
import { storage } from "./storage";

const { Pool } = pg;

// Session user type (attached to req.user after authentication)
export interface SessionUser {
  id: string;
  email: string;
  role: string;
  lenderId?: string;
  firstName?: string;
  lastName?: string;
}

// Extend Express Request type to include our user
declare global {
  namespace Express {
    interface User extends SessionUser {}
  }
}

// Create pool for session store
const sessionPool = new Pool({
  connectionString: process.env.DATABASE_URL!,
});

// Session store using Postgres
const PgSession = connectPgSimple(session);

export function setupAuth(app: Express): void {
  // Session configuration
  const sessionSecret = process.env.SESSION_SECRET || "dev-secret-change-in-production";

  app.use(
    session({
      store: new PgSession({
        pool: sessionPool,
        tableName: "sessions",
        createTableIfMissing: true,
      }),
      secret: sessionSecret,
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
      },
    })
  );

  // Initialize Passport
  app.use(passport.initialize());
  app.use(passport.session());

  // Configure Passport Local Strategy
  passport.use(
    new LocalStrategy(
      {
        usernameField: "email",
        passwordField: "password",
      },
      async (email, password, done) => {
        try {
          // Find user by email
          const user = await storage.getUserByEmail(email);

          if (!user) {
            return done(null, false, { message: "Invalid email or password" });
          }

          // Verify password
          const isValid = await bcrypt.compare(password, user.password);
          if (!isValid) {
            return done(null, false, { message: "Invalid email or password" });
          }

          // Get lenderId if user is a lender
          let lenderId: string | undefined;
          if (user.role === "lender") {
            const lender = await storage.getLenderByUserId(user.id);
            lenderId = lender?.id;
          }

          // Return session user object
          const sessionUser: SessionUser = {
            id: user.id,
            email: user.email,
            role: user.role,
            lenderId,
            firstName: user.firstName || undefined,
            lastName: user.lastName || undefined,
          };

          return done(null, sessionUser);
        } catch (error) {
          return done(error);
        }
      }
    )
  );

  // Serialize user for session
  passport.serializeUser((user: SessionUser, done) => {
    done(null, user.id);
  });

  // Deserialize user from session
  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await storage.getUser(id);
      if (!user) {
        return done(null, false);
      }

      // Get lenderId if user is a lender
      let lenderId: string | undefined;
      if (user.role === "lender") {
        const lender = await storage.getLenderByUserId(user.id);
        lenderId = lender?.id;
      }

      const sessionUser: SessionUser = {
        id: user.id,
        email: user.email,
        role: user.role,
        lenderId,
        firstName: user.firstName || undefined,
        lastName: user.lastName || undefined,
      };

      done(null, sessionUser);
    } catch (error) {
      done(error);
    }
  });
}

// Helper to get session user from request
export function getSessionUser(req: Request): SessionUser | null {
  if (req.isAuthenticated() && req.user) {
    return req.user as SessionUser;
  }
  return null;
}

// Basic authentication middleware
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (req.isAuthenticated() && req.user) {
    return next();
  }
  return res.status(401).json({
    error: "Authentication required",
    code: "UNAUTHORIZED"
  });
}

// Role-based access middleware
export function requireRole(...allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({
        error: "Authentication required",
        code: "UNAUTHORIZED"
      });
    }

    const userRole = (req.user as SessionUser).role;

    // Normalize role comparison (case-insensitive)
    const normalizedUserRole = userRole.toLowerCase();
    const normalizedAllowed = allowedRoles.map(r => r.toLowerCase());

    if (!normalizedAllowed.includes(normalizedUserRole)) {
      return res.status(403).json({
        error: "Insufficient permissions",
        code: "FORBIDDEN"
      });
    }

    return next();
  };
}

// Auth routes setup
export function setupAuthRoutes(app: Express): void {
  // Register new user
  app.post("/api/auth/register", async (req, res) => {
    try {
      const { email, password, role, firstName, lastName, username } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: "Email and password required" });
      }

      // Check if user already exists
      const existing = await storage.getUserByEmail(email);
      if (existing) {
        return res.status(400).json({ error: "Email already registered" });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create user
      const user = await storage.createUser({
        email,
        password: hashedPassword,
        role: role || "lender",
        firstName: firstName || null,
        lastName: lastName || null,
        username: username || email.split("@")[0],
      });

      // If role is lender, create lender record
      let lenderId: string | undefined;
      if (user.role === "lender") {
        const lender = await storage.createLender({
          userId: user.id,
          email: user.email,
          firstName: firstName || "New",
          lastName: lastName || "Lender",
          organization: "Unknown",
        });
        lenderId = lender.id;
      }

      // Log registration
      await storage.createLog({
        userId: user.id,
        actorRole: user.role,
        actorEmail: user.email,
        action: "AUTH_REGISTER",
        resourceId: user.id,
        resourceType: "user",
        metadata: { email: user.email } as Record<string, any>,
      });

      res.status(201).json({
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          lenderId,
          firstName: user.firstName,
          lastName: user.lastName,
        },
        message: "Registration successful",
      });
    } catch (error: any) {
      console.error("Registration error:", error);
      res.status(500).json({ error: "Registration failed" });
    }
  });

  // Login
  app.post("/api/auth/login", (req, res, next) => {
    passport.authenticate("local", async (err: any, user: SessionUser | false, info: any) => {
      if (err) {
        return res.status(500).json({ error: "Authentication error" });
      }

      if (!user) {
        return res.status(401).json({
          error: info?.message || "Invalid credentials",
          code: "INVALID_CREDENTIALS"
        });
      }

      req.logIn(user, async (loginErr) => {
        if (loginErr) {
          return res.status(500).json({ error: "Login failed" });
        }

        // Log login
        try {
          await storage.createLog({
            userId: user.id,
            actorRole: user.role,
            actorEmail: user.email,
            action: "AUTH_LOGIN",
            resourceId: user.id,
            resourceType: "user",
            metadata: {
              email: user.email,
              ip: req.ip,
              userAgent: req.headers["user-agent"],
            } as Record<string, any>,
          });
        } catch (e) {
          // Don't fail login if audit log fails
          console.error("Failed to log login:", e);
        }

        return res.json({
          user: {
            id: user.id,
            email: user.email,
            role: user.role,
            lenderId: user.lenderId,
            firstName: user.firstName,
            lastName: user.lastName,
          },
          message: "Login successful",
        });
      });
    })(req, res, next);
  });

  // Logout
  app.post("/api/auth/logout", requireAuth, async (req, res) => {
    const user = req.user as SessionUser;

    // Log logout
    try {
      await storage.createLog({
        userId: user.id,
        actorRole: user.role,
        actorEmail: user.email,
        action: "AUTH_LOGOUT",
        resourceId: user.id,
        resourceType: "user",
        metadata: { email: user.email } as Record<string, any>,
      });
    } catch (e) {
      console.error("Failed to log logout:", e);
    }

    req.logout((err) => {
      if (err) {
        return res.status(500).json({ error: "Logout failed" });
      }

      req.session.destroy((destroyErr) => {
        if (destroyErr) {
          console.error("Session destroy error:", destroyErr);
        }
        res.clearCookie("connect.sid");
        return res.json({ message: "Logged out successfully" });
      });
    });
  });

  // Get current user
  app.get("/api/auth/me", (req, res) => {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({
        error: "Not authenticated",
        code: "UNAUTHORIZED"
      });
    }

    const user = req.user as SessionUser;
    return res.json({
      id: user.id,
      email: user.email,
      role: user.role,
      lenderId: user.lenderId,
      firstName: user.firstName,
      lastName: user.lastName,
    });
  });
}
