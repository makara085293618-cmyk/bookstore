import { useEffect, useState } from "react";
import { getBooks } from "../api/client";
import BookCard from "../components/BookCard";

const CATEGORIES = ["Fiction", "Programming", "History", "Cooking"];

export default function Home() {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");

  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(() => {
      const params = {};
      if (search.trim()) params.search = search.trim();
      if (category) params.category = category;

      getBooks(params)
        .then(data => {
          setBooks(data);
          setError("");
        })
        .catch(err => setError(err.message))
        .finally(() => setLoading(false));
    }, 300);

    return () => clearTimeout(timer);
  }, [search, category]);

  return (
    <div className="container">
      <h1 className="page-title">📚 សៀវភៅទាំងអស់</h1>
      <p className="subtitle">រកឃើញសៀវភៅ {books.length} ក្បាល</p>

      {/* Search & Filter - Mobile Responsive */}
      <div className="search-filter-container">
        <input
          type="text"
          placeholder="ស្វែងរកតាមចំណងជើង ឬអ្នកនិពន្ធ..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="search-input"
        />
        <select
          value={category}
          onChange={e => setCategory(e.target.value)}
          className="filter-select"
        >
          <option value="">គ្រប់ប្រភេទ</option>
          {CATEGORIES.map(cat => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
      </div>

      {/* Loading */}
      {loading && (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>កំពុងស្វែងរក...</p>
        </div>
      )}

      {/* Error */}
      {error && <div className="error-msg">{error}</div>}

      {/* Empty State */}
      {!loading && books.length === 0 && (
        <div className="empty-state">រកមិនឃើញសៀវភៅត្រូវនឹងលក្ខខណ្ឌនេះទេ 🔍</div>
      )}

      {/* Book Grid */}
      <div className="book-grid">
        {books.map(book => (
          <BookCard key={book.id} book={book} />
        ))}
      </div>
    </div>
  );
}
