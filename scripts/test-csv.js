import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { createObjectCsvWriter } from "csv-writer";
import { Order } from "../src/app/models/Order.js";
import { MarketplaceListing } from "../src/app/models/MarketPlace.js";
import { uploadToSftp } from "../src/lib/config/sftp/sftpClient.js";

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error("Please set MONGO_URI in your .env file");
  process.exit(1);
}

// Connect to MongoDB
mongoose.connect(MONGODB_URI);

/**
 * Create order from last 20 Marketplace listings and upload CSV to SFTP
 */
async function createOrderFromRecentProductsAndUpload() {
  try {
    const userId = "6888f7e9e9896d7bd5cc4727";
    const listings = await MarketplaceListing.find({})
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    if (!listings.length) {
      console.log("No Marketplace listings found.");
      return;
    }

    // Build items array
    const items = listings.map((listing) => ({
      listing: listing._id,
      quantity: 1,
      priceAtPurchase: listing.price || 0,
      currency: listing.currency || "GBP",
    }));

    const total = items.reduce((sum, item) => sum + item.priceAtPurchase, 0);

    // Create order
    const order = await Order.create({
      user: userId,
      type: "order",
      status: "ordered",
      items,
      total,
      currency: "GBP",
      shipping: { method: "standard", status: "ordered" },
      payment: { status: "paid", method: "wallet", paidAt: new Date() },
      shippingAddress: {
        fullName: "Michael Orizu",
        phoneNumber: "2347089224074",
        addressLine1: "12 Example Street",
        city: "London",
        country: "United Kingdom",
      },
      billingAddress: {
        fullName: "Michael Orizu",
        phoneNumber: "2347089224074",
        addressLine1: "12 Example Street",
        city: "London",
        country: "United Kingdom",
      },
      history: [{ status: "ordered", note: "Auto order from recent listings" }],
      placedAt: new Date(),
    });

    // Build CSV data
    const csvData = listings.map((listing) => ({
      orderId: order._id.toString(),
      productId: listing._id.toString(),
      title: listing.title || "Untitled",
      price: listing.price,
      currency: listing.currency || "GBP",
      createdAt: listing.createdAt?.toISOString() || "",
    }));

    const csvPath = path.join(process.cwd(), "recent_20_products_order.csv");

    const csvWriter = createObjectCsvWriter({
      path: csvPath,
      header: [
        { id: "orderId", title: "Order ID" },
        { id: "productId", title: "Product ID" },
        { id: "title", title: "Product Title" },
        { id: "price", title: "Price" },
        { id: "currency", title: "Currency" },
        { id: "createdAt", title: "Created At" },
      ],
    });

    await csvWriter.writeRecords(csvData);
    console.log("✅ CSV file created:", csvPath);

    // Upload to SFTP
    await uploadToSftp(csvPath, "/uploads/orders/outgoing");

    console.log("🎉 Order created and CSV uploaded to SFTP!");
  } catch (err) {
    console.error("❌ Error:", err);
  } finally {
    await mongoose.disconnect();
  }
}

createOrderFromRecentProductsAndUpload();
