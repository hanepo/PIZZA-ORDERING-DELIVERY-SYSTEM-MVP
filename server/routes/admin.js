const express = require('express');
const store   = require('../data/store');
const { verifyToken, requireAdmin } = require('../middleware/auth');
const router  = express.Router();

// GET /api/admin/stats — dashboard overview
router.get('/stats', verifyToken, requireAdmin, (req, res) => {
  const today = new Date().toDateString();

  const todayOrders   = store.orders.filter(o => new Date(o.created_at).toDateString() === today);
  const todayRevenue  = todayOrders.filter(o => o.status === 'delivered').reduce((s, o) => s + o.total_price, 0);
  const activeOrders  = store.orders.filter(o => ['placed','preparing','out_for_delivery'].includes(o.status)).length;
  const totalCustomers= store.users.filter(u => u.role === 'customer').length;
  const availRiders   = store.riders.filter(r => r.status === 'available').length;
  const allTimeRev    = store.orders.filter(o => o.status === 'delivered').reduce((s, o) => s + o.total_price, 0);

  const recentOrders = [...store.orders].reverse().slice(0, 5).map(o => ({
    ...o,
    item_count: store.orderItems.filter(i => i.order_id === o.id).length
  }));

  res.json({
    success: true,
    data: {
      todayOrders:     todayOrders.length,
      todayRevenue:    todayRevenue.toFixed(2),
      activeOrders,
      totalCustomers,
      availableRiders: availRiders,
      allTimeRevenue:  allTimeRev.toFixed(2),
      recentOrders
    }
  });
});

// GET /api/admin/analytics — charts data
router.get('/analytics', verifyToken, requireAdmin, (req, res) => {
  const delivered = store.orders.filter(o => o.status === 'delivered');

  // Best-selling pizzas
  const pizzaSales = {};
  for (const item of store.orderItems) {
    const order = store.orders.find(o => o.id === item.order_id);
    if (order && order.status === 'delivered') {
      if (!pizzaSales[item.pizza_name]) pizzaSales[item.pizza_name] = { pizza_name: item.pizza_name, total_sold: 0, revenue: 0 };
      pizzaSales[item.pizza_name].total_sold += item.quantity;
      pizzaSales[item.pizza_name].revenue   += item.quantity * item.unit_price;
    }
  }
  const bestSelling = Object.values(pizzaSales).sort((a, b) => b.total_sold - a.total_sold).slice(0, 5);

  // Orders by status
  const statusMap = {};
  for (const o of store.orders) {
    statusMap[o.status] = (statusMap[o.status] || 0) + 1;
  }
  const statusBreakdown = Object.entries(statusMap).map(([status, count]) => ({ status, count }));

  // Revenue last 7 days
  const days = {};
  const cutoff = new Date(Date.now() - 7 * 24 * 3600000);
  for (const o of store.orders) {
    if (new Date(o.created_at) >= cutoff && o.status !== 'cancelled') {
      const d = new Date(o.created_at).toISOString().split('T')[0];
      if (!days[d]) days[d] = { date: d, revenue: 0, orders: 0 };
      days[d].revenue += o.total_price;
      days[d].orders++;
    }
  }
  const dailyRevenue = Object.values(days).sort((a, b) => a.date.localeCompare(b.date));

  // Peak hours
  const hours = {};
  for (const o of store.orders) {
    const h = new Date(o.created_at).getHours();
    hours[h] = (hours[h] || 0) + 1;
  }
  const peakHours = Object.entries(hours).map(([hour, orders]) => ({ hour: parseInt(hour), orders })).sort((a, b) => a.hour - b.hour);

  res.json({ success: true, data: { bestSelling, statusBreakdown, dailyRevenue, peakHours } });
});

// GET /api/admin/orders — all orders with pagination
router.get('/orders', verifyToken, requireAdmin, (req, res) => {
  const { status, page = 1, limit = 20 } = req.query;
  let filtered = [...store.orders].reverse();
  if (status && status !== 'all') filtered = filtered.filter(o => o.status === status);

  const total   = filtered.length;
  const pageInt = parseInt(page, 10);
  const limInt  = parseInt(limit, 10);
  const paged   = filtered.slice((pageInt - 1) * limInt, pageInt * limInt);

  const result = paged.map(o => {
    const rider = o.rider_id ? store.riders.find(r => r.id === o.rider_id) : null;
    return { ...o, rider_name: rider ? rider.name : null, items: store.orderItems.filter(i => i.order_id === o.id) };
  });

  res.json({ success: true, data: result, total, page: pageInt, pages: Math.ceil(total / limInt) });
});

// PATCH /api/admin/orders/:id/status
router.patch('/orders/:id/status', verifyToken, requireAdmin, (req, res) => {
  const io = req.app.get('io');
  const order = store.orders.find(o => o.id === parseInt(req.params.id));
  if (!order) return res.status(404).json({ success: false, message: 'Order not found.' });

  const { status } = req.body;
  order.status = status;

  if (io) {
    io.to(`order-${req.params.id}`).emit('order-status-update', { orderId: order.id, status });
    io.to('admin-room').emit('order-updated', { orderId: order.id, status });
  }

  res.json({ success: true, message: 'Status updated.' });
});

// PATCH /api/admin/orders/:id/assign
router.patch('/orders/:id/assign', verifyToken, requireAdmin, (req, res) => {
  const io = req.app.get('io');
  const order = store.orders.find(o => o.id === parseInt(req.params.id));
  if (!order) return res.status(404).json({ success: false, message: 'Order not found.' });

  const { rider_id } = req.body;
  const rider = store.riders.find(r => r.id === parseInt(rider_id));
  if (!rider) return res.status(404).json({ success: false, message: 'Rider not found.' });

  order.rider_id   = rider.id;
  order.status     = 'out_for_delivery';
  rider.status     = 'busy';

  if (io) {
    io.to(`order-${req.params.id}`).emit('order-status-update', { orderId: order.id, status: 'out_for_delivery', message: '🛵 Rider is on the way!' });
    io.to('admin-room').emit('order-updated', { orderId: order.id, status: 'out_for_delivery' });
  }

  res.json({ success: true, message: 'Rider assigned.' });
});

module.exports = router;
