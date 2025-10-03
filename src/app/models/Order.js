import mongoose, { Schema, model, Types } from "mongoose";

const addressSchema = new Schema(
  {
    fullName: { type: String, required: true },
    phoneNumber: { type: String, required: true },
    addressLine1: { type: String, required: true },
    addressLine2: { type: String },
    city: { type: String, required: true },
    state: { type: String },
    postalCode: { type: String },
    country: { type: String, required: true },
  },
  { _id: false }
);

const orderItemSchema = new Schema(
  {
    listing: { type: Types.ObjectId, ref: "MarketplaceListing", required: true },
    quantity: { type: Number, required: true, default: 1 },
    priceAtPurchase: { type: Number, required: true },
    currency: { type: String, required: true },
  },
  { _id: false }
);

const shippingSchema = new Schema(
  {
    method: { type: String, default: "standard" },
    cost: { type: Number, default: 0 },
    status: {
      type: String,
      enum: [
        "ordered",
        "pending",
        "processing",
        "dispatched",
        "in_transit",
        "out_for_delivery",
        "delivered",
        "returned",
        "cancelled",
      ],
      default: "ordered",
    },
    trackingNumber: { type: String },
    shippedAt: { type: Date },
    deliveredAt: { type: Date },
  },
  { _id: false }
);

const paymentSchema = new Schema(
  {
    status: {
      type: String,
      enum: ["unpaid", "paid", "failed", "refunded"],
      default: "unpaid",
    },
    method: {
      type: String,
      enum: ["card", "wallet", "bank_transfer", "cash_on_delivery"],
      default: "card",
    },
    transactionId: { type: String },
    paidAt: { type: Date },
    refundedAt: { type: Date },
  },
  { _id: false }
);

const orderHistorySchema = new Schema(
  {
    status: {
      type: String,
      enum: [
        "ordered",
        "processing",
        "dispatched",
        "in_transit",
        "out_for_delivery",
        "delivered",
        "cancelled",
      ],
    },
    updatedAt: { type: Date, default: Date.now },
    note: { type: String },
  },
  { _id: false }
);

const orderSchema = new Schema(
  {
    user: { type: Types.ObjectId, ref: "User", required: true, index: true },

    type: { type: String, enum: ["cart", "order"], default: "cart" },

    status: {
      type: String,
      enum: [
        "ordered",
        "processing",
        "dispatched",
        "in_transit",
        "out_for_delivery",
        "delivered",
        "cancelled",
      ],
      default: "ordered",
      index: true,
    },

    items: [orderItemSchema],

    shipping: shippingSchema,

    payment: paymentSchema, // embedded, not a ref

    shippingAddress: addressSchema,

    billingAddress: addressSchema,

    total: { type: Number, required: true },

    currency: { type: String, default: "GBP" },

    paymentIntentId: { type: String, index: true },

    history: [orderHistorySchema],

    placedAt: { type: Date, default: Date.now },
  },
  {
    collection: "orders",
    timestamps: true,
  }
);

// Hook: push status changes into history automatically
orderSchema.pre("findOneAndUpdate", async function (next) {
  const update = this.getUpdate();
  if (update?.status) {
    this.findOneAndUpdate(
      {},
      {
        $push: {
          history: {
            status: update.status,
            updatedAt: new Date(),
          },
        },
      }
    );
  }
  next();
});

export const Order = model("Order", orderSchema);
