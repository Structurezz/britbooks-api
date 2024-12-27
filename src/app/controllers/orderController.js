import Order from '../models/Order.js';
import User from '../models/User.js';
//import Item from '../models/Item.js';

// Create a new order
export const createOrder = async (req, res) => {
  const { userId, orderType, items, shippingAddress } = req.body;

  try {
    // Verify if the user exists
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Calculate total amount for the order
    let totalAmount = 0;
    for (const item of items) {
      const product = await Item.findById(item.itemId);
      if (!product) return res.status(404).json({ message: 'Item not found' });
      totalAmount += product.price * item.quantity;
    }

    // Create a new order
    const newOrder = new Order({
      user: userId,
      orderType,
      items,
      totalAmount,
      shippingAddress,
      orderStatus: 'pending',
      paymentStatus: 'pending'
    });

    await newOrder.save();

    res.status(201).json({ message: 'Order created successfully', order: newOrder });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'An error occurred while creating the order' });
  }
};

// Fetch orders by user
export const getOrdersByUser = async (req, res) => {
  const { userId } = req.params;

  try {
    const orders = await Order.find({ user: userId });
    if (!orders || orders.length === 0) {
      return res.status(404).json({ message: 'No orders found for this user' });
    }

    res.status(200).json({ orders });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error fetching orders for user' });
  }
};

// Admin route to get all orders
export const getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find();
    res.status(200).json({ orders });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error fetching all orders' });
  }
};

// Update order status
export const updateOrderStatus = async (req, res) => {
  const { orderId } = req.params;
  const { orderStatus, paymentStatus } = req.body;

  try {
    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ message: 'Order not found' });

    order.orderStatus = orderStatus || order.orderStatus;
    order.paymentStatus = paymentStatus || order.paymentStatus;
    order.updatedAt = Date.now();

    await order.save();

    res.status(200).json({ message: 'Order status updated successfully', order });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error updating order status' });
  }
};

// Delete order (admin only)
export const deleteOrder = async (req, res) => {
  const { orderId } = req.params;

  try {
    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ message: 'Order not found' });

    await order.remove();
    res.status(200).json({ message: 'Order deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error deleting order' });
  }
};
