/**
 * context/AuthContext.jsx
 * ================================
 * រក្សាទុកព័ត៌មាន "តើនរណា login នៅ" សម្រាប់ទាំង App
 * ដូច្នេះទំព័រណាមួយក៏អាចដឹងបាន (Navbar បង្ហាញឈ្មោះ, Cart ដឹងថាត្រូវ login សិន ។ល។)
 */
import { createContext, useContext, useState, useEffect } from 'react';
import { loginUser, registerUser, getCurrentUser } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // ពេលបើក app ដំបូង ពិនិត្យមើលថាមាន token ចាស់ (localStorage) ដែរឬទេ
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      setLoading(false);
      return;
    }
    getCurrentUser()
      .then((data) => setUser(data.user))
      .catch(() => localStorage.removeItem('token'))
      .finally(() => setLoading(false));
  }, []);

  async function login(email, password) {
    const data = await loginUser(email, password);
    localStorage.setItem('token', data.token);
    setUser(data.user);
  }

  async function register(name, email, password) {
    const data = await registerUser(name, email, password);
    localStorage.setItem('token', data.token);
    setUser(data.user);
  }

  function logout() {
    localStorage.removeItem('token');
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
