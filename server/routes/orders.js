const express = require('express');
const store   = require('../data/store');
const { verifyToken, requireAdmin, requireRider } = require('../middleware/auth');
const router  = express.Router();

// POST /api/orders — place new order
router.post('/', (req, res) => {
  const io = req.app.get('io');
  const {
    items, customer_name, customer_phone, address,
    payment_method, promo_code, notes, user_id
  } = req.body;

  if (!items || items.length === 0) {
    return res.status(400).json({ success: false, message: 'Cart is empty.' });
  }
  if (!customer_name || !customer_phone || !address) {
    return res.status(400).json({ success: false, message: 'Name, phone and address required.' });
  }

  // Calculate subtotal
  let subtotal = 0;
  for (const item of items) {
    let unitPrice = parseFloat(item.price || item.unit_price || 0);
    if (item.size === 'small') unitPrice *= 0.8;
    if (item.size === 'large') unitPrice *= 1.3;
    subtotal += unitPrice * item.quantity;
  }

  // Apply promo code
  let discount = 0;
  if (promo_code) {
    const promo = store.promoCodes.find(
      p => p.code === promo_code.toUpperCase() && p.is_active === 1 && p.uses_left > 0 && p.min_order <= subtotal
    );
    if (promo) {
      discount = promo.discount_type === 'percentage'
        ? subtotal * (promo.discount_value / 100)
        : promo.discount_value;
      discount = Math.round(discount * 100) / 100;
      promo.uses_left--;
    }
  }

  const deliveryFee = 3.00;
  const totalPrice  = Math.max(0, subtotal - discount) + deliveryFee;
  const orderId     = store.getNextOrderId();

  const newOrder = {
    id: orderId,
    user_id: user_id || null,
    total_price:    Math.round(totalPrice * 100) / 100,
    subtotal:       Math.round(subtotal * 100) / 100,
    discount,
    delivery_fee:   deliveryFee,
    status:         'placed',
    payment_method: payment_method || 'cod',
    customer_name,
    customer_phone,
    address,
    promo_code:     promo_code || null,
    notes:          notes || null,
    rider_id:       null,
    created_at:     new Date()
  };
  store.orders.push(newOrder);

  for (const item of items) {
    let unitPrice = parseFloat(item.price || item.unit_price || 0);
    if (item.size === 'small') unitPrice *= 0.8;
    if (item.size === 'large') unitPrice *= 1.3;
    store.orderItems.push({
      id:         store.getNextOrderItemId(),
      order_id:   orderId,
      pizza_id:   item.id || item.pizza_id || null,
      pizza_name: item.name || item.pizza_name || 'Pizza',
      quantity:   item.quantity,
      unit_price: Math.round(unitPrice * 100) / 100,
      size:       item.size || 'medium',
      crust:      item.crust || 'Classic',
      toppings:   item.toppings ? JSON.stringify(item.toppings) : null
    });
  }

  if (io) {
    io.to('admin-room').emit('new-order', {
      orderId,
      customerName: customer_name,
      total: totalPrice,
      itemCount: items.length
    });
  }

  res.status(201).json({
    success: true,
    message: 'Order placed successfully!',
    orderId,
    total: totalPrice,
    discount
  });
});

// GET /api/orders — customer gets own orders, admin/rider gets theirs
router.get('/', verifyToken, (req, res) => {
  let orders;

  if (req.user.role === 'admin') {
    orders = [...store.orders].reverse();
  } else if (req.user.role === 'rider') {
    const rider = store.riders.find(r => r.user_id === req.user.id);
    if (!rider) return res.json({ success: true, data: [] });
    orders = store.orders.filter(o => o.rider_id === rider.id);
  } else {
    orders = store.orders.filter(o => o.user_id === req.user.id).reverse();
  }

  const result = orders.map(o => {
    const rider = o.rider_id ? store.riders.find(r => r.id === o.rider_id) : null;
    return {
      ...o,
      rider_name: rider ? rider.name : null,
      items: store.orderItems.filter(i => i.order_id === o.id)
    };
  });

  res.json({ success: true, data: result });
});

// GET /api/orders/:id — single order detail
router.get('/:id', (req, res) => {
  const order = store.orders.find(o => o.id === parseInt(req.params.id));
  if (!order) return res.status(404).json({ success: false, message: 'Order not found.' });

  const rider = order.rider_id ? store.riders.find(r => r.id === order.rider_id) : null;
  const items = store.orderItems.filter(i => i.order_id === order.id);

  res.json({
    success: true,
    data: {
      ...order,
      rider_name:  rider ? rider.name  : null,
      rider_phone: rider ? rider.phone : null,
      current_lat: rider ? rider.current_lat : null,
      current_lng: rider ? rider.current_lng : null,
      items
    }
  });
});

// PUT /api/orders/:id/status — admin or rider updates status
router.put('/:id/status', verifyToken, (req, res) => {
  const io = req.app.get('io');
  const { status } = req.body;
  const validStatuses = ['placed', 'preparing', 'out_for_delivery', 'delivered', 'cancelled'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ success: false, message: 'Invalid status.' });
  }

  const order = store.orders.find(o => o.id === parseInt(req.params.id));
  if (!order) return res.status(404).json({ success: false, message: 'Order not found.' });

  order.status = status;

  if (io) {
    const messages = {
      placed:           '🍕 Order placed successfully!',
      preparing:        '👨‍🍳 Your pizza is being prepared...',
      out_for_delivery: '🛵 Rider is on the way!',
      delivered:        '✅ Order delivered! Enjoy your pizza!',
      cancelled:        '❌ Order cancelled.'
    };
    io.to(`order-${req.params.id}`).emit('order-status-update', {
      orderId: parseInt(req.params.id),
      status,
      message: messages[status]
    });
    io.to('admin-room').emit('order-updated', { orderId: parseInt(req.params.id), status });
  }

  res.json({ success: true, message: 'Status updated.', status });
});

module.exports = router;
