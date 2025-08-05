
import { MarketplaceListing } from '../models/MarketPlace.js';
import { Types } from 'mongoose';
import { genAI } from '../../lib/config/openAi.js';
import BeeQueue from 'bee-queue';
import dotenv from 'dotenv';

dotenv.config();

// Redis setup
if (!process.env.REDIS_URL) {
  throw new Error('❌ REDIS_URL not set. Check your .env or Railway service variables.');
}

const redisQueue = new BeeQueue('enrichmentQueue', {
  redis: {
    url: process.env.REDIS_URL,
  },
});
function extractRetryDelay(err) {
  try {
    const raw = err.message.match(/\[(\{.*\})\]$/);
    if (raw) {
      const errorData = JSON.parse(raw[1]);
      const retryInfo = errorData.find(e => e['@type']?.includes('RetryInfo'));
      if (retryInfo?.retryDelay?.endsWith('s')) {
        return parseInt(retryInfo.retryDelay) * 1000;
      }
    }
  } catch (_) {}
  return null;
}

export async function enrichListingWithAI(listing, retries = 3) {
  const prompt = `
Categorize and tag the following book:

Title: ${listing.title}
Author: ${listing.author}
Description: ${listing.notes || ''}
Condition: ${listing.condition}
Language: ${listing.language}

Respond in JSON format:
{
  "category": "...",
  "tags": ["...", "...", "..."],
  "confidence": 0.92
}`;

  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
      });

      const responseText = result.response.text().trim();
      if (!responseText) throw new Error('Empty response from Gemini');

      let aiData;
      try {
        aiData = JSON.parse(responseText);
      } catch (err) {
        console.error('❌ Failed to parse Gemini response:', err.message);
        return listing;
      }

      return await MarketplaceListing.findByIdAndUpdate(
        listing._id,
        {
          category: aiData.category || listing.category,
          autoCategorizedTags: aiData.tags || [],
          aiConfidenceScore: aiData.confidence || null,
          aiMetadataFilled: true,
        },
        { new: true }
      );
    } catch (err) {
      if (err.message.includes('429')) {
        const delay = extractRetryDelay(err) || 60000;
        console.warn(`⚠️ Rate limited by Gemini. Waiting ${delay / 1000}s before retrying...`);
        await new Promise((res) => setTimeout(res, delay));
        continue;
      }

      console.error('❌ Failed to enrich with Gemini AI:', err.message);
      return listing;
    }
  }

  console.error(`❌ Failed after ${retries} retries. Skipping listing ${listing._id}`);
  return listing;
}

export async function queueAIEnrichment(listingId) {
  try {
    await redisQueue
      .createJob({ listingId }) 
      .save();
  } catch (err) {
    console.error('❌ Failed to enqueue listing for enrichment:', err);
  }
}


export async function upsertListingFromInventory(data, syncBatchId) {
    const {
      inventorySyncId,
      isbn,
      title,
      author,
      edition,
      language,
      category,
      condition,
      price,
      currency,
      stock,
      coverImageUrl,
      samplePageUrls,
      notes,
      rawDataDump,
    } = data;
  
    const normalizedCondition = (condition || '').toLowerCase();
  
    const payload = {
      isbn,
      title,
      author,
      edition,
      language,
      category,
      condition: normalizedCondition,
      price,
      currency: currency || 'GBP',
      stock,
      coverImageUrl,
      samplePageUrls,
      notes,
      inventory: {
        inventorySyncId,
        rawTitle: title,
        rawAuthor: author,
        condition: normalizedCondition, // also normalize here
        rawDataDump,
        syncSource: data.syncSource || 'api',
        syncBatchId: syncBatchId ? new Types.ObjectId(syncBatchId) : undefined,
      },
      isPublished: true,
    };
  
    const existing = await MarketplaceListing.findOne({
      'inventory.inventorySyncId': inventorySyncId,
    });
  
    const record = existing
      ? await MarketplaceListing.findByIdAndUpdate(existing._id, payload, { new: true })
      : await MarketplaceListing.create(payload);
  
    await queueAIEnrichment(record._id);
  
    return record;
  }
  

export async function bulkSyncFromCSV(rows, syncBatchId) {
  const ops = rows.map(row => {
    const inventorySyncId = row.inventorySyncId || row.ISBN || row.id || `${row.title}-${row.author}`;
    return {
      updateOne: {
        filter: { 'inventory.inventorySyncId': inventorySyncId },
        update: {
          $set: {
            isbn: row.isbn,
            title: row.title,
            author: row.author,
            edition: row.edition,
            language: row.language,
            category: row.category,
            condition: row.condition,
            price: row.price,
            currency: row.currency || 'GBP',
            stock: row.stock,
            coverImageUrl: row.coverImageUrl,
            samplePageUrls: row.samplePageUrls,
            notes: row.notes,
            isPublished: true,
            inventory: {
              inventorySyncId,
              rawTitle: row.title,
              rawAuthor: row.author,
              rawDataDump: row,
              syncSource: 'csv',
              syncBatchId: syncBatchId ? new Types.ObjectId(syncBatchId) : undefined,
            },
          },
        },
        upsert: true,
      },
    };
  });

  await MarketplaceListing.bulkWrite(ops, { ordered: false });

  const listingIds = await MarketplaceListing.find({ 'inventory.syncBatchId': syncBatchId }, { _id: 1 }).lean();

  for (const { _id } of listingIds) {
    await queueAIEnrichment(_id);
  }

  return { count: listingIds.length };
}

export async function createListing(data) {
  const existing = await MarketplaceListing.findOne({ title: data.title.trim() });

  if (existing) {
    throw new Error('A listing with the same title already exists.');
  }

  const listing = await MarketplaceListing.create({ ...data, isPublished: true });
  await queueAIEnrichment(listing._id);
  return listing;
}


export async function updateListing(listingId, updates) {
  const listing = await MarketplaceListing.findByIdAndUpdate(listingId, updates, { new: true });
  await queueAIEnrichment(listing._id);
  return listing;
}

export async function archiveListing(listingId) {
  return await MarketplaceListing.findByIdAndUpdate(listingId, { isArchived: true }, { new: true });
}

export async function getAllListingsForAdmin({ page = 1, limit = 20, includeArchived = false, sort = 'createdAt', order = 'desc', filters = {} }) {
  const query = includeArchived ? { ...filters } : { isArchived: false, ...filters };
  const sortOption = { [sort]: order === 'asc' ? 1 : -1 };

  console.log('Running query:', query);  // ⬅️ Add this
  console.log('Sort:', sortOption);

  return await MarketplaceListing
    .find(query)
    .sort(sortOption)
    .skip((page - 1) * limit)
    .limit(limit);
}


export async function getPublishedListings({ page = 1, limit = 20, sort = 'listedAt', order = 'desc', filters = {} }) {
  const query = { isPublished: true, isArchived: false, ...filters };
  const sortOption = { [sort]: order === 'asc' ? 1 : -1 };
  return await MarketplaceListing.find(query).sort(sortOption).skip((page - 1) * limit).limit(limit);
}

export async function getListingById(id) {
  return await MarketplaceListing.findOne({ _id: id, isPublished: true, isArchived: false });
}

export async function searchListings({ keyword, page = 1, limit = 20, filters = {}, sort = 'views', order = 'desc' }) {
  const regex = new RegExp(keyword, 'i');
  const query = {
    isPublished: true,
    isArchived: false,
    $or: [
      { title: regex },
      { author: regex },
      { tags: regex },
      { autoCategorizedTags: regex },
      { category: regex },
    ],
    ...filters,
  };
  const sortOption = { [sort]: order === 'asc' ? 1 : -1, aiConfidenceScore: -1 };
  return await MarketplaceListing.find(query).sort(sortOption).skip((page - 1) * limit).limit(limit);
}

export async function incrementViews(listingId) {
  await MarketplaceListing.findByIdAndUpdate(listingId, { $inc: { views: 1 } });
}

export async function markAsPurchased(listingId) {
  await MarketplaceListing.findByIdAndUpdate(listingId, { $inc: { purchases: 1 } });
}

export async function setPublishStatus(listingId, isPublished = true) {
  return await MarketplaceListing.findByIdAndUpdate(listingId, { isPublished }, { new: true });
}

export async function deleteListingPermanently(listingId) {
  return await MarketplaceListing.findByIdAndDelete(listingId);
}

export async function bulkUpdateListings(action, listingIds = []) {
  if (!Array.isArray(listingIds) || listingIds.length === 0) return { modifiedCount: 0 };

  const updateMap = {
    publish: { isPublished: true },
    unpublish: { isPublished: false },
    archive: { isArchived: true },
    unarchive: { isArchived: false },
  };

  const update = updateMap[action];
  if (!update) throw new Error('Invalid bulk action');

  const result = await MarketplaceListing.updateMany(
    { _id: { $in: listingIds.map(id => new Types.ObjectId(id)) } },
    update
  );

  return result;
}

export async function flagListingAsModerationNeeded(listingId, reason = 'incomplete or spam') {
  return await MarketplaceListing.findByIdAndUpdate(
    listingId,
    { moderationFlag: true, moderationReason: reason },
    { new: true }
  );
}

export async function getListingStats({ filters = {} } = {}) {
    const match = { ...filters };
    const pipeline = [
      { $match: match },
      {
        $group: {
          _id: null,
          totalListings: { $sum: 1 },
          totalViews: { $sum: '$views' },
          totalPurchases: { $sum: '$purchases' },
          lowStock: {
            $sum: {
              $cond: [{ $lt: ['$stock', 3] }, 1, 0],
            },
          },
        },
      },
    ];
  
    const result = await MarketplaceListing.aggregate(pipeline);
    const stats = result[0] || {
      totalListings: 0,
      totalViews: 0,
      totalPurchases: 0,
      lowStock: 0,
    };
  
    // Remove _id from result
    const { _id, ...cleanStats } = stats;
  
    return cleanStats;
  }
  
  export async function updateInventoryFields({ sku, price, quantity }) {
    if (!sku || isNaN(price) || isNaN(quantity)) {
      throw new Error(`Invalid inventory update row: ${JSON.stringify({ sku, price, quantity })}`);
    }
  
    const listing = await MarketplaceListing.findOneAndUpdate(
      { 'inventory.inventorySyncId': sku },
      {
        $set: {
          price: parseFloat(price),
          stock: parseInt(quantity),
          isPublished: quantity > 0, // Optional: auto unpublish when out of stock
        },
      },
      { new: true }
    );
  
    if (!listing) {
      throw new Error(`Listing with SKU ${sku} not found.`);
    }
  
    return listing;
  }
  