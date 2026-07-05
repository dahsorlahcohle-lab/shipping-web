import express from "express";
import path from "path";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import crypto from "crypto";
import { createServer as createViteServer } from "vite";
import {
  getShipments,
  getShipmentByTrackingId,
  createShipment,
  updateShipmentStatus,
  getSupabaseStatus
} from "./server/db";

dotenv.config();

const app = express();
const PORT = 3000;

// Configs and Secrets
const COOKIE_SECRET = process.env.COOKIE_SECRET || "shipping-dashboard-secure-cookie-secret-key-123456";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin";

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser(COOKIE_SECRET));

// In-memory tracking of failed login attempts by IP
interface LockoutInfo {
  failedAttempts: number;
  lockoutUntil: number | null;
}
const loginAttempts = new Map<string, LockoutInfo>();

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 10 * 60 * 1000; // 10 minutes

// Constant-time comparison for password safety
function constantTimeCompare(val1: string, val2: string): boolean {
  const buf1 = Buffer.from(val1);
  const buf2 = Buffer.from(val2);
  
  if (buf1.length !== buf2.length) {
    // Prevent timing leaks by performing a dummy compare
    crypto.timingSafeEqual(buf1, buf1);
    return false;
  }
  
  return crypto.timingSafeEqual(buf1, buf2);
}

// API Routes

// Public API: Track shipment by Tracking ID
app.get("/api/shipments/:trackingId", (req, res) => {
  const trackingId = req.params.trackingId;
  const shipment = getShipmentByTrackingId(trackingId);
  if (!shipment) {
    return res.status(404).json({ error: "Shipment not found" });
  }
  res.json(shipment);
});

// Public API: Get Supabase connection status and errors
app.get("/api/supabase-status", (req, res) => {
  res.json(getSupabaseStatus());
});

// Admin Auth Attempt Route
app.post("/api/admin/auth", (req, res) => {
  const { password } = req.body;
  const ip = req.ip || (req.headers["x-forwarded-for"] as string) || "unknown";

  // Check lockout
  const attempts = loginAttempts.get(ip) || { failedAttempts: 0, lockoutUntil: null };
  if (attempts.lockoutUntil && Date.now() < attempts.lockoutUntil) {
    return res.status(401).json({ error: "Invalid password" });
  }

  // Ensure password is read from body only (not query params)
  if (!password || typeof password !== "string") {
    return res.status(401).json({ error: "Invalid password" });
  }

  const matches = constantTimeCompare(password, ADMIN_PASSWORD);

  if (matches) {
    // Reset failed attempts on success
    loginAttempts.delete(ip);

    // Set 12-hour session cookie
    const sessionValue = JSON.stringify({
      admin: true,
      expiresAt: Date.now() + 12 * 60 * 60 * 1000
    });

    res.cookie("admin_session", sessionValue, {
      httpOnly: true,
      secure: true, // Required for sameSite: "none" in cross-origin iframe
      sameSite: "none", // Required for cross-origin iframe
      maxAge: 12 * 60 * 60 * 1000,
      signed: true
    });

    return res.json({ success: true, redirect: "/admin/dashboard" });
  } else {
    // Track failure
    attempts.failedAttempts += 1;
    if (attempts.failedAttempts >= MAX_FAILED_ATTEMPTS) {
      attempts.lockoutUntil = Date.now() + LOCKOUT_DURATION_MS;
      console.log(`🔒 IP locked out due to multiple login failures: ${ip}`);
    }
    loginAttempts.set(ip, attempts);

    return res.status(401).json({ error: "Invalid password" });
  }
});

// Admin Auth Status Route
app.get("/api/admin/me", (req, res) => {
  const signedSession = req.signedCookies.admin_session;
  if (!signedSession) {
    return res.json({ authenticated: false });
  }
  try {
    const session = JSON.parse(signedSession);
    if (session.admin && session.expiresAt && Date.now() < session.expiresAt) {
      return res.json({ authenticated: true });
    }
  } catch (e) {}
  res.clearCookie("admin_session", {
    secure: true,
    sameSite: "none"
  });
  res.json({ authenticated: false });
});

// Admin Logout Route
app.post("/api/admin/logout", (req, res) => {
  res.clearCookie("admin_session", {
    secure: true,
    sameSite: "none"
  });
  res.json({ success: true });
});

// Protected Api Middleware
function apiAuthMiddleware(req: express.Request, res: express.Response, next: express.NextFunction) {
  const signedSession = req.signedCookies.admin_session;
  if (!signedSession) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  try {
    const session = JSON.parse(signedSession);
    if (session.admin && session.expiresAt && Date.now() < session.expiresAt) {
      return next();
    }
  } catch (e) {}
  res.clearCookie("admin_session", {
    secure: true,
    sameSite: "none"
  });
  return res.status(401).json({ error: "Session expired or unauthorized" });
}

// Protected Admin API: Get all shipments
app.get("/api/admin/shipments", apiAuthMiddleware, (req, res) => {
  const shipments = getShipments();
  res.json(shipments);
});

// Protected Admin API: Create a new shipment
app.post("/api/admin/shipments", apiAuthMiddleware, (req, res) => {
  const { origin, destination, carrierService, status } = req.body;
  if (!origin || !destination || !carrierService || !status) {
    return res.status(400).json({ error: "Missing required fields" });
  }
  
  const shipment = createShipment({
    origin,
    destination,
    carrierService,
    status
  });
  res.status(211).json(shipment);
});

// Protected Admin API: Update status
app.patch("/api/admin/shipments/:trackingId/status", apiAuthMiddleware, (req, res) => {
  const { trackingId } = req.params;
  const { status } = req.body;
  if (!status) {
    return res.status(400).json({ error: "Missing status parameter" });
  }

  const updated = updateShipmentStatus(trackingId, status);
  if (!updated) {
    return res.status(404).json({ error: "Shipment not found" });
  }
  res.json(updated);
});

// Admin Route Guards - Redirect checks for browser requests
app.get("/admin/login", (req, res, next) => {
  const signedSession = req.signedCookies.admin_session;
  if (signedSession) {
    try {
      const session = JSON.parse(signedSession);
      if (session.admin && session.expiresAt && Date.now() < session.expiresAt) {
        return res.redirect("/admin/dashboard");
      }
    } catch (e) {}
  }
  next();
});

app.get("/admin/*", (req, res, next) => {
  const signedSession = req.signedCookies.admin_session;
  if (!signedSession) {
    return res.redirect("/admin/login");
  }
  try {
    const session = JSON.parse(signedSession);
    if (!session.admin || !session.expiresAt || Date.now() > session.expiresAt) {
      res.clearCookie("admin_session", {
        secure: true,
        sameSite: "none"
      });
      return res.redirect("/admin/login");
    }
  } catch (e) {
    res.clearCookie("admin_session", {
      secure: true,
      sameSite: "none"
    });
    return res.redirect("/admin/login");
  }
  next();
});

// Vite / Production Build Setup
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Shipping Dashboard Server running on http://localhost:${PORT}`);
  });
}

startServer();
