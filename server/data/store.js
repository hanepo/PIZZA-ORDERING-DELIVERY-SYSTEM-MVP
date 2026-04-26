// ─── In-Memory Data Store ─────────────────────────────────────────
// Replaces MySQL for demo deployments (no database needed).
// Data resets on server restart — perfect for demos.

const users = [
  { id: 1, name: 'Admin Pizza',  email: 'admin@pizza.com',    password: '$2a$10$333SkEE680sDveJd7RHc7eRR6.l2H3TSSEF4ZbG/0J/4R6yVGMi5e', role: 'admin',    phone: '011-1234567', address: null },
  { id: 2, name: 'Ahmad Fauzi', email: 'customer@pizza.com', password: '$2a$10$7WE1iy7WKBvVI2PHExdIBeCoqqP3XYRo8bN1d7SaEXWB3K4wncF1.', role: 'customer', phone: '012-3456789', address: 'No. 12 Jalan Pahlawan, Taman Sri Muar, 84000 Muar, Johor' },
  { id: 3, name: 'Razif Rider',  email: 'rider@pizza.com',    password: '$2a$10$R4ELRGg5GTzDhXTMlq1o1e5n84J963Xgr/Z.oon/Ptt/W2pAV8wN.', role: 'rider',    phone: '013-4567890', address: null },
];

const pizzas = [
  { id:  1, name: 'Pepperoni Classic',   description: 'Loaded with premium beef pepperoni, mozzarella cheese, and our signature tomato sauce.',              price: 22.90, category: 'non-veg', is_featured: 1, is_available: 1, avg_rating: 5.0, total_reviews: 2, image: 'https://images.unsplash.com/photo-1628840042765-356cda07504e?w=600&q=80' },
  { id:  2, name: 'BBQ Chicken',         description: 'Smoky BBQ sauce, grilled chicken strips, caramelised onions, and three-cheese blend.',                price: 24.90, category: 'non-veg', is_featured: 1, is_available: 1, avg_rating: 5.0, total_reviews: 1, image: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=600&q=80' },
  { id:  3, name: 'Margherita Supreme',  description: 'Fresh tomatoes, buffalo mozzarella, basil leaves, and extra-virgin olive oil. Pure Italian classic.', price: 18.90, category: 'veg',     is_featured: 1, is_available: 1, avg_rating: 5.0, total_reviews: 2, image: 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=600&q=80' },
  { id:  4, name: 'Spicy Hot Chicken',   description: 'Fiery sriracha base, spiced chicken, jalapeños, red onions, and chilli flakes.',                      price: 26.90, category: 'non-veg', is_featured: 1, is_available: 1, avg_rating: 4.0, total_reviews: 1, image: 'https://images.unsplash.com/photo-1593560708920-61dd98c46a4e?w=600&q=80' },
  { id:  5, name: 'Garden Veggie',       description: 'Mushrooms, capsicum, black olives, cherry tomatoes, sweet corn, and mozzarella on herb sauce.',       price: 19.90, category: 'veg',     is_featured: 0, is_available: 1, avg_rating: 0,   total_reviews: 0, image: 'https://images.unsplash.com/photo-1571407970349-bc81e7e96d47?w=600&q=80' },
  { id:  6, name: 'Meat Lovers',         description: 'Double beef, chicken sausage, beef pepperoni, bacon bits — the ultimate carnivore pizza.',            price: 29.90, category: 'non-veg', is_featured: 1, is_available: 1, avg_rating: 5.0, total_reviews: 1, image: 'https://images.unsplash.com/photo-1595854341625-f33ee10dbf94?w=600&q=80' },
  { id:  7, name: 'Hawaiian Deluxe',     description: 'Smoked ham, pineapple chunks, mozzarella, and sweet chilli sauce — a tropical crowd-pleaser.',        price: 23.90, category: 'non-veg', is_featured: 0, is_available: 1, avg_rating: 0,   total_reviews: 0, image: 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=600&q=80' },
  { id:  8, name: 'Mushroom Truffle',    description: 'Black truffle cream sauce, wild mushrooms, parmesan shavings, and fresh thyme.',                      price: 27.90, category: 'veg',     is_featured: 0, is_available: 1, avg_rating: 0,   total_reviews: 0, image: 'https://images.unsplash.com/photo-1540713434306-58505cf1b6fc?w=600&q=80' },
  { id:  9, name: 'Seafood Bonanza',     description: 'Prawns, squid rings, crab sticks, lemon herb sauce, and rocket leaves.',                              price: 28.90, category: 'non-veg', is_featured: 0, is_available: 1, avg_rating: 0,   total_reviews: 0, image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=600&q=80' },
  { id: 10, name: 'Buffalo Wings Pizza', description: 'Tangy buffalo sauce, shredded chicken, blue cheese drizzle, celery bits.',                            price: 25.90, category: 'non-veg', is_featured: 0, is_available: 1, avg_rating: 0,   total_reviews: 0, image: 'https://images.unsplash.com/photo-1534308983496-4fabb1a015ee?w=600&q=80' },
  { id: 11, name: 'Four Cheese',         description: 'Mozzarella, cheddar, parmesan, gorgonzola on a white garlic cream base. Cheese paradise.',            price: 24.90, category: 'veg',     is_featured: 0, is_available: 1, avg_rating: 0,   total_reviews: 0, image: 'https://images.unsplash.com/photo-1571407970349-bc81e7e96d47?w=600&q=80' },
  { id: 12, name: 'Teriyaki Chicken',    description: 'Japanese teriyaki sauce, chicken thigh, sesame seeds, spring onions, and mayo drizzle.',              price: 25.90, category: 'non-veg', is_featured: 0, is_available: 1, avg_rating: 0,   total_reviews: 0, image: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=600&q=80' },
];

const riders = [
  { id: 1, name: 'Razif Rider',    phone: '013-4567890', status: 'available', user_id: 3, current_lat: 2.044200, current_lng: 102.568810, total_deliveries: 12, email: 'rider@pizza.com' },
  { id: 2, name: 'Hafiz Delivery', phone: '014-5678901', status: 'available', user_id: null, current_lat: 2.046500, current_lng: 102.571200, total_deliveries: 8, email: null },
];

const reviews = [
  { id: 1, user_id: 2, pizza_id: 1, order_id: 1, rating: 5, comment: 'Absolutely amazing pepperoni! Crispy crust, generous toppings. Will definitely reorder!', user_name: 'Ahmad Fauzi',  created_at: new Date('2024-12-01') },
  { id: 2, user_id: 2, pizza_id: 3, order_id: 1, rating: 5, comment: 'Best margherita in Muar. Fresh ingredients, perfect sauce-to-cheese ratio.',              user_name: 'Ahmad Fauzi',  created_at: new Date('2024-12-01') },
  { id: 3, user_id: null, pizza_id: 6, order_id: null, rating: 5, comment: 'Meat lovers is insane. Worth every ringgit. My family loved it!',                  user_name: 'Zulaikha R.', created_at: new Date('2024-12-02') },
  { id: 4, user_id: null, pizza_id: 4, order_id: null, rating: 4, comment: 'Spicy as advertised! Great for heat lovers. Delivery was fast too.',               user_name: 'Khairul A.',  created_at: new Date('2024-12-03') },
  { id: 5, user_id: null, pizza_id: 2, order_id: null, rating: 5, comment: 'BBQ Chicken is my go-to every Friday. Never disappoints.',                        user_name: 'Nurul F.',    created_at: new Date('2024-12-04') },
];

const promoCodes = [
  { id: 1, code: 'PIZZA10',      discount_type: 'percentage', discount_value: 10, min_order: 20, is_active: 1, uses_left: 500 },
  { id: 2, code: 'WELCOME20',    discount_type: 'percentage', discount_value: 20, min_order: 30, is_active: 1, uses_left: 100 },
  { id: 3, code: 'FREEDELIVERY', discount_type: 'fixed',      discount_value:  3, min_order:  0, is_active: 1, uses_left: 999 },
];

// Sample orders with timestamps spread over today
const now = new Date();
const orders = [
  { id: 1, user_id: 2, total_price: 51.80, subtotal: 49.80, discount: 0, delivery_fee: 3.00, status: 'delivered',        payment_method: 'cod',    customer_name: 'Ahmad Fauzi', customer_phone: '012-3456789', address: 'No. 12 Jalan Pahlawan, Taman Sri Muar, 84000 Muar, Johor', rider_id: 1, promo_code: null, notes: null, created_at: new Date(now - 3600000 * 4) },
  { id: 2, user_id: 2, total_price: 57.80, subtotal: 54.80, discount: 0, delivery_fee: 3.00, status: 'out_for_delivery', payment_method: 'cod',    customer_name: 'Ahmad Fauzi', customer_phone: '012-3456789', address: 'No. 12 Jalan Pahlawan, Taman Sri Muar, 84000 Muar, Johor', rider_id: 1, promo_code: null, notes: null, created_at: new Date(now - 3600000 * 2) },
  { id: 3, user_id: 2, total_price: 26.90, subtotal: 23.90, discount: 0, delivery_fee: 3.00, status: 'preparing',        payment_method: 'online', customer_name: 'Ahmad Fauzi', customer_phone: '012-3456789', address: 'No. 12 Jalan Pahlawan, Taman Sri Muar, 84000 Muar, Johor', rider_id: null, promo_code: null, notes: 'Extra spicy please', created_at: new Date(now - 3600000) },
  { id: 4, user_id: 2, total_price: 22.90, subtotal: 19.90, discount: 0, delivery_fee: 3.00, status: 'placed',           payment_method: 'cod',    customer_name: 'Ahmad Fauzi', customer_phone: '012-3456789', address: 'No. 12 Jalan Pahlawan, Taman Sri Muar, 84000 Muar, Johor', rider_id: null, promo_code: null, notes: null, created_at: new Date(now - 1800000) },
];

const orderItems = [
  { id: 1, order_id: 1, pizza_id: 1, pizza_name: 'Pepperoni Classic',   quantity: 1, unit_price: 22.90, size: 'large',  crust: 'Classic',       toppings: null },
  { id: 2, order_id: 1, pizza_id: 3, pizza_name: 'Margherita Supreme',  quantity: 1, unit_price: 18.90, size: 'medium', crust: 'Thin',          toppings: null },
  { id: 3, order_id: 2, pizza_id: 6, pizza_name: 'Meat Lovers',         quantity: 1, unit_price: 29.90, size: 'large',  crust: 'Stuffed Crust', toppings: null },
  { id: 4, order_id: 2, pizza_id: 4, pizza_name: 'Spicy Hot Chicken',   quantity: 1, unit_price: 26.90, size: 'medium', crust: 'Classic',       toppings: null },
  { id: 5, order_id: 3, pizza_id: 7, pizza_name: 'Hawaiian Deluxe',     quantity: 1, unit_price: 23.90, size: 'large',  crust: 'Classic',       toppings: null },
  { id: 6, order_id: 4, pizza_id: 1, pizza_name: 'Pepperoni Classic',   quantity: 1, unit_price: 22.90, size: 'medium', crust: 'Classic',       toppings: null },
];

// Auto-increment counters
let nextUserId      = users.length + 1;
let nextOrderId     = orders.length + 1;
let nextOrderItemId = orderItems.length + 1;
let nextRiderId     = riders.length + 1;
let nextReviewId    = reviews.length + 1;

module.exports = {
  users, pizzas, riders, reviews, promoCodes, orders, orderItems,
  getNextUserId:      () => nextUserId++,
  getNextOrderId:     () => nextOrderId++,
  getNextOrderItemId: () => nextOrderItemId++,
  getNextRiderId:     () => nextRiderId++,
  getNextReviewId:    () => nextReviewId++,
};
