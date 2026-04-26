const express = require('express');
const store   = require('../data/store');
const { verifyToken, requireAdmin } = require('../middleware/auth');
const router  = express.Router();

// GET /api/pizzas — list with filters
router.get('/', (req, res) => {
  const { category, featured, search, sort, limit } = req.query;
  let results = store.pizzas.filter(p => p.is_available === 1);

  if (category && category !== 'all') results = results.filter(p => p.category === category);
  if (featured === '1') results = results.filter(p => p.is_featured === 1);
  if (search) {
    const q = search.toLowerCase();
    results = results.filter(p => p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q));
  }

  if (sort === 'price_asc')  results.sort((a, b) => a.price - b.price);
  else if (sort === 'price_desc') results.sort((a, b) => b.price - a.price);
  else if (sort === 'rating') results.sort((a, b) => b.avg_rating - a.avg_rating);
  else results.sort((a, b) => b.is_featured - a.is_featured || a.id - b.id);

  if (limit) results = results.slice(0, parseInt(limit, 10));

  res.json({ success: true, data: results });
});

// GET /api/pizzas/:id
router.get('/:id', (req, res) => {
  const pizza = store.pizzas.find(p => p.id === parseInt(req.params.id));
  if (!pizza) return res.status(404).json({ success: false, message: 'Pizza not found.' });

  const reviews = store.reviews.filter(r => r.pizza_id === pizza.id).slice(0, 10);
  const related = store.pizzas
    .filter(p => p.category === pizza.category && p.id !== pizza.id && p.is_available === 1)
    .slice(0, 3)
    .map(({ id, name, price, image, avg_rating }) => ({ id, name, price, image, avg_rating }));

  res.json({ success: true, data: pizza, reviews, related });
});

// POST /api/pizzas — admin only
router.post('/', verifyToken, requireAdmin, (req, res) => {
  const { name, description, price, category, is_featured, image_url } = req.body;
  if (!name || !price) return res.status(400).json({ success: false, message: 'Name and price required.' });

  const newPizza = {
    id: store.pizzas.length + 1,
    name,
    description: description || '',
    price: parseFloat(price),
    category: category || 'non-veg',
    is_featured: is_featured ? 1 : 0,
    is_available: 1,
    avg_rating: 0,
    total_reviews: 0,
    image: image_url || 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=600&q=80'
  };
  store.pizzas.push(newPizza);
  res.status(201).json({ success: true, message: 'Pizza created.', id: newPizza.id });
});

// PUT /api/pizzas/:id — admin only
router.put('/:id', verifyToken, requireAdmin, (req, res) => {
  const pizza = store.pizzas.find(p => p.id === parseInt(req.params.id));
  if (!pizza) return res.status(404).json({ success: false, message: 'Pizza not found.' });

  const { name, description, price, category, is_featured, is_available, image_url } = req.body;
  if (name !== undefined)         pizza.name         = name;
  if (description !== undefined)  pizza.description  = description;
  if (price !== undefined)        pizza.price        = parseFloat(price);
  if (category !== undefined)     pizza.category     = category;
  if (is_featured !== undefined)  pizza.is_featured  = is_featured ? 1 : 0;
  if (is_available !== undefined) pizza.is_available = is_available ? 1 : 0;
  if (image_url !== undefined)    pizza.image        = image_url;

  res.json({ success: true, message: 'Pizza updated.' });
});

// DELETE /api/pizzas/:id — admin only
router.delete('/:id', verifyToken, requireAdmin, (req, res) => {
  const pizza = store.pizzas.find(p => p.id === parseInt(req.params.id));
  if (!pizza) return res.status(404).json({ success: false, message: 'Pizza not found.' });
  pizza.is_available = 0;
  res.json({ success: true, message: 'Pizza removed from menu.' });
});

module.exports = router;
