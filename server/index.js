const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");
require("dotenv").config();
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-here";
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

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

    const existingUser = await pool.query(
      "SELECT * FROM users WHERE email = $1",
      [email]
    );
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: "Email already registered" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await pool.query(
      "INSERT INTO users (name, email, password) VALUES ($1, $2, $3) RETURNING id, name, email",
      [name, email, hashedPassword]
    );

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

    const validPassword = await bcrypt.compare(password, user.rows[0].password);

    if (!validPassword) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

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

// ============================================
// 🛒 ប្រព័ន្ធកន្ត្រក (Cart)
// ============================================

app.post("/api/cart", authenticateToken, async (req, res) => {
  try {
    const { book_id, quantity = 1 } = req.body;
    const user_id = req.user.id;

    const book = await pool.query("SELECT * FROM books WHERE id = $1", [
      book_id,
    ]);
    if (book.rows.length === 0) {
      return res.status(404).json({ error: "Book not found" });
    }

    if (book.rows[0].stock < quantity) {
      return res.status(400).json({ error: "Not enough stock available" });
    }

    const result = await pool.query(
      `INSERT INTO cart (user_id, book_id, quantity) 
       VALUES ($1, $2, $3) 
       ON CONFLICT (user_id, book_id) 
       DO UPDATE SET quantity = cart.quantity + $3 
       RETURNING *`,
      [user_id, book_id, quantity]
    );

    res.json({
      message: "Book added to cart successfully",
      cart: result.rows[0],
    });
  } catch (err) {
    console.error("Error adding to cart:", err.message);
    res.status(500).json({ error: "Server Error" });
  }
});

app.get("/api/cart", authenticateToken, async (req, res) => {
  try {
    const user_id = req.user.id;

    const result = await pool.query(
      `SELECT c.id, c.quantity, c.created_at,
              b.id as book_id, b.title, b.author, b.price, b.image_url, b.stock
       FROM cart c
       JOIN books b ON c.book_id = b.id
       WHERE c.user_id = $1
       ORDER BY c.created_at DESC`,
      [user_id]
    );

    const total = result.rows.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );
    const totalItems = result.rows.reduce(
      (sum, item) => sum + item.quantity,
      0
    );

    res.json({
      items: result.rows,
      total: parseFloat(total.toFixed(2)),
      totalItems: totalItems,
      count: result.rows.length,
    });
  } catch (err) {
    console.error("Error getting cart:", err.message);
    res.status(500).json({ error: "Server Error" });
  }
});

app.put("/api/cart/:book_id", authenticateToken, async (req, res) => {
  try {
    const { book_id } = req.params;
    const { quantity } = req.body;
    const user_id = req.user.id;

    if (quantity < 1) {
      return res.status(400).json({ error: "Quantity must be at least 1" });
    }

    const book = await pool.query("SELECT stock FROM books WHERE id = $1", [
      book_id,
    ]);
    if (book.rows.length === 0) {
      return res.status(404).json({ error: "Book not found" });
    }
    if (book.rows[0].stock < quantity) {
      return res.status(400).json({ error: "Not enough stock available" });
    }

    const result = await pool.query(
      "UPDATE cart SET quantity = $1 WHERE user_id = $2 AND book_id = $3 RETURNING *",
      [quantity, user_id, book_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Item not found in cart" });
    }

    res.json({
      message: "Cart updated successfully",
      cart: result.rows[0],
    });
  } catch (err) {
    console.error("Error updating cart:", err.message);
    res.status(500).json({ error: "Server Error" });
  }
});

app.delete("/api/cart/:book_id", authenticateToken, async (req, res) => {
  try {
    const { book_id } = req.params;
    const user_id = req.user.id;

    const result = await pool.query(
      "DELETE FROM cart WHERE user_id = $1 AND book_id = $2 RETURNING *",
      [user_id, book_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Item not found in cart" });
    }

    res.json({
      message: "Book removed from cart successfully",
      removed: result.rows[0],
    });
  } catch (err) {
    console.error("Error removing from cart:", err.message);
    res.status(500).json({ error: "Server Error" });
  }
});

app.delete("/api/cart", authenticateToken, async (req, res) => {
  try {
    const user_id = req.user.id;

    const result = await pool.query(
      "DELETE FROM cart WHERE user_id = $1 RETURNING *",
      [user_id]
    );

    res.json({
      message: "Cart cleared successfully",
      removedCount: result.rows.length,
    });
  } catch (err) {
    console.error("Error clearing cart:", err.message);
    res.status(500).json({ error: "Server Error" });
  }
});

// ============================================
// 💳 Stripe Payment Intent
// ============================================

app.post("/api/create-payment-intent", authenticateToken, async (req, res) => {
  try {
    const user_id = req.user.id;

    const cartItems = await pool.query(
      `SELECT c.book_id, c.quantity, b.price, b.title
       FROM cart c
       JOIN books b ON c.book_id = b.id
       WHERE c.user_id = $1`,
      [user_id]
    );

    if (cartItems.rows.length === 0) {
      return res.status(400).json({ error: "Cart is empty" });
    }

    const totalAmount = cartItems.rows.reduce(
      (sum, item) => sum + parseFloat(item.price) * item.quantity,
      0
    );
    const amountInCents = Math.round(totalAmount * 100);

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency: "usd",
      metadata: {
        user_id: user_id,
        items: JSON.stringify(
          cartItems.rows.map(item => ({
            book_id: item.book_id,
            quantity: item.quantity,
            price: parseFloat(item.price),
          }))
        ),
      },
    });

    res.json({
      clientSecret: paymentIntent.client_secret,
      amount: totalAmount,
      currency: "usd",
    });
  } catch (err) {
    console.error("Payment Intent Error:", err);
    res.status(500).json({ error: err.message || "Server Error" });
  }
});

// ============================================
// 💳 Stripe Webhook
// ============================================

app.post(
  "/api/webhook",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    const sig = req.headers["stripe-signature"];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    let event;

    try {
      event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } catch (err) {
      console.error("Webhook signature verification failed:", err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    if (event.type === "payment_intent.succeeded") {
      const paymentIntent = event.data.object;
      const metadata = paymentIntent.metadata;
      const user_id = parseInt(metadata.user_id);
      const items = JSON.parse(metadata.items);

      try {
        const totalAmount = items.reduce(
          (sum, item) => sum + item.price * item.quantity,
          0
        );

        // 🔥 កែ total_amount ទៅ total
        const order = await pool.query(
          `INSERT INTO orders (user_id, total, payment_method, payment_status, status) 
           VALUES ($1, $2, 'stripe', 'paid', 'completed') 
           RETURNING *`,
          [user_id, totalAmount]
        );

        for (const item of items) {
          await pool.query(
            `INSERT INTO order_items (order_id, book_id, quantity, price) 
             VALUES ($1, $2, $3, $4)`,
            [order.rows[0].id, item.book_id, item.quantity, item.price]
          );

          await pool.query(
            `UPDATE books SET stock = stock - $1 WHERE id = $2`,
            [item.quantity, item.book_id]
          );
        }

        await pool.query("DELETE FROM cart WHERE user_id = $1", [user_id]);

        console.log(
          `✅ Order ${order.rows[0].id} created successfully for user ${user_id}`
        );
      } catch (err) {
        console.error("Error creating order from webhook:", err);
      }
    }

    res.json({ received: true });
  }
);

// ============================================
// 📦 Orders Routes (កែប្រែ)
// ============================================

// បង្កើត Order
app.post("/api/orders", authenticateToken, async (req, res) => {
  try {
    const user_id = req.user.id;
    const { total_amount, items } = req.body;

    if (!total_amount || !items || items.length === 0) {
      return res.status(400).json({ error: "Invalid order data" });
    }

    // 🔥 កែ total_amount ទៅ total
    const newOrder = await pool.query(
      `INSERT INTO orders (user_id, total, status) 
       VALUES ($1, $2, 'pending') 
       RETURNING id, user_id, total as total_amount, status, created_at`,
      [user_id, total_amount]
    );

    for (const item of items) {
      await pool.query(
        `INSERT INTO order_items (order_id, book_id, quantity, price) 
         VALUES ($1, $2, $3, $4)`,
        [newOrder.rows[0].id, item.book_id, item.quantity, item.price]
      );

      await pool.query(`UPDATE books SET stock = stock - $1 WHERE id = $2`, [
        item.quantity,
        item.book_id,
      ]);
    }

    await pool.query("DELETE FROM cart WHERE user_id = $1", [user_id]);

    res.json({
      message: "Order created successfully",
      order: newOrder.rows[0],
    });
  } catch (err) {
    console.error("Order Error:", err.message);
    res.status(500).json({ error: "Server Error: " + err.message });
  }
});

// មើល Orders
app.get("/api/orders", authenticateToken, async (req, res) => {
  try {
    const user_id = req.user.id;

    // 🔥 កែ total ទៅ total_amount
    const orders = await pool.query(
      `SELECT id, user_id, total as total_amount, status, created_at 
       FROM orders WHERE user_id = $1 ORDER BY created_at DESC`,
      [user_id]
    );

    for (const order of orders.rows) {
      const items = await pool.query(
        `SELECT oi.*, b.title, b.image_url 
         FROM order_items oi 
         JOIN books b ON oi.book_id = b.id 
         WHERE oi.order_id = $1`,
        [order.id]
      );
      order.items = items.rows;
    }

    res.json(orders.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: "Server Error" });
  }
});

// មើល Order មួយ
app.get("/api/orders/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const user_id = req.user.id;

    // 🔥 កែ total ទៅ total_amount
    const order = await pool.query(
      `SELECT id, user_id, total as total_amount, status, created_at 
       FROM orders WHERE id = $1 AND user_id = $2`,
      [id, user_id]
    );

    if (order.rows.length === 0) {
      return res.status(404).json({ error: "Order not found" });
    }

    const items = await pool.query(
      `SELECT oi.*, b.title, b.image_url 
       FROM order_items oi 
       JOIN books b ON oi.book_id = b.id 
       WHERE oi.order_id = $1`,
      [id]
    );

    order.rows[0].items = items.rows;
    res.json(order.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: "Server Error" });
  }
});

// ============================================
// បន្ថែម API ថ្មីសម្រាប់ Update រូបភាព
// ============================================

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
