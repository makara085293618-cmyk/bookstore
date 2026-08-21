const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
require('dotenv').config();

const app = express();

// កំណត់ CORS ឱ្យច្បាស់លាស់ដើម្បីបំបាត់ Error CORS policy
app.use(cors({
  origin: [
    'http://localhost:5173', 
    'https://bookstore-frontend-tau-khaki.vercel.app', 
    'https://amplifyapp.com' // Added your AWS Amplify link
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

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

// ---------- Auth Routes (បន្ថែមថ្មីដើម្បីដោះស្រាយ Error 404 ពេល Register/Login) ----------
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const newUser = await pool.query(
      'INSERT INTO users (name, email, password) VALUES ($1, $2, $3) RETURNING id, name, email',
      [name, email, password]
    );
    res.json({ message: 'User registered successfully', user: newUser.rows[0] });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server Error or Email already exists' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await pool.query('SELECT * FROM users WHERE email = $1 AND password = $2', [email, password]);
    if (user.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    res.json({ token: 'fake-jwt-token-' + user.rows[0].id, user: user.rows[0] });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server Error' });
  }
});

app.get('/api/auth/me', async (req, res) => {
  try {
    res.json({ id: 1, name: 'User Test', email: 'test@example.com' });
  } catch (err) {
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