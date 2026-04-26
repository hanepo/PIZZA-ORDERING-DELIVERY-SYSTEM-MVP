/* ─── cart.js — Cart state management with localStorage ─── */

const Cart = {
  key: 'pizza_cart',

  get() {
    try { return JSON.parse(localStorage.getItem(this.key)) || []; }
    catch { return []; }
  },

  save(items) {
    localStorage.setItem(this.key, JSON.stringify(items));
    this.updateBadge();
    this.renderSidebar();
  },

  add(pizza, size = 'medium', crust = 'Classic', toppings = [], qty = 1) {
    const items = this.get();
    const key   = `${pizza.id}-${size}-${crust}`;
    const idx   = items.findIndex(i => i._key === key);

    let unitPrice = parseFloat(pizza.price);
    if (size === 'small')  unitPrice = Math.round(unitPrice * 0.8  * 100) / 100;
    if (size === 'large')  unitPrice = Math.round(unitPrice * 1.3  * 100) / 100;

    if (idx >= 0) {
      items[idx].quantity += qty;
    } else {
      items.push({
        _key: key, id: pizza.id, name: pizza.name,
        image: pizza.image, price: unitPrice,
        basePrice: parseFloat(pizza.price),
        size, crust, toppings, quantity: qty
      });
    }

    this.save(items);
    showToast(`${pizza.name} added to cart! 🍕`, 'success');
  },

  remove(key) {
    const items = this.get().filter(i => i._key !== key);
    this.save(items);
  },

  updateQty(key, delta) {
    const items = this.get();
    const idx   = items.findIndex(i => i._key === key);
    if (idx < 0) return;
    items[idx].quantity = Math.max(1, items[idx].quantity + delta);
    this.save(items);
  },

  clear() {
    localStorage.removeItem(this.key);
    this.updateBadge();
    this.renderSidebar();
  },

  subtotal() {
    return this.get().reduce((s, i) => s + i.price * i.quantity, 0);
  },

  count() {
    return this.get().reduce((s, i) => s + i.quantity, 0);
  },

  updateBadge() {
    const badges = document.querySelectorAll('.nav-cart-badge, #cartCount');
    const cnt    = this.count();
    badges.forEach(b => { b.textContent = cnt; b.style.display = cnt > 0 ? 'flex' : 'none'; });
  },

  renderSidebar() {
    const container = document.getElementById('cartItems');
    if (!container) return;
    const items = this.get();

    if (items.length === 0) {
      container.innerHTML = `
        <div class="cart-empty">
          <i class="fas fa-shopping-cart"></i>
          <p>Your cart is empty.<br>Add some pizzas! 🍕</p>
          <a href="/menu.html" class="btn btn-primary btn-sm">Browse Menu</a>
        </div>`;
      this.updateSummary(0, 0, 3.00);
      return;
    }

    container.innerHTML = items.map(item => `
      <div class="cart-item">
        <img class="cart-item-img" src="${item.image}" alt="${item.name}" onerror="this.src='https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=200&q=60'"/>
        <div class="cart-item-info">
          <div class="cart-item-name">${item.name}</div>
          <div class="cart-item-meta">${item.size.charAt(0).toUpperCase()+item.size.slice(1)} • ${item.crust}</div>
          <div class="cart-item-price">${formatPrice(item.price * item.quantity)}</div>
          <div class="qty-control">
            <button class="qty-btn" onclick="Cart.updateQty('${item._key}', -1)"><i class="fas fa-minus"></i></button>
            <span class="qty-num">${item.quantity}</span>
            <button class="qty-btn" onclick="Cart.updateQty('${item._key}', 1)"><i class="fas fa-plus"></i></button>
            <button class="cart-remove" onclick="Cart.remove('${item._key}')"><i class="fas fa-trash"></i></button>
          </div>
        </div>
      </div>
    `).join('');

    this.updateSummary(this.subtotal(), 0, 3.00);
  },

  updateSummary(subtotal, discount, delivery = 3.00) {
    const el = id => document.getElementById(id);
    if (el('cartSubtotal'))  el('cartSubtotal').textContent  = formatPrice(subtotal);
    if (el('cartDelivery'))  el('cartDelivery').textContent  = formatPrice(delivery);
    if (el('cartDiscount'))  el('cartDiscount').textContent  = discount > 0 ? `-${formatPrice(discount)}` : 'RM0.00';
    if (el('cartTotal'))     el('cartTotal').textContent     = formatPrice(Math.max(0, subtotal - discount) + delivery);
    if (el('checkoutTotal')) el('checkoutTotal').textContent = formatPrice(Math.max(0, subtotal - discount) + delivery);
  },

  openSidebar() {
    const overlay = document.getElementById('cartOverlay');
    const sidebar = document.getElementById('cartSidebar');
    if (overlay) overlay.classList.add('open');
    if (sidebar) sidebar.classList.add('open');
    this.renderSidebar();
  },

  closeSidebar() {
    const overlay = document.getElementById('cartOverlay');
    const sidebar = document.getElementById('cartSidebar');
    if (overlay) overlay.classList.remove('open');
    if (sidebar) sidebar.classList.remove('open');
  }
};

/* ── Cart sidebar init ──────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  const cartBtn     = document.getElementById('cartBtn');
  const cartOverlay = document.getElementById('cartOverlay');
  const cartClose   = document.getElementById('cartClose');
  const checkoutBtn = document.getElementById('cartCheckout');

  if (cartBtn)     cartBtn.addEventListener('click',     () => Cart.openSidebar());
  if (cartOverlay) cartOverlay.addEventListener('click', () => Cart.closeSidebar());
  if (cartClose)   cartClose.addEventListener('click',   () => Cart.closeSidebar());
  if (checkoutBtn) checkoutBtn.addEventListener('click', () => {
    if (Cart.count() === 0) { showToast('Your cart is empty!', 'error'); return; }
    window.location.href = '/checkout.html';
  });

  Cart.updateBadge();
  Cart.renderSidebar();
});
