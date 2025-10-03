import mongoose from "mongoose";
import dotenv from "dotenv";
import { parseOrderResponseCSV } from "../src/lib/integration/parseEagleOrderResponse.js";
import { Order } from "../src/app/models/Order.js";

dotenv.config();

const mongoUri = process.env.MONGODB_URI;
if (!mongoUri) {
  throw new Error("❌ MONGODB_URI not found in .env file");
}

// Business-level flow (Order.status)
const ORDER_STATUS_FLOW = [
  "ordered",
  "processing",
  "dispatched",
  "in_transit",
  "out_for_delivery",
  "delivered", // stop here
];

// Logistics-level flow (Order.shipping.status)
const SHIPPING_STATUS_FLOW = [
  "pending",
  "processing",
  "dispatched",
  "in_transit",
  "out_for_delivery",
  "delivered",
  "returned",
];

async function run() {
  try {
    await mongoose.connect(mongoUri);
    console.log("✅ Connected to MongoDB");

    const filePath =
      "/Users/mac/britbook-api/src/ftp-root/staging/incoming/orders/order_68daaf3d82d486b6a91f3849.csv";

    // Step 1: Parse the Eagle CSV normally
    await parseOrderResponseCSV(filePath);
    console.log("📄 CSV parsed and orders updated");

    // Step 2: Walk each parsed order through the full status flow
    const orders = await Order.find({});
    console.log(`🔍 Found ${orders.length} orders to walk through status flow`);

    for (const order of orders) {
      // Ensure shipping object always exists
      if (!order.shipping) {
        order.shipping = {};
      }

      const currentIndex = ORDER_STATUS_FLOW.indexOf(order.status);
      const startIndex = currentIndex >= 0 ? currentIndex : 0;

      for (let i = startIndex; i < ORDER_STATUS_FLOW.length; i++) {
        const nextStatus = ORDER_STATUS_FLOW[i];

        // Update order.status (business lifecycle)
        order.status = nextStatus;

        // Keep shipping.status in sync (logistics lifecycle)
        if (SHIPPING_STATUS_FLOW.includes(nextStatus)) {
          order.shipping.status = nextStatus;
        }

        // Set timestamps for key events
        if (nextStatus === "dispatched") {
          order.shipping.shippedAt = new Date();
        }
        if (nextStatus === "delivered") {
          order.shipping.deliveredAt = new Date();
        }

        await order.save();
        console.log(`✅ Order ${order._id} → ${nextStatus}`);
      }
    }

    console.log("🎉 Status flow complete (stopped at delivered)");
  } catch (err) {
    console.error("❌ Script failed:", err);
  } finally {
    await mongoose.disconnect();
    console.log("🔌 Disconnected from MongoDB");
    process.exit(0);
  }
}

run();
