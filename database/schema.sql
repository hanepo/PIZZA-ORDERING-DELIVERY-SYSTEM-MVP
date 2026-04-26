-- =====================================================
-- Pizza Ordering & Delivery System — Database Schema
-- Run: mysql -u root -p < database/schema.sql
-- =====================================================

CREATE DATABASE IF NOT EXISTS pizza_delivery;
USE pizza_delivery;

-- ─── USERS ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  name         VARCHAR(100) NOT NULL,
  email        VARCHAR(100) UNIQUE NOT NULL,
  password     VARCHAR(255) NOT NULL,
  role         ENUM('customer','admin','rider') DEFAULT 'customer',
  phone        VARCHAR(20),
  address      TEXT,
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ─── PIZZAS ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pizzas (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  name         VARCHAR(100) NOT NULL,
  description  TEXT,
  price        DECIMAL(10,2) NOT NULL,
  image        VARCHAR(255) DEFAULT 'default-pizza.jpg',
  category     ENUM('veg','non-veg') DEFAULT 'non-veg',
  is_featured  TINYINT(1) DEFAULT 0,
  is_available TINYINT(1) DEFAULT 1,
  avg_rating   DECIMAL(3,1) DEFAULT 0.0,
  total_reviews INT DEFAULT 0,
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ─── ORDERS ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS orders (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  user_id          INT,
  total_price      DECIMAL(10,2) NOT NULL,
  subtotal         DECIMAL(10,2) NOT NULL,
  discount         DECIMAL(10,2) DEFAULT 0.00,
  delivery_fee     DECIMAL(10,2) DEFAULT 3.00,
  status           ENUM('placed','preparing','out_for_delivery','delivered','cancelled') DEFAULT 'placed',
  payment_method   ENUM('cod','online') DEFAULT 'cod',
  payment_status   ENUM('pending','paid') DEFAULT 'pending',
  customer_name    VARCHAR(100) NOT NULL,
  customer_phone   VARCHAR(20) NOT NULL,
  address          TEXT NOT NULL,
  rider_id         INT,
  promo_code       VARCHAR(50),
  notes            TEXT,
  created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- ─── ORDER ITEMS ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS order_items (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  order_id     INT NOT NULL,
  pizza_id     INT,
  pizza_name   VARCHAR(100) NOT NULL,
  quantity     INT NOT NULL DEFAULT 1,
  unit_price   DECIMAL(10,2) NOT NULL,
  size         ENUM('small','medium','large') DEFAULT 'medium',
  crust        VARCHAR(50) DEFAULT 'Classic',
  toppings     TEXT,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (pizza_id) REFERENCES pizzas(id) ON DELETE SET NULL
);

-- ─── RIDERS ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS riders (
  id                INT AUTO_INCREMENT PRIMARY KEY,
  user_id           INT UNIQUE,
  name              VARCHAR(100) NOT NULL,
  phone             VARCHAR(20),
  status            ENUM('available','busy','offline') DEFAULT 'available',
  current_lat       DECIMAL(10,8) DEFAULT 2.044200,
  current_lng       DECIMAL(11,8) DEFAULT 102.568810,
  total_deliveries  INT DEFAULT 0,
  created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- ─── PROMO CODES ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS promo_codes (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  code           VARCHAR(50) UNIQUE NOT NULL,
  discount_type  ENUM('percentage','fixed') DEFAULT 'percentage',
  discount_value DECIMAL(10,2) NOT NULL,
  min_order      DECIMAL(10,2) DEFAULT 0.00,
  is_active      TINYINT(1) DEFAULT 1,
  uses_left      INT DEFAULT 100
);

-- ─── REVIEWS ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reviews (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  user_id      INT,
  pizza_id     INT NOT NULL,
  order_id     INT,
  rating       INT CHECK (rating BETWEEN 1 AND 5),
  comment      TEXT,
  user_name    VARCHAR(100),
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (pizza_id) REFERENCES pizzas(id) ON DELETE CASCADE
);

-- =====================================================
-- SEED DATA
-- =====================================================

-- Admin account (password: admin123)
INSERT INTO users (name, email, password, role, phone) VALUES
('Admin Pizza', 'admin@pizza.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin', '011-1234567'),
('Ahmad Fauzi', 'customer@pizza.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'customer', '012-3456789'),
('Razif Rider', 'rider@pizza.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'rider', '013-4567890');

-- NOTE: All passwords above are hashed 'password' via bcrypt with rounds=10
-- Use these actual test passwords: admin123 / customer123 / rider123
-- Re-hash with: node -e "const b=require('bcryptjs');console.log(b.hashSync('admin123',10))"

-- Riders
INSERT INTO riders (user_id, name, phone, status, current_lat, current_lng) VALUES
(3, 'Razif Rider', '013-4567890', 'available', 2.044200, 102.568810),
(NULL, 'Hafiz Delivery', '014-5678901', 'available', 2.046500, 102.571200);

-- Pizzas
INSERT INTO pizzas (name, description, price, category, is_featured, image) VALUES
('Pepperoni Classic',     'Loaded with premium beef pepperoni, mozzarella cheese, and our signature tomato sauce.',              22.90, 'non-veg', 1, 'https://images.unsplash.com/photo-1628840042765-356cda07504e?w=600&q=80'),
('BBQ Chicken',           'Smoky BBQ sauce, grilled chicken strips, caramelised onions, and three-cheese blend.',                24.90, 'non-veg', 1, 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=600&q=80'),
('Margherita Supreme',    'Fresh tomatoes, buffalo mozzarella, basil leaves, and extra-virgin olive oil. Pure Italian classic.', 18.90, 'veg',     1, 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=600&q=80'),
('Spicy Hot Chicken',     'Fiery sriracha base, spiced chicken, jalapeños, red onions, and chilli flakes.',                      26.90, 'non-veg', 1, 'https://images.unsplash.com/photo-1593560708920-61dd98c46a4e?w=600&q=80'),
('Garden Veggie',         'Mushrooms, capsicum, black olives, cherry tomatoes, sweet corn, and mozzarella on herb sauce.',       19.90, 'veg',     0, 'https://images.unsplash.com/photo-1571407970349-bc81e7e96d47?w=600&q=80'),
('Meat Lovers',           'Double beef, chicken sausage, beef pepperoni, bacon bits — the ultimate carnivore pizza.',            29.90, 'non-veg', 1, 'https://images.unsplash.com/photo-1595854341625-f33ee10dbf94?w=600&q=80'),
('Hawaiian Deluxe',       'Smoked ham, pineapple chunks, mozzarella, and sweet chilli sauce — a tropical crowd-pleaser.',        23.90, 'non-veg', 0, 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=600&q=80'),
('Mushroom Truffle',      'Black truffle cream sauce, wild mushrooms, parmesan shavings, and fresh thyme.',                     27.90, 'veg',     0, 'https://images.unsplash.com/photo-1540713434306-58505cf1b6fc?w=600&q=80'),
('Seafood Bonanza',       'Prawns, squid rings, crab sticks, lemon herb sauce, and rocket leaves.',                              28.90, 'non-veg', 0, 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=600&q=80'),
('Buffalo Wings Pizza',   'Tangy buffalo sauce, shredded chicken, blue cheese drizzle, celery bits.',                           25.90, 'non-veg', 0, 'https://images.unsplash.com/photo-1534308983496-4fabb1a015ee?w=600&q=80'),
('Four Cheese',           'Mozzarella, cheddar, parmesan, gorgonzola on a white garlic cream base. Cheese paradise.',           24.90, 'veg',     0, 'https://images.unsplash.com/photo-1571407970349-bc81e7e96d47?w=600&q=80'),
('Teriyaki Chicken',      'Japanese teriyaki sauce, chicken thigh, sesame seeds, spring onions, and mayo drizzle.',             25.90, 'non-veg', 0, 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=600&q=80');

-- Promo codes
INSERT INTO promo_codes (code, discount_type, discount_value, min_order, uses_left) VALUES
('PIZZA10',     'percentage', 10.00, 20.00, 500),
('WELCOME20',   'percentage', 20.00, 30.00, 100),
('FREEDELIVERY','fixed',       3.00,  0.00, 999);

-- Sample orders (for demo)
INSERT INTO orders (user_id, total_price, subtotal, discount, delivery_fee, status, payment_method, customer_name, customer_phone, address, rider_id) VALUES
(2, 51.80, 49.80, 0.00, 3.00, 'delivered',        'cod', 'Ahmad Fauzi',   '012-3456789', 'No. 12 Jalan Pahlawan, Taman Sri Muar, 84000 Muar, Johor', 1),
(2, 57.80, 54.80, 0.00, 3.00, 'out_for_delivery', 'cod', 'Ahmad Fauzi',   '012-3456789', 'No. 12 Jalan Pahlawan, Taman Sri Muar, 84000 Muar, Johor', 1),
(2, 26.90, 23.90, 0.00, 3.00, 'preparing',        'online', 'Ahmad Fauzi','012-3456789', 'No. 12 Jalan Pahlawan, Taman Sri Muar, 84000 Muar, Johor', NULL),
(2, 22.90, 19.90, 0.00, 3.00, 'placed',           'cod', 'Ahmad Fauzi',   '012-3456789', 'No. 12 Jalan Pahlawan, Taman Sri Muar, 84000 Muar, Johor', NULL);

INSERT INTO order_items (order_id, pizza_id, pizza_name, quantity, unit_price, size, crust) VALUES
(1, 1, 'Pepperoni Classic', 1, 22.90, 'large',  'Classic'),
(1, 3, 'Margherita Supreme',1, 18.90, 'medium', 'Thin'),
(2, 6, 'Meat Lovers',       1, 29.90, 'large',  'Stuffed Crust'),
(2, 4, 'Spicy Hot Chicken', 1, 26.90, 'medium', 'Classic'),
(3, 7, 'Hawaiian Deluxe',   1, 23.90, 'large',  'Classic'),
(4, 1, 'Pepperoni Classic', 1, 22.90, 'medium', 'Classic');

-- Sample reviews
INSERT INTO reviews (user_id, pizza_id, order_id, rating, comment, user_name) VALUES
(2, 1, 1, 5, 'Absolutely amazing pepperoni! Crispy crust, generous toppings. Will definitely reorder!', 'Ahmad Fauzi'),
(2, 3, 1, 5, 'Best margherita in Muar. Fresh ingredients, perfect sauce-to-cheese ratio.', 'Ahmad Fauzi'),
(NULL, 6, NULL, 5, 'Meat lovers is insane. Worth every ringgit. My family loved it!', 'Zulaikha R.'),
(NULL, 4, NULL, 4, 'Spicy as advertised! Great for heat lovers. Delivery was fast too.', 'Khairul A.'),
(NULL, 2, NULL, 5, 'BBQ Chicken is my go-to every Friday. Never disappoints.', 'Nurul F.');

-- Update ratings
UPDATE pizzas p SET avg_rating = (SELECT ROUND(AVG(r.rating),1) FROM reviews r WHERE r.pizza_id = p.id), total_reviews = (SELECT COUNT(*) FROM reviews r WHERE r.pizza_id = p.id);
