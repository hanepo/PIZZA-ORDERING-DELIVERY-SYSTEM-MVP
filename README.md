# 🍕 Pizza Ordering & Delivery System — Full-Stack MVP

A complete pizza ordering and real-time delivery tracking web app inspired by Domino's Pizza / Foodpanda.

---

## 🚀 Tech Stack

| Layer     | Technology                      |
| --------- | ------------------------------- |
| Frontend  | HTML5, CSS3, Vanilla JavaScript |
| Backend   | Node.js + Express.js            |
| Database  | MySQL                           |
| Real-time | Socket.IO                       |
| Auth      | JWT + bcryptjs                  |
| Uploads   | Multer                          |

---

## 📁 Project Structure

```
Pizza Ordering & Delivery System/
├── client/                    # Frontend (static files)
│   ├── css/
│   │   └── style.css          # Global styles (pizza theme)
│   ├── js/
│   │   ├── app.js             # Shared utilities & API helpers
│   │   ├── cart.js            # Cart state management
│   │   └── tracking.js        # Socket.IO tracking client
│   ├── admin/
│   │   ├── dashboard.html     # Admin overview
│   │   ├── orders.html        # Order management
│   │   ├── menu.html          # Menu CRUD
│   │   └── riders.html        # Rider management
│   ├── rider/
│   │   └── panel.html         # Rider delivery panel
│   ├── index.html             # Customer homepage
│   ├── menu.html              # Pizza menu + customization
│   ├── tracking.html          # Live order tracking
│   └── auth.html              # Login / Register
├── server/
│   ├── config/
│   │   └── db.js              # MySQL connection pool
│   ├── middleware/
│   │   └── auth.js            # JWT verification middleware
│   ├── routes/
│   │   ├── auth.js            # POST /api/auth/login|register
│   │   ├── pizzas.js          # GET|POST|PUT|DELETE /api/pizzas
│   │   ├── orders.js          # GET|POST|PUT /api/orders
│   │   ├── riders.js          # Rider endpoints
│   │   └── admin.js           # Admin stats & management
│   ├── uploads/               # Pizza image uploads
│   ├── index.js               # Main server + Socket.IO
│   ├── package.json
│   └── .env
├── database/
│   └── schema.sql             # Full schema + seed data
└── README.md
```

---

## ⚙️ Setup Instructions

### 1. MySQL Database

```bash
# Login to MySQL
mysql -u root -p

# Run the schema
source /path/to/database/schema.sql
```

Or import via phpMyAdmin / MySQL Workbench:

- Open `database/schema.sql`
- Execute against your MySQL server

### 2. Backend Server

```bash
cd server

# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Edit .env with your MySQL credentials
nano .env
```

**`.env` configuration:**

```env
PORT=3000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=yourpassword
DB_NAME=pizza_delivery
JWT_SECRET=your_super_secret_key_here
CLIENT_URL=http://localhost:3000
```

### 3. Start the Server

```bash
# Production
npm start

# Development (auto-reload)
npm run dev
```

Server runs on: **http://localhost:3000**

### 4. Open the App

The server serves the client files automatically. Open:

- **Customer:** http://localhost:3000
- **Admin:** http://localhost:3000/admin/dashboard.html
- **Rider:** http://localhost:3000/rider/panel.html

---

## 👤 Demo Accounts

| Role     | Email              | Password    |
| -------- | ------------------ | ----------- |
| Admin    | admin@pizza.com    | admin123    |
| Customer | customer@pizza.com | customer123 |
| Rider    | rider@pizza.com    | rider123    |

---

## 🎮 Features

### Customer

- ✅ Browse menu with filters (veg/non-veg, price)
- ✅ Customize pizza (size, crust, toppings)
- ✅ Shopping cart with localStorage persistence
- ✅ Checkout with COD or fake online payment
- ✅ Real-time order tracking with simulated map
- ✅ Order history
- ✅ Promo codes (try: `PIZZA10`, `WELCOME20`)
- ✅ Rate & review pizzas

### Admin

- ✅ Dashboard with live stats (orders, revenue, riders)
- ✅ Menu management (add/edit/delete pizzas + image upload)
- ✅ Order management (view, update status, assign rider)
- ✅ Rider management
- ✅ Analytics (best-selling, peak hours)

### Rider

- ✅ View assigned deliveries
- ✅ Update delivery status
- ✅ Simulated GPS location updates via Socket.IO

### Real-time (Socket.IO)

- ✅ Order status push to customer
- ✅ Rider location broadcast every 3 seconds
- ✅ Admin gets new order notifications
- ✅ ETA countdown timer

---

## 🗄️ API Endpoints

### Auth

```
POST   /api/auth/register       Create account
POST   /api/auth/login          Login → JWT
GET    /api/auth/me             Current user profile
```

### Pizzas

```
GET    /api/pizzas              List all pizzas (+ filters)
GET    /api/pizzas/:id          Single pizza
POST   /api/pizzas              Create pizza (admin)
PUT    /api/pizzas/:id          Update pizza (admin)
DELETE /api/pizzas/:id          Delete pizza (admin)
```

### Orders

```
POST   /api/orders              Place order
GET    /api/orders              My orders (customer) / All orders (admin)
GET    /api/orders/:id          Order detail
PUT    /api/orders/:id/status   Update status (admin/rider)
PUT    /api/orders/:id/rider    Assign rider (admin)
```

### Admin

```
GET    /api/admin/stats         Dashboard stats
GET    /api/admin/analytics     Revenue & best-selling data
```

### Riders

```
GET    /api/riders              List riders (admin)
POST   /api/riders              Add rider (admin)
PUT    /api/riders/:id/status   Update rider status
PUT    /api/riders/:id/location Update GPS location (rider)
```

---

## 🎁 Promo Codes

| Code         | Discount              |
| ------------ | --------------------- |
| PIZZA10      | 10% off               |
| WELCOME20    | 20% off (first order) |
| FREEDELIVERY | Free delivery         |

---

## 🔌 Socket.IO Events

| Event                 | Direction     | Description            |
| --------------------- | ------------- | ---------------------- |
| `join-order`          | Client→Server | Join order room        |
| `order-status-update` | Server→Client | Status changed         |
| `rider-location`      | Server→Client | GPS coordinates update |
| `new-order`           | Server→Admin  | New order placed       |
| `update-location`     | Rider→Server  | Rider sends location   |

---

## 📦 npm Dependencies

```json
{
  "express": "^4.18.2",
  "mysql2": "^3.9.7",
  "socket.io": "^4.7.5",
  "jsonwebtoken": "^9.0.2",
  "bcryptjs": "^2.4.3",
  "cors": "^2.8.5",
  "dotenv": "^16.4.5",
  "multer": "^1.4.5-lts.1"
}
```

---

## 🌙 Extra Features Implemented

- Dark mode toggle
- Toast notifications
- Promo code validation
- Review & rating system
- AI "People also ordered" recommendations
- Fake chatbot support widget
- Order history with reorder button
- Mobile-responsive design

---

_Built as MVP demo for client presentation — Muar, Johor, Malaysia_
