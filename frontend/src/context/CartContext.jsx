// src/context/CartContext.jsx
import { createContext, useContext, useState, useCallback } from "react";
import {
  getCart,
  addToCart as apiAddToCart,
  updateCartItem,
  removeCartItem,
  clearCart as apiClearCart, // 👈 បន្ថែមនេះ
} from "../api/client";
import { useAuth } from "./AuthContext";

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  const refreshCart = useCallback(async () => {
    if (!user) {
      setItems([]);
      setTotal(0);
      return;
    }
    try {
      setLoading(true);
      const data = await getCart();
      setItems(data.items || []);
      setTotal(data.total || 0);
    } catch (error) {
      console.error("Refresh cart error:", error);
      setItems([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // ➕ បន្ថែមទៅកន្ត្រក
  async function addToCart(bookId, quantity = 1) {
    try {
      await apiAddToCart(bookId, quantity);
      await refreshCart();
      return { success: true };
    } catch (error) {
      console.error("Add to cart error:", error);
      return { success: false, error: error.message };
    }
  }

  // 🔄 ធ្វើបច្ចុប្បន្នភាពបរិមាណ
  async function changeQuantity(bookId, quantity) {
    try {
      await updateCartItem(bookId, quantity);
      await refreshCart();
      return { success: true };
    } catch (error) {
      console.error("Change quantity error:", error);
      return { success: false, error: error.message };
    }
  }

  // ❌ លុបចេញពីកន្ត្រក
  async function removeFromCart(bookId) {
    try {
      await removeCartItem(bookId);
      await refreshCart();
      return { success: true };
    } catch (error) {
      console.error("Remove from cart error:", error);
      return { success: false, error: error.message };
    }
  }

  // 🗑️ លុបកន្ត្រកទាំងមូល (ប្រើ apiClearCart)
  async function clearCart() {
    try {
      await apiClearCart(); // 👈 ប្រើ apiClearCart ជំនួស fetch ផ្ទាល់
      setItems([]);
      setTotal(0);
      return { success: true };
    } catch (error) {
      console.error("Clear cart error:", error);
      return { success: false, error: error.message };
    }
  }

  // 📊 គណនាចំនួនសរុប
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);

  const value = {
    items,
    total,
    totalItems,
    loading,
    refreshCart,
    addToCart,
    changeQuantity,
    removeFromCart,
    clearCart,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}
