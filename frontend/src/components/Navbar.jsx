import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext'; // <--- បន្ថែមបន្ទាត់នេះចូល
import { useCart } from '../context/CartContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const { items } = useCart();
  const cartCount = items.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <header className="navbar sticky top-0 z-50 bg-[#3d2817] shadow-md">
      <Link to="/" className="brand">📖 សៀវភៅសម្រាយ</Link>
      <nav>
        <Link to="/">សៀវភៅ</Link>
        {user && (
          <Link to="/cart">
            កន្ត្រក {cartCount > 0 && <span className="cart-badge">{cartCount}</span>}
          </Link>
        )}
        {user && <Link to="/orders">ការកម្មង់ទិញ</Link>}
        {user?.role === 'admin' && <Link to="/admin">Admin</Link>}
        {user ? (
          <>
            <span>សួស្តី, {user.name}</span>
            <a href="#" onClick={(e) => { e.preventDefault(); logout(); }}>ចាកចេញ</a>
          </>
        ) : (
          <>
            <Link to="/login">ចូលប្រើប្រាស់</Link>
            <Link to="/register">ចុះឈ្មោះ</Link>
          </>
        )}
      </nav>
    </header>
  );
}