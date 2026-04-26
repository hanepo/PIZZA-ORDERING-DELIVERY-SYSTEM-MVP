/* ─── tracking.js — Socket.IO real-time order tracking ─── */

const SOCKET_URL = window.location.origin;

class OrderTracker {
  constructor(orderId) {
    this.orderId  = orderId;
    this.socket   = null;
    this.etaTimer = null;
    this.eta      = 35; // minutes default
    this.statusSteps = ['placed', 'preparing', 'out_for_delivery', 'delivered'];

    this.connect();
    this.startEtaCountdown();
    this.simulateProgressDemo(); // demo fallback if backend offline
  }

  connect() {
    try {
      this.socket = io(SOCKET_URL);

      this.socket.on('connect', () => {
        console.log('🔌 Connected to tracking server');
        this.socket.emit('join-order', { orderId: this.orderId });
      });

      this.socket.on('joined-order', (data) => {
        console.log('✅ Tracking started for order', data.orderId);
      });

      this.socket.on('order-status-update', (data) => {
        if (data.orderId == this.orderId) {
          this.updateStatus(data.status);
          if (data.message) showToast(data.message, 'info');
        }
      });

      this.socket.on('rider-location', (data) => {
        if (data.orderId == this.orderId) {
          this.updateRiderPosition(data.lat, data.lng);
          if (data.eta !== undefined) this.updateEta(data.eta);
          if (data.progress !== undefined) this.updateProgress(data.progress);
        }
      });

      this.socket.on('disconnect', () => console.log('🔌 Tracking disconnected'));
    } catch (e) {
      console.warn('Socket.IO not available — using simulation mode');
    }
  }

  updateStatus(status) {
    const stepIdx = this.statusSteps.indexOf(status);
    const steps   = document.querySelectorAll('.tracker-step');
    const prog    = document.getElementById('trackerProgress');
    const msgEl   = document.getElementById('trackingMessage');
    const badgeEl = document.getElementById('currentStatusBadge');

    steps.forEach((step, i) => {
      step.classList.remove('active', 'done');
      if (i < stepIdx)  step.classList.add('done');
      if (i === stepIdx) step.classList.add('active');
    });

    // Update progress bar
    const pct = stepIdx === 0 ? 5 : stepIdx === 1 ? 35 : stepIdx === 2 ? 65 : stepIdx === 3 ? 100 : 0;
    if (prog) prog.style.width = pct + '%';

    // Update badge
    if (badgeEl) {
      badgeEl.className = `status-badge status-${status}`;
      badgeEl.textContent = statusLabel(status);
    }

    // Update message
    const msgs = {
      placed:           '🍕 Order confirmed! Getting ready...',
      preparing:        '👨‍🍳 Our chefs are crafting your pizza...',
      out_for_delivery: '🛵 Your rider is on the way!',
      delivered:        '✅ Delivered! Enjoy your pizza!'
    };
    if (msgEl) msgEl.textContent = msgs[status] || '';

    // Show/hide map
    const mapSection = document.getElementById('mapSection');
    if (mapSection) mapSection.style.display = status === 'out_for_delivery' ? 'block' : 'block';

    // Save updated status
    localStorage.setItem(`order_${this.orderId}_status`, status);
  }

  updateRiderPosition(lat, lng) {
    const dot   = document.getElementById('riderDot');
    const label = document.getElementById('riderLabel');
    if (!dot) return;

    // Convert lat/lng to percentage position on our fake map
    // Muar area: lat ~2.03–2.06, lng ~102.56–102.58
    const mapEl  = document.getElementById('fakeMap');
    if (!mapEl) return;
    const rect = mapEl.getBoundingClientRect();

    const latMin = 2.03, latMax = 2.06;
    const lngMin = 102.56, lngMax = 102.58;
    const x = ((lng - lngMin) / (lngMax - lngMin)) * 100;
    const y = (1 - (lat - latMin) / (latMax - latMin)) * 100;

    dot.style.left  = Math.max(2, Math.min(95, x)) + '%';
    dot.style.top   = Math.max(2, Math.min(90, y)) + '%';
    if (label) {
      label.style.left = Math.max(2, Math.min(85, x + 2)) + '%';
      label.style.top  = Math.max(2, Math.min(85, y - 8)) + '%';
    }
  }

  updateEta(minutes) {
    this.eta = minutes;
    const el = document.getElementById('etaMinutes');
    if (el) el.textContent = Math.max(0, Math.round(minutes));
  }

  updateProgress(pct) {
    const bar = document.getElementById('deliveryProgressBar');
    if (bar) bar.style.width = pct + '%';
  }

  startEtaCountdown() {
    this.etaTimer = setInterval(() => {
      if (this.eta > 0) {
        this.eta--;
        const el = document.getElementById('etaMinutes');
        if (el) el.textContent = this.eta;
      } else {
        clearInterval(this.etaTimer);
      }
    }, 60000); // update every minute
  }

  // Demo simulation when backend not running
  simulateProgressDemo() {
    const demo = localStorage.getItem(`order_${this.orderId}_demo`);
    if (demo === 'done') return;

    const sequence = [
      { status: 'placed',           delay: 500  },
      { status: 'preparing',        delay: 5000 },
      { status: 'out_for_delivery', delay: 15000 },
    ];

    sequence.forEach(({ status, delay }) => {
      setTimeout(() => {
        // Only simulate if socket not providing real updates
        const current = localStorage.getItem(`order_${this.orderId}_status`);
        if (!current || this.statusSteps.indexOf(current) < this.statusSteps.indexOf(status)) {
          this.updateStatus(status);
        }
      }, delay);
    });

    // Simulate rider movement
    let step = 0;
    const interval = setInterval(() => {
      step++;
      const progress = step / 20;
      const lat = 2.044 + (2.040 - 2.044) * progress + (Math.random() * 0.0005);
      const lng = 102.568 + (102.575 - 102.568) * progress + (Math.random() * 0.0005);
      this.updateRiderPosition(lat, lng);
      this.updateEta(Math.max(0, 30 - step));
      this.updateProgress(Math.round(progress * 100));
      if (step >= 20) {
        clearInterval(interval);
        this.updateStatus('delivered');
        localStorage.setItem(`order_${this.orderId}_demo`, 'done');
      }
    }, 3000);
  }

  destroy() {
    if (this.socket)   this.socket.disconnect();
    if (this.etaTimer) clearInterval(this.etaTimer);
  }
}

// Init tracking page
document.addEventListener('DOMContentLoaded', () => {
  const params  = new URLSearchParams(window.location.search);
  const orderId = params.get('id') || localStorage.getItem('lastOrderId');

  if (!orderId) {
    document.getElementById('trackingContent')?.classList.add('d-none');
    document.getElementById('noOrderMsg')?.classList.remove('d-none');
    return;
  }

  // Set order ID display
  document.querySelectorAll('.order-id-display').forEach(el => el.textContent = `#${orderId}`);

  // Load order details from API
  fetch(`/api/orders/${orderId}`)
    .then(r => r.json())
    .then(data => {
      if (!data.success) return;
      const order = data.data;

      // Populate order details
      const el = id => document.getElementById(id);
      if (el('orderDate'))    el('orderDate').textContent    = formatDate(order.created_at);
      if (el('orderAddress')) el('orderAddress').textContent = order.address;
      if (el('orderTotal'))   el('orderTotal').textContent   = formatPrice(order.total_price);
      if (el('paymentMethod'))el('paymentMethod').textContent= order.payment_method.toUpperCase();
      if (el('riderName'))    el('riderName').textContent    = order.rider_name || 'Being assigned...';

      // Render items
      const itemsList = el('orderItemsList');
      if (itemsList && order.items) {
        itemsList.innerHTML = order.items.map(item => `
          <div style="display:flex;justify-content:space-between;padding:.5rem 0;border-bottom:1px solid var(--border);font-size:.9rem">
            <span>${item.pizza_name} × ${item.quantity} <small style="color:var(--text-2)">(${item.size})</small></span>
            <span style="font-weight:700">${formatPrice(item.unit_price * item.quantity)}</span>
          </div>
        `).join('');
      }

      // Set initial status
      window._tracker = new OrderTracker(orderId);
      window._tracker.updateStatus(order.status);
    })
    .catch(() => {
      // Fallback: start tracker anyway for demo
      window._tracker = new OrderTracker(orderId);
    });
});
