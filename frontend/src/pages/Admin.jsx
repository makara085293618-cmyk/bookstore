import { useEffect, useState } from 'react';
import { getBooks, createBook, updateBook, deleteBook } from '../api/client';
import { useAuth } from '../context/AuthContext';

const emptyForm = {
  title: '', author: '', description: '', price: '', stock: '', category: '', image_url: '',
};

export default function Admin() {
  const { user, loading: authLoading } = useAuth();
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null); // null = កំពុងបន្ថែមថ្មី, មានលេខ = កំពុងកែ
  const [saving, setSaving] = useState(false);

  async function loadBooks() {
    setLoading(true);
    try {
      setBooks(await getBooks());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadBooks(); }, []);

  function startEdit(book) {
    setEditingId(book.id);
    setForm({
      title: book.title,
      author: book.author,
      description: book.description || '',
      price: book.price,
      stock: book.stock,
      category: book.category || '',
      image_url: book.image_url || '',
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(emptyForm);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const payload = { ...form, price: Number(form.price), stock: Number(form.stock) };
      if (editingId) {
        await updateBook(editingId, payload);
      } else {
        await createBook(payload);
      }
      cancelEdit();
      await loadBooks();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    if (!confirm('តើប្រាកដថាចង់លុបសៀវភៅនេះមែនទេ?')) return;
    try {
      await deleteBook(id);
      await loadBooks();
    } catch (err) {
      setError(err.message);
    }
  }

  // ---------- ការពារទំព័រនេះ៖ តម្រូវឲ្យ login ជា admin ប៉ុណ្ណោះ ----------
  if (authLoading) return <div className="container"><p>កំពុងផ្ទុក...</p></div>;
  if (!user || user.role !== 'admin') {
    return (
      <div className="container">
        <div className="error-msg">🔒 ទំព័រនេះសម្រាប់ admin ប៉ុណ្ណោះ។ សូម login ជាមួយគណនី admin។</div>
      </div>
    );
  }

  return (
    <div className="container">
      <h1 className="page-title">🛠️ គ្រប់គ្រងសៀវភៅ (Admin)</h1>

      {error && <div className="error-msg">{error}</div>}

      {/* ---------- ទម្រង់បន្ថែម/កែ ---------- */}
      <form onSubmit={handleSubmit} style={{ background: 'white', border: '1px solid var(--line)', borderRadius: 'var(--radius)', padding: '1.5rem', marginBottom: '2rem' }}>
        <h3 style={{ marginTop: 0 }}>{editingId ? `កែសម្រួលសៀវភៅ #${editingId}` : 'បន្ថែមសៀវភៅថ្មី'}</h3>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div className="field">
            <label>ចំណងជើង</label>
            <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
          </div>
          <div className="field">
            <label>អ្នកនិពន្ធ</label>
            <input value={form.author} onChange={(e) => setForm({ ...form, author: e.target.value })} required />
          </div>
          <div className="field">
            <label>តម្លៃ ($)</label>
            <input type="number" step="0.01" min="0" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} required />
          </div>
          <div className="field">
            <label>ស្តុក</label>
            <input type="number" min="0" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} required />
          </div>
          <div className="field">
            <label>ប្រភេទ</label>
            <input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
          </div>
          <div className="field">
            <label>URL រូបភាព</label>
            <input value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} />
          </div>
        </div>
        <div className="field">
          <label>ការពិពណ៌នា</label>
          <textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </div>

        <div style={{ display: 'flex', gap: '0.6rem' }}>
          <button className="btn" type="submit" disabled={saving}>
            {saving ? 'កំពុងរក្សាទុក...' : editingId ? 'រក្សាទុកការកែប្រែ' : 'បន្ថែមសៀវភៅ'}
          </button>
          {editingId && (
            <button type="button" className="btn btn-outline" onClick={cancelEdit}>បោះបង់</button>
          )}
        </div>
      </form>

      {/* ---------- តារាងសៀវភៅ ---------- */}
      {loading ? (
        <p>កំពុងផ្ទុក...</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', background: 'white' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid var(--line)', textAlign: 'left' }}>
              <th style={{ padding: '0.6rem' }}>ចំណងជើង</th>
              <th style={{ padding: '0.6rem' }}>អ្នកនិពន្ធ</th>
              <th style={{ padding: '0.6rem' }}>តម្លៃ</th>
              <th style={{ padding: '0.6rem' }}>ស្តុក</th>
              <th style={{ padding: '0.6rem' }}></th>
            </tr>
          </thead>
          <tbody>
            {books.map((book) => (
              <tr key={book.id} style={{ borderBottom: '1px solid var(--line)' }}>
                <td style={{ padding: '0.6rem' }}>{book.title}</td>
                <td style={{ padding: '0.6rem' }}>{book.author}</td>
                <td style={{ padding: '0.6rem' }}>${Number(book.price).toFixed(2)}</td>
                <td style={{ padding: '0.6rem' }}>{book.stock}</td>
                <td style={{ padding: '0.6rem', display: 'flex', gap: '0.4rem' }}>
                  <button className="btn btn-outline" onClick={() => startEdit(book)}>កែ</button>
                  <button className="btn" style={{ background: 'var(--terracotta-dark)' }} onClick={() => handleDelete(book.id)}>លុប</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
