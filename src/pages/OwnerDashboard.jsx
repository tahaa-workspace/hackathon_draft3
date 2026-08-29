import UploadDocument from "../components/UploadDocument";
import { useCallback, useEffect, useState } from 'react';
import { UserPlus, Loader2, Users, CheckCircle2, Key } from 'lucide-react';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import { createBeneficiary, listBeneficiaries } from '../services/authService';

const EMPTY = { name: '', username: '', email: '', initialPassword: '' };

function formatDate(value) {
  return new Date(value).toLocaleString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export default function OwnerDashboard() {
  const { user } = useAuth();
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [beneficiaries, setBeneficiaries] = useState([]);
  const [listLoading, setListLoading] = useState(true);

  const update = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const load = useCallback(async () => {
    setListLoading(true);
    try {
      const data = await listBeneficiaries();
      setBeneficiaries(data.beneficiaries);
    } catch {
      // ignore list errors silently
    } finally {
      setListLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (form.initialPassword.length < 8) {
      setError('Initial password must be at least 8 characters long.');
      return;
    }
    setLoading(true);
    try {
      await createBeneficiary(form);
      setSuccess('Beneficiary created. They must change their password on first login.');
      setForm(EMPTY);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-ink-50">
      <Navbar />
      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
            <UserPlus size={20} />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-ink-900">Owner dashboard</h1>
            <p className="text-sm text-ink-500">
              Welcome, {user?.name}. Create beneficiary accounts tied to your ownership.
            </p>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-5">
          <section className="card lg:col-span-3">
            <h2 className="mb-1 text-lg font-semibold text-ink-800">Create beneficiary</h2>
            <p className="mb-5 text-sm text-ink-500">
              Beneficiaries cannot self-register. They will log in with the credentials below
              and must change their password on first login.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              {error && <div className="alert-error">{error}</div>}
              {success && (
                <div className="alert-success flex items-center gap-2">
                  <CheckCircle2 size={16} /> {success}
                </div>
              )}

              <div>
                <label className="field-label" htmlFor="b-name">Full name</label>
                <input id="b-name" className="field-input" value={form.name} onChange={update('name')} required />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="field-label" htmlFor="b-username">Username</label>
                  <input id="b-username" className="field-input" value={form.username} onChange={update('username')} required />
                </div>
                <div>
                  <label className="field-label" htmlFor="b-email">Email</label>
                  <input id="b-email" type="email" className="field-input" value={form.email} onChange={update('email')} required />
                </div>
              </div>
              <div>
                <label className="field-label" htmlFor="b-pass">
                  Initial password
                </label>
                <input
                  id="b-pass"
                  type="password"
                  className="field-input"
                  value={form.initialPassword}
                  onChange={update('initialPassword')}
                  required
                />
                <p className="mt-1.5 text-xs text-ink-400">
                  The beneficiary will be required to change this on first login.
                </p>
              </div>

              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={16} />}
                {loading ? 'Creating…' : 'Create beneficiary'}
              </button>
            </form>
          </section>

          <section className="card lg:col-span-2">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-ink-800">
              <Users size={18} /> Your beneficiaries
            </h2>
            {listLoading ? (
              <div className="flex items-center justify-center gap-2 py-10 text-sm text-ink-500">
                <Loader2 size={16} className="animate-spin" /> Loading…
              </div>
            ) : beneficiaries.length === 0 ? (
              <p className="py-10 text-center text-sm text-ink-500">
                No beneficiaries yet. Create one to see it here.
              </p>
            ) : (
              <ul className="space-y-3">
                {beneficiaries.map((b) => (
                  <li key={b.id} className="rounded-xl border border-ink-100 p-4">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-ink-800">{b.name}</span>
                      {b.mustChangePassword ? (
                        <span className="badge bg-amber-50 text-amber-700">
                          <Key size={12} className="mr-1" /> Pending change
                        </span>
                      ) : (
                        <span className="badge bg-green-50 text-green-700">Active</span>
                      )}
                    </div>
                    <div className="mt-1 text-sm text-ink-500">@{b.username} · {b.email}</div>
                    <div className="mt-0.5 text-xs text-ink-400">Created {formatDate(b.createdAt)}</div>

                    <h1>Owner Dashboard</h1>

                    <UploadDocument />
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
