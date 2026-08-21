// src/pages/Cart.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import { checkout } from "../api/client";

export default function Cart() {
  const {
    items,
    total,
    refreshCart,
    changeQuantity,
    removeFromCart,
    clearCart,
  } = useCart();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [checkingOut, setCheckingOut] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      refreshCart().finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [user]);

  // ❌ មុខងារលុប (ប្រើ book_id)
  const handleRemove = async bookId => {
    setError("");
    try {
      await removeFromCart(bookId);
      await refreshCart();
    } catch (err) {
      setError(err.message || "Failed to remove item");
    }
  };

  // 🔄 មុខងារធ្វើបច្ចុប្បន្នភាពបរិមាណ (ប្រើ book_id)
  const handleChangeQuantity = async (bookId, newQuantity) => {
    setError("");
    try {
      await changeQuantity(bookId, newQuantity);
      await refreshCart();
    } catch (err) {
      setError(err.message || "Failed to update quantity");
    }
  };

  // 🗑️ លុបកន្ត្រកទាំងមូល
  const handleClearCart = async () => {
    if (!window.confirm("តើអ្នកប្រាកដថាចង់លុបកន្ត្រកទាំងមូល?")) {
      return;
    }
    setError("");
    const result = await clearCart();
    if (!result.success) {
      setError(result.error || "Failed to clear cart");
    }
  };

  // 💳 មុខងារ Checkout
  async function handleCheckout() {
    setError("");
    setCheckingOut(true);
    try {
      const order = await checkout();
      await refreshCart();
      navigate("/orders");
      alert(`បានកម្មង់ទិញជោគជ័យ! លេខកម្មង់ #${order.id} សរុប $${order.total}`);
    } catch (err) {
      setError(err.message || "Checkout failed");
    } finally {
      setCheckingOut(false);
    }
  }

  // 🔒 ប្រសិនបើមិនទាន់ Login
  if (!user) {
    return (
      <div className="container">
        <div className="card text-center" style={{ padding: "40px" }}>
          <h2>🔒 សូមចូលប្រើប្រាស់</h2>
          <p>សូមចូលប្រើប្រាស់ដើម្បីមើលកន្ត្រករបស់អ្នក</p>
          <div
            style={{
              display: "flex",
              gap: "15px",
              justifyContent: "center",
              marginTop: "20px",
              flexWrap: "wrap",
            }}
          >
            <button
              className="btn btn-primary"
              onClick={() => navigate("/login")}
            >
              ចូលប្រើប្រាស់
            </button>
            <button
              className="btn btn-outline"
              onClick={() => navigate("/register")}
            >
              ចុះឈ្មោះ
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ⏳ Loading State
  if (loading) {
    return (
      <div className="container">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>កំពុងផ្ទុកកន្ត្រក...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <h1 className="page-title">🛒 កន្ត្រករបស់ខ្ញុំ</h1>

      {error && <div className="error-msg">⚠️ {error}</div>}

      {items.length === 0 ? (
        <div className="empty-state">
          <p style={{ fontSize: "20px" }}>📭 កន្ត្រករបស់អ្នកទទេនៅឡើយ</p>
          <button
            className="btn btn-primary"
            onClick={() => navigate("/")}
            style={{ marginTop: "15px" }}
          >
            ត្រឡប់ទៅទិញសៀវភៅ
          </button>
        </div>
      ) : (
        <>
          {/* Cart Items */}
          <div className="cart-items">
            {items.map(item => (
              <div key={item.id} className="cart-item">
                <img
                  src={
                    item.image_url ||
                    "https://via.placeholder.com/80x80?text=No+Image"
                  }
                  alt={item.title}
                  onError={e => {
                    e.target.src =
                      "https://via.placeholder.com/80x80?text=No+Image";
                  }}
                />
                <div className="item-info">
                  <div className="item-title">{item.title}</div>
                  <div className="item-author">{item.author || "Unknown"}</div>
                  <div className="item-price">
                    ${Number(item.price).toFixed(2)}
                  </div>
                </div>
                <div className="item-quantity">
                  <button
                    className="qty-btn"
                    onClick={
                      () =>
                        handleChangeQuantity(item.book_id, item.quantity - 1) // 👈 ប្រើ book_id
                    }
                    disabled={item.quantity <= 1}
                  >
                    −
                  </button>
                  <span className="qty-number">{item.quantity}</span>
                  <button
                    className="qty-btn"
                    onClick={
                      () =>
                        handleChangeQuantity(item.book_id, item.quantity + 1) // 👈 ប្រើ book_id
                    }
                    disabled={item.quantity >= (item.stock || 999)}
                  >
                    +
                  </button>
                </div>
                <button
                  className="btn btn-danger"
                  onClick={() => handleRemove(item.book_id)} // 👈 ប្រើ book_id
                >
                  🗑️ យកចេញ
                </button>
              </div>
            ))}
          </div>

          {/* Cart Total */}
          <div className="cart-total">
            <div className="total-row">
              <span>សរុបចំនួន:</span>
              <span>
                {items.reduce((sum, item) => sum + item.quantity, 0)} ក្បាល
              </span>
            </div>
            <div className="total-row total-amount-row">
              <span>តម្លៃសរុប:</span>
              <span className="total-amount">${Number(total).toFixed(2)}</span>
            </div>
            <div className="cart-actions">
              <button
                className="btn btn-success"
                onClick={handleCheckout}
                disabled={checkingOut}
              >
                {checkingOut ? (
                  <>
                    <span className="spinner-small"></span>
                    កំពុងដំណើរការ...
                  </>
                ) : (
                  "💳 ដាក់កម្មង់ទិញ"
                )}
              </button>
              <button className="btn btn-danger" onClick={handleClearCart}>
                🗑️ លុបកន្ត្រកទាំងមូល
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
