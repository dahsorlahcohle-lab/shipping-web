import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config();

interface StatusHistoryEntry {
  status: string;
  timestamp: string;
}

interface Shipment {
  id: string;
  trackingId: string;
  origin: string;
  destination: string;
  carrierService: string;
  status: string;
  statusHistory: StatusHistoryEntry[];
  createdAt: string;
  updatedAt: string;
}

async function runMigration() {
  console.log("🚀 Starting Supabase data migration...");

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error("❌ Error: Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY / SUPABASE_SECRET_KEY in environment variables.");
    process.exit(1);
  }

  const dbJsonPath = path.join(process.cwd(), "data", "db.json");
  if (!fs.existsSync(dbJsonPath)) {
    console.log("ℹ️ No local data/db.json found. Nothing to migrate.");
    return;
  }

  let localShipments: Shipment[] = [];
  try {
    const raw = fs.readFileSync(dbJsonPath, "utf-8");
    localShipments = JSON.parse(raw).shipments || [];
  } catch (e) {
    console.error("❌ Failed to parse local data/db.json:", e);
    process.exit(1);
  }

  if (localShipments.length === 0) {
    console.log("ℹ️ Local db.json has no shipments. Skipping migration.");
    return;
  }

  console.log(`Loaded ${localShipments.length} shipments from local db.json.`);

  try {
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false }
    });

    console.log("Connecting to Supabase. Fetching existing records...");
    const { data: existingRecords, error: fetchError } = await supabase
      .from("shipments")
      .select("tracking_id");

    if (fetchError) {
      console.error("❌ Error querying existing records from Supabase:", fetchError.message);
      console.log("\n💡 Make sure you have created the 'shipments' table using schema.sql in your Supabase SQL Editor!");
      process.exit(1);
    }

    const existingTrackingIds = new Set(
      (existingRecords || []).map((r: any) => r.tracking_id?.toUpperCase())
    );

    let migratedCount = 0;
    let skippedCount = 0;

    for (const shipment of localShipments) {
      if (existingTrackingIds.has(shipment.trackingId.toUpperCase())) {
        skippedCount++;
        continue;
      }

      const { error: insertError } = await supabase
        .from("shipments")
        .insert({
          id: shipment.id,
          tracking_id: shipment.trackingId,
          origin: shipment.origin,
          destination: shipment.destination,
          carrier_service: shipment.carrierService,
          status: shipment.status,
          status_history: shipment.statusHistory, // Supabase jsonb handles array automatically!
          created_at: shipment.createdAt,
          updated_at: shipment.updatedAt,
        });

      if (insertError) {
        console.error(`❌ Failed to migrate ${shipment.trackingId}:`, insertError.message);
      } else {
        migratedCount++;
        console.log(`✅ Migrated: ${shipment.trackingId}`);
      }
    }

    console.log("\n=================================");
    console.log("📊 Supabase Migration Summary:");
    console.log(`- Total local shipments: ${localShipments.length}`);
    console.log(`- Successfully migrated: ${migratedCount}`);
    console.log(`- Already present (skipped): ${skippedCount}`);
    console.log("=================================\n");

  } catch (error) {
    console.error("❌ Migration failed with error:", error);
    process.exit(1);
  }
}

runMigration();
