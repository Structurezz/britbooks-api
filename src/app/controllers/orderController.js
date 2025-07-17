import * as OrderService from '../services/orderService.js';

export async function createOrder(req, res) {
  try {
    const { items, shippingAddress, billingAddress, paymentMethod } = req.body;
    const role = req.user?.role || 'user';
    const userId = req.user?.id;

    if (!items?.length) {
      return res.status(400).json({ success: false, message: 'Order items are required.' });
    }

    const order = await OrderService.createOrder({
      userId,
      role,
      items,
      shippingAddress,
      billingAddress,
      paymentMethod,
    });

    res.status(201).json({ success: true, order });
  } catch (error) {
    console.error('Create order failed:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

export async function getOrders(req, res) {
  try {
    const { page = 1, limit = 20, ...filters } = req.query;
    const role = req.user?.role || 'user';
    const userId = req.user?.id;

    const orders = await OrderService.getOrders({
      userId,
      role,
      filters,
      page: parseInt(page),
      limit: parseInt(limit),
    });

    res.status(200).json({ success: true, orders });
  } catch (error) {
    console.error('Get orders failed:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

export async function getOrderDetails(req, res) {
  try {
    const { id } = req.params;
    const order = await OrderService.getOrderDetails(id);

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    res.status(200).json({ success: true, order });
  } catch (error) {
    console.error('Get order details failed:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

export async function updateOrderStatus(req, res) {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const updated = await OrderService.updateOrderStatus(id, status);
    res.status(200).json({ success: true, order: updated });
  } catch (error) {
    console.error('Update order status failed:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

export async function deleteOrder(req, res) {
  try {
    const { id } = req.params;

    await OrderService.deleteOrder(id);
    res.status(200).json({ success: true, message: 'Order deleted' });
  } catch (error) {
    console.error('Delete order failed:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

export async function resendOrderDocuments(req, res) {
  try {
    const { id } = req.params;

    await OrderService.resendOrderDocuments(id);
    res.status(200).json({ success: true, message: 'Invoice and receipt re-sent.' });
  } catch (error) {
    console.error('Resend documents failed:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
}
