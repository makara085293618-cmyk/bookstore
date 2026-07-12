import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useNavigate } from 'react-router-dom';

export default function BookCard({ book }) {
  const { user } = useAuth();
  const { addToCart } = useCart();
  const navigate = useNavigate();
  const [adding, setAdding] = useState(false);

  async function handleAdd() {
    if (!user) {
      navigate('/login');
      return;
    }
    setAdding(true);
    try {
      await addToCart(book.id, 1);
    } catch (err) {
      alert(err.message);
    } finally {
      setAdding(false);
    }
  }

  return (
    <div className="book-card">
      <img src={book.image_url} alt={book.title} />
      <div className="info">
        {book.category && <span className="category-tag">{book.category}</span>}
        <div className="title">{book.title}</div>
        <div className="author">{book.author}</div>
        <div className="price">${Number(book.price).toFixed(2)}</div>
        <button className="btn" onClick={handleAdd} disabled={adding || book.stock < 1}>
          {book.stock < 1 ? 'អស់ស្តុក' : adding ? 'កំពុងបន្ថែម...' : 'ដាក់ក្នុងកន្ត្រក'}
        </button>
      </div>
    </div>
  );
}
