import PDFDocument from 'pdfkit';
import axios from 'axios';
import QRCode from 'qrcode';

export const generateTransactionId = () => {
    return uuidv4();
};

export const generateTransferReceipt = ({ transactionId, amount, fromUser, toUser, timestamp, note }) => {
    return {
      receiptId: transactionId,
      amount,
      from: {
        userId: fromUser._id,
        email: fromUser.email,
        role: fromUser.role,
      },
      to: {
        userId: toUser._id,
        email: toUser.email,
        role: toUser.role,
      },
      timestamp,
      note,
    };
  };
  

export const generateOrderReceiptPdf = async ({
  orderId,
  user,
  items,
  shippingAddress,
  billingAddress,
  total,
  currency = 'GBP',
  status = 'Completed',
  createdAt,
  companyDetails = {
    name: 'Limpiar Bookstore',
    logoUrl: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSB7wZVGP41i0vgIWlY6BCs6ikW3MAlohcZtg&s',
    website: 'www.britbooks.com',
    supportEmail: 'helpdesk@uselimpiar.online'
  }
}) => {
  try {
    const imageResponse = await axios.get(companyDetails.logoUrl, { responseType: 'arraybuffer' });
    const logoBuffer = Buffer.from(imageResponse.data, 'binary');

    const qrCodeUrl = `https://${companyDetails.website}/verify?order=${orderId}`;
    const qrCodeBuffer = await QRCode.toBuffer(qrCodeUrl, { width: 100, margin: 1 });

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 40, size: 'A4' });
      const chunks = [];

      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', err => reject(err));

      const gradient = doc.linearGradient(0, 0, 595, 100);
      gradient.stop(0, '#007bff').stop(1, '#0056b3');
      doc.rect(0, 0, 595, 100).fill(gradient);

      doc.image(logoBuffer, 40, 20, { width: 80 });
      doc.font('Helvetica-Bold').fontSize(18).fillColor('#ffffff').text(companyDetails.name, 130, 30);
      doc.fontSize(10).text(companyDetails.website, 130, 50).text(companyDetails.supportEmail, 130, 65);

      doc.fontSize(24).fillColor('#ffffff').text('Order Receipt', 40, 120);
      doc.fontSize(12).fillColor(status === 'Completed' ? '#28a745' : '#dc3545')
        .rect(450, 115, 100, 20)
        .fillAndStroke(status === 'Completed' ? '#28a745' : '#dc3545', '#ffffff')
        .text(status, 450, 120, { align: 'center' });

      doc.rect(40, 160, 515, 220).fillOpacity(0.1).fillAndStroke('#f8f9fa', '#dee2e6').fillOpacity(1);
      doc.font('Helvetica').fontSize(12).fillColor('#333333')
        .text(`Order ID: ${orderId}`, 50, 170)
        .text(`Date: ${new Date(createdAt).toLocaleString()}`, 50, 190)
        .text(`Status: ${status}`, 50, 210);

      doc.fontSize(14).fillColor('#007bff').text('Customer', 50, 240);
      doc.fontSize(12).fillColor('#333333').text(user.fullName, 50, 260).text(user.email, 50, 280);

      doc.fontSize(14).fillColor('#007bff').text('Shipping Address', 300, 240);
      doc.fontSize(12).fillColor('#333333')
        .text(`${shippingAddress.fullName}`, 300, 260)
        .text(`${shippingAddress.addressLine1}`, 300, 275)
        .text(`${shippingAddress.city}, ${shippingAddress.state}`, 300, 290)
        .text(`${shippingAddress.country} - ${shippingAddress.postalCode}`, 300, 305)
        .text(`Phone: ${shippingAddress.phoneNumber}`, 300, 320);

      doc.fontSize(14).fillColor('#007bff').text('Items', 50, 370);

      let y = 390;
      items.forEach((item, index) => {
        doc.fontSize(12).fillColor('#333333')
          .text(`${index + 1}. ${item.title} by ${item.author}`, 50, y)
          .text(`Qty: ${item.quantity}  |  Price: ${currency} ${item.priceAtPurchase.toFixed(2)}`, 50, y + 15);
        y += 35;
      });

      doc.rect(40, y, 515, 80).fillOpacity(0.05).fillAndStroke('#e9ecef', '#dee2e6').fillOpacity(1);
      doc.fontSize(14).fillColor('#007bff').text('Order Summary', 50, y + 10);
      doc.fontSize(12).fillColor('#333333')
        .text(`Total:`, 50, y + 30, { continued: true })
        .fillColor('#28a745')
        .text(` ${currency} ${total.toFixed(2)}`);

      doc.moveDown(2)
        .fontSize(12)
        .fillColor('#007bff')
        .text('Verify Order', 50, doc.y + 10)
        .fontSize(10)
        .fillColor('#333333')
        .text('Scan the QR code to verify this order.', 50, doc.y + 10);
      doc.image(qrCodeBuffer, 50, doc.y + 10, { width: 100 });

      doc.moveDown(3).fontSize(10).fillColor('#555555')
        .text(`Thank you for shopping with ${companyDetails.name}!`, { align: 'center' })
        .text(`© ${new Date().getFullYear()} ${companyDetails.name} — All rights reserved.`, { align: 'center' });

      doc.end();
    });
  } catch (err) {
    console.error('Failed to generate order receipt:', err);
    throw err;
  }
};
