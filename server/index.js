require('dotenv').config();
const express    = require('express');
const http       = require('http');
const { Server } = require('socket.io');
const cors       = require('cors');
const path       = require('path');

// Route imports
const authRoutes   = require('./routes/auth');
const pizzaRoutes  = require('./routes/pizzas');
const orderRoutes  = require('./routes/orders');
const riderRoutes  = require('./routes/riders');
const adminRoutes  = require('./routes/admin');

const app    = express();
const server = http.createServer(app);
const io     = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST', 'PUT', 'DELETE'] }
});

const PORT = process.env.PORT || 3000;

// ── Middleware ──────────────────────────────────────────────────
app.use(cors({ origin: '*' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static frontend files from ../client
app.use(express.static(path.join(__dirname, '../client')));

// Serve uploaded images
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ── API Routes ─────────────────────────────────────────────────
app.use('/api/auth',   authRoutes);
app.use('/api/pizzas', pizzaRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/riders', riderRoutes);
app.use('/api/admin',  adminRoutes);

// Expose io instance to routes via app
app.set('io', io);

// ── Root fallback → homepage ───────────────────────────────────
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/index.html'));
});

// ── Socket.IO — Real-time events ───────────────────────────────
// Active riders map: { socketId: { riderId, orderId, lat, lng, intervalId } }
const activeRiders = new Map();

// Muar, Johor area bounds for simulation
const MUAR_CENTER = { lat: 2.0442, lng: 102.5688 };

function simulateRiderMovement(socket, orderId, destination) {
  // Start near restaurant, gradually move toward customer
  let step = 0;
  const totalSteps = 20;
  const startLat = MUAR_CENTER.lat + (Math.random() * 0.01 - 0.005);
  const startLng = MUAR_CENTER.lng + (Math.random() * 0.01 - 0.005);
  const endLat   = destination.lat;
  const endLng   = destination.lng;

  const intervalId = setInterval(() => {
    step++;
    const progress = step / totalSteps;
    const lat = startLat + (endLat - startLat) * progress + (Math.random() * 0.0008 - 0.0004);
    const lng = startLng + (endLng - startLng) * progress + (Math.random() * 0.0008 - 0.0004);

    // Broadcast to order room
    io.to(`order-${orderId}`).emit('rider-location', {
      orderId, lat, lng,
      eta: Math.max(0, Math.round((totalSteps - step) * 0.5)), // minutes
      progress: Math.round(progress * 100)
    });

    if (step >= totalSteps) {
      clearInterval(intervalId);
      io.to(`order-${orderId}`).emit('order-status-update', {
        orderId, status: 'delivered', message: 'Your pizza has been delivered! Enjoy 🍕'
      });
    }
  }, 3000); // update every 3 seconds

  return intervalId;
}

io.on('connection', (socket) => {
  console.log('🔌 Client connected:', socket.id);

  // Customer joins their order tracking room
  socket.on('join-order', ({ orderId }) => {
    socket.join(`order-${orderId}`);
    console.log(`👤 Customer joined order-${orderId}`);
    socket.emit('joined-order', { orderId, message: 'Tracking started' });
  });

  // Admin joins admin room for new order notifications
  socket.on('join-admin', () => {
    socket.join('admin-room');
    console.log('🧑‍💼 Admin joined admin-room');
  });

  // Rider starts delivery — begin GPS simulation
  socket.on('start-delivery', ({ riderId, orderId, customerLat, customerLng }) => {
    const destination = {
      lat: customerLat || MUAR_CENTER.lat + (Math.random() * 0.02 - 0.01),
      lng: customerLng || MUAR_CENTER.lng + (Math.random() * 0.02 - 0.01)
    };

    const intervalId = simulateRiderMovement(socket, orderId, destination);
    activeRiders.set(socket.id, { riderId, orderId, intervalId });

    io.to(`order-${orderId}`).emit('order-status-update', {
      orderId, status: 'out_for_delivery',
      message: 'Your rider is on the way! 🛵'
    });

    console.log(`🛵 Rider ${riderId} started delivery for order ${orderId}`);
  });

  // Rider manually updates location
  socket.on('update-location', ({ orderId, lat, lng, eta }) => {
    io.to(`order-${orderId}`).emit('rider-location', { orderId, lat, lng, eta });
  });

  // Admin triggers order status update
  socket.on('admin-status-update', ({ orderId, status }) => {
    io.to(`order-${orderId}`).emit('order-status-update', { orderId, status });

    // If setting to out_for_delivery, start simulation
    if (status === 'out_for_delivery') {
      const intervalId = simulateRiderMovement(socket, orderId, {
        lat: MUAR_CENTER.lat + (Math.random() * 0.02 - 0.01),
        lng: MUAR_CENTER.lng + (Math.random() * 0.02 - 0.01)
      });
      activeRiders.set(socket.id, { orderId, intervalId });
    }
  });

  // Disconnect — clean up intervals
  socket.on('disconnect', () => {
    const data = activeRiders.get(socket.id);
    if (data?.intervalId) clearInterval(data.intervalId);
    activeRiders.delete(socket.id);
    console.log('❌ Client disconnected:', socket.id);
  });
});

// ── Start server ──────────────────────────────────────────────
server.listen(PORT, () => {
  console.log(`\n🍕 Pizza Delivery Server running at http://localhost:${PORT}`);
  console.log(`📁 Serving frontend from: ../client`);
  console.log(`🔌 Socket.IO ready for real-time tracking\n`);
});
