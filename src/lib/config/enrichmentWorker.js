import dotenv from 'dotenv';
import mongoose from 'mongoose';
import IORedis from 'ioredis';
import BeeQueue from 'bee-queue';

import { MarketplaceListing } from '../../app/models/MarketPlace.js';
import { openai } from './openAi.js';
import { fetchCoverImageUrl } from '../utils/fetchCoverImageUrl.js';

dotenv.config();

// Validate required environment variables
if (!process.env.OPENAI_API_KEY || !process.env.MONGODB_URI) {
  console.error('❌ Required environment variables missing');
  process.exit(1);
}

// MongoDB connection
try {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✅ MongoDB connected');
} catch (err) {
  console.error('❌ MongoDB connection failed:', err);
  process.exit(1);
}

// Redis connection (shared for BeeQueue)
if (!process.env.REDIS_URL) {
  throw new Error('❌ REDIS_URL not found. Make sure it is defined in .env or Railway variables');
}
const connection = new IORedis(process.env.REDIS_URL, {
  maxRetriesPerRequest: null,
});


// Slug helper
function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// Main enrichment logic
async function enrichListing(listing) {
  const slug = slugify(listing.title);
  const basePreviewUrl = process.env.PREVIEW_IMAGE_BASE_URL || 'https://cdn.bookbank.com/previews';

  const expectedSampleUrls = [
    `${basePreviewUrl}/${slug}/page-1.jpg`,
    `${basePreviewUrl}/${slug}/page-2.jpg`,
  ];

  const prompt = `
You are an AI assistant helping categorize books and generate metadata.

Here is a book listing:

Title: ${listing.title}
Author: ${listing.author || 'Unknown'}
Description: ${listing.notes || 'N/A'}
Condition: ${listing.condition}
Language: ${listing.language}

Tasks:
1. If the author is unknown or missing, try to infer the correct author.
2. Categorize the book into a single category.
3. Generate exactly 3 relevant tags.
4. Provide a confidence score as a decimal (e.g., 0.85).
5. Generate exactly 2 sample page preview image URLs using this format: "${expectedSampleUrls[0]}" and "${expectedSampleUrls[1]}".

Respond in strict JSON format:
{
  "author": "J.R.R. Tolkien",
  "category": "Fantasy Fiction",
  "tags": ["Fantasy", "Adventure", "Classic"],
  "confidence": 0.92,
  "samplePageUrls": [
    "${expectedSampleUrls[0]}",
    "${expectedSampleUrls[1]}"
  ]
}
`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      temperature: 0.3,
      messages: [{ role: 'user', content: prompt }],
    });

    const content = response.choices?.[0]?.message?.content?.trim();
    if (!content) throw new Error('Empty response from OpenAI');

    let aiData = {};
    try {
      aiData = JSON.parse(content);
    } catch (parseErr) {
      console.error(`❌ JSON parse error: ${parseErr.message}`);
      aiData.samplePageUrls = [];
    }

    const coverImageUrl = await fetchCoverImageUrl({
      title: listing.title,
      author: aiData.author || listing.author,
      isbn: listing.isbn,
    });

    const sampleUrls =
      Array.isArray(aiData.samplePageUrls) &&
      aiData.samplePageUrls.length === 2 &&
      aiData.samplePageUrls.every((url, i) => url === expectedSampleUrls[i])
        ? aiData.samplePageUrls
        : expectedSampleUrls;

    const updatedListing = await MarketplaceListing.findById(listing._id);
    if (!updatedListing) throw new Error('Listing not found');

    updatedListing.set({
      author: (listing.author === 'Unknown' && aiData.author) ? aiData.author : listing.author,
      category: aiData.category || listing.category,
      autoCategorizedTags: aiData.tags || [],
      aiConfidenceScore: aiData.confidence || null,
      samplePageUrls: sampleUrls,
      aiMetadataFilled: true,
      coverImageUrl,
    });

    await updatedListing.save({ validateBeforeSave: true });

    console.log(`✅ Enriched: "${updatedListing.title}" (${listing._id})`);
  } catch (err) {
    console.error(`❌ Enrichment failed for ${listing._id}:`, err.message);
  }
}

// BeeQueue worker setup
const enrichmentQueue = new BeeQueue('enrichmentQueue', {
  isWorker: true,
  redis: connection,
});


enrichmentQueue.process(async (job, done) => {
  const { listingId } = job.data;
  console.log(`🔄 Processing listing ${listingId}`);

  try {
    const listing = await MarketplaceListing.findById(listingId);
    if (!listing) {
      console.warn(`⚠️ Listing ${listingId} not found`);
      return done(); // Don't fail the job
    }

    if (listing.aiMetadataFilled) {
      console.log(`⏭️ Already enriched. Skipping listing ${listingId}`);
      return done();
    }

    await enrichListing(listing);
    done();
  } catch (err) {
    console.error(`🔥 Job failed: ${err.message}`);
    done(err);
  }
});

enrichmentQueue.on('succeeded', (job) => {
  console.log(`🎉 Job ${job.id} completed`);
});

enrichmentQueue.on('failed', (job, err) => {
  console.error(`💥 Job ${job.id} failed: ${err.message}`);
});

// Export for reuse/testing
export { enrichmentQueue, enrichListing, connection as redis };
