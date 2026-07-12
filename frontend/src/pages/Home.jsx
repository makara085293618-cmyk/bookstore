import { useEffect, useState } from 'react';
import { getBooks } from '../api/client';
import BookCard from '../components/BookCard';

const CATEGORIES = ['Fiction', 'Programming', 'History', 'Cooking'];

export default function Home() {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');

  // ស្វែងរកម្តងទៀត រាល់ពេល search ឬ category ផ្លាស់ប្តូរ
  // setTimeout ដាក់ delay បន្តិច (debounce) ដើម្បីកុំឲ្យហៅ API រាល់ពេលចុចអក្សរនីមួយៗ
  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(() => {
      const params = {};
      if (search.trim()) params.search = search.trim();
      if (category) params.category = category;

      getBooks(params)
        .then((data) => { setBooks(data); setError(''); })
        .catch((err) => setError(err.message))
        .finally(() => setLoading(false));
    }, 300);

    return () => clearTimeout(timer);
  }, [search, category]);

  return (
    <div className="container">
      <h1 className="page-title">សៀវភៅទាំងអស់</h1>
      <p className="subtitle">រកឃើញសៀវភៅ {books.length} ក្បាល</p>

      <div style={{ display: 'flex', gap: '0.8rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <input
          type="text"
          placeholder="ស្វែងរកតាមចំណងជើង ឬអ្នកនិពន្ធ..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ flex: 1, minWidth: '220px', padding: '0.6rem', border: '1px solid var(--line)', borderRadius: 'var(--radius)', fontFamily: 'inherit' }}
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          style={{ padding: '0.6rem', border: '1px solid var(--line)', borderRadius: 'var(--radius)', fontFamily: 'inherit' }}
        >
          <option value="">គ្រប់ប្រភេទ</option>
          {CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
      </div>

      {loading && <p>កំពុងស្វែងរក...</p>}
      {error && <div className="error-msg">{error}</div>}

      {!loading && books.length === 0 && (
        <div className="empty-state">រកមិនឃើញសៀវភៅត្រូវនឹងលក្ខខណ្ឌនេះទេ 🔍</div>
      )}

      <div className="book-grid">
        {books.map((book) => (
          <BookCard key={book.id} book={book} />
        ))}
      </div>
    </div>
  );
}
