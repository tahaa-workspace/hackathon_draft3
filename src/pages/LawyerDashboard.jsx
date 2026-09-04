import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Eye,
  FileText,
  Loader2,
  PauseCircle,
  RefreshCw,
  Scale,
  ShieldCheck,
} from 'lucide-react';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import {
  getClaimFileUrl,
  getLawyerClaims,
  reviewClaimAsLawyer,
} from '../services/legacyService';

const FILTERS = [
  ['ALL', 'All cases'],
  ['UNDER_LAWYER_REVIEW', 'Under Review'],
  ['MORE_INFORMATION_REQUIRED', 'More Information Required'],
  ['APPROVED_INFORMATION_RELEASED', 'Completed'],
  ['ON_HOLD_DISPUTED', 'On Hold'],
];

function statusLabel(status) {
  const labels = {
    UNDER_LAWYER_REVIEW: 'Under Lawyer Review',
    MORE_INFORMATION_REQUIRED: 'More Information Required',
    APPROVED_INFORMATION_RELEASED: 'Completed / Released',
    ON_HOLD_DISPUTED: 'On Hold / External Resolution',
  };
  return labels[status] || status;
}

function Badge({ status }) {
  const styles = {
    UNDER_LAWYER_REVIEW: 'bg-violet-50 text-violet-700',
    MORE_INFORMATION_REQUIRED: 'bg-orange-50 text-orange-700',
    APPROVED_INFORMATION_RELEASED: 'bg-green-50 text-green-700',
    ON_HOLD_DISPUTED: 'bg-red-50 text-red-700',
  };
  return <span className={`badge ${styles[status] || 'bg-ink-100 text-ink-600'}`}>{statusLabel(status)}</span>;
}

export default function LawyerDashboard() {
  const { user } = useAuth();
  const [claims, setClaims] = useState([]);
  const [filter, setFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [workingId, setWorkingId] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setClaims(await getLawyerClaims());
    } catch (err) {
      setError(err.message || 'Unable to load assigned Legacy Access Claims.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const stats = useMemo(() => ({
    pending: claims.filter((c) => c.status === 'UNDER_LAWYER_REVIEW').length,
    moreInfo: claims.filter((c) => c.status === 'MORE_INFORMATION_REQUIRED').length,
    completed: claims.filter((c) => c.status === 'APPROVED_INFORMATION_RELEASED').length,
    hold: claims.filter((c) => c.status === 'ON_HOLD_DISPUTED').length,
  }), [claims]);

  const visibleClaims = filter === 'ALL' ? claims : claims.filter((claim) => claim.status === filter);

  const openEvidence = async (claimId, kind) => {
    try {
      const { url } = await getClaimFileUrl(claimId, kind);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (err) {
      setError(err.message);
    }
  };

  const review = async (claim, action) => {
    const promptText = action === 'APPROVE'
      ? 'Professional review remarks (optional).'
      : action === 'REQUEST_MORE_INFORMATION'
        ? 'What additional information or clearer evidence is required?'
        : 'State the concern or reason external resolution is required.';
    const remarks = window.prompt(promptText, '') ?? null;
    if (remarks === null) return;

    const confirmation = action !== 'REQUEST_MORE_INFORMATION'
      ? window.confirm(
          action === 'APPROVE'
            ? 'Complete professional review and release only the Owner-assigned information to this Beneficiary?'
            : 'Place this Legacy Access Claim on hold? Assigned information will remain locked.'
        )
      : true;
    if (!confirmation) return;

    setWorkingId(claim.id);
    setError('');
    try {
      await reviewClaimAsLawyer(claim.id, action, remarks);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setWorkingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-ink-50">
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-brand-600">Lawyer workspace</p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight text-ink-900">Legacy Access case management</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-ink-500">
              Welcome, {user?.name || 'Lawyer'}. Review only cases assigned by Admin. Your review controls release of stored information; it does not determine inheritance or legal title.
            </p>
          </div>
          <button onClick={load} disabled={loading} className="btn-secondary self-start">
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>

        {error && <div className="alert-error mb-5">{error}</div>}

        <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            [Clock3, 'Under Review', stats.pending],
            [AlertTriangle, 'More Information', stats.moreInfo],
            [CheckCircle2, 'Completed', stats.completed],
            [PauseCircle, 'On Hold', stats.hold],
          ].map(([Icon, label, value]) => (
            <div key={label} className="rounded-2xl border border-ink-100 bg-white p-5 shadow-sm">
              <Icon size={20} className="text-brand-600" />
              <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-ink-400">{label}</p>
              <p className="mt-1 text-3xl font-bold text-ink-900">{value}</p>
            </div>
          ))}
        </div>

        <div className="mb-5 flex flex-wrap gap-2">
          {FILTERS.map(([value, label]) => (
            <button
              key={value}
              onClick={() => setFilter(value)}
              className={`rounded-xl px-3 py-2 text-xs font-semibold transition ${
                filter === value ? 'bg-brand-600 text-white' : 'border border-ink-100 bg-white text-ink-600 hover:bg-ink-50'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="card flex items-center justify-center gap-2 py-16 text-sm text-ink-500">
            <Loader2 size={18} className="animate-spin" /> Loading assigned cases…
          </div>
        ) : visibleClaims.length === 0 ? (
          <div className="card py-16 text-center">
            <Scale size={34} className="mx-auto text-ink-300" />
            <p className="mt-3 font-semibold text-ink-800">No cases in this section</p>
            <p className="mt-1 text-sm text-ink-400">Only Admin-assigned Legacy Access Claims appear here.</p>
          </div>
        ) : (
          <div className="space-y-5">
            {visibleClaims.map((claim) => (
              <section key={claim.id} className="overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-sm">
                <div className="flex flex-col gap-3 border-b border-ink-100 bg-ink-50/50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <ShieldCheck size={17} className="text-brand-600" />
                      <h2 className="font-semibold text-ink-900">{claim.beneficiary?.name} → {claim.owner?.name}</h2>
                    </div>
                    <p className="mt-1 text-xs text-ink-400">Professional Legacy Access Review · {claim.id}</p>
                  </div>
                  <Badge status={claim.status} />
                </div>

                <div className="grid gap-6 p-5 lg:grid-cols-2">
                  <div>
                    <h3 className="text-sm font-semibold text-ink-800">Case identities and evidence</h3>
                    <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
                      <div><dt className="text-xs text-ink-400">Owner</dt><dd className="font-medium text-ink-700">{claim.owner?.name}<br />{claim.owner?.email}</dd></div>
                      <div><dt className="text-xs text-ink-400">Beneficiary</dt><dd className="font-medium text-ink-700">{claim.beneficiary?.name}<br />{claim.beneficiary?.email}</dd></div>
                      <div><dt className="text-xs text-ink-400">Identity proof</dt><dd className="font-medium text-ink-700">{claim.identityProofType}</dd></div>
                      <div><dt className="text-xs text-ink-400">Admin check</dt><dd className="font-medium text-ink-700">{claim.adminReview?.reviewedAt ? 'Completed' : 'Not recorded'}</dd></div>
                    </dl>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <button onClick={() => openEvidence(claim.id, 'death-certificate')} className="btn-secondary"><FileText size={15} /> Death certificate <Eye size={14} /></button>
                      <button onClick={() => openEvidence(claim.id, 'identity-proof')} className="btn-secondary"><FileText size={15} /> Identity proof <Eye size={14} /></button>
                      {claim.supportingDocument?.available && (
                        <button onClick={() => openEvidence(claim.id, 'supporting-document')} className="btn-secondary"><FileText size={15} /> Supporting document <Eye size={14} /></button>
                      )}
                    </div>
                    {claim.adminReview?.remarks && <p className="mt-4 text-sm text-ink-600"><span className="font-semibold">Admin remarks:</span> {claim.adminReview.remarks}</p>}
                    {claim.beneficiaryRemarks && <p className="mt-2 text-sm text-ink-600"><span className="font-semibold">Beneficiary remarks:</span> {claim.beneficiaryRemarks}</p>}
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold text-ink-800">Owner-assigned records for this Beneficiary</h3>
                    <p className="mt-1 text-xs text-ink-400">The Lawyer sees metadata for the pre-assigned records; release remains controlled by the final workflow.</p>
                    <div className="mt-3 space-y-2">
                      {(claim.assignedDocuments || []).length === 0 ? (
                        <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-700">No assigned documents were found. Do not approve until clarified.</p>
                      ) : (
                        claim.assignedDocuments.map((doc) => (
                          <div key={doc.id} className="rounded-xl border border-ink-100 px-3 py-3">
                            <p className="text-sm font-semibold text-ink-800">{doc.title}</p>
                            <p className="text-xs text-ink-400">{doc.category} · {doc.originalName}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>

                {['UNDER_LAWYER_REVIEW', 'MORE_INFORMATION_REQUIRED'].includes(claim.status) && (
                  <div className="flex flex-wrap justify-end gap-2 border-t border-ink-100 bg-ink-50/30 px-5 py-4">
                    <button disabled={workingId === claim.id} onClick={() => review(claim, 'REQUEST_MORE_INFORMATION')} className="rounded-lg border border-orange-200 px-3 py-2 text-xs font-semibold text-orange-700 hover:bg-orange-50">Request More Information</button>
                    <button disabled={workingId === claim.id} onClick={() => review(claim, 'HOLD')} className="rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50"><PauseCircle size={14} className="inline" /> Hold / Raise Concern</button>
                    <button disabled={workingId === claim.id} onClick={() => review(claim, 'APPROVE')} className="btn-primary"><CheckCircle2 size={15} /> Complete / Approve Review</button>
                  </div>
                )}

                {claim.lawyerReview?.remarks && (
                  <div className="border-t border-ink-100 px-5 py-3 text-sm text-ink-600"><span className="font-semibold">Latest professional remarks:</span> {claim.lawyerReview.remarks}</div>
                )}
              </section>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
