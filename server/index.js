const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// ភ្ជាប់ទៅកាន់ Neon PostgreSQL Database
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Test Route
app.get('/api', (req, res) => {
  res.json({ message: 'Bookstore API is running successfully!' });
});

// API យកបញ្ជីសៀវភៅទាំងអស់ពី Database
app.get('/api/books', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM books');
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server Error' });
  }
});

// API សម្រាប់បង្កើត Order (Checkout)
app.post('/api/orders', async (req, res) => {
  try {
    const { user_id, total_amount } = req.body;
    const newOrder = await pool.query(
      'INSERT INTO orders (user_id, total_amount) VALUES ($1, $2) RETURNING *',
      [user_id, total_amount]
    );
    res.json({ message: 'Order created successfully', order: newOrder.rows[0] });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server Error' });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});