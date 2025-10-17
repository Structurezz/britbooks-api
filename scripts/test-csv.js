import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { createObjectCsvWriter } from "csv-writer";
import { Order } from "../src/app/models/Order.js";
// Load environment variables
dotenv.config();
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error("Please set MONGO_URI in your .env file");
  process.exit(1);
}

// Connect to MongoDB
mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

/**
 * Mark the last 20 orders as paid and export to CSV
 */
async function markLast20OrdersAsPaidAndExportCSV() {
  try {
    // Fetch the last 20 orders that are currently unpaid
    const last20Orders = await Order.find({ "payment.status": { $ne: "paid" } })
      .sort({ placedAt: -1 })
      .limit(20);

    if (!last20Orders.length) {
      console.log("No unpaid orders found to mark as paid.");
      return;
    }

    const now = new Date();

    // Update orders to paid and prepare CSV data
    const csvData = [];
    for (const order of last20Orders) {
      order.payment.status = "paid";
      order.payment.paidAt = now;

      order.history.push({
        status: "ordered",
        updatedAt: now,
        note: "Marked as paid automatically",
      });

      await order.save();

      // Prepare CSV row
      csvData.push({
        orderId: order._id.toString(),
        status: "Paid",
        total: order.total,
        currency: order.currency,
        placedAt: order.placedAt.toISOString(),
        shippingMethod: order.shipping?.method || "standard",
        trackingNumber: order.shipping?.trackingNumber || "",
        items: order.items
          .map(
            (item) =>
              `${item.listing.toString()} (Qty: ${item.quantity}, Price: ${item.priceAtPurchase})`
          )
          .join("; "),
      });
    }

    // Write CSV
    const csvWriter = createObjectCsvWriter({
      path: path.join(process.cwd(), "last_20_paid_orders.csv"),
      header: [
        { id: "orderId", title: "Order ID" },
        { id: "status", title: "Status" },
        { id: "total", title: "Total" },
        { id: "currency", title: "Currency" },
        { id: "placedAt", title: "Placed At" },
        { id: "shippingMethod", title: "Shipping Method" },
        { id: "trackingNumber", title: "Tracking Number" },
        { id: "items", title: "Items" },
      ],
    });

    await csvWriter.writeRecords(csvData);
    console.log("CSV file successfully created: last_20_paid_orders.csv");
  } catch (err) {
    console.error("Error processing orders:", err);
  } finally {
    mongoose.disconnect();
  }
}

// Run the function
markLast20OrdersAsPaidAndExportCSV();
