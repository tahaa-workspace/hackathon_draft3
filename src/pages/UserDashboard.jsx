import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Archive,
  FilePlus2,
  Loader2,
  Search,
  Send,
  ShieldCheck,
  Users,
} from 'lucide-react';

import Navbar from '../components/Navbar';
import {
  createLegacyAllocation,
  getOutgoingAllocations,
  searchAllocationUsers,
} from '../services/legacyService';

const API_BASE = '/api';

function authHeaders() {
  const token = sessionStorage.getItem('dl_token');
  return token ? { Authorization: 'Bearer ' + token } : {};
}

async function loadDocuments() {
  const response = await fetch(API_BASE + '/documents', {
    headers: authHeaders(),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || 'Unable to load assets.');
  return data.documents || [];
}

async function uploadDocument(form) {
  const body = new FormData();
  body.append('title', form.title);
  body.append('category', form.category);
  body.append('recordType', form.recordType);
  body.append('file', form.file);

  const response = await fetch(API_BASE + '/documents', {
    method: 'POST',
    headers: authHeaders(),
    body,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || 'Unable to upload asset.');
  return data.document;
}

export default function UserDashboard() {
  const [documents, setDocuments] = useState([]);
  const [outgoing, setOutgoing] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  const [uploadForm, setUploadForm] = useState({
    title: '',
    category: 'Personal',
    recordType: 'ASSET',
    file: null,
  });
  const [uploading, setUploading] = useState(false);

  const [allocationAssetId, setAllocationAssetId] = useState('');
  const [query, setQuery] = useState('');
  const [matches, setMatches] = useState([]);
  const [recipient, setRecipient] = useState(null);
  const [searching, setSearching] = useState(false);
  const [allocating, setAllocating] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [docs, allocations] = await Promise.all([
        loadDocuments(),
        getOutgoingAllocations(),
      ]);
      setDocuments(docs);
      setOutgoing(allocations);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (query.trim().length < 2) {
      setMatches([]);
      return;
    }

    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        setMatches(await searchAllocationUsers(query.trim()));
      } catch (error) {
        setMessage(error.message);
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  const handleUpload = async (event) => {
    event.preventDefault();
    if (!uploadForm.file) {
      setMessage('Select a document to upload.');
      return;
    }

    setUploading(true);
    setMessage('');
    try {
      await uploadDocument(uploadForm);
      setUploadForm({
        title: '',
        category: 'Personal',
        recordType: 'ASSET',
        file: null,
      });
      setMessage('Asset uploaded securely.');
      await refresh();
    } catch (error) {
      setMessage(error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleAllocate = async (event) => {
    event.preventDefault();
    if (!allocationAssetId || !recipient) {
      setMessage('Select an asset and recipient.');
      return;
    }

    setAllocating(true);
    setMessage('');
    try {
      await createLegacyAllocation({
        assetId: allocationAssetId,
        allocatedTo: recipient.id,
        permissions: { view: true, download: false },
        releaseCondition: 'LEGACY_CLAIM',
      });
      setRecipient(null);
      setQuery('');
      setMatches([]);
      setAllocationAssetId('');
      setMessage('Legacy access allocated successfully.');
      await refresh();
    } catch (error) {
      setMessage(error.message);
    } finally {
      setAllocating(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      <main className="mx-auto max-w-7xl space-y-7 px-4 py-8 sm:px-6 lg:px-8">
        <section className="rounded-3xl bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 p-7 text-white shadow-xl">
          <div className="flex flex-col justify-between gap-5 md:flex-row md:items-center">
            <div>
              <div className="flex items-center gap-2 text-cyan-200">
                <ShieldCheck size={17} />
                <span className="text-xs font-bold uppercase tracking-[0.16em]">Unified account</span>
              </div>
              <h1 className="mt-3 text-3xl font-bold">User Dashboard</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
                Manage assets you own and allocate selected legacy access to other verified users. Incoming allocations are available separately in Legacy Access.
              </p>
            </div>

            <Link
              to="/legacy-access"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-semibold text-indigo-800 shadow-sm"
            >
              <Archive size={17} />
              Open Legacy Access
            </Link>
          </div>
        </section>

        {message && (
          <div className="rounded-2xl border border-indigo-100 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm">
            {message}
          </div>
        )}

        <section className="grid gap-6 lg:grid-cols-2">
          <form onSubmit={handleUpload} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <FilePlus2 className="text-indigo-600" size={21} />
              <div>
                <h2 className="font-semibold text-slate-900">Add an asset</h2>
                <p className="text-xs text-slate-500">Files remain encrypted in the vault.</p>
              </div>
            </div>

            <div className="mt-5 grid gap-3">
              <input
                className="field-input"
                placeholder="Asset title"
                value={uploadForm.title}
                onChange={(e) => setUploadForm((v) => ({ ...v, title: e.target.value }))}
                required
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <select
                  className="field-input"
                  value={uploadForm.category}
                  onChange={(e) => setUploadForm((v) => ({ ...v, category: e.target.value }))}
                >
                  {['Personal','Financial','Legal','Insurance','Property','Family','Other'].map((value) => (
                    <option key={value} value={value}>{value}</option>
                  ))}
                </select>
                <select
                  className="field-input"
                  value={uploadForm.recordType}
                  onChange={(e) => setUploadForm((v) => ({ ...v, recordType: e.target.value }))}
                >
                  <option value="ASSET">Asset</option>
                  <option value="LIABILITY">Liability</option>
                  <option value="GENERAL">General</option>
                </select>
              </div>
              <input
                type="file"
                className="field-input"
                accept="application/pdf,image/jpeg,image/png"
                onChange={(e) => setUploadForm((v) => ({ ...v, file: e.target.files?.[0] || null }))}
                required
              />
              <button disabled={uploading} className="btn-primary">
                {uploading ? <Loader2 size={16} className="animate-spin" /> : <FilePlus2 size={16} />}
                {uploading ? 'Uploading…' : 'Upload asset'}
              </button>
            </div>
          </form>

          <form onSubmit={handleAllocate} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <Send className="text-indigo-600" size={21} />
              <div>
                <h2 className="font-semibold text-slate-900">Allocate Legacy Access</h2>
                <p className="text-xs text-slate-500">Assign one of your assets to an existing user.</p>
              </div>
            </div>

            <div className="mt-5 space-y-3">
              <select
                className="field-input"
                value={allocationAssetId}
                onChange={(e) => setAllocationAssetId(e.target.value)}
                required
              >
                <option value="">Select asset</option>
                {documents.map((doc) => (
                  <option key={doc.id} value={doc.id}>{doc.title}</option>
                ))}
              </select>

              <label className="relative block">
                <Search size={16} className="absolute left-3 top-3.5 text-slate-400" />
                <input
                  className="field-input pl-10"
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setRecipient(null);
                  }}
                  placeholder="Search user by name, username or email"
                />
              </label>

              {searching && <p className="text-xs text-slate-400">Searching…</p>}

              {matches.length > 0 && !recipient && (
                <div className="max-h-48 overflow-auto rounded-xl border border-slate-200">
                  {matches.map((user) => (
                    <button
                      type="button"
                      key={user.id}
                      onClick={() => {
                        setRecipient(user);
                        setQuery(user.name + ' (@' + user.username + ')');
                        setMatches([]);
                      }}
                      className="flex w-full items-center justify-between border-b border-slate-100 px-3 py-3 text-left last:border-0 hover:bg-slate-50"
                    >
                      <span>
                        <span className="block text-sm font-semibold text-slate-800">{user.name}</span>
                        <span className="text-xs text-slate-400">@{user.username}</span>
                      </span>
                      <Users size={16} className="text-indigo-500" />
                    </button>
                  ))}
                </div>
              )}

              {recipient && (
                <div className="rounded-xl bg-indigo-50 px-3 py-3 text-sm text-indigo-800">
                  Recipient: <strong>{recipient.name}</strong> (@{recipient.username})
                </div>
              )}

              <button disabled={allocating || !recipient || !allocationAssetId} className="btn-primary">
                {allocating ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                {allocating ? 'Allocating…' : 'Confirm allocation'}
              </button>
            </div>
          </form>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">My Assets</h2>
              <p className="text-xs text-slate-500">Assets currently owned by your account.</p>
            </div>
            <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">{documents.length}</span>
          </div>

          {loading ? (
            <div className="py-10 text-center text-sm text-slate-400">Loading…</div>
          ) : documents.length === 0 ? (
            <div className="py-10 text-center text-sm text-slate-400">No assets uploaded yet.</div>
          ) : (
            <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {documents.map((doc) => (
                <article key={doc.id} className="rounded-2xl border border-slate-200 p-4">
                  <p className="font-semibold text-slate-900">{doc.title}</p>
                  <p className="mt-1 text-xs text-slate-500">{doc.category} · {doc.recordType}</p>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Outgoing Legacy Allocations</h2>
          <p className="mt-1 text-xs text-slate-500">Assets you have allocated to other users.</p>

          <div className="mt-5 space-y-3">
            {outgoing.length === 0 ? (
              <p className="text-sm text-slate-400">No outgoing allocations yet.</p>
            ) : outgoing.map((allocation) => (
              <article key={allocation.id} className="flex flex-col justify-between gap-3 rounded-2xl border border-slate-200 p-4 sm:flex-row sm:items-center">
                <div>
                  <p className="font-semibold text-slate-900">{allocation.asset?.title}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    To {allocation.allocatedTo?.name} (@{allocation.allocatedTo?.username}) · {allocation.status}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
