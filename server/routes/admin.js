const express = require('express');
const db      = require('../config/db');
const { verifyToken, requireAdmin } = require('../middleware/auth');
const router  = express.Router();

// GET /api/admin/stats — dashboard overview
router.get('/stats', verifyToken, requireAdmin, async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    const [[totalOrders]]  = await db.execute("SELECT COUNT(*) AS count FROM orders WHERE DATE(created_at) = ?", [today]);
    const [[totalRevenue]] = await db.execute("SELECT COALESCE(SUM(total_price),0) AS total FROM orders WHERE status = 'delivered' AND DATE(created_at) = ?", [today]);
    const [[activeOrders]] = await db.execute("SELECT COUNT(*) AS count FROM orders WHERE status IN ('placed','preparing','out_for_delivery')");
    const [[totalUsers]]   = await db.execute("SELECT COUNT(*) AS count FROM users WHERE role = 'customer'");
    const [[availRiders]]  = await db.execute("SELECT COUNT(*) AS count FROM riders WHERE status = 'available'");
    const [[allTimeRev]]   = await db.execute("SELECT COALESCE(SUM(total_price),0) AS total FROM orders WHERE status = 'delivered'");

    // Recent orders (last 5)
    const [recentOrders] = await db.execute(
      `SELECT o.id, o.customer_name, o.total_price, o.status, o.created_at, o.payment_method,
         COUNT(oi.id) AS item_count
       FROM orders o
       LEFT JOIN order_items oi ON o.id = oi.order_id
       GROUP BY o.id
       ORDER BY o.created_at DESC LIMIT 5`
    );

    res.json({
      success: true,
      data: {
        todayOrders:   totalOrders.count,
        todayRevenue:  parseFloat(totalRevenue.total).toFixed(2),
        activeOrders:  activeOrders.count,
        totalCustomers:totalUsers.count,
        availableRiders: availRiders.count,
        allTimeRevenue:  parseFloat(allTimeRev.total).toFixed(2),
        recentOrders
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// GET /api/admin/analytics — charts data
router.get('/analytics', verifyToken, requireAdmin, async (req, res) => {
  try {
    // Best-selling pizzas
    const [bestSelling] = await db.execute(
      `SELECT oi.pizza_name, SUM(oi.quantity) AS total_sold, SUM(oi.quantity * oi.unit_price) AS revenue
       FROM order_items oi
       JOIN orders o ON oi.order_id = o.id
       WHERE o.status = 'delivered'
       GROUP BY oi.pizza_name
       ORDER BY total_sold DESC LIMIT 5`
    );

    // Orders by status
    const [statusBreakdown] = await db.execute(
      `SELECT status, COUNT(*) AS count FROM orders GROUP BY status`
    );

    // Revenue last 7 days
    const [dailyRevenue] = await db.execute(
      `SELECT DATE(created_at) AS date, SUM(total_price) AS revenue, COUNT(*) AS orders
       FROM orders
       WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY) AND status != 'cancelled'
       GROUP BY DATE(created_at)
       ORDER BY date ASC`
    );

    // Peak hours
    const [peakHours] = await db.execute(
      `SELECT HOUR(created_at) AS hour, COUNT(*) AS orders
       FROM orders
       GROUP BY HOUR(created_at)
       ORDER BY hour ASC`
    );

    res.json({
      success: true,
      data: { bestSelling, statusBreakdown, dailyRevenue, peakHours }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// GET /api/admin/orders — all orders with pagination
router.get('/orders', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    let sql = `SELECT o.*, r.name AS rider_name FROM orders o LEFT JOIN riders r ON o.rider_id = r.id`;
    const params = [];

    if (status && status !== 'all') { sql += ' WHERE o.status = ?'; params.push(status); }
    const limitInt  = parseInt(limit, 10);
    const offsetInt = parseInt(offset, 10);
    sql += ` ORDER BY o.created_at DESC LIMIT ${limitInt} OFFSET ${offsetInt}`;

    const [orders] = await db.execute(sql, params);

    for (const order of orders) {
      const [items] = await db.execute('SELECT * FROM order_items WHERE order_id = ?', [order.id]);
      order.items = items;
    }

    const [[{ total }]] = await db.execute('SELECT COUNT(*) AS total FROM orders' + (status && status !== 'all' ? ' WHERE status = ?' : ''), status && status !== 'all' ? [status] : []);

    res.json({ success: true, data: orders, total, page: parseInt(page), pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

module.exports = router;
