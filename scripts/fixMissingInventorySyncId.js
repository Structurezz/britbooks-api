
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { MarketplaceListing } from '../src/app/models/MarketPlace.js';

dotenv.config(); // Loads MONGODB_URI from .env

async function fixMissingInventorySyncIds() {
  await mongoose.connect(process.env.MONGODB_URI);

  const listings = await MarketplaceListing.find({
    $or: [
      { inventory: { $exists: false } },
      { 'inventory.inventorySyncId': { $exists: false } },
      { 'inventory.inventorySyncId': null },
    ]
  });

  console.log(`Found ${listings.length} listings missing inventorySyncId`);

  for (const listing of listings) {
    const generatedSku = `FIXED-${listing._id.toString().slice(-6)}`;
    listing.inventory = {
      ...listing.inventory,
      inventorySyncId: generatedSku,
      syncSource: 'manual',
      importedAt: new Date(),
    };
    await listing.save();
    console.log(`✅ Patched listing ${listing._id} with SKU: ${generatedSku}`);
  }

  await mongoose.disconnect();
  console.log('🛠️ Done fixing listings.');
}

fixMissingInventorySyncIds().catch(err => {
  console.error('❌ Fix script failed:', err);
});
