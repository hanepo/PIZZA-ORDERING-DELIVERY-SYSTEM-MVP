const express = require('express');
const multer  = require('multer');
const path    = require('path');
const db      = require('../config/db');
const { verifyToken, requireAdmin } = require('../middleware/auth');
const router  = express.Router();

// Multer config for pizza images
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '../uploads')),
  filename:    (req, file, cb) => cb(null, `pizza-${Date.now()}${path.extname(file.originalname)}`)
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|webp/;
    if (allowed.test(path.extname(file.originalname).toLowerCase())) cb(null, true);
    else cb(new Error('Only image files allowed.'));
  }
});

// GET /api/pizzas — list with filters
router.get('/', async (req, res) => {
  try {
    const { category, featured, search, sort, limit } = req.query;
    let sql = 'SELECT * FROM pizzas WHERE is_available = 1';
    const params = [];

    if (category && category !== 'all') { sql += ' AND category = ?'; params.push(category); }
    if (featured === '1') { sql += ' AND is_featured = 1'; }
    if (search) { sql += ' AND (name LIKE ? OR description LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }

    if (sort === 'price_asc')  sql += ' ORDER BY price ASC';
    else if (sort === 'price_desc') sql += ' ORDER BY price DESC';
    else if (sort === 'rating') sql += ' ORDER BY avg_rating DESC';
    else sql += ' ORDER BY is_featured DESC, id ASC';

    if (limit) { sql += ` LIMIT ${parseInt(limit, 10)}`; }

    const [pizzas] = await db.execute(sql, params);
    res.json({ success: true, data: pizzas });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// GET /api/pizzas/:id
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await db.execute('SELECT * FROM pizzas WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ success: false, message: 'Pizza not found.' });

    // Get reviews
    const [reviews] = await db.execute(
      'SELECT * FROM reviews WHERE pizza_id = ? ORDER BY created_at DESC LIMIT 10',
      [req.params.id]
    );

    // Get "people also ordered" — different pizza from same category
    const [related] = await db.execute(
      'SELECT id, name, price, image, avg_rating FROM pizzas WHERE category = ? AND id != ? AND is_available = 1 LIMIT 3',
      [rows[0].category, req.params.id]
    );

    res.json({ success: true, data: rows[0], reviews, related });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// POST /api/pizzas — admin only
router.post('/', verifyToken, requireAdmin, upload.single('image'), async (req, res) => {
  try {
    const { name, description, price, category, is_featured } = req.body;
    if (!name || !price) return res.status(400).json({ success: false, message: 'Name and price required.' });

    let image = req.file ? `/uploads/${req.file.filename}` : req.body.image_url || 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=600&q=80';

    const [result] = await db.execute(
      'INSERT INTO pizzas (name, description, price, image, category, is_featured) VALUES (?, ?, ?, ?, ?, ?)',
      [name, description || '', parseFloat(price), image, category || 'non-veg', is_featured ? 1 : 0]
    );

    res.status(201).json({ success: true, message: 'Pizza created.', id: result.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// PUT /api/pizzas/:id — admin only
router.put('/:id', verifyToken, requireAdmin, upload.single('image'), async (req, res) => {
  try {
    const { name, description, price, category, is_featured, is_available } = req.body;
    const [existing] = await db.execute('SELECT * FROM pizzas WHERE id = ?', [req.params.id]);
    if (existing.length === 0) return res.status(404).json({ success: false, message: 'Pizza not found.' });

    let image = existing[0].image;
    if (req.file) image = `/uploads/${req.file.filename}`;
    else if (req.body.image_url) image = req.body.image_url;

    await db.execute(
      'UPDATE pizzas SET name=?, description=?, price=?, image=?, category=?, is_featured=?, is_available=? WHERE id=?',
      [
        name || existing[0].name,
        description ?? existing[0].description,
        price ? parseFloat(price) : existing[0].price,
        image,
        category || existing[0].category,
        is_featured !== undefined ? (is_featured ? 1 : 0) : existing[0].is_featured,
        is_available !== undefined ? (is_available ? 1 : 0) : existing[0].is_available,
        req.params.id
      ]
    );

    res.json({ success: true, message: 'Pizza updated.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// DELETE /api/pizzas/:id — admin only
router.delete('/:id', verifyToken, requireAdmin, async (req, res) => {
  try {
    await db.execute('UPDATE pizzas SET is_available = 0 WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Pizza removed from menu.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// POST /api/pizzas/:id/review
router.post('/:id/review', verifyToken, async (req, res) => {
  try {
    const { rating, comment, order_id } = req.body;
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ success: false, message: 'Rating must be 1–5.' });
    }

    await db.execute(
      'INSERT INTO reviews (user_id, pizza_id, order_id, rating, comment, user_name) VALUES (?, ?, ?, ?, ?, ?)',
      [req.user.id, req.params.id, order_id || null, rating, comment || '', req.user.name]
    );

    // Update pizza avg_rating
    await db.execute(
      'UPDATE pizzas SET avg_rating = (SELECT ROUND(AVG(rating),1) FROM reviews WHERE pizza_id = ?), total_reviews = (SELECT COUNT(*) FROM reviews WHERE pizza_id = ?) WHERE id = ?',
      [req.params.id, req.params.id, req.params.id]
    );

    res.status(201).json({ success: true, message: 'Review submitted.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

module.exports = router;
