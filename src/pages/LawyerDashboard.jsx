import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Clock3, Eye, FileText, Loader2, RefreshCw, Scale, ShieldCheck, Landmark, CreditCard, FolderOpen, XCircle, MessageSquareMore } from 'lucide-react';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import {
  getAdditionalClaimFile,
  getClaimFileUrl,
  getClaimInformationRequests,
  getLawyerClaims,
  rejectClaim,
  requestClaimInformation,
  reviewClaimAsLawyer,
} from '../services/legacyService';

const FILTERS = [
  ['ALL', 'All cases'],
  ['UNDER_LAWYER_REVIEW', 'Under Review'],
  ['MORE_INFORMATION_REQUIRED', 'Waiting for Beneficiary'],
  ['APPROVED_INFORMATION_RELEASED', 'Completed'],
  ['REJECTED_PLATFORM_CLAIM', 'Rejected'],
];

function statusLabel(status) {
  const labels = {
    UNDER_LAWYER_REVIEW: 'Under Lawyer Review',
    MORE_INFORMATION_REQUIRED: 'Waiting for Beneficiary Information',
    APPROVED_INFORMATION_RELEASED: 'Completed / Released',
    REJECTED_PLATFORM_CLAIM: 'Rejected',
  };
  return labels[status] || status;
}

function Badge({ status }) {
  const styles = {
    UNDER_LAWYER_REVIEW: 'bg-violet-50 text-violet-700',
    MORE_INFORMATION_REQUIRED: 'bg-orange-50 text-orange-700',
    APPROVED_INFORMATION_RELEASED: 'bg-green-50 text-green-700',
    REJECTED_PLATFORM_CLAIM: 'bg-slate-100 text-slate-600',
  };
  return <span className={`badge ${styles[status] || 'bg-ink-100 text-ink-600'}`}>{statusLabel(status)}</span>;
}

function RecordsGroup({ title, icon: Icon, records }) {
  return <div><div className="mb-2 flex items-center gap-2"><Icon size={15} className="text-brand-600" /><p className="text-xs font-semibold uppercase tracking-wide text-ink-500">{title} ({records.length})</p></div>{records.length === 0 ? <p className="rounded-xl bg-ink-50 px-3 py-3 text-xs text-ink-400">No {title.toLowerCase()} assigned.</p> : <div className="space-y-2">{records.map((doc) => <div key={doc.id} className="rounded-xl border border-ink-100 px-3 py-3"><p className="text-sm font-semibold text-ink-800">{doc.title}</p><p className="text-xs text-ink-400">{doc.category} · {doc.originalName}</p></div>)}</div>}</div>;
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
      const data = await getLawyerClaims();
      const enriched = await Promise.all(data.map(async (claim) => ({
        ...claim,
        informationRequests: await getClaimInformationRequests(claim.id).catch(() => []),
      })));
      setClaims(enriched);
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
    rejected: claims.filter((c) => c.status === 'REJECTED_PLATFORM_CLAIM').length,
  }), [claims]);

  const visibleClaims = filter === 'ALL' ? claims : claims.filter((claim) => claim.status === filter);

  const openBlob = async (loader) => {
    try {
      setError('');
      const blob = await loader();
      const fileUrl = URL.createObjectURL(blob);
      const popup = window.open(fileUrl, '_blank', 'noopener,noreferrer');
      if (!popup) {
        URL.revokeObjectURL(fileUrl);
        throw new Error('The browser blocked the document window. Please allow pop-ups for this site.');
      }
      setTimeout(() => URL.revokeObjectURL(fileUrl), 60000);
    } catch (err) {
      setError(err.message || 'Unable to open claim document.');
    }
  };

  const requestInfo = async (claim) => {
    const message = window.prompt('What additional document, information, or clearer evidence is required?', '') ?? null;
    if (message === null) return;
    if (!message.trim()) { setError('Please specify what the Beneficiary must provide.'); return; }
    setWorkingId(claim.id);
    try { await requestClaimInformation(claim.id, message.trim()); await load(); }
    catch (err) { setError(err.message); }
    finally { setWorkingId(null); }
  };

  const reject = async (claim) => {
    const remarks = window.prompt('State the professional reason for rejecting this claim.', '') ?? null;
    if (remarks === null) return;
    if (!remarks.trim()) { setError('A rejection reason is required.'); return; }
    if (!window.confirm('Reject this Legacy Access Claim?')) return;
    setWorkingId(claim.id);
    try { await rejectClaim(claim.id, remarks.trim()); await load(); }
    catch (err) { setError(err.message); }
    finally { setWorkingId(null); }
  };

  const approve = async (claim) => {
    const remarks = window.prompt('Professional review remarks (optional).', '') ?? null;
    if (remarks === null) return;
    if (!window.confirm('Approve this review and release only the Owner-assigned records to the Beneficiary?')) return;
    setWorkingId(claim.id);
    try { await reviewClaimAsLawyer(claim.id, 'APPROVE', remarks); await load(); }
    catch (err) { setError(err.message); }
    finally { setWorkingId(null); }
  };

  return (
    <div className="min-h-screen bg-ink-50">
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-sm font-semibold text-brand-600">Lawyer workspace</p><h1 className="mt-1 text-3xl font-bold tracking-tight text-ink-900">Legacy Access case management</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-ink-500">Welcome, {user?.name || 'Lawyer'}. Review assigned cases using three clear outcomes: approve, reject, or request more information.</p></div><button onClick={load} disabled={loading} className="btn-secondary self-start"><RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> Refresh</button></div>
        {error && <div className="alert-error mb-5">{error}</div>}
        <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[[Clock3, 'Under Review', stats.pending], [AlertTriangle, 'Waiting for Beneficiary', stats.moreInfo], [CheckCircle2, 'Completed', stats.completed], [XCircle, 'Rejected', stats.rejected]].map(([Icon, label, value]) => <div key={label} className="rounded-2xl border border-ink-100 bg-white p-5 shadow-sm"><Icon size={20} className="text-brand-600" /><p className="mt-3 text-xs font-semibold uppercase tracking-wide text-ink-400">{label}</p><p className="mt-1 text-3xl font-bold text-ink-900">{value}</p></div>)}</div>
        <div className="mb-5 flex flex-wrap gap-2">{FILTERS.map(([value, label]) => <button key={value} onClick={() => setFilter(value)} className={`rounded-xl px-3 py-2 text-xs font-semibold transition ${filter === value ? 'bg-brand-600 text-white' : 'border border-ink-100 bg-white text-ink-600 hover:bg-ink-50'}`}>{label}</button>)}</div>
        {loading ? <div className="card flex items-center justify-center gap-2 py-16 text-sm text-ink-500"><Loader2 size={18} className="animate-spin" /> Loading assigned cases…</div> : visibleClaims.length === 0 ? <div className="card py-16 text-center"><Scale size={34} className="mx-auto text-ink-300" /><p className="mt-3 font-semibold text-ink-800">No cases in this section</p></div> : <div className="space-y-5">{visibleClaims.map((claim) => {
          const records = claim.assignedRecords || claim.assignedDocuments || [];
          const assets = records.filter((r) => r.recordType === 'ASSET');
          const liabilities = records.filter((r) => r.recordType === 'LIABILITY');
          const general = records.filter((r) => (r.recordType || 'GENERAL') === 'GENERAL');
          return <section key={claim.id} className="overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-sm">
            <div className="flex flex-col gap-3 border-b border-ink-100 bg-ink-50/50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"><div><div className="flex items-center gap-2"><ShieldCheck size={17} className="text-brand-600" /><h2 className="font-semibold text-ink-900">{claim.beneficiary?.name} → {claim.owner?.name}</h2></div><p className="mt-1 text-xs text-ink-400">Professional Legacy Access Review · {claim.id}</p></div><Badge status={claim.status} /></div>
            <div className="grid gap-6 p-5 lg:grid-cols-2">
              <div><h3 className="text-sm font-semibold text-ink-800">Case identities and evidence</h3><dl className="mt-3 grid grid-cols-2 gap-3 text-sm"><div><dt className="text-xs text-ink-400">Owner</dt><dd className="font-medium text-ink-700">{claim.owner?.name}<br />{claim.owner?.email}</dd></div><div><dt className="text-xs text-ink-400">Beneficiary</dt><dd className="font-medium text-ink-700">{claim.beneficiary?.name}<br />{claim.beneficiary?.email}</dd></div><div><dt className="text-xs text-ink-400">Identity proof</dt><dd className="font-medium text-ink-700">{claim.identityProofType}</dd></div><div><dt className="text-xs text-ink-400">Admin check</dt><dd className="font-medium text-ink-700">{claim.adminReview?.reviewedAt ? 'Completed' : 'Not recorded'}</dd></div></dl><div className="mt-4 flex flex-wrap gap-2"><button onClick={() => openBlob(() => getClaimFileUrl(claim.id, 'death-certificate'))} className="btn-secondary"><FileText size={15} /> Death certificate <Eye size={14} /></button><button onClick={() => openBlob(() => getClaimFileUrl(claim.id, 'identity-proof'))} className="btn-secondary"><FileText size={15} /> Identity proof <Eye size={14} /></button>{claim.supportingDocument?.available && <button onClick={() => openBlob(() => getClaimFileUrl(claim.id, 'supporting-document'))} className="btn-secondary"><FileText size={15} /> Supporting document <Eye size={14} /></button>}</div>{claim.adminReview?.remarks && <p className="mt-4 text-sm text-ink-600"><span className="font-semibold">Admin remarks:</span> {claim.adminReview.remarks}</p>}</div>
              <div><div className="flex items-center justify-between gap-3"><div><h3 className="text-sm font-semibold text-ink-800">Owner-assigned Vault records</h3><p className="mt-1 text-xs text-ink-400">These are the records pre-assigned by the Owner to this Beneficiary.</p></div><span className="badge bg-brand-50 text-brand-700">{records.length} total</span></div>{records.length === 0 ? <p className="mt-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-700">No assigned records were found. Do not approve until clarified.</p> : <div className="mt-4 space-y-4"><RecordsGroup title="Assets" icon={Landmark} records={assets} /><RecordsGroup title="Liabilities" icon={CreditCard} records={liabilities} /><RecordsGroup title="General" icon={FolderOpen} records={general} /></div>}</div>
            </div>
            {claim.informationRequests?.length > 0 && <div className="border-t border-ink-100 bg-orange-50/40 px-5 py-4"><div className="flex items-center gap-2 text-sm font-semibold text-orange-800"><MessageSquareMore size={16} /> Additional information history</div><div className="mt-3 space-y-3">{claim.informationRequests.map((request) => <div key={request.id} className="rounded-xl border border-orange-100 bg-white p-3 text-sm"><p className="font-semibold text-ink-800">Requested by {request.requestedByRole === 'ADMIN' ? 'Admin' : 'Lawyer'}</p><p className="mt-1 text-ink-600">{request.message}</p><p className="mt-1 text-xs text-ink-400">{request.status === 'SUBMITTED' ? 'Beneficiary resubmitted evidence' : 'Waiting for Beneficiary'}</p>{request.responseMessage && <p className="mt-2 text-ink-600"><span className="font-semibold">Beneficiary response:</span> {request.responseMessage}</p>}{request.additionalDocuments?.length > 0 && <div className="mt-2 flex flex-wrap gap-2">{request.additionalDocuments.map((file) => <button key={`${request.id}-${file.index}`} onClick={() => openBlob(() => getAdditionalClaimFile(claim.id, request.id, file.index))} className="btn-secondary"><Eye size={14} /> {file.originalName}</button>)}</div>}</div>)}</div></div>}
            {claim.status === 'UNDER_LAWYER_REVIEW' && <div className="flex flex-wrap justify-end gap-2 border-t border-ink-100 bg-ink-50/30 px-5 py-4"><button disabled={workingId === claim.id} onClick={() => requestInfo(claim)} className="rounded-lg border border-orange-200 px-3 py-2 text-xs font-semibold text-orange-700 hover:bg-orange-50"><MessageSquareMore size={14} className="inline" /> Request More Information</button><button disabled={workingId === claim.id} onClick={() => reject(claim)} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"><XCircle size={14} className="inline" /> Reject</button><button disabled={workingId === claim.id} onClick={() => approve(claim)} className="btn-primary"><CheckCircle2 size={15} /> Approve</button></div>}
            {claim.status === 'MORE_INFORMATION_REQUIRED' && <div className="border-t border-ink-100 bg-orange-50 px-5 py-4 text-sm font-medium text-orange-800">Waiting for the Beneficiary to upload the requested additional documents.</div>}
            {claim.lawyerReview?.remarks && <div className="border-t border-ink-100 px-5 py-3 text-sm text-ink-600"><span className="font-semibold">Latest professional remarks:</span> {claim.lawyerReview.remarks}</div>}
          </section>;
        })}</div>}
      </main>
    </div>
  );
}
