import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";

export default function Orders() {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expandedId, setExpandedId] = useState(null);
  const [details, setDetails] = useState({});

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const fetchOrders = async () => {
      try {
        const token = localStorage.getItem("token");
        const response = await fetch(
          "https://bookstore-kybd.onrender.com/api/orders",
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );

        if (!response.ok) {
          throw new Error("Failed to fetch orders");
        }

        const data = await response.json();
        setOrders(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, [user]);

  // ចុចលើ order មួយ -> ទាញយកព័ត៌មានលម្អិត
  async function toggleExpand(orderId) {
    if (expandedId === orderId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(orderId);
    if (!details[orderId]) {
      try {
        const token = localStorage.getItem("token");
        const response = await fetch(
          `https://bookstore-kybd.onrender.com/api/orders/${orderId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );

        if (!response.ok) {
          throw new Error("Failed to fetch order details");
        }

        const data = await response.json();
        setDetails(prev => ({ ...prev, [orderId]: data }));
      } catch (err) {
        setError(err.message);
      }
    }
  }

  const statusLabel = {
    pending: "កំពុងរង់ចាំ",
    paid: "បានទូទាត់",
    shipped: "កំពុងដឹកជញ្ជូន",
    completed: "បានបញ្ចប់",
    cancelled: "បានលុបចោល",
  };

  if (!user) {
    return (
      <div className="container">
        <div className="card text-center" style={{ padding: "40px" }}>
          <h2>🔒 សូមចូលប្រើប្រាស់</h2>
          <p>សូមចូលប្រើប្រាស់ដើម្បីមើលកម្មង់ទិញរបស់អ្នក</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>កំពុងផ្ទុកកម្មង់ទិញ...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <h1 className="page-title">📦 ការកម្មង់ទិញរបស់ខ្ញុំ</h1>
      <p className="subtitle">ចុចលើកម្មង់ទិញនីមួយៗ ដើម្បីមើលព័ត៌មានលម្អិត</p>

      {error && <div className="error-msg">⚠️ {error}</div>}

      {orders.length === 0 ? (
        <div className="empty-state">
          <p style={{ fontSize: "20px" }}>📭 អ្នកមិនទាន់មានកម្មង់ទិញនៅឡើយទេ</p>
          <button
            className="btn btn-primary"
            onClick={() => (window.location.href = "/")}
          >
            ត្រឡប់ទៅទិញសៀវភៅ
          </button>
        </div>
      ) : (
        orders.map(order => (
          <div key={order.id} className="order-card">
            <button
              onClick={() => toggleExpand(order.id)}
              className="order-toggle"
            >
              <div className="order-summary">
                <div className="order-info">
                  <strong>កម្មង់ #{order.id}</strong>
                  <span className="order-date">
                    📅 {new Date(order.created_at).toLocaleDateString("km-KH")}
                  </span>
                </div>
                <div className="order-meta">
                  <span className={`status-badge ${order.status}`}>
                    {statusLabel[order.status] || order.status}
                  </span>
                  <strong className="order-total">
                    ${Number(order.total_amount).toFixed(2)}
                  </strong>
                  <span className="expand-icon">
                    {expandedId === order.id ? "▲" : "▼"}
                  </span>
                </div>
              </div>
            </button>

            {expandedId === order.id && (
              <div className="order-details">
                {!details[order.id] ? (
                  <p>កំពុងផ្ទុក...</p>
                ) : (
                  details[order.id].items?.map((item, i) => (
                    <div key={i} className="order-item-detail">
                      <img
                        src={
                          item.image_url ||
                          "https://via.placeholder.com/60x60?text=No+Image"
                        }
                        alt={item.title}
                        className="order-item-image"
                      />
                      <div className="order-item-info">
                        <div className="order-item-title">{item.title}</div>
                        <div className="order-item-qty">
                          ចំនួន {item.quantity} × $
                          {Number(item.price).toFixed(2)}
                        </div>
                      </div>
                      {item.ebook_url ? (
                        <a
                          href={item.ebook_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-primary"
                        >
                          📥 ទាញយក Ebook
                        </a>
                      ) : (
                        <span className="no-ebook">មិនមាន Ebook</span>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}
