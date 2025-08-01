import { v4 as uuidv4 } from 'uuid';
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
  


  
  export const generateTransferReceiptPdf = async ({
    transactionId,
    amount,
    fromUser,
    toUser,
    timestamp,
    note,
    currency = 'USD',
    fee = 0,
    status = 'Completed',
    companyDetails = {
      name: 'Limpiar Wallet',
      logoUrl: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQXMGoPwlxU3Lf1hHwxOdAgSIE9CwKhQf6fnA&s',
      website: 'www.limpiar.online',
      supportEmail: 'helpdesk@uselimpiar.online'
    }
  }) => {
    try {
      const imageResponse = await axios.get(companyDetails.logoUrl, {
        responseType: 'arraybuffer'
      });
      const logoBuffer = Buffer.from(imageResponse.data, 'binary');
      const qrCodeUrl = `https://${companyDetails.website}/verify?tx=${transactionId}`;
      const qrCodeBuffer = await QRCode.toBuffer(qrCodeUrl, {
        width: 100,
        margin: 1
      });
  
      return new Promise((resolve, reject) => {
        const doc = new PDFDocument({ margin: 40, size: 'A4' });
        const chunks = [];
  
        doc.on('data', (chunk) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', (err) => reject(err));
  
        const gradient = doc.linearGradient(0, 0, 595, 100);
        gradient.stop(0, '#007bff').stop(1, '#0056b3');
        doc.rect(0, 0, 595, 100).fill(gradient);
  
        doc.image(logoBuffer, 40, 20, { width: 80 });
        doc
          .font('Helvetica-Bold')
          .fontSize(18)
          .fillColor('#ffffff')
          .text(companyDetails.name, 130, 30)
          .fontSize(10)
          .text(companyDetails.website, 130, 50)
          .text(companyDetails.supportEmail, 130, 65);
  
        doc
          .fontSize(24)
          .fillColor('#ffffff')
          .text('Transfer Receipt', 40, 120)
          .fontSize(12)
          .fillColor(status === 'Completed' ? '#28a745' : '#dc3545')
          .rect(450, 115, 100, 20)
          .fillAndStroke(status === 'Completed' ? '#28a745' : '#dc3545', '#ffffff')
          .text(status, 450, 120, { align: 'center' });
  
        doc
          .rect(40, 160, 515, 220)
          .fillOpacity(0.1)
          .fillAndStroke('#f8f9fa', '#dee2e6')
          .fillOpacity(1);
  
        doc
          .font('Helvetica')
          .fontSize(12)
          .fillColor('#333333')
          .text(`Receipt ID: ${transactionId}`, 50, 170)
          .text(`Date: ${new Date(timestamp).toLocaleString()}`, 50, 190)
          .text(`Status: ${status}`, 50, 210);
  
        doc
          .fontSize(14)
          .fillColor('#007bff')
          .text('Sender', 50, 240)
          .fontSize(12)
          .fillColor('#333333')
          .text(`${fromUser.fullName}`, 50, 260)
          .text(`${fromUser.email}`, 50, 280);
       
  
        doc
          .fontSize(14)
          .fillColor('#007bff')
          .text('Recipient', 300, 240)
          .fontSize(12)
          .fillColor('#333333')
          .text(`${toUser.fullName}`, 300, 260)
          .text(`${toUser.email}`, 300, 280);
          
  
        doc
          .rect(40, 390, 515, 100)
          .fillOpacity(0.05)
          .fillAndStroke('#e9ecef', '#dee2e6')
          .fillOpacity(1);
  
        doc
          .fontSize(14)
          .fillColor('#007bff')
          .text('Transaction Summary', 50, 400)
          .fontSize(12)
          .fillColor('#333333')
          .text(`Amount:`, 50, 420, { continued: true })
          .fillColor('#28a745')
          .text(` ${currency} ${amount.toFixed(2)}`, { continued: false })
          .fillColor('#333333')
          .text(`Fee:`, 50, 440, { continued: true })
          .fillColor('#dc3545')
          .text(` ${currency} ${fee.toFixed(2)}`, { continued: false })
          .fillColor('#333333')
          .text(`Total:`, 50, 460, { continued: true })
          .fillColor('#28a745')
          .text(` ${currency} ${(amount + fee).toFixed(2)}`, { continued: false });
  
        if (note) {
          doc
            .moveDown(2)
            .rect(40, doc.y, 515, 60)
            .fillOpacity(0.05)
            .fillAndStroke('#e9ecef', '#dee2e6')
            .fillOpacity(1)
            .fontSize(12)
            .fillColor('#333333')
            .text('Note:', 50, doc.y + 10)
            .text(note, 50, doc.y + 10, { width: 455 });
        }
  
        doc
          .moveDown(2)
          .fontSize(12)
          .fillColor('#007bff')
          .text('Verify Transaction', 50, doc.y + 10)
          .fontSize(10)
          .fillColor('#333333')
          .text('Scan the QR code to verify this transaction.', 50, doc.y + 10);
        doc.image(qrCodeBuffer, 50, doc.y + 10, { width: 100 });
  
        doc
          .moveDown(3)
          .fontSize(10)
          .fillColor('#555555')
          .text(`Thank you for using ${companyDetails.name}!`, { align: 'center' })
          .text(`© ${new Date().getFullYear()} ${companyDetails.name} — All rights reserved.`, { align: 'center' });
  
        doc.end();
      });
    } catch (err) {
      console.error('Failed to generate receipt:', err);
      throw err;
    }
  };