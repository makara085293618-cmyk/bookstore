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
    throw new Error(data.error || `Request failed (${res.status})`);
  }

  return data;
}

// ---------- Books ----------
export const getBooks = (params = {}) => {
  const query = new URLSearchParams(params).toString();
  return request(`/api/books.php${query ? `?${query}` : ''}`);
};
export const getBook = (id) => request(`/api/books.php?id=${id}`);

export const createBook = (book) => request('/api/books.php', { method: 'POST', body: book, auth: true });
export const updateBook = (id, book) => request(`/api/books.php?id=${id}`, { method: 'PUT', body: book, auth: true });
export const deleteBook = (id) => request(`/api/books.php?id=${id}`, { method: 'DELETE', auth: true });

// ---------- Auth ----------
export const registerUser = (name, email, password) =>
  request('/api/auth.php?action=register', { method: 'POST', body: { name, email, password } });

export const loginUser = (email, password) =>
  request('/api/auth.php?action=login', { method: 'POST', body: { email, password } });

export const getCurrentUser = () => request('/api/auth.php?action=me', { auth: true });

// ---------- Cart ----------
export const getCart = () => request('/api/cart.php', { auth: true });
export const addToCart = (book_id, quantity = 1) =>
  request('/api/cart.php', { method: 'POST', body: { book_id, quantity }, auth: true });
export const updateCartItem = (id, quantity) =>
  request(`/api/cart.php?id=${id}`, { method: 'PUT', body: { quantity }, auth: true });
export const removeCartItem = (id) =>
  request(`/api/cart.php?id=${id}`, { method: 'DELETE', auth: true });

// ---------- Orders ----------
export const checkout = () => request('/api/orders.php', { method: 'POST', auth: true });
export const getOrders = () => request('/api/orders.php', { auth: true });
export const getOrder = (id) => request(`/api/orders.php?id=${id}`, { auth: true });