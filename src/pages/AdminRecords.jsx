import { useCallback, useEffect, useState } from 'react';
import {
  FileCheck2,
  Link2,
  Loader2,
  RefreshCw,
  Search,
  ShieldCheck,
} from 'lucide-react';

import Navbar from '../components/Navbar';
import {
  getAdminDocuments,
  getAdminLegacyAllocations,
  reviewAdminDocumentVerification,
} from '../services/legacyService';

function VerificationBadge({ status }) {
  const styles = {
    PENDING: 'bg-amber-50 text-amber-700',
    VERIFIED: 'bg-emerald-50 text-emerald-700',
    FLAGGED: 'bg-orange-50 text-orange-700',
    FAILED: 'bg-red-50 text-red-700',
  };

  return (
    <span className={'rounded-full px-2.5 py-1 text-xs font-semibold ' + (styles[status] || styles.PENDING)}>
      {status || 'PENDING'}
    </span>
  );
}

export default function AdminRecords() {
  const [tab, setTab] = useState('documents');
  const [documents, setDocuments] = useState([]);
  const [allocations, setAllocations] = useState([]);
  const [search, setSearch] = useState('');
  const [verificationFilter, setVerificationFilter] = useState('');
  const [allocationStatus, setAllocationStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setMessage('');

    try {
      if (tab === 'documents') {
        const data = await getAdminDocuments({
          q: search,
          verificationStatus: verificationFilter,
          limit: 100,
        });
        setDocuments(data.documents || []);
      } else {
        const data = await getAdminLegacyAllocations({
          status: allocationStatus,
          limit: 100,
        });
        setAllocations(data.allocations || []);
      }
    } catch (error) {
      setMessage(error.message || 'Unable to load admin records.');
    } finally {
      setLoading(false);
    }
  }, [tab, search, verificationFilter, allocationStatus]);

  useEffect(() => {
    const timer = window.setTimeout(load, 250);
    return () => window.clearTimeout(timer);
  }, [load]);

  const review = async (document, status) => {
    const remarks =
      window.prompt(
        'Optional technical verification remarks. This review does not establish legal authenticity:',
        document.verificationRemarks || ''
      ) ?? document.verificationRemarks ?? '';

    setBusyId(document.id);
    setMessage('');

    try {
      await reviewAdminDocumentVerification(document.id, status, remarks);
      setMessage(
        'Technical document verification status updated. This is not a legal-authenticity determination.'
      );
      await load();
    } catch (error) {
      setMessage(error.message || 'Unable to update document verification.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-indigo-600">
              Administration
            </p>
            <h1 className="mt-1 text-3xl font-bold text-slate-900">
              Documents & Legacy Allocations
            </h1>
            <p className="mt-2 max-w-3xl text-sm text-slate-500">
              Review technical file-integrity metadata and inspect allocation relationships.
              A VERIFIED status here means a technical review was completed; it does not prove legal authenticity.
            </p>
          </div>

          <button type="button" onClick={load} className="btn-secondary">
            <RefreshCw size={15} />
            Refresh
          </button>
        </div>

        {message && (
          <div className="mt-5 rounded-2xl border border-indigo-100 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm">
            {message}
          </div>
        )}

        <div className="mt-6 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setTab('documents')}
            className={tab === 'documents' ? 'btn-primary' : 'btn-secondary'}
          >
            <FileCheck2 size={16} />
            Documents / Verification
          </button>
          <button
            type="button"
            onClick={() => setTab('allocations')}
            className={tab === 'allocations' ? 'btn-primary' : 'btn-secondary'}
          >
            <Link2 size={16} />
            Legacy Allocations
          </button>
        </div>

        {tab === 'documents' ? (
          <>
            <section className="mt-5 grid gap-3 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:grid-cols-[1fr_220px]">
              <label className="relative">
                <Search size={16} className="absolute left-3 top-3.5 text-slate-400" />
                <input
                  className="field-input pl-10"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search document title or filename"
                />
              </label>

              <select
                className="field-input"
                value={verificationFilter}
                onChange={(event) => setVerificationFilter(event.target.value)}
              >
                <option value="">All technical statuses</option>
                <option value="PENDING">Pending</option>
                <option value="VERIFIED">Verified</option>
                <option value="FLAGGED">Flagged</option>
                <option value="FAILED">Failed</option>
              </select>
            </section>

            <section className="mt-5 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
              {loading ? (
                <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-500">
                  <Loader2 size={18} className="animate-spin" />
                  Loading documents…
                </div>
              ) : documents.length === 0 ? (
                <div className="py-16 text-center text-sm text-slate-400">
                  No documents match the current filters.
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {documents.map((document) => (
                    <article key={document.id} className="p-5">
                      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h2 className="font-semibold text-slate-900">{document.title}</h2>
                            <VerificationBadge status={document.verificationStatus} />
                          </div>
                          <p className="mt-1 text-sm text-slate-500">
                            {document.originalName} · {document.category} · {document.recordType}
                          </p>
                          <p className="mt-1 text-xs text-slate-400">
                            Owner: {document.owner?.name || 'Unknown'} ({document.owner?.email || 'No email'})
                          </p>
                          <p className="mt-2 break-all font-mono text-[11px] text-slate-400">
                            SHA-256: {document.sha256 || 'Not recorded for this older upload'}
                          </p>
                          {document.verificationRemarks && (
                            <p className="mt-2 text-xs leading-5 text-slate-500">
                              Review remarks: {document.verificationRemarks}
                            </p>
                          )}
                        </div>

                        <div className="flex flex-wrap gap-2">
                          {['VERIFIED', 'FLAGGED', 'FAILED', 'PENDING'].map((status) => (
                            <button
                              type="button"
                              key={status}
                              disabled={busyId === document.id}
                              onClick={() => review(document, status)}
                              className="btn-secondary"
                            >
                              {busyId === document.id ? (
                                <Loader2 size={14} className="animate-spin" />
                              ) : (
                                <ShieldCheck size={14} />
                              )}
                              {status}
                            </button>
                          ))}
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </>
        ) : (
          <>
            <section className="mt-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <select
                className="field-input max-w-xs"
                value={allocationStatus}
                onChange={(event) => setAllocationStatus(event.target.value)}
              >
                <option value="">All allocation statuses</option>
                {['ACTIVE', 'PENDING', 'RELEASED', 'CLAIMED', 'REVOKED', 'EXPIRED'].map((status) => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </section>

            <section className="mt-5 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
              {loading ? (
                <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-500">
                  <Loader2 size={18} className="animate-spin" />
                  Loading allocations…
                </div>
              ) : allocations.length === 0 ? (
                <div className="py-16 text-center text-sm text-slate-400">
                  No legacy allocations match this filter.
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {allocations.map((allocation) => (
                    <article key={allocation.id} className="p-5">
                      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
                        <div>
                          <p className="font-semibold text-slate-900">
                            {allocation.asset?.title || 'Legacy asset'}
                          </p>
                          <p className="mt-1 text-sm text-slate-500">
                            {allocation.allocatedBy?.name || 'User'} → {allocation.allocatedTo?.name || 'User'}
                          </p>
                          <p className="mt-1 text-xs text-slate-400">
                            {allocation.releaseCondition} · View: {allocation.permissions?.view ? 'Yes' : 'No'} · Download: {allocation.permissions?.download ? 'Yes' : 'No'}
                          </p>
                        </div>
                        <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
                          {allocation.status}
                        </span>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}
