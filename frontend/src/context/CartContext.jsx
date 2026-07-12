/**
 * context/CartContext.jsx
 * ================================
 * រក្សាទុកទិន្នន័យកន្ត្រក ដើម្បីឲ្យ Navbar (លេខរាប់) និង Cart page ប្រើរួមគ្នា
 */
import { createContext, useContext, useState, useCallback } from 'react';
import { getCart, addToCart as apiAddToCart, updateCartItem, removeCartItem } from '../api/client';
import { useAuth } from './AuthContext';

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);

  const refreshCart = useCallback(async () => {
    if (!user) {
      setItems([]);
      setTotal(0);
      return;
    }
    const data = await getCart();
    setItems(data.items);
    setTotal(data.total);
  }, [user]);

  async function addToCart(bookId, quantity = 1) {
    await apiAddToCart(bookId, quantity);
    await refreshCart();
  }

  async function changeQuantity(cartItemId, quantity) {
    await updateCartItem(cartItemId, quantity);
    await refreshCart();
  }

  async function removeFromCart(cartItemId) {
    await removeCartItem(cartItemId);
    await refreshCart();
  }

  return (
    <CartContext.Provider
      value={{ items, total, refreshCart, addToCart, changeQuantity, removeFromCart }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  return useContext(CartContext);
}
