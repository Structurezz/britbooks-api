import fs from 'fs';
import path from 'path';
import { Parser } from 'json2csv';
import { uploadToSftp } from '../config/sftp/sftpClient.js';

export async function sendOrderToSFTP(order) {
  console.log('🚀 sendOrderToSFTP() triggered...');
  console.log('🧾 Raw order received:', JSON.stringify(order, null, 2));

  try {
    // 🧩 Validate order data
    if (!order) {
      console.warn('⚠️ No order object provided.');
      return;
    }

    if (!order.items || order.items.length === 0) {
      console.warn('⚠️ Order has no items — skipping export.');
      return;
    }

    // 📂 Ensure output directory exists
    const tempDir = path.resolve('./src/ftp-root/staging/incoming/orders/outgoing');
    const remoteDir = '/uploads/orders/outgoing';

    fs.mkdirSync(tempDir, { recursive: true });
    console.log('📁 Ensured temp directory exists:', tempDir);

    // 📝 Create filename
    const fileName = `order_${order._id || Date.now()}.csv`;
    const localPath = path.join(tempDir, fileName);
    console.log('🧾 Will save CSV as:', localPath);

    // 🧮 Prepare data for CSV export
    const orderData = order.items.map((item, index) => {
      console.log(`🛒 Processing item ${index + 1}:`, item.title || item.listing?.title);
      return {
        OrderID: order._id?.toString() || 'N/A',
        Email: order.email || 'N/A',
        SKU: item.sku || item.listing?.isbn || 'N/A',
        Title: item.title || item.listing?.title || 'Untitled',
        Quantity: item.quantity ?? 1,
        Price: item.priceAtPurchase ?? item.price ?? 0,
        Currency: order.currency || 'GBP',
        ShippingName:
          order.shippingAddress?.fullName ||
          order.shippingAddress?.name ||
          'N/A',
        ShippingCity: order.shippingAddress?.city || 'N/A',
        ShippingCountry: order.shippingAddress?.country || 'N/A',
        ShippingPostalCode: order.shippingAddress?.postalCode || 'N/A',
        OrderDate:
          order.createdAt?.toISOString() ||
          new Date().toISOString(),
        Status: order.status || 'PAID',
      };
    });

    console.log('✅ Flattened order data for CSV:', orderData);

    // 🧾 Convert to CSV
    const parser = new Parser({ header: true });
    const csv = parser.parse(orderData);
    console.log('🧩 CSV content preview:\n', csv.slice(0, 200)); // show first 200 chars

    // 💾 Write CSV file locally
    fs.writeFileSync(localPath, csv);
    console.log(`✅ CSV file created successfully at: ${localPath}`);

    // 📤 Upload file to SFTP
    console.log('📡 Starting SFTP upload...');
    await uploadToSftp(localPath, remoteDir);
    console.log(`📤 Order ${order._id} successfully uploaded to SFTP.`);

    // ✅ Done
    console.log('🎉 Order export completed successfully!');
  } catch (err) {
    console.error('❌ Failed to export order to SFTP:');
    console.error('   → Message:', err.message);
    console.error('   → Stack:', err.stack);
  }
}
