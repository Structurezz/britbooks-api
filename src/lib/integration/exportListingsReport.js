
import fs from 'fs';
import path from 'path';
import { Parser } from 'json2csv';
import mongoose from 'mongoose';
import { MarketplaceListing } from '../../app/models/MarketPlace.js';
import connectDB from '../config/db.js';

export async function exportListingsReportCSV() {
  await connectDB();

  const today = new Date().toISOString().split('T')[0]; // e.g., 2025-07-16
  const outputDir = path.resolve('./src/ftp-root/staging/outgoing/listings');
  const outputPath = path.join(outputDir, `report-${today}.csv`);

  // Ensure directory exists
  fs.mkdirSync(outputDir, { recursive: true });

  const listings = await MarketplaceListing.find();

  if (!listings.length) {
    console.log('⚠️ No listings found to export.');
    return;
  }

  const fields = ['sku', 'title', 'price', 'quantity', 'category', 'createdAt'];
  const opts = { fields };

  const parser = new Parser(opts);
  const csv = parser.parse(listings);

  fs.writeFileSync(outputPath, csv);
  console.log(`✅ Exported ${listings.length} listings to ${outputPath}`);
}
