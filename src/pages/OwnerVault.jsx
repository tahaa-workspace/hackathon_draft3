import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Briefcase,
  CreditCard,
  Eye,
  FileText,
  FolderLock,
  Loader2,
  Save,
  Search,
  Share2,
  ShieldCheck,
  Users,
  X,
} from 'lucide-react';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import { listBeneficiaries } from '../services/authService';

const TABS = [
  { value: 'ALL', label: 'All' },
  { value: 'ASSET', label: 'Assets' },
  { value: 'LIABILITY', label: 'Liabilities' },
  { value: 'GENERAL', label: 'General' },
];

function normalizedType(document) {
  return document.recordType || 'GENERAL';
}

function typeLabel(type) {
  if (type === 'ASSET') return 'Asset';
  if (type === 'LIABILITY') return 'Liability';
  return 'General';
}

function typeStyle(type) {
  if (type === 'ASSET') return 'bg-emerald-50 text-emerald-700';
  if (type === 'LIABILITY') return 'bg-rose-50 text-rose-700';
  return 'bg-slate-100 text-slate-600';
}

function categoryStyle(category) {
  const styles = {
    Personal: 'bg-blue-50 text-blue-700',
    Financial: 'bg-emerald-50 text-emerald-700',
    Legal: 'bg-violet-50 text-violet-700',
    Insurance: 'bg-amber-50 text-amber-700',
    Property: 'bg-cyan-50 text-cyan-700',
    Family: 'bg-pink-50 text-pink-700',
    Other: 'bg-ink-100 text-ink-600',
  };
  return styles[category] || styles.Other;
}

function TypeIcon({ type, size = 18 }) {
  if (type === 'ASSET') return <Briefcase size={size} />;
  if (type === 'LIABILITY') return <CreditCard size={size} />;
  return <FileText size={size} />;
}

function formatDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export default function OwnerVault() {
  const { token } = useAuth();
  const [documents, setDocuments] = useState([]);
  const [beneficiaries, setBeneficiaries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('ALL');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('ALL');
  const [managingId, setManagingId] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [saving, setSaving] = useState(false);
  const [accessMessage, setAccessMessage] = useState('');

  const loadVault = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const [documentsResponse, beneficiaryData] = await Promise.all([
        fetch('/api/documents', {
          headers: { Authorization: `Bearer ${token}` },
        }),
        listBeneficiaries(),
      ]);
      const documentData = await documentsResponse.json();
      if (!documentsResponse.ok) {
        throw new Error(documentData.message || 'Failed to load vault records.');
      }
      setDocuments(documentData.documents || []);
      setBeneficiaries(beneficiaryData.beneficiaries || []);
    } catch (loadError) {
      setError(loadError.message || 'Unable to load your vault.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadVault();
  }, [loadVault]);

  const counts = useMemo(() => {
    const result = { ALL: documents.length, ASSET: 0, LIABILITY: 0, GENERAL: 0 };
    documents.forEach((document) => {
      result[normalizedType(document)] += 1;
    });
    return result;
  }, [documents]);

  const categories = useMemo(
    () => [...new Set(documents.map((document) => document.category).filter(Boolean))].sort(),
    [documents]
  );

  const visibleDocuments = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return documents.filter((document) => {
      const type = normalizedType(document);
      const matchesTab = activeTab === 'ALL' || type === activeTab;
      const matchesCategory = category === 'ALL' || document.category === category;
      const matchesSearch = !needle || [document.title, document.originalName, document.category]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(needle));
      return matchesTab && matchesCategory && matchesSearch;
    });
  }, [documents, activeTab, category, search]);

  const viewDocument = async (documentId) => {
    try {
      setError('');
      const response = await fetch(`/api/documents/${documentId}/access`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        let message = 'Unable to access vault record.';
        try {
          const data = await response.json();
          message = data.message || message;
        } catch {
          // Binary responses do not need JSON parsing.
        }
        throw new Error(message);
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (viewError) {
      setError(viewError.message || 'Unable to access vault record.');
    }
  };

  const openAccess = (document) => {
    setManagingId(document.id);
    setSelectedIds(document.assignedBeneficiaryIds || []);
    setAccessMessage('');
  };

  const closeAccess = () => {
    setManagingId(null);
    setSelectedIds([]);
    setAccessMessage('');
  };

  const toggleBeneficiary = (id) => {
    setSelectedIds((current) => current.includes(id)
      ? current.filter((value) => value !== id)
      : [...current, id]);
  };

  const saveAccess = async (documentId) => {
    setSaving(true);
    setError('');
    setAccessMessage('');
    try {
      const response = await fetch(`/api/documents/${documentId}/beneficiaries`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ beneficiaryIds: selectedIds }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to update access.');
      setDocuments((current) => current.map((document) =>
        document.id === documentId ? data.document : document
      ));
      setAccessMessage('Beneficiary assignment updated successfully.');
    } catch (saveError) {
      setError(saveError.message || 'Failed to update access.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-ink-50">
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
        <div className="mb-7 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-brand-100 bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700">
              <ShieldCheck size={14} /> Owner Vault
            </div>
            <h1 className="mt-3 text-3xl font-bold tracking-tight text-ink-900">My Vault</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-500">
              Review your encrypted asset, liability, and general records. Classification changes organization only; your existing encryption and beneficiary permissions remain unchanged.
            </p>
          </div>
          <div className="rounded-2xl border border-ink-100 bg-white px-5 py-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wider text-ink-400">Total records</p>
            <p className="mt-1 text-3xl font-bold text-ink-900">{counts.ALL}</p>
          </div>
        </div>

        <section className="mb-6 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700">Assets</p>
                <p className="mt-2 text-3xl font-bold text-ink-900">{counts.ASSET}</p>
              </div>
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700"><Briefcase size={20} /></div>
            </div>
          </div>
          <div className="rounded-2xl border border-rose-100 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-rose-700">Liabilities</p>
                <p className="mt-2 text-3xl font-bold text-ink-900">{counts.LIABILITY}</p>
              </div>
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-rose-50 text-rose-700"><CreditCard size={20} /></div>
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-600">General</p>
                <p className="mt-2 text-3xl font-bold text-ink-900">{counts.GENERAL}</p>
              </div>
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-600"><FileText size={20} /></div>
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-card">
          <div className="border-b border-ink-100 px-5 py-5 sm:px-6">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-700"><FolderLock size={20} /></div>
              <div>
                <h2 className="font-semibold text-ink-900">Vault records</h2>
                <p className="text-xs text-ink-500">Filter records without changing how they are stored or shared.</p>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              {TABS.map((tab) => (
                <button
                  key={tab.value}
                  type="button"
                  onClick={() => {
                    setActiveTab(tab.value);
                    closeAccess();
                  }}
                  className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                    activeTab === tab.value
                      ? 'bg-brand-600 text-white shadow-sm'
                      : 'border border-ink-100 bg-white text-ink-600 hover:bg-ink-50'
                  }`}
                >
                  {tab.label} <span className="ml-1 opacity-75">{counts[tab.value]}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-3 border-b border-ink-100 bg-ink-50/40 px-5 py-4 sm:px-6 md:grid-cols-[1fr_220px]">
            <label className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search title, file or category"
                className="w-full rounded-xl border border-ink-100 bg-white py-2.5 pl-10 pr-3 text-sm text-ink-800 outline-none transition focus:border-brand-300 focus:ring-2 focus:ring-brand-100"
              />
            </label>
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              className="rounded-xl border border-ink-100 bg-white px-3 py-2.5 text-sm text-ink-700 outline-none"
            >
              <option value="ALL">All categories</option>
              {categories.map((value) => <option key={value} value={value}>{value}</option>)}
            </select>
          </div>

          {error && <div className="border-b border-red-100 bg-red-50 px-5 py-3 text-sm text-red-700">{error}</div>}

          {loading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-sm text-ink-500">
              <Loader2 size={18} className="animate-spin" /> Loading vault records...
            </div>
          ) : visibleDocuments.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <FolderLock size={32} className="mx-auto text-ink-300" />
              <p className="mt-3 font-semibold text-ink-700">No matching vault records</p>
              <p className="mt-1 text-sm text-ink-400">Try another tab/filter or upload a record from the Owner dashboard.</p>
            </div>
          ) : (
            <div className="divide-y divide-ink-100">
              {visibleDocuments.map((document) => {
                const type = normalizedType(document);
                const assignedCount = document.assignedBeneficiaryIds?.length || 0;
                const isManaging = managingId === document.id;
                return (
                  <article key={document.id}>
                    <div className="p-5 sm:p-6">
                      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                        <div className="flex min-w-0 gap-4">
                          <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${typeStyle(type)}`}>
                            <TypeIcon type={type} size={20} />
                          </div>
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="max-w-xl truncate font-semibold text-ink-900">{document.title}</h3>
                              <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${typeStyle(type)}`}>{typeLabel(type)}</span>
                              <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${categoryStyle(document.category)}`}>{document.category}</span>
                            </div>
                            <p className="mt-1 max-w-xl truncate text-xs text-ink-400">{document.originalName}</p>
                            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs text-ink-500">
                              <span>Uploaded {formatDate(document.createdAt)}</span>
                              <span className="flex items-center gap-1.5 font-medium text-brand-700"><Users size={13} />{assignedCount === 0 ? 'Private' : `Assigned to ${assignedCount}`}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex shrink-0 gap-2">
                          <button type="button" onClick={() => viewDocument(document.id)} className="btn-primary !px-3.5 !py-2"><Eye size={15} /> View</button>
                          <button type="button" onClick={() => isManaging ? closeAccess() : openAccess(document)} className="btn-secondary !px-3.5 !py-2"><Share2 size={15} /> {isManaging ? 'Close' : 'Manage access'}</button>
                        </div>
                      </div>
                    </div>

                    {isManaging && (
                      <div className="border-t border-ink-100 bg-ink-50/60 px-5 py-5 sm:px-6">
                        <p className="text-sm font-semibold text-ink-800">Assigned beneficiaries</p>
                        <p className="mt-1 text-xs text-ink-500">Classification does not grant access. Only beneficiaries selected here can receive this record after the Legacy Access workflow is approved.</p>

                        {beneficiaries.length === 0 ? (
                          <div className="mt-4 rounded-xl border border-dashed border-ink-200 bg-white px-4 py-5 text-center text-sm text-ink-500">Create a beneficiary before assigning records.</div>
                        ) : (
                          <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                            {beneficiaries.map((beneficiary) => {
                              const selected = selectedIds.includes(beneficiary.id);
                              return (
                                <label key={beneficiary.id} className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-3 transition ${selected ? 'border-brand-200 bg-brand-50' : 'border-ink-100 bg-white hover:border-ink-200'}`}>
                                  <input type="checkbox" checked={selected} onChange={() => toggleBeneficiary(beneficiary.id)} className="h-4 w-4 accent-brand-600" />
                                  <div className="min-w-0">
                                    <p className="truncate text-sm font-semibold text-ink-800">{beneficiary.name}</p>
                                    <p className="truncate text-xs text-ink-400">@{beneficiary.username}</p>
                                  </div>
                                </label>
                              );
                            })}
                          </div>
                        )}

                        {accessMessage && <div className="alert-success mt-4">{accessMessage}</div>}
                        <div className="mt-4 flex gap-2">
                          <button type="button" onClick={() => saveAccess(document.id)} disabled={saving || beneficiaries.length === 0} className="btn-primary">
                            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} {saving ? 'Saving...' : 'Save access'}
                          </button>
                          <button type="button" onClick={closeAccess} className="btn-secondary"><X size={15} /> Cancel</button>
                        </div>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
