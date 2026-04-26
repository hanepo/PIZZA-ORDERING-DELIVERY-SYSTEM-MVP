/* ─── app.js — Shared utilities, API helpers, navbar, toast, chatbot ─── */

// Relative path works on localhost AND any deployed URL
const API = '/api';

/* ── Auth helpers ────────────────────────────────────── */
const Auth = {
  getToken:  () => localStorage.getItem('token'),
  getUser:   () => { try { return JSON.parse(localStorage.getItem('user')); } catch { return null; } },
  setSession:(token, user) => { localStorage.setItem('token', token); localStorage.setItem('user', JSON.stringify(user)); },
  clear:     () => { localStorage.removeItem('token'); localStorage.removeItem('user'); },
  isLoggedIn:() => !!localStorage.getItem('token'),
  isAdmin:   () => { const u = Auth.getUser(); return u?.role === 'admin'; },
  isRider:   () => { const u = Auth.getUser(); return u?.role === 'rider'; }
};

/* ── API fetch wrapper ───────────────────────────────── */
async function apiCall(method, endpoint, body = null) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' }
  };
  const token = Auth.getToken();
  if (token) opts.headers['Authorization'] = `Bearer ${token}`;
  if (body) opts.body = JSON.stringify(body);

  const res  = await fetch(`${API}${endpoint}`, opts);
  const data = await res.json();
  return { ok: res.ok, status: res.status, ...data };
}

/* ── Toast notifications ─────────────────────────────── */
function showToast(message, type = 'success') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }
  const icons = { success: 'fa-check-circle', error: 'fa-times-circle', info: 'fa-info-circle' };
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `<i class="fas ${icons[type] || icons.info} toast-icon"></i><span class="toast-text">${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('removing');
    toast.addEventListener('animationend', () => toast.remove());
  }, 3500);
}

/* ── Dark mode ───────────────────────────────────────── */
function initDarkMode() {
  const btn = document.getElementById('darkToggle');
  if (!btn) return;
  const saved = localStorage.getItem('theme') || 'light';
  document.documentElement.setAttribute('data-theme', saved);
  btn.innerHTML = saved === 'dark' ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
  btn.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
    btn.innerHTML = next === 'dark' ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
  });
}

/* ── Navbar ──────────────────────────────────────────── */
function initNavbar() {
  const nav = document.querySelector('.navbar');
  if (!nav) return;
  window.addEventListener('scroll', () => nav.classList.toggle('scrolled', window.scrollY > 10));

  // Hamburger
  const ham = document.getElementById('hamburger');
  const links = document.querySelector('.nav-links');
  if (ham && links) {
    ham.addEventListener('click', () => {
      links.style.display = links.style.display === 'flex' ? 'none' : 'flex';
    });
  }

  // Auth nav items
  const user = Auth.getUser();
  const loginBtn = document.getElementById('navLoginBtn');
  const userMenu = document.getElementById('navUserMenu');
  const userName = document.getElementById('navUserName');

  if (user && userMenu) {
    if (loginBtn) loginBtn.style.display = 'none';
    userMenu.style.display = 'flex';
    if (userName) userName.textContent = user.name.split(' ')[0];
  } else if (!user && loginBtn) {
    loginBtn.style.display = 'inline-flex';
    if (userMenu) userMenu.style.display = 'none';
  }

  // Logout
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      Auth.clear();
      window.location.href = '/auth.html';
    });
  }

  // Cart badge
  Cart.updateBadge();
}

/* ── Scroll reveal ───────────────────────────────────── */
function initReveal() {
  document.querySelectorAll('.reveal').forEach(el =>
    new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); });
    }, { threshold: 0.08 }).observe(el)
  );
}

/* ── Status helpers ──────────────────────────────────── */
function statusLabel(s) {
  const map = {
    placed: 'Order Placed',
    preparing: 'Preparing',
    out_for_delivery: 'Out for Delivery',
    delivered: 'Delivered',
    cancelled: 'Cancelled'
  };
  return map[s] || s;
}

function renderStars(rating) {
  const r = parseFloat(rating) || 0;
  let html = '';
  for (let i = 1; i <= 5; i++) {
    if (i <= Math.floor(r)) html += '<i class="fas fa-star"></i>';
    else if (i - 0.5 <= r) html += '<i class="fas fa-star-half-alt"></i>';
    else html += '<i class="far fa-star"></i>';
  }
  return html;
}

function formatPrice(p) { return 'RM ' + parseFloat(p).toFixed(2); }
function formatDate(d)   { return new Date(d).toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }); }

/* ── Chatbot ─────────────────────────────────────────── */
function initChatbot() {
  const btn    = document.getElementById('chatbotToggle');
  const win    = document.getElementById('chatbotWindow');
  const input  = document.getElementById('chatInput');
  const sendBtn= document.getElementById('chatSend');
  const msgs   = document.getElementById('chatMessages');
  if (!btn || !win) return;

  btn.addEventListener('click', () => win.classList.toggle('open'));

  const botReplies = {
    hi: "Hello! 🍕 Welcome to Pizza Palace! How can I help you today?",
    hello: "Hi there! What can I get for you?",
    menu: "Check out our full menu on the <a href='/menu.html'>Menu page</a>! We have 12+ pizzas starting from RM18.90.",
    order: "You can place an order from our <a href='/menu.html'>menu page</a>. Add items to cart and checkout!",
    track: "To track your order, go to <a href='/tracking.html'>Order Tracking</a> and enter your order ID.",
    delivery: "We deliver within Muar, Johor. Delivery fee is RM3.00. Average time: 25–40 minutes.",
    promo: "Use code <strong>PIZZA10</strong> for 10% off or <strong>WELCOME20</strong> for 20% off your first order!",
    hours: "We're open daily 10AM – 11PM.",
    location: "We're based in Muar, Johor, Malaysia.",
    payment: "We accept Cash on Delivery (COD) and online payment.",
    default: "I'm not sure about that. Try asking about: menu, order, delivery, promo codes, or tracking! 🍕"
  };

  function addMessage(text, from = 'bot') {
    const div = document.createElement('div');
    div.className = from === 'bot' ? 'bot-msg' : 'user-msg';
    div.innerHTML = text;
    msgs.appendChild(div);
    msgs.scrollTop = msgs.scrollHeight;
  }

  function handleSend() {
    const text = input.value.trim();
    if (!text) return;
    addMessage(text, 'user');
    input.value = '';
    const key = Object.keys(botReplies).find(k => text.toLowerCase().includes(k));
    setTimeout(() => addMessage(botReplies[key] || botReplies.default, 'bot'), 600);
  }

  if (sendBtn) sendBtn.addEventListener('click', handleSend);
  if (input)   input.addEventListener('keypress', e => e.key === 'Enter' && handleSend());
}

/* ── Initialize ──────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  initDarkMode();
  initNavbar();
  initReveal();
  initChatbot();
});
