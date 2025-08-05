import dotenv from 'dotenv';
import mongoose from 'mongoose';
import IORedis from 'ioredis';
import BeeQueue from 'bee-queue';
import { GoogleGenerativeAI } from '@google/generative-ai';

import { MarketplaceListing } from '../../app/models/MarketPlace.js';
import { fetchCoverImageUrl } from '../utils/fetchCoverImageUrl.js';

dotenv.config();

// Validate required environment variables
if (!process.env.GEMINI_API_KEY || !process.env.MONGODB_URI) {
  console.error('❌ Required environment variables missing');
  process.exit(1);
}

// Gemini client setup
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });

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
  You are a book metadata assistant.
  
  Here is a book listing:
  
  Title: ${listing.title}
  Author: ${listing.author || 'Unknown'}
  Description: ${listing.notes || 'N/A'}
  Condition: ${listing.condition}
  Language: ${listing.language}
  
  Tasks:
  
  1. If the author is "Unknown" or missing, infer the correct author using available information.
  2. Categorize the book into a single category.
  3. Generate exactly 3 relevant tags (comma-separated keywords).
  4. Provide a confidence score (decimal between 0 and 1).
  5. Search Google Books and return a **real** cover image URL from there (do not fabricate it).
  6. Search Google Books for 2 sample preview page image URLs (if available). If not, return null or empty strings.
  
  Respond strictly in **valid JSON** inside triple backticks like:
  
  \`\`\`json
  {
    "author": "George Orwell",
    "category": "Dystopian Fiction",
    "tags": ["dystopia", "totalitarianism", "classic"],
    "confidence": 0.91,
    "coverImageUrl": "https://books.google.com/books/content?id=xyz123&printsec=frontcover&img=1&zoom=1",
    "samplePageUrls": [
      "https://books.google.com/page1.jpg",
      "https://books.google.com/page2.jpg"
    ]
  }
  \`\`\`
  `;
  
  

  try {
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
    });

    const content = result.response.text().trim();
    if (!content) throw new Error('Empty response from Gemini');
    
    // 🧼 Strip code fences if present
    let cleanContent = content;
    if (cleanContent.startsWith('```')) {
      cleanContent = cleanContent.replace(/^```json\s*/i, '').replace(/```$/, '').trim();
    }
    
    let aiData = {};
    try {
      aiData = JSON.parse(cleanContent);
    } catch (parseErr) {
      console.error(`❌ JSON parse error: ${parseErr.message}\nGemini returned:\n${content}`);
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
  redis: {
    url: process.env.REDIS_URL,
  },
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
