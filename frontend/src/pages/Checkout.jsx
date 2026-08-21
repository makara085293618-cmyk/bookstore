// src/pages/Checkout.jsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";

// Stripe Publishable Key (ពី .env)
const stripePromise = loadStripe(
  "pk_test_51U6t2kEO9V0DjQWGc2c6NqS8BbbTMXdEp1JiT0QxzWV6m59Oi7F9LZOMVSvDVm2Q7ILUqi2QQFxkxzltSznLXZUa008JjQe9Rl"
);

function CheckoutForm() {
  const stripe = useStripe();
  const elements = useElements();
  const navigate = useNavigate();
  const { items, total, clearCart } = useCart();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [clientSecret, setClientSecret] = useState("");

  useEffect(() => {
    // បង្កើត Payment Intent
    const createPaymentIntent = async () => {
      try {
        const token = localStorage.getItem("token");
        const response = await fetch(
          "https://bookstore-kybd.onrender.com/api/create-payment-intent",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );

        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        setClientSecret(data.clientSecret);
      } catch (err) {
        setError(err.message);
      }
    };

    if (user && items.length > 0) {
      createPaymentIntent();
    }
  }, [user, items]);

  const handleSubmit = async e => {
    e.preventDefault();
    if (!stripe || !elements || !clientSecret) return;

    setLoading(true);
    setError("");

    const { error: stripeError, paymentIntent } =
      await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: elements.getElement(CardElement),
        },
      });

    if (stripeError) {
      setError(stripeError.message);
      setLoading(false);
    } else if (paymentIntent.status === "succeeded") {
      alert("✅ ការទូទាត់ជោគជ័យ!");
      await clearCart();
      navigate("/orders");
      setLoading(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="container">
        <div className="card text-center" style={{ padding: "40px" }}>
          <h2>🛒 កន្ត្រករបស់អ្នកទទេ</h2>
          <button className="btn btn-primary" onClick={() => navigate("/")}>
            ត្រឡប់ទៅទិញសៀវភៅ
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container" style={{ maxWidth: "600px" }}>
      <h1 className="page-title">💳 ទូទាត់</h1>

      <div className="card" style={{ padding: "30px" }}>
        <div className="order-summary" style={{ marginBottom: "20px" }}>
          <h3>សង្ខេបការកម្មង់</h3>
          {items.map(item => (
            <div
              key={item.id}
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "8px 0",
                borderBottom: "1px solid #eee",
              }}
            >
              <span>
                {item.title} x {item.quantity}
              </span>
              <span>${(item.price * item.quantity).toFixed(2)}</span>
            </div>
          ))}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: "20px",
              fontWeight: "700",
              marginTop: "15px",
              paddingTop: "15px",
              borderTop: "2px solid #ddd",
            }}
          >
            <span>សរុប</span>
            <span style={{ color: "#e74c3c" }}>${total.toFixed(2)}</span>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: "20px" }}>
            <label
              style={{
                display: "block",
                marginBottom: "10px",
                fontWeight: "600",
              }}
            >
              ព័ត៌មានកាត (Card Details)
            </label>
            <div
              style={{
                padding: "15px",
                border: "1px solid #ddd",
                borderRadius: "8px",
              }}
            >
              <CardElement
                options={{
                  style: {
                    base: {
                      fontSize: "16px",
                      color: "#424770",
                      "::placeholder": { color: "#aab7c4" },
                    },
                    invalid: { color: "#9e2146" },
                  },
                }}
              />
            </div>
          </div>

          {error && <div className="error-msg">⚠️ {error}</div>}

          <button
            type="submit"
            className="btn btn-success btn-block"
            disabled={!stripe || loading}
            style={{ width: "100%", padding: "14px", fontSize: "18px" }}
          >
            {loading ? "កំពុងដំណើរការ..." : "💳 បញ្ជាក់ការទូទាត់"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function Checkout() {
  return (
    <Elements stripe={stripePromise}>
      <CheckoutForm />
    </Elements>
  );
}
