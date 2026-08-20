import { useEffect, useState } from 'react';
import { getOrders, getOrder } from '../api/client';

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [details, setDetails] = useState({}); // { [orderId]: {...items} }

  useEffect(() => {
    getOrders()
      .then(setOrders)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  // ចុចលើ order មួយ -> ទាញយកព័ត៌មានលម្អិត (រួមទាំង ebook_url) មកបង្ហាញ
  async function toggleExpand(orderId) {
    if (expandedId === orderId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(orderId);
    if (!details[orderId]) {
      try {
        const full = await getOrder(orderId);
        setDetails((prev) => ({ ...prev, [orderId]: full }));
      } catch (err) {
        setError(err.message);
      }
    }
  }

  const statusLabel = { pending: 'កំពុងរង់ចាំ', paid: 'បានទូទាត់', shipped: 'កំពុងដឹកជញ្ជូន', completed: 'បានបញ្ចប់', cancelled: 'បានលុបចោល' };

  if (loading) return <div className="container"><p>កំពុងផ្ទុក...</p></div>;

  return (
    <div className="container">
      <h1 className="page-title">ការកម្មង់ទិញរបស់ខ្ញុំ</h1>
      <p className="subtitle">ចុចលើកម្មង់ទិញនីមួយៗ ដើម្បីមើលព័ត៌មានលម្អិត និងទាញយក Ebook</p>

      {error && <div className="error-msg">{error}</div>}

      {orders.length === 0 ? (
        <div className="empty-state">អ្នកមិនទាន់មានកម្មង់ទិញនៅឡើយទេ 📦</div>
      ) : (
        orders.map((order) => (
          <div key={order.id} style={{ background: 'white', border: '1px solid var(--line)', borderRadius: 'var(--radius)', marginBottom: '1rem', overflow: 'hidden' }}>
            <button
              onClick={() => toggleExpand(order.id)}
              style={{ width: '100%', textAlign: 'left', padding: '1rem', background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontFamily: 'inherit' }}
            >
              <div>
                <strong>កម្មង់ #{order.id}</strong>
                <span style={{ marginLeft: '1rem', color: 'var(--ink-soft)', fontSize: '0.9rem' }}>
                  {new Date(order.created_at).toLocaleDateString('km-KH')}
                </span>
              </div>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <span className="category-tag">{statusLabel[order.status] || order.status}</span>
                <strong>${Number(order.total).toFixed(2)}</strong>
              </div>
            </button>

            {expandedId === order.id && (
              <div style={{ padding: '0 1rem 1rem', borderTop: '1px solid var(--line)' }}>
                {!details[order.id] ? (
                  <p>កំពុងផ្ទុក...</p>
                ) : (
                  details[order.id].items.map((item, i) => (
                    <div key={i} className="cart-row" style={{ borderBottom: i < details[order.id].items.length - 1 ? '1px solid var(--line)' : 'none' }}>
                      <img src={item.image_url} alt={item.title} />
                      <div className="info">
                        <div style={{ fontWeight: 'bold' }}>{item.title}</div>
                        <div style={{ color: 'var(--ink-soft)', fontSize: '0.85rem' }}>
                          ចំនួន {item.quantity} × ${Number(item.price).toFixed(2)}
                        </div>
                      </div>
                      {/* ⬇️ Link ទាញយក Ebook - បង្ហាញឲ្យតែម្ចាស់កម្មង់ទិញនេះប៉ុណ្ណោះ ព្រោះ orders.php
                          ត្រួតពិនិត្យ WHERE user_id = user.id រួចហើយពី Backend */}
                      {item.ebook_url ? (
                        <a href={item.ebook_url} target="_blank" rel="noopener noreferrer" className="btn">
                          ទាញយក Ebook
                        </a>
                      ) : (
                        <span style={{ fontSize: '0.8rem', color: 'var(--ink-soft)' }}>មិនមាន Ebook</span>
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
