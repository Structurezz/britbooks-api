import fs from "fs";
import path from "path";
import { stringify } from "csv-stringify/sync";
import { uploadToSftp } from "../../lib/config/sftp/sftpClient.js"; // ✅ correct path
import { MarketplaceListing } from "../../app/models/MarketPlace.js";

/**
 * Generate CSV for a confirmed order and upload to SFTP (Eagle format).
 */
export async function sendOrderToSFTP(order) {
  console.log(`🚀 Preparing to export order ${order._id} to SFTP...`);

  try {
    const fileName = `order_${order._id}.csv`;
    const localDir = path.join(process.cwd(), "src/ftp-root/staging/outgoing");
    const localPath = path.join(localDir, fileName);

    fs.mkdirSync(localDir, { recursive: true });

    const records = [];

    for (const item of order.items || []) {
      let listing = null;
      if (item.sku) {
        listing = await MarketplaceListing.findOne({ sku: item.sku });
      } else if (item.productId) {
        listing = await MarketplaceListing.findById(item.productId);
      }

      records.push({
        order_id: order._id.toString(),
        order_date: order.createdAt?.toISOString() || "",
        user_id: order.userId?.toString() || "",
        customer_name: order.userName || order.customerName || "",
        customer_email: order.userEmail || "",
        customer_phone: order.userPhone || "",
        shipping_address: order.shippingAddress || "",
        sku: listing?.sku || item.sku || "N/A",
        isbn: listing?.isbn || "",
        title: listing?.title || item.productName || "Unknown Title",
        author: listing?.author || item.author || "",
        edition: listing?.edition || "",
        language: listing?.language || "English",
        category: listing?.category || "",
        tags: listing?.tags?.join(", ") || "",
        condition: listing?.condition || "",
        price: (listing?.price || item.price || 0).toFixed(2),
        quantity: item.quantity || 1,
        total_price: ((listing?.price || item.price || 0) * (item.quantity || 1)).toFixed(2),
        currency: listing?.currency || order.currency || "GBP",
        ai_metadata_filled: listing?.aiMetadataFilled ? "yes" : "no",
        ai_confidence_score: listing?.aiConfidenceScore?.toFixed(2) || "",
        auto_tags: listing?.autoCategorizedTags?.join(", ") || "",
        sync_source: listing?.inventory?.syncSource || "",
        inventory_sync_id: listing?.inventory?.inventorySyncId || "",
        payment_reference: order.paymentIntentId || "",
        payment_status: order.payment?.status || "",
        order_status: order.status || "",
        receipt_url: order.payment?.receiptUrl || "",
      });
    }

    // ✅ Convert to CSV and write
    const csv = stringify(records, { header: true });
    fs.writeFileSync(localPath, csv);
    console.log(`📝 CSV generated for order ${order._id}: ${localPath}`);

    // ✅ Verify file exists before upload
    if (!fs.existsSync(localPath)) {
      console.error("❌ CSV file not found before upload:", localPath);
      throw new Error("CSV generation failed");
    }

    console.log("🧩 Preparing to upload order to SFTP:", {
      id: order._id,
      items: order.items?.length,
      filePath: localPath,
      remoteDir: "/uploads/orders/outgoing",
    });

    // ✅ Upload to SFTP
    await uploadToSftp(localPath, "/uploads/orders/outgoing");
    console.log(`✅ Order ${order._id} successfully uploaded to SFTP`);

    return { success: true, path: localPath };
  } catch (err) {
    console.error("❌ sendOrderToSFTP error:", err.message);
    throw err;
  }
}
3