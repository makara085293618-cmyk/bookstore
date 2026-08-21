const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");
require("dotenv").config();
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-here";

const app = express();

// កំណត់ CORS
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://bookstore-frontend-tau-khaki.vercel.app",
      "https://main.d1cfahortjyjeh.amplifyapp.com",
    ],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

app.use(express.json());

// Middleware សម្រាប់ផ្ទៀងផ្ទាត់ Token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Access denied. No token provided." });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(403).json({ error: "Invalid or expired token." });
  }
};

// ភ្ជាប់ទៅកាន់ Neon PostgreSQL Database
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// Test Route
app.get("/api", (req, res) => {
  res.json({ message: "Bookstore API is running successfully!" });
});

// API យកបញ្ជីសៀវភៅទាំងអស់
app.get("/api/books", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM books");
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: "Server Error" });
  }
});

// ---------- Auth Routes ----------
// Register ជាមួយ JWT
app.post("/api/auth/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // ពិនិត្យថាអ៊ីមែលមានរួចហើយ
    const existingUser = await pool.query(
      "SELECT * FROM users WHERE email = $1",
      [email]
    );
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: "Email already registered" });
    }

    // បំប្លែងពាក្យសម្ងាត់
    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await pool.query(
      "INSERT INTO users (name, email, password) VALUES ($1, $2, $3) RETURNING id, name, email",
      [name, email, hashedPassword]
    );

    // បង្កើត Token
    const token = jwt.sign(
      { id: newUser.rows[0].id, email: newUser.rows[0].email },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      message: "User registered successfully",
      token: token,
      user: newUser.rows[0],
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: "Server Error" });
  }
});

// Login ជាមួយ JWT
app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await pool.query("SELECT * FROM users WHERE email = $1", [
      email,
    ]);

    if (user.rows.length === 0) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    // ពិនិត្យពាក្យសម្ងាត់
    const validPassword = await bcrypt.compare(password, user.rows[0].password);

    if (!validPassword) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    // បង្កើត Token
    const token = jwt.sign(
      { id: user.rows[0].id, email: user.rows[0].email },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      message: "Login successful",
      token: token,
      user: {
        id: user.rows[0].id,
        name: user.rows[0].name,
        email: user.rows[0].email,
      },
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: "Server Error" });
  }
});

// Route ដែលត្រូវការ Authentication
app.get("/api/auth/me", authenticateToken, async (req, res) => {
  try {
    const user = await pool.query(
      "SELECT id, name, email, created_at FROM users WHERE id = $1",
      [req.user.id]
    );

    if (user.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json(user.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: "Server Error" });
  }
});

// API សម្រាប់បង្កើត Order
app.post("/api/orders", async (req, res) => {
  try {
    const { user_id, total_amount } = req.body;
    const newOrder = await pool.query(
      "INSERT INTO orders (user_id, total_amount) VALUES ($1, $2) RETURNING *",
      [user_id, total_amount]
    );
    res.json({
      message: "Order created successfully",
      order: newOrder.rows[0],
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: "Server Error" });
  }
});

// ============================================
// បន្ថែម API ថ្មីសម្រាប់ Update រូបភាព
// ============================================

// 1. API សម្រាប់ Update រូបភាពសៀវភៅតាម ID
app.put("/api/books/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { title, author, description, price, stock, category, image_url } =
      req.body;

    const result = await pool.query(
      `UPDATE books 
       SET title = COALESCE($1, title),
           author = COALESCE($2, author),
           description = COALESCE($3, description),
           price = COALESCE($4, price),
           stock = COALESCE($5, stock),
           category = COALESCE($6, category),
           image_url = COALESCE($7, image_url)
       WHERE id = $8 
       RETURNING *`,
      [title, author, description, price, stock, category, image_url, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Book not found" });
    }

    res.json({
      message: "Book updated successfully",
      book: result.rows[0],
    });
  } catch (err) {
    console.error("Error updating book:", err.message);
    res.status(500).json({ error: "Server Error" });
  }
});

// 2. API សម្រាប់បន្ថែមរូបភាពឲ្យសៀវភៅជាភាសាខ្មែរ
app.post("/api/books/update-images", async (req, res) => {
  try {
    const khmerBooksImages = [
      {
        title: "រឿងព្រេងខ្មែរ",
        image_url: "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c",
      },
      {
        title: "វិធីសាស្ត្រសិក្សាទំនើប",
        image_url:
          "https://images.unsplash.com/photo-1512820790803-83ca734da794",
      },
      {
        title: "កម្មវិធី JavaScript",
        image_url:
          "https://images.unsplash.com/photo-1532012197267-da84d127e765",
      },
      {
        title: "សេដ្ឋកិច្ចកម្ពុជា",
        image_url:
          "https://images.unsplash.com/photo-1507842217343-583bb7270b66",
      },
      {
        title: "វប្បធម៌ខ្មែរ",
        image_url:
          "https://images.unsplash.com/photo-1495446815901-a7297e633e8d",
      },
    ];

    let updatedCount = 0;
    const results = [];

    for (const book of khmerBooksImages) {
      const result = await pool.query(
        "UPDATE books SET image_url = $1 WHERE title = $2 AND image_url IS NULL RETURNING id, title, image_url",
        [book.image_url, book.title]
      );

      if (result.rows.length > 0) {
        updatedCount++;
        results.push(result.rows[0]);
      }
    }

    res.json({
      message: `Updated ${updatedCount} books with images`,
      updated_books: results,
      total_updated: updatedCount,
    });
  } catch (err) {
    console.error("Error updating book images:", err.message);
    res.status(500).json({ error: "Server Error" });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
