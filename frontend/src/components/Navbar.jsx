import { useState } from "react"; // <--- បន្ថែម useState
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";

export default function Navbar() {
  const { user, logout } = useAuth();
  const { items } = useCart();
  const cartCount = items.reduce((sum, i) => sum + i.quantity, 0);

  // State សម្រាប់ Hamburger Menu
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Toggle Menu
  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);

  // បិទ Menu ពេលចុចលើ Link
  const closeMenu = () => setIsMenuOpen(false);

  return (
    <header className="navbar sticky top-0 z-50 bg-[#3d2817] shadow-md">
      <div className="navbar-container">
        {/* Brand Logo */}
        <Link to="/" className="brand" onClick={closeMenu}>
          📖 សៀវភៅសម្រាយ
        </Link>

        {/* Hamburger Button (Mobile) */}
        <button
          className="hamburger-btn"
          onClick={toggleMenu}
          aria-label="Toggle menu"
        >
          <span className="hamburger-icon">{isMenuOpen ? "✕" : "☰"}</span>
        </button>

        {/* Navigation Links */}
        <nav className={`nav-links ${isMenuOpen ? "open" : ""}`}>
          <Link to="/" onClick={closeMenu}>
            សៀវភៅ
          </Link>

          {user && (
            <Link to="/cart" onClick={closeMenu}>
              🛒 កន្ត្រក
              {cartCount > 0 && <span className="cart-badge">{cartCount}</span>}
            </Link>
          )}

          {user && (
            <Link to="/orders" onClick={closeMenu}>
              📦 ការកម្មង់ទិញ
            </Link>
          )}

          {user?.role === "admin" && (
            <Link to="/admin" onClick={closeMenu}>
              ⚙️ Admin
            </Link>
          )}

          {user ? (
            <>
              <span className="user-name">សួស្តី, {user.name}</span>
              <a
                href="#"
                onClick={e => {
                  e.preventDefault();
                  logout();
                  closeMenu();
                }}
                className="logout-btn"
              >
                🚪 ចាកចេញ
              </a>
            </>
          ) : (
            <>
              <Link to="/login" onClick={closeMenu} className="login-btn">
                ចូលប្រើប្រាស់
              </Link>
              <Link to="/register" onClick={closeMenu} className="register-btn">
                ចុះឈ្មោះ
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
