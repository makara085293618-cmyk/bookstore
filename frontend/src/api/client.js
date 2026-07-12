/**
 * api/client.js
 * ================================
 * កន្លែងតែមួយសម្រាប់ហៅ Backend PHP ទាំងអស់ (ជំនួស curl ដោយ fetch())
 *
 * នៅពេល deploy ពិត សូមផ្លាស់ប្តូរ BASE_URL ទៅជា URL របស់ Render/Railway
 * ក្នុងអំឡុងពេលអភិវឌ្ឍន៍ (development) យើងប្រើ localhost:8000 ដែលបងទើបតែសាកល្បងរួច
 */

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

function getToken() {
  return localStorage.getItem('token');
}

async function request(path, { method = 'GET', body, auth = false } = {}) {
  const headers = { 'Content-Type': 'application/json' };

  if (auth) {
    const token = getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    // ប្រាប់ error message ពី PHP (ដូចជា "អ៊ីមែលនេះមានគេប្រើរួចហើយ")
    throw new Error(data.error || `Request failed (${res.status})`);
  }

  return data;
}

// ---------- Books ----------
export const getBooks = (params = {}) => {
  const query = new URLSearchParams(params).toString();
  return request(`/books.php${query ? `?${query}` : ''}`);
};
export const getBook = (id) => request(`/books.php?id=${id}`);

// Admin ប៉ុណ្ណោះ (auth: true ភ្ជាប់ token ជូន ដើម្បីឲ្យ requireAdmin() ក្នុង PHP ត្រួតពិនិត្យបាន)
export const createBook = (book) => request('/books.php', { method: 'POST', body: book, auth: true });
export const updateBook = (id, book) => request(`/books.php?id=${id}`, { method: 'PUT', body: book, auth: true });
export const deleteBook = (id) => request(`/books.php?id=${id}`, { method: 'DELETE', auth: true });

// ---------- Auth ----------
export const registerUser = (name, email, password) =>
  request('/auth.php?action=register', { method: 'POST', body: { name, email, password } });

export const loginUser = (email, password) =>
  request('/auth.php?action=login', { method: 'POST', body: { email, password } });

export const getCurrentUser = () => request('/auth.php?action=me', { auth: true });

// ---------- Cart ----------
export const getCart = () => request('/cart.php', { auth: true });
export const addToCart = (book_id, quantity = 1) =>
  request('/cart.php', { method: 'POST', body: { book_id, quantity }, auth: true });
export const updateCartItem = (id, quantity) =>
  request(`/cart.php?id=${id}`, { method: 'PUT', body: { quantity }, auth: true });
export const removeCartItem = (id) =>
  request(`/cart.php?id=${id}`, { method: 'DELETE', auth: true });

// ---------- Orders ----------
export const checkout = () => request('/orders.php', { method: 'POST', auth: true });
export const getOrders = () => request('/orders.php', { auth: true });
