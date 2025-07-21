import dotenv from 'dotenv';
import IORedis from 'ioredis';

import mongoose from 'mongoose';
import { MarketplaceListing } from '../../app/models/MarketPlace.js';
import { openai } from './openAi.js';
import { fetchCoverImageUrl } from '../utils/fetchCoverImageUrl.js';

dotenv.config();

// Validate required environment variables
if (!process.env.OPENAI_API_KEY) {
  console.error('❌ OPENAI_API_KEY not found in environment variables.');
  process.exit(1);
}
if (!process.env.MONGODB_URI) {
  console.error('❌ MONGODB_URI not found.');
  process.exit(1);
}

try {
  await mongoose.connect(process.env.MONGODB_URI, {
  
  });
  console.log('✅ MongoDB connected');
} catch (err) {
  console.error('❌ MongoDB connection failed:', err);
  process.exit(1);
}

// Redis connection
const connection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});

function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

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
  4. Provide a confidence score as a decimal (e.g., 0.85) for the categorization.
  5. Generate exactly 2 sample page preview image URLs using this format: "${expectedSampleUrls[0]}" and "${expectedSampleUrls[1]}".
  
  Respond in **strict JSON** format like:
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

    console.log('🧠 AI Response Content:', content);

    let aiData = {};
    let coverImageUrl = '';
    try {
      aiData = JSON.parse(content);
      console.log('✅ Parsed AI Data:', JSON.stringify(aiData, null, 2));
    
      // ✅ Now that we have title/author, fetch real book cover
      coverImageUrl = await fetchCoverImageUrl({
        title: listing.title,
        author: aiData.author || listing.author,
        isbn: listing.isbn,
      });
    } catch (parseErr) {
      console.error(`❌ JSON parse error: ${parseErr.message}`);
      aiData.samplePageUrls = [];
    }
    

    let sampleUrls = [];

    if (
      Array.isArray(aiData.samplePageUrls) &&
      aiData.samplePageUrls.length === 2 &&
      aiData.samplePageUrls.every((url, i) => url === expectedSampleUrls[i])
    ) {
      sampleUrls = aiData.samplePageUrls;
    } else {
      console.warn('⚠️ Using fallback sample URLs');
      sampleUrls = expectedSampleUrls;
    }

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

    const finalSaved = await MarketplaceListing.findById(listing._id);
    console.log(`✅ Successfully enriched and saved listing "${finalSaved.title}" (${listing._id})`);
    console.log('   → Tags:', finalSaved.autoCategorizedTags);
    console.log('   → Category:', finalSaved.category);
    console.log('   → Sample URLs:', finalSaved.samplePageUrls);
  } catch (err) {
    console.error(`❌ Enrichment failed for listing ${listing._id}:`, err.message);
  }
}
const { Worker } = await import('bullmq');

const worker = new Worker(
  'enrichmentQueue',
  async (job) => {
    const { listingId } = job.data;
    console.log(`🔄 Starting enrichment for listing ${listingId}`);

    const listing = await MarketplaceListing.findById(listingId);
    if (!listing) {
      console.warn(`⚠️ Listing with ID ${listingId} not found`);
      return;
    }

    if (listing.aiMetadataFilled) {
      console.log(`⏩ Listing ${listingId} already enriched. Skipping.`);
      return;
    }

    await enrichListing(listing);
  },
  {
    connection,
    concurrency: 2,
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
  }
);

worker.on('completed', (job) => {
  console.log(`🎉 Job ${job.id} completed successfully`);
});

worker.on('failed', (job, err) => {
  console.error(`🔥 Job ${job?.id} failed:`, err.message);
});


export { worker, enrichListing, connection as redis };