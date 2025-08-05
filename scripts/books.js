// scripts/seedMillionBooks.js
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { faker } from '@faker-js/faker';
import { MarketplaceListing } from '../src/app/models/MarketPlace.js';
import { enrichmentQueue } from '../src/lib/config/enrichmentWorker.js';

dotenv.config();

await mongoose.connect(process.env.MONGODB_URI);
console.log('✅ Connected to MongoDB');

const CONDITIONS = ['new', 'like new', 'very good', 'good', 'acceptable'];
const CATEGORIES = [
  'Literary Fiction', 'Historical Fiction', 'Science Fiction', 'Fantasy', 'Thriller', 'Mystery',
  'Romance', 'Adventure', 'Contemporary Fiction', 'LGBTQ+ Fiction', 'Biography', 'Memoir',
  'True Crime', 'History', 'Politics', 'Science', 'Nature & Environment', 'Psychology',
  'Self-Help', 'Philosophy', 'Religion & Spirituality', 'Health & Wellness', 'Business',
  'Finance', 'Technology', 'Essays', 'Travel', 'Art', 'Photography', 'Cookbooks', 'Parenting',
  'Children’s Books', 'YA Fiction', 'Graphic Novels', 'Poetry', 'Drama', 'Comics',
  'Academic', 'Textbooks', 'Language Learning', 'Test Prep', 'Mindfulness', 'Global Literature',
  'African Literature', 'Asian Literature', 'Latin American Literature', 'Leadership',
  'Marketing', 'Entrepreneurship', 'Investing', 'Humor'
];

const getRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];
const getRandomPrice = () => parseFloat((Math.random() * 40 + 5).toFixed(2));
const getRandomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

const generateAIStyleBook = (i) => {
  const volume = faker.number.int({ min: 1, max: 5 });
  return {
    title: `${faker.word.adjective()} ${faker.word.noun()} Vol. ${volume}`,
    author: faker.person.fullName(),
    isbn: `978-3-${100000000 + i}`,
    condition: getRandom(CONDITIONS),
    price: getRandomPrice(),
    currency: 'GBP',
    stock: getRandomInt(1, 10),
    listedAt: new Date(),
    category: getRandom(CATEGORIES),
    aiMetadataFilled: false,
    isPublished: true,
    isArchived: false,
  };
};

const BATCH_SIZE = 1000;
const TOTAL = 1_000_000;

console.time('📚 Seeded 1M books in');

for (let i = 0; i < TOTAL; i += BATCH_SIZE) {
  const books = [];
  for (let j = 0; j < BATCH_SIZE; j++) {
    books.push(generateAIStyleBook(i + j));
  }

  const inserted = await MarketplaceListing.insertMany(books);
  console.log(`✅ Inserted batch ${i + BATCH_SIZE} / ${TOTAL}`);

  // Optional: enqueue for enrichment
  for (const listing of inserted) {
    await enrichmentQueue.createJob({ listingId: listing._id.toString() }).save();
  }
}

console.timeEnd('📚 Seeded 1M books in');
await mongoose.disconnect();
process.exit(0);
