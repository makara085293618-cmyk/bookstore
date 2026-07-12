import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { checkout } from '../api/client';

export default function Cart() {
  const { items, total, refreshCart, changeQuantity, removeFromCart } = useCart();
  const [loading, setLoading] = useState(true);
  const [checkingOut, setCheckingOut] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    refreshCart().finally(() => setLoading(false));
  }, []);

  async function handleCheckout() {
    setError('');
    setCheckingOut(true);
    try {
      const order = await checkout();
      await refreshCart();
      navigate('/', { state: { orderConfirmed: order.id } });
      alert(`បានកម្មង់ទិញជោគជ័យ! លេខកម្មង់ #${order.id} សរុប $${order.total}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setCheckingOut(false);
    }
  }

  if (loading) return <div className="container"><p>កំពុងផ្ទុក...</p></div>;

  return (
    <div className="container">
      <h1 className="page-title">កន្ត្រករបស់ខ្ញុំ</h1>

      {error && <div className="error-msg">{error}</div>}

      {items.length === 0 ? (
        <div className="empty-state">កន្ត្រករបស់អ្នកទទេនៅឡើយ 📭</div>
      ) : (
        <>
          {items.map((item) => (
            <div key={item.id} className="cart-row">
              <img src={item.image_url} alt={item.title} />
              <div className="info">
                <div style={{ fontWeight: 'bold' }}>{item.title}</div>
                <div style={{ color: 'var(--ink-soft)' }}>${Number(item.price).toFixed(2)}</div>
              </div>
              <div className="qty-controls">
                <button onClick={() => changeQuantity(item.id, item.quantity - 1)} disabled={item.quantity <= 1}>-</button>
                <span>{item.quantity}</span>
                <button onClick={() => changeQuantity(item.id, item.quantity + 1)} disabled={item.quantity >= item.stock}>+</button>
              </div>
              <button className="btn btn-outline" onClick={() => removeFromCart(item.id)}>យកចេញ</button>
            </div>
          ))}

          <div className="cart-total">
            <span>សរុប</span>
            <span>${Number(total).toFixed(2)}</span>
          </div>

          <button className="btn" style={{ marginTop: '1.5rem', width: '100%' }} onClick={handleCheckout} disabled={checkingOut}>
            {checkingOut ? 'កំពុងដំណើរការ...' : 'ដាក់កម្មង់ទិញ (Checkout)'}
          </button>
        </>
      )}
    </div>
  );
}
