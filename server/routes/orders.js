const express = require('express');
const db      = require('../config/db');
const { verifyToken, requireAdmin, requireRider } = require('../middleware/auth');
const router  = express.Router();

// POST /api/orders — place new order
router.post('/', async (req, res) => {
  const io = req.app.get('io');
  try {
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
      let unitPrice = parseFloat(item.price);
      if (item.size === 'small')  unitPrice *= 0.8;
      if (item.size === 'large')  unitPrice *= 1.3;
      subtotal += unitPrice * item.quantity;
    }

    // Apply promo code
    let discount = 0;
    let validPromo = null;
    if (promo_code) {
      const [promo] = await db.execute(
        'SELECT * FROM promo_codes WHERE code = ? AND is_active = 1 AND uses_left > 0 AND min_order <= ?',
        [promo_code.toUpperCase(), subtotal]
      );
      if (promo.length > 0) {
        validPromo = promo[0];
        discount = validPromo.discount_type === 'percentage'
          ? subtotal * (validPromo.discount_value / 100)
          : validPromo.discount_value;
        discount = Math.round(discount * 100) / 100;
        await db.execute('UPDATE promo_codes SET uses_left = uses_left - 1 WHERE id = ?', [validPromo.id]);
      }
    }

    const deliveryFee = 3.00;
    const totalPrice  = Math.max(0, subtotal - discount) + deliveryFee;

    // Insert order
    const [orderResult] = await db.execute(
      `INSERT INTO orders 
        (user_id, total_price, subtotal, discount, delivery_fee, payment_method, customer_name, customer_phone, address, promo_code, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        user_id || null,
        Math.round(totalPrice * 100) / 100,
        Math.round(subtotal * 100) / 100,
        discount,
        deliveryFee,
        payment_method || 'cod',
        customer_name,
        customer_phone,
        address,
        promo_code || null,
        notes || null
      ]
    );

    const orderId = orderResult.insertId;

    // Insert order items
    for (const item of items) {
      let unitPrice = parseFloat(item.price || item.unit_price || 0);
      if (item.size === 'small') unitPrice *= 0.8;
      if (item.size === 'large') unitPrice *= 1.3;

      await db.execute(
        'INSERT INTO order_items (order_id, pizza_id, pizza_name, quantity, unit_price, size, crust, toppings) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [
          orderId,
          item.id || item.pizza_id || null,
          item.name || item.pizza_name || 'Pizza',
          item.quantity,
          Math.round(unitPrice * 100) / 100,
          item.size || 'medium',
          item.crust || 'Classic',
          item.toppings ? JSON.stringify(item.toppings) : null
        ]
      );
    }

    // Notify admin room via Socket.IO
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
  } catch (err) {
    console.error('Place order error:', err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// GET /api/orders — customer gets own orders, admin gets all
router.get('/', verifyToken, async (req, res) => {
  try {
    let sql, params;

    if (req.user.role === 'admin') {
      sql = `SELECT o.*, 
               r.name AS rider_name 
             FROM orders o
             LEFT JOIN riders r ON o.rider_id = r.id
             ORDER BY o.created_at DESC`;
      params = [];
    } else if (req.user.role === 'rider') {
      // Rider sees orders assigned to them
      const [riderRow] = await db.execute('SELECT id FROM riders WHERE user_id = ?', [req.user.id]);
      if (riderRow.length === 0) return res.json({ success: true, data: [] });
      sql    = 'SELECT * FROM orders WHERE rider_id = ? ORDER BY created_at DESC';
      params = [riderRow[0].id];
    } else {
      sql    = 'SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC';
      params = [req.user.id];
    }

    const [orders] = await db.execute(sql, params);

    // Attach items
    for (const order of orders) {
      const [items] = await db.execute('SELECT * FROM order_items WHERE order_id = ?', [order.id]);
      order.items = items;
    }

    res.json({ success: true, data: orders });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// GET /api/orders/:id — single order detail
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await db.execute(
      `SELECT o.*, r.name AS rider_name, r.phone AS rider_phone, r.current_lat, r.current_lng
       FROM orders o
       LEFT JOIN riders r ON o.rider_id = r.id
       WHERE o.id = ?`,
      [req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ success: false, message: 'Order not found.' });

    const [items] = await db.execute('SELECT * FROM order_items WHERE order_id = ?', [req.params.id]);
    res.json({ success: true, data: { ...rows[0], items } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// PUT /api/orders/:id/status — admin or rider updates status
router.put('/:id/status', verifyToken, async (req, res) => {
  const io = req.app.get('io');
  try {
    const { status } = req.body;
    const validStatuses = ['placed', 'preparing', 'out_for_delivery', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status.' });
    }

    await db.execute('UPDATE orders SET status = ? WHERE id = ?', [status, req.params.id]);

    // Broadcast to order room
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
      // Also notify admin room
      io.to('admin-room').emit('order-status-changed', { orderId: parseInt(req.params.id), status });
    }

    res.json({ success: true, message: `Order status updated to: ${status}` });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// PUT /api/orders/:id/rider — assign rider (admin)
router.put('/:id/rider', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { rider_id } = req.body;
    await db.execute('UPDATE orders SET rider_id = ? WHERE id = ?', [rider_id, req.params.id]);
    await db.execute('UPDATE riders SET status = "busy" WHERE id = ?', [rider_id]);
    res.json({ success: true, message: 'Rider assigned.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// POST /api/orders/validate-promo
router.post('/validate-promo', async (req, res) => {
  try {
    const { code, subtotal } = req.body;
    const [rows] = await db.execute(
      'SELECT * FROM promo_codes WHERE code = ? AND is_active = 1 AND uses_left > 0',
      [code.toUpperCase()]
    );
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Invalid or expired promo code.' });
    }
    const promo = rows[0];
    if (parseFloat(subtotal) < parseFloat(promo.min_order)) {
      return res.status(400).json({
        success: false,
        message: `Minimum order RM${promo.min_order} required for this code.`
      });
    }

    const discount = promo.discount_type === 'percentage'
      ? (subtotal * promo.discount_value / 100).toFixed(2)
      : promo.discount_value;

    res.json({
      success: true,
      message: `Promo applied! You save RM${discount}`,
      discount: parseFloat(discount),
      type: promo.discount_type,
      value: promo.discount_value
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

module.exports = router;
