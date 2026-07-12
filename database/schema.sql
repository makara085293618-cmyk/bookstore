-- =====================================================
-- Book Store System - PostgreSQL Schema
-- ប្រព័ន្ធហាងលក់សៀវភៅ - គ្រោងសង់ទិន្នន័យ
-- =====================================================
-- Run this once against your PostgreSQL database, e.g.:
--   psql "postgresql://user:pass@host:port/dbname" -f schema.sql

-- ---------- USERS ----------
-- Stores both normal customers and admins (role column decides)
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'customer', -- 'customer' or 'admin'
    created_at TIMESTAMP DEFAULT NOW()
);

-- ---------- AUTH TOKENS ----------
-- Simple token-based auth (works across Vercel <-> Render domains,
-- unlike PHP sessions which struggle with cross-domain cookies)
CREATE TABLE IF NOT EXISTS auth_tokens (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ---------- BOOKS ----------
CREATE TABLE IF NOT EXISTS books (
    id SERIAL PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    author VARCHAR(150) NOT NULL,
    description TEXT,
    price NUMERIC(10,2) NOT NULL DEFAULT 0,
    stock INTEGER NOT NULL DEFAULT 0,
    category VARCHAR(80),
    image_url VARCHAR(300),
    created_at TIMESTAMP DEFAULT NOW()
);

-- ---------- CART ITEMS ----------
-- Belongs to a logged-in user (guest cart handled in browser localStorage in Phase 1-2)
CREATE TABLE IF NOT EXISTS cart_items (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    book_id INTEGER NOT NULL REFERENCES books(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, book_id)
);

-- ---------- ORDERS ----------
CREATE TABLE IF NOT EXISTS orders (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    total NUMERIC(10,2) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'pending', -- pending, paid, shipped, completed, cancelled
    created_at TIMESTAMP DEFAULT NOW()
);

-- ---------- ORDER ITEMS ----------
-- Snapshot of price at the time of purchase (price can change later in `books`)
CREATE TABLE IF NOT EXISTS order_items (
    id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    book_id INTEGER NOT NULL REFERENCES books(id),
    quantity INTEGER NOT NULL,
    price NUMERIC(10,2) NOT NULL
);

-- =====================================================
-- SAMPLE DATA (so the store isn't empty when you demo it)
-- =====================================================
INSERT INTO books (title, author, description, price, stock, category, image_url) VALUES
('The Silent Forest', 'Dara Sok', 'A quiet mystery set in the Cambodian countryside.', 8.50, 12, 'Fiction', 'https://picsum.photos/seed/book1/300/420'),
('Learning PHP the Fun Way', 'Anna Ngin', 'A friendly introduction to backend development with PHP.', 15.00, 20, 'Programming', 'https://picsum.photos/seed/book2/300/420'),
('Angkor: A History', 'Sovann Chey', 'An illustrated history of the Khmer empire.', 22.00, 7, 'History', 'https://picsum.photos/seed/book3/300/420'),
('PostgreSQL for Beginners', 'Marc Diaz', 'Everything you need to start with relational databases.', 18.75, 15, 'Programming', 'https://picsum.photos/seed/book4/300/420'),
('Rivers of Time', 'Lina Pich', 'A poetic novel following three generations of a Mekong family.', 10.25, 9, 'Fiction', 'https://picsum.photos/seed/book5/300/420'),
('Street Food Stories', 'Vuthy Ros', 'Recipes and tales from Phnom Penh markets.', 12.00, 18, 'Cooking', 'https://picsum.photos/seed/book6/300/420')
ON CONFLICT DO NOTHING;

-- Default admin account (password: admin123 -- CHANGE THIS after first login!)
-- password_hash below is bcrypt for 'admin123'
INSERT INTO users (name, email, password_hash, role) VALUES
('Admin', 'admin@bookstore.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin')
ON CONFLICT (email) DO NOTHING;
