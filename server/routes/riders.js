const express = require('express');
const store   = require('../data/store');
const { verifyToken, requireAdmin, requireRider } = require('../middleware/auth');
const router  = express.Router();

// GET /api/riders/my-orders — rider gets their assigned orders (must be before /:id)
router.get('/my-orders', verifyToken, requireRider, (req, res) => {
  const rider = store.riders.find(r => r.user_id === req.user.id);
  if (!rider) return res.json({ success: true, data: [], riderId: null });

  const orders = store.orders
    .filter(o => o.rider_id === rider.id && ['out_for_delivery','preparing'].includes(o.status))
    .map(o => ({ ...o, items: store.orderItems.filter(i => i.order_id === o.id) }));

  res.json({ success: true, data: orders, riderId: rider.id });
});

// GET /api/riders/available — for assigning to orders
router.get('/available', verifyToken, requireAdmin, (req, res) => {
  const available = store.riders
    .filter(r => r.status === 'available')
    .map(({ id, name, phone, status }) => ({ id, name, phone, status }));
  res.json({ success: true, data: available });
});

// GET /api/riders — list all riders (admin)
router.get('/', verifyToken, requireAdmin, (req, res) => {
  const result = store.riders.map(r => ({
    ...r,
    active_orders: store.orders.filter(o => o.rider_id === r.id && o.status === 'out_for_delivery').length
  }));
  res.json({ success: true, data: result });
});

// POST /api/riders — add rider (admin)
router.post('/', verifyToken, requireAdmin, (req, res) => {
  const { name, phone, user_id } = req.body;
  if (!name) return res.status(400).json({ success: false, message: 'Name required.' });

  const newRider = {
    id:                store.getNextRiderId(),
    name,
    phone:             phone || null,
    status:            'available',
    user_id:           user_id || null,
    current_lat:       2.044200,
    current_lng:       102.568810,
    total_deliveries:  0,
    email:             null
  };
  store.riders.push(newRider);
  res.status(201).json({ success: true, message: 'Rider added.', id: newRider.id });
});

// PUT /api/riders/:id/status
router.put('/:id/status', verifyToken, (req, res) => {
  const { status } = req.body;
  if (!['available','busy','offline'].includes(status)) {
    return res.status(400).json({ success: false, message: 'Invalid status.' });
  }
  const rider = store.riders.find(r => r.id === parseInt(req.params.id));
  if (!rider) return res.status(404).json({ success: false, message: 'Rider not found.' });
  rider.status = status;
  res.json({ success: true, message: 'Status updated.' });
});

// PUT /api/riders/:id/location — rider updates GPS
router.put('/:id/location', verifyToken, (req, res) => {
  const io = req.app.get('io');
  const { lat, lng, order_id } = req.body;
  const rider = store.riders.find(r => r.id === parseInt(req.params.id));
  if (!rider) return res.status(404).json({ success: false, message: 'Rider not found.' });

  rider.current_lat = parseFloat(lat);
  rider.current_lng = parseFloat(lng);

  if (io && order_id) {
    io.to(`order-${order_id}`).emit('rider-location', {
      orderId: parseInt(order_id), lat: parseFloat(lat), lng: parseFloat(lng)
    });
  }
  res.json({ success: true });
});

// DELETE /api/riders/:id — admin
router.delete('/:id', verifyToken, requireAdmin, (req, res) => {
  const idx = store.riders.findIndex(r => r.id === parseInt(req.params.id));
  if (idx === -1) return res.status(404).json({ success: false, message: 'Rider not found.' });
  store.riders.splice(idx, 1);
  res.json({ success: true, message: 'Rider removed.' });
});

module.exports = router;
