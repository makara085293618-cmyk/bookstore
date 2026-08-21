// const BASE_URL = import.meta.env.VITE_API_URL || '';
// const BASE_URL = 'https://bookstore-backend-pj9p.onrender.com';
// const BASE_URL = import.meta.env.VITE_API_URL || 'https://bookstore-3iu5.onrender.com';
// ប្ដូរឱ្យចំ Link ថ្មីដែល Render ទើបឱ្យយើង (3iu5)
// const BASE_URL = import.meta.env.VITE_API_URL || 'https://bookstore-kybd.onrender.com';
// កែពីកូដចាស់មកជាបែបនេះវិញ ដើម្បីឱ្យប្រាកដថាវាអានពី Amplify
const BASE_URL = import.meta.env.VITE_API_URL || 'https://bookstore-kybd.onrender.com';
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
    throw new Error(data.error || `Request failed (${res.status})`);
  }

  return data;
}

// ---------- Books (Node.js API Routes) ----------
export const getBooks = (params = {}) => {
  const query = new URLSearchParams(params).toString();
  return request(`/api/books${query ? `?${query}` : ''}`);
};
export const getBook = (id) => request(`/api/books/${id}`);

export const createBook = (book) => request('/api/books', { method: 'POST', body: book, auth: true });
export const updateBook = (id, book) => request(`/api/books/${id}`, { method: 'PUT', body: book, auth: true });
export const deleteBook = (id) => request(`/api/books/${id}`, { method: 'DELETE', auth: true });

// ---------- Auth ----------
export const registerUser = (name, email, password) =>
  request('/api/auth/register', { method: 'POST', body: { name, email, password } });

export const loginUser = (email, password) =>
  request('/api/auth/login', { method: 'POST', body: { email, password } });

export const getCurrentUser = () => request('/api/auth/me', { auth: true });

// ---------- Cart ----------
export const getCart = () => request('/api/cart', { auth: true });
export const addToCart = (book_id, quantity = 1) =>
  request('/api/cart', { method: 'POST', body: { book_id, quantity }, auth: true });
export const updateCartItem = (id, quantity) =>
  request(`/api/cart/${id}`, { method: 'PUT', body: { quantity }, auth: true });
export const removeCartItem = (id) =>
  request(`/api/cart/${id}`, { method: 'DELETE', auth: true });

// ---------- Orders ----------
export const checkout = () => request('/api/orders', { method: 'POST', auth: true });
export const getOrders = () => request('/api/orders', { auth: true });
export const getOrder = (id) => request(`/api/orders/${id}`, { auth: true });
