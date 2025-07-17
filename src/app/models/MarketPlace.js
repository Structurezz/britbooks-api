import mongoose from 'mongoose';
import { Schema, model, Types } from 'mongoose';

const inventorySubSchema = new Schema(
  {
    inventorySyncId: { type: String },
    rawTitle: { type: String },
    rawAuthor: { type: String },
    rawDataDump: { type: Schema.Types.Mixed },
    importedAt: { type: Date, default: Date.now },
    syncSource: { type: String, enum: ['csv', 'api', 'manual'], default: 'manual' },
    syncBatchId: { type: Types.ObjectId, ref: 'InventorySync' },
  },
  { _id: false }
);

const marketplaceListingSchema = new Schema(
  {
    seller: { type: Types.ObjectId, ref: 'User' },
    isbn: { type: String, trim: true },
    title: { type: String, required: true, trim: true },
    author: { type: String, required: true, trim: true },
    edition: { type: String, trim: true },
    language: { type: String, default: 'English' },
    category: { type: String },
    tags: [String],
    condition: {
      type: String,
      enum: ['new', 'like new', 'very good', 'good', 'acceptable'],
      required: true,
    },
    price: { type: Number, required: true },
    currency: { type: String, default: 'GBP' },
    stock: { type: Number, default: 1 },
    listedAt: { type: Date, default: Date.now },
    coverImageUrl: { type: String },
    samplePageUrls: [String],
    notes: { type: String },
    inventory: inventorySubSchema,
    aiMetadataFilled: { type: Boolean, default: false },
    aiConfidenceScore: { type: Number },
    autoCategorizedTags: [String],
    vectorEmbedding: [Number],
    isPublished: { type: Boolean, default: true },
    isArchived: { type: Boolean, default: false },
    views: { type: Number, default: 0 },
    purchases: { type: Number, default: 0 },
  },
  {
    timestamps: true,
  }
);

export const MarketplaceListing = mongoose.models.MarketplaceListing || model('MarketplaceListing', marketplaceListingSchema);
