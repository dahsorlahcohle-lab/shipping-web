import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";
import crypto from "crypto";

export interface StatusHistoryEntry {
  status: string;
  timestamp: string;
}

export interface Shipment {
  id: string;
  trackingId: string;
  origin: string;
  destination: string;
  carrierService: string;
  status: "Pending" | "In Transit" | "Out for Delivery" | "Delivered";
  statusHistory: StatusHistoryEntry[];
  createdAt: string;
  updatedAt: string;
}

// In-memory cache of shipments
let cachedShipments: Shipment[] = [];
let isInitialized = false;
let lastFetchTime = 0;
const CACHE_TTL = 10000; // 10 seconds

const DATA_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "db.json");

// Helper to load sample data / local backup
function loadLocalBackup(): Shipment[] {
  if (fs.existsSync(DB_PATH)) {
    try {
      const raw = fs.readFileSync(DB_PATH, "utf-8");
      return JSON.parse(raw).shipments || [];
    } catch (e) {
      console.error("Failed to read local backup db.json:", e);
    }
  }
  
  // Return default sample shipments if no file exists
  return [
    {
      id: crypto.randomUUID(),
      trackingId: `TRK-${new Date().getFullYear()}-H7K9`,
      origin: "Los Angeles, CA",
      destination: "New York, NY",
      carrierService: "Express Delivery",
      status: "In Transit",
      statusHistory: [
        { status: "Pending", timestamp: new Date(Date.now() - 86400000 * 2).toISOString() },
        { status: "In Transit", timestamp: new Date(Date.now() - 86400000).toISOString() }
      ],
      createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
      updatedAt: new Date(Date.now() - 86400000).toISOString()
    },
    {
      id: crypto.randomUUID(),
      trackingId: `TRK-${new Date().getFullYear()}-A4B2`,
      origin: "San Francisco, CA",
      destination: "Austin, TX",
      carrierService: "Ground Shipping",
      status: "Delivered",
      statusHistory: [
        { status: "Pending", timestamp: new Date(Date.now() - 86400000 * 5).toISOString() },
        { status: "In Transit", timestamp: new Date(Date.now() - 86400000 * 3).toISOString() },
        { status: "Out for Delivery", timestamp: new Date(Date.now() - 86400000).toISOString() },
        { status: "Delivered", timestamp: new Date().toISOString() }
      ],
      createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
      updatedAt: new Date().toISOString()
    }
  ];
}

// Initialize cachedShipments immediately with local backup
cachedShipments = loadLocalBackup();

// Get Supabase credentials safely
function getSupabaseCredentials() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_ANON_KEY;

  if (!url || !key) {
    return null;
  }
  return { url, key };
}

export interface SupabaseStatus {
  configured: boolean;
  ok: boolean;
  error: string | null;
}

let supabaseStatus: SupabaseStatus = {
  configured: false,
  ok: true,
  error: null
};

export function getSupabaseStatus(): SupabaseStatus {
  const creds = getSupabaseCredentials();
  if (!creds) {
    return {
      configured: false,
      ok: true,
      error: "Supabase credentials (SUPABASE_URL or keys) are not yet fully configured in your environment variables."
    };
  }
  return { ...supabaseStatus, configured: true };
}

// Lazy Supabase client initialization
let supabaseClientInstance: any = null;

function getSupabaseClient() {
  if (supabaseClientInstance) {
    return supabaseClientInstance;
  }

  const creds = getSupabaseCredentials();
  if (!creds) {
    return null;
  }

  try {
    supabaseClientInstance = createClient(creds.url, creds.key, {
      auth: {
        persistSession: false,
      },
    });
    return supabaseClientInstance;
  } catch (error) {
    console.error("Error connecting to Supabase:", error);
    return null;
  }
}

// Robust database field mappers (handles snake_case and camelCase column schemas)
function mapRowToShipment(row: any): Shipment {
  let statusHistory: StatusHistoryEntry[] = [];
  try {
    const history = row.status_history || row.statusHistory || [];
    statusHistory = typeof history === "string" ? JSON.parse(history) : history;
  } catch (e) {
    console.error(`Failed to parse status history for row ${row.tracking_id || row.trackingId}:`, e);
  }

  return {
    id: row.id || "",
    trackingId: row.tracking_id || row.trackingId || "",
    origin: row.origin || "",
    destination: row.destination || "",
    carrierService: row.carrier_service || row.carrierService || "",
    status: (row.status as Shipment["status"]) || "Pending",
    statusHistory,
    createdAt: row.created_at || row.createdAt || "",
    updatedAt: row.updated_at || row.updatedAt || "",
  };
}

// Async sync function to fetch from Supabase and update cache
async function syncFromSupabase() {
  const supabase = getSupabaseClient();
  if (!supabase) {
    supabaseStatus = {
      configured: false,
      ok: false,
      error: "Supabase client initialization failed. Please verify your environment variables."
    };
    console.warn("⚠️ Supabase credentials are not configured or client creation failed. Operating in local cache mode.");
    return;
  }

  try {
    const { data, error } = await supabase
      .from("shipments")
      .select("*");

    if (error) {
      throw new Error(error.message);
    }

    if (data) {
      const shipments: Shipment[] = data.map(mapRowToShipment);
      cachedShipments = shipments;
      isInitialized = true;
      lastFetchTime = Date.now();
      supabaseStatus = {
        configured: true,
        ok: true,
        error: null
      };
      console.log(`✅ Synced ${shipments.length} shipments from Supabase.`);
      
      // Update local backup
      saveLocalBackup();
    }
  } catch (error: any) {
    supabaseStatus = {
      configured: true,
      ok: false,
      error: error.message || String(error)
    };
    console.error("❌ Error syncing from Supabase:", error);
  }
}

// Asynchronously load from Supabase immediately at startup
syncFromSupabase().catch((err) => {
  console.error("❌ Initial Supabase sync failed:", err);
});

// Sync data to the local backup db.json for offline robustness
function saveLocalBackup() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DB_PATH, JSON.stringify({ shipments: cachedShipments }, null, 2), "utf-8");
  } catch (e) {
    console.error("Failed to write local backup db.json:", e);
  }
}

// API Functions (keep identical synchronous signatures)

export function getShipments(): Shipment[] {
  // Check if cache expired and trigger background sync if so
  const creds = getSupabaseCredentials();
  if (creds && Date.now() - lastFetchTime > CACHE_TTL) {
    // Fire-and-forget background sync
    syncFromSupabase().catch((err) => {
      console.error("Background Supabase sync failed:", err);
    });
  }

  return [...cachedShipments].sort((a, b) => {
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });
}

export function getShipmentByTrackingId(trackingId: string): Shipment | null {
  const creds = getSupabaseCredentials();
  if (creds && Date.now() - lastFetchTime > CACHE_TTL) {
    // Fire-and-forget background sync
    syncFromSupabase().catch((err) => {
      console.error("Background Supabase sync failed:", err);
    });
  }

  const shipment = cachedShipments.find(
    (s) => s.trackingId.toUpperCase() === trackingId.trim().toUpperCase()
  );
  return shipment || null;
}

export function createShipment(data: {
  origin: string;
  destination: string;
  carrierService: string;
  status: Shipment["status"];
}): Shipment {
  const existingIds = cachedShipments.map((s) => s.trackingId);
  const trackingId = generateTrackingId(existingIds);
  const now = new Date().toISOString();

  const newShipment: Shipment = {
    id: crypto.randomUUID(),
    trackingId,
    origin: data.origin,
    destination: data.destination,
    carrierService: data.carrierService,
    status: data.status,
    statusHistory: [
      {
        status: data.status,
        timestamp: now,
      },
    ],
    createdAt: now,
    updatedAt: now,
  };

  // Update in-memory cache synchronously for instant client-side updates
  cachedShipments.push(newShipment);
  lastFetchTime = Date.now(); // Reset TTL timer to keep our new item cached

  // Keep local backup synchronized
  saveLocalBackup();

  // Asynchronously append to Supabase in the background
  const supabase = getSupabaseClient();
  if (supabase) {
    supabase
      .from("shipments")
      .insert({
        id: newShipment.id,
        tracking_id: newShipment.trackingId,
        origin: newShipment.origin,
        destination: newShipment.destination,
        carrier_service: newShipment.carrierService,
        status: newShipment.status,
        status_history: newShipment.statusHistory,
        created_at: newShipment.createdAt,
        updated_at: newShipment.updatedAt,
      })
      .then(({ error }: any) => {
        if (error) {
          console.error(`Error saving shipment ${trackingId} to Supabase:`, error.message);
        } else {
          console.log(`Saved new shipment ${trackingId} to Supabase.`);
        }
      })
      .catch((err: any) => {
        console.error(`Exception saving shipment ${trackingId} to Supabase:`, err);
      });
  }

  return newShipment;
}

export function updateShipmentStatus(
  trackingId: string,
  newStatus: Shipment["status"]
): Shipment | null {
  const index = cachedShipments.findIndex(
    (s) => s.trackingId.toUpperCase() === trackingId.trim().toUpperCase()
  );

  if (index === -1) {
    return null;
  }

  const shipment = cachedShipments[index];
  const now = new Date().toISOString();

  // Update in-memory cache synchronously
  shipment.status = newStatus;
  shipment.statusHistory.push({
    status: newStatus,
    timestamp: now,
  });
  shipment.updatedAt = now;

  cachedShipments[index] = shipment;
  lastFetchTime = Date.now(); // Reset TTL timer

  // Keep local backup synchronized
  saveLocalBackup();

  // Asynchronously update Supabase in the background
  const supabase = getSupabaseClient();
  if (supabase) {
    supabase
      .from("shipments")
      .update({
        status: newStatus,
        status_history: shipment.statusHistory,
        updated_at: now,
      })
      .eq("tracking_id", trackingId)
      .then(({ error }: any) => {
        if (error) {
          console.error(`Error updating shipment ${trackingId} in Supabase:`, error.message);
        } else {
          console.log(`Updated shipment ${trackingId} in Supabase.`);
        }
      })
      .catch((err: any) => {
        console.error(`Exception updating shipment ${trackingId} in Supabase:`, err);
      });
  }

  return shipment;
}

// Generate unique tracking ID: TRK-{currentYear}-{4 random alphanumeric chars}
export function generateTrackingId(existingIds?: string[]): string {
  const currentYear = new Date().getFullYear();
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

  const idsToCompare = existingIds || cachedShipments.map((s) => s.trackingId);

  let trackingId = "";
  let collision = true;
  let attempts = 0;

  while (collision && attempts < 100) {
    let randomPart = "";
    for (let i = 0; i < 4; i++) {
      randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    trackingId = `TRK-${currentYear}-${randomPart}`;
    collision = idsToCompare.some(
      (id) => id.toUpperCase() === trackingId.toUpperCase()
    );
    attempts++;
  }

  return trackingId;
}
