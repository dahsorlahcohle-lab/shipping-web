/**
 * Test script for confirming the data layer works end-to-end.
 * Run this with: npx tsx scripts/test-db.js
 */

import {
  createShipment,
  getShipments,
  getShipmentByTrackingId,
  updateShipmentStatus
} from "../server/db.ts";

async function runTests() {
  console.log("🚀 Starting database layer end-to-end test...\n");

  // 1. Get initial shipments
  const initialShipments = getShipments();
  console.log(`📦 Found ${initialShipments.length} initial shipments in database.`);
  initialShipments.forEach((s) => {
    console.log(` - [${s.trackingId}] ${s.origin} ➔ ${s.destination} (${s.status})`);
  });

  // 2. Create a new sample shipment
  console.log("\n➕ Creating new shipment...");
  const newShipment = createShipment({
    origin: "Chicago, IL",
    destination: "Seattle, WA",
    carrierService: "Priority Air",
    status: "Pending"
  });
  console.log("✅ Created successfully:");
  console.log(JSON.stringify(newShipment, null, 2));

  // 3. Retrieve the created shipment by tracking ID
  console.log(`\n🔍 Finding shipment with Tracking ID: ${newShipment.trackingId}...`);
  const foundShipment = getShipmentByTrackingId(newShipment.trackingId);
  if (foundShipment) {
    console.log("✅ Shipment found in database!");
  } else {
    console.error("❌ Error: Shipment not found!");
  }

  // 4. Update the shipment status
  console.log(`\n🔄 Updating status of ${newShipment.trackingId} to 'In Transit'...`);
  const updated = updateShipmentStatus(newShipment.trackingId, "In Transit");
  if (updated && updated.status === "In Transit" && updated.statusHistory.length === 2) {
    console.log("✅ Update successful. Current status history:");
    console.log(JSON.stringify(updated.statusHistory, null, 2));
  } else {
    console.error("❌ Error updating status!");
  }

  // 5. Verify final counts
  const finalShipments = getShipments();
  console.log(`\n🏁 Test finished. Database now contains ${finalShipments.length} shipments.`);
}

runTests().catch((err) => {
  console.error("❌ Test failed with error:", err);
});
