import { Types } from 'mongoose';
import { MarketplaceListing } from '../models/Marketplace.js';
import { Order } from '../models/Order.js';
import { generateOrderReceiptPdf } from '../../lib/utils/pdfGenerator.js';


export async function createOrder({ userId, items, shippingAddress, billingAddress, paymentMethod = 'card', source = 'web' }) {
  const bookIds = items.map(item => item.listingId);
  const listings = await MarketplaceListing.find({ _id: { $in: bookIds }, isPublished: true });

  const orderItems = listings.map(listing => {
    const matchedItem = items.find(i => i.listingId.toString() === listing._id.toString());
    return {
      listing: listing._id,
      quantity: matchedItem.quantity,
      priceAtPurchase: listing.price,
      currency: listing.currency || 'GBP',
    };
  });

  const totalAmount = orderItems.reduce((sum, item) => sum + (item.priceAtPurchase * item.quantity), 0);

  const order = await Order.create({
    user: new Types.ObjectId(userId),
    type: 'order',
    items: orderItems,
    total: totalAmount,
    currency: 'GBP',
    shipping: { method: 'standard', cost: 0 },
    payment: { method: paymentMethod, status: 'unpaid' },
    shippingAddress,
    billingAddress,
    status: 'pending', // will be updated below
  });

  const receiptBuffer = await generateOrderReceiptPdf(order);

  // ✅ Mark order as confirmed (to be picked by export job)
  order.status = 'confirmed';
  await order.save();

  return order;
}


export async function getOrders({ userId, role, filters, page, limit }) {
    const query = {}; 
  
    if (filters.status) {
      query.status = filters.status;
    }
  
    return await Order.find(query)
      .skip((page - 1) * limit)
      .limit(limit)
      .sort({ createdAt: -1 });
  }
  

export async function getOrderDetails(orderId) {
  return await Order.findById(orderId);
}

export async function updateOrderStatus(orderId, status) {
  return await Order.findByIdAndUpdate(orderId, { status }, { new: true });
}

export async function updatePaymentStatus(orderId, paymentStatus, transactionId) {
  return await Order.findByIdAndUpdate(orderId, {
    'payment.status': paymentStatus,
    'payment.transactionId': transactionId,
    'payment.paidAt': paymentStatus === 'paid' ? new Date() : undefined,
  }, { new: true });
}

export async function updateShippingStatus(orderId, status, trackingNumber) {
  const update = {
    'shipping.status': status,
    ...(trackingNumber && { 'shipping.trackingNumber': trackingNumber }),
  };
  if (status === 'shipped') update['shipping.shippedAt'] = new Date();
  if (status === 'delivered') update['shipping.deliveredAt'] = new Date();

  return await Order.findByIdAndUpdate(orderId, update, { new: true });
}

export async function deleteOrder(orderId) {
  return await Order.findByIdAndDelete(orderId);
}
