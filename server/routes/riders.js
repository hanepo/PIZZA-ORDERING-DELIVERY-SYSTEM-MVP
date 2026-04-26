const express = require('express');
const db      = require('../config/db');
const { verifyToken, requireAdmin, requireRider } = require('../middleware/auth');
const router  = express.Router();

// GET /api/riders — list all riders (admin)
router.get('/', verifyToken, requireAdmin, async (req, res) => {
  try {
    const [riders] = await db.execute(
      `SELECT r.*, u.email,
         (SELECT COUNT(*) FROM orders o WHERE o.rider_id = r.id AND o.status = 'out_for_delivery') AS active_orders
       FROM riders r
       LEFT JOIN users u ON r.user_id = u.id
       ORDER BY r.status ASC`
    );
    res.json({ success: true, data: riders });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// GET /api/riders/available — for assigning to orders
router.get('/available', verifyToken, requireAdmin, async (req, res) => {
  try {
    const [riders] = await db.execute(
      "SELECT id, name, phone, status FROM riders WHERE status = 'available' ORDER BY name"
    );
    res.json({ success: true, data: riders });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// POST /api/riders — add rider (admin)
router.post('/', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { name, phone, user_id } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'Name required.' });

    const [result] = await db.execute(
      'INSERT INTO riders (name, phone, user_id) VALUES (?, ?, ?)',
      [name, phone || null, user_id || null]
    );
    res.status(201).json({ success: true, message: 'Rider added.', id: result.insertId });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// PUT /api/riders/:id/status
router.put('/:id/status', verifyToken, async (req, res) => {
  try {
    const { status } = req.body;
    const valid = ['available', 'busy', 'offline'];
    if (!valid.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status.' });
    }
    await db.execute('UPDATE riders SET status = ? WHERE id = ?', [status, req.params.id]);
    res.json({ success: true, message: 'Status updated.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// PUT /api/riders/:id/location — rider updates GPS
router.put('/:id/location', verifyToken, async (req, res) => {
  const io = req.app.get('io');
  try {
    const { lat, lng, order_id } = req.body;
    await db.execute(
      'UPDATE riders SET current_lat = ?, current_lng = ? WHERE id = ?',
      [lat, lng, req.params.id]
    );

    // Broadcast location to order room
    if (io && order_id) {
      io.to(`order-${order_id}`).emit('rider-location', {
        orderId: parseInt(order_id), lat: parseFloat(lat), lng: parseFloat(lng)
      });
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// GET /api/riders/my-orders — rider gets their assigned orders
router.get('/my-orders', verifyToken, requireRider, async (req, res) => {
  try {
    const [riderRow] = await db.execute('SELECT id FROM riders WHERE user_id = ?', [req.user.id]);
    if (riderRow.length === 0) return res.json({ success: true, data: [] });

    const [orders] = await db.execute(
      `SELECT o.* FROM orders o
       WHERE o.rider_id = ? AND o.status IN ('out_for_delivery','preparing')
       ORDER BY o.created_at DESC`,
      [riderRow[0].id]
    );

    for (const order of orders) {
      const [items] = await db.execute('SELECT * FROM order_items WHERE order_id = ?', [order.id]);
      order.items = items;
    }

    res.json({ success: true, data: orders, riderId: riderRow[0].id });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// DELETE /api/riders/:id — admin
router.delete('/:id', verifyToken, requireAdmin, async (req, res) => {
  try {
    await db.execute('DELETE FROM riders WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Rider removed.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

module.exports = router;
