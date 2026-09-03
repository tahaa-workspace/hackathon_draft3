import { useCallback, useEffect, useState } from 'react';
import { Check, X, Loader2, ShieldCheck, Inbox, Eye, FileText } from 'lucide-react';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import {
  approveUser,
  getAadhaarReviewUrl,
  getPendingRegistrations,
  rejectUser,
} from '../services/authService';

function StatusBadge({ status }) {
  const map = {
    PENDING: 'bg-amber-50 text-amber-700',
    ACTIVE: 'bg-green-50 text-green-700',
    REJECTED: 'bg-red-50 text-red-700',
  };
  return <span className={`badge ${map[status] || 'bg-ink-100 text-ink-600'}`}>{status}</span>;
}

function formatDate(value) {
  return new Date(value).toLocaleString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function formatFileSize(bytes) {
  if (!bytes) return '';
  if (bytes < 1024 * 1024) return `${Math.ceil(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function AdminDashboard() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [documentLoadingId, setDocumentLoadingId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getPendingRegistrations();
      setItems(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleApprove = async (id) => {
    setActionLoadingId(id);
    try {
      await approveUser(id);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleReject = async (id) => {
    setActionLoadingId(id);
    try {
      await rejectUser(id);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleViewAadhaar = async (item) => {
    setDocumentLoadingId(item.id);
    setError('');
    try {
      const { url } = await getAadhaarReviewUrl(item.id);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (err) {
      setError(err.message);
    } finally {
      setDocumentLoadingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-ink-50">
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="mb-1 text-sm font-semibold text-brand-600">Administration</p>
            <h1 className="text-2xl font-bold text-ink-900">Registration approvals</h1>
            <p className="mt-1 text-sm text-ink-500">Review identity documents and approve new owner accounts.</p>
          </div>
          <div className="flex items-center gap-3 rounded-xl border border-ink-100 bg-white px-4 py-3 shadow-sm">
            <ShieldCheck size={19} className="text-brand-600" />
            <div>
              <p className="text-xs text-ink-400">Signed in as</p>
              <p className="text-sm font-semibold text-ink-800">{user?.name || user?.username}</p>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        )}

        <section className="card overflow-hidden p-0">
          <div className="flex items-center justify-between border-b border-ink-100 px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                <Inbox size={18} />
              </div>
              <div>
                <h2 className="font-semibold text-ink-900">Pending registrations</h2>
                <p className="text-xs text-ink-400">{items.length} waiting for review</p>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center gap-2 px-5 py-16 text-sm text-ink-500">
              <Loader2 size={18} className="animate-spin" /> Loading registrations…
            </div>
          ) : items.length === 0 ? (
            <div className="px-5 py-16 text-center">
              <ShieldCheck size={36} className="mx-auto mb-3 text-green-500" />
              <p className="font-semibold text-ink-800">All caught up</p>
              <p className="mt-1 text-sm text-ink-400">There are no pending registration requests.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-ink-100">
                <thead className="bg-ink-50/70">
                  <tr className="text-left text-xs font-semibold uppercase tracking-wide text-ink-400">
                    <th className="px-5 py-3">Applicant</th>
                    <th className="px-5 py-3">Role</th>
                    <th className="px-5 py-3">Submitted</th>
                    <th className="px-5 py-3">Identity document</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-100 bg-white">
                  {items.map((item) => (
                    <tr key={item.id} className="align-middle transition hover:bg-ink-50/40">
                      <td className="px-5 py-4">
                        <p className="font-semibold text-ink-800">{item.name}</p>
                        <p className="text-xs text-ink-400">{item.email}</p>
                        <p className="text-xs text-ink-400">@{item.username}</p>
                      </td>
                      <td className="px-5 py-4 text-sm text-ink-600">{item.role}</td>
                      <td className="px-5 py-4 text-sm text-ink-500">{formatDate(item.createdAt)}</td>
                      <td className="px-5 py-4">
                        {item.aadhaar ? (
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                              <FileText size={16} />
                            </div>
                            <div className="min-w-0">
                              <p className="max-w-[180px] truncate text-sm font-medium text-ink-700">{item.aadhaar.originalName || 'Aadhaar document'}</p>
                              <p className="text-xs text-ink-400">{formatFileSize(item.aadhaar.bytes)}</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleViewAadhaar(item)}
                              disabled={documentLoadingId === item.id}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-ink-100 px-2.5 py-2 text-xs font-semibold text-ink-600 transition hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700 disabled:opacity-50"
                            >
                              {documentLoadingId === item.id ? <Loader2 size={14} className="animate-spin" /> : <Eye size={14} />}
                              View
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-ink-400">No document</span>
                        )}
                      </td>
                      <td className="px-5 py-4"><StatusBadge status={item.status} /></td>
                      <td className="px-5 py-4">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => handleReject(item.id)}
                            disabled={actionLoadingId === item.id}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                          >
                            <X size={14} /> Reject
                          </button>
                          <button
                            type="button"
                            onClick={() => handleApprove(item.id)}
                            disabled={actionLoadingId === item.id}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-brand-700 disabled:opacity-50"
                          >
                            {actionLoadingId === item.id ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                            Approve
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
