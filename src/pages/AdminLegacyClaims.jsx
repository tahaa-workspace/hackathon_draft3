import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, Clock3, Eye, FileText, Loader2, Scale, ShieldCheck, XCircle, Landmark, CreditCard, FolderOpen, MessageSquareMore } from 'lucide-react';
import Navbar from '../components/Navbar';
import {
  assignClaimToLawyer,
  getAdminLegacyClaims,
  getApprovedLawyers,
  getClaimFileUrl,
  getClaimInformationRequests,
  getAdditionalClaimFile,
  rejectClaim,
  requestClaimInformation,
  reviewClaimAsAdmin,
} from '../services/legacyService';

function statusLabel(status) {
  const labels = {
    UNDER_ADMIN_REVIEW: 'Under Admin Review',
    LEGACY_ACCESS_REQUESTED: 'Admin Verified - Awaiting Lawyer',
    UNDER_LAWYER_REVIEW: 'Under Lawyer Review',
    MORE_INFORMATION_REQUIRED: 'Waiting for Beneficiary Information',
    APPROVED_INFORMATION_RELEASED: 'Approved - Information Released',
    REJECTED_PLATFORM_CLAIM: 'Rejected Platform Claim',
  };
  return labels[status] || status;
}

function Badge({ status }) {
  const styles = {
    UNDER_ADMIN_REVIEW: 'bg-amber-50 text-amber-700',
    LEGACY_ACCESS_REQUESTED: 'bg-blue-50 text-blue-700',
    UNDER_LAWYER_REVIEW: 'bg-violet-50 text-violet-700',
    MORE_INFORMATION_REQUIRED: 'bg-orange-50 text-orange-700',
    APPROVED_INFORMATION_RELEASED: 'bg-green-50 text-green-700',
    REJECTED_PLATFORM_CLAIM: 'bg-slate-100 text-slate-600',
  };
  return <span className={`badge ${styles[status] || 'bg-ink-100 text-ink-600'}`}>{statusLabel(status)}</span>;
}

function SummaryCard({ Icon, label, value }) {
  return <div className="rounded-xl border border-ink-100 bg-white p-3"><Icon size={16} className="text-brand-600" /><p className="mt-2 text-[11px] font-semibold uppercase tracking-wide text-ink-400">{label}</p><p className="text-xl font-bold text-ink-900">{value}</p></div>;
}

export default function AdminLegacyClaims() {
  const [claims, setClaims] = useState([]);
  const [lawyers, setLawyers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [workingId, setWorkingId] = useState(null);
  const [selectedLawyers, setSelectedLawyers] = useState({});

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [claimData, lawyerData] = await Promise.all([getAdminLegacyClaims(), getApprovedLawyers()]);
      const enriched = await Promise.all(claimData.map(async (claim) => ({
        ...claim,
        informationRequests: await getClaimInformationRequests(claim.id).catch(() => []),
      })));
      setClaims(enriched);
      setLawyers(lawyerData);
    } catch (err) {
      setError(err.message || 'Unable to load Legacy Access Claims.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

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
    const message = window.prompt('Specify exactly what additional document or information the Beneficiary must provide.', '') ?? null;
    if (message === null) return;
    if (!message.trim()) { setError('Please enter what additional information is required.'); return; }
    setWorkingId(claim.id);
    try { await requestClaimInformation(claim.id, message.trim()); await load(); }
    catch (err) { setError(err.message); }
    finally { setWorkingId(null); }
  };

const reject = async (claim) => {
  const remarks =
    window.prompt(
      'State the platform reason for rejection.',
      ''
    ) ?? null;

  if (remarks === null) {
    return;
  }

  if (!remarks.trim()) {
    setError(
      'A rejection reason is required.'
    );
    return;
  }

  const confirmed =
    window.confirm(
      'Reject this Legacy Access Claim?\n\nAll Beneficiary-uploaded Legacy Claim documents will be permanently deleted from Cloudinary and the claim metadata will be removed from MongoDB.'
    );

  if (!confirmed) {
    return;
  }

  setWorkingId(claim.id);
  setError('');

  try {
    const result =
      await rejectClaim(
        claim.id,
        remarks.trim()
      );

    if (result?.deleted) {
      setClaims((current) =>
        current.filter(
          (item) =>
            item.id !== claim.id
        )
      );
    } else {
      await load();
    }
  } catch (err) {
    setError(
      err.message ||
        'Unable to reject Legacy Access Claim.'
    );
  } finally {
    setWorkingId(null);
  }
};

  const forward = async (claim) => {
    const remarks = window.prompt('Platform review remarks.', 'Platform checks completed.') ?? null;
    if (remarks === null) return;
    setWorkingId(claim.id);
    try { await reviewClaimAsAdmin(claim.id, 'FORWARD', remarks); await load(); }
    catch (err) { setError(err.message); }
    finally { setWorkingId(null); }
  };

  const assign = async (claim) => {
    const lawyerId = selectedLawyers[claim.id];
    if (!lawyerId) { setError('Select an approved Lawyer before assigning the claim.'); return; }
    setWorkingId(claim.id);
    try { await assignClaimToLawyer(claim.id, lawyerId); await load(); }
    catch (err) { setError(err.message); }
    finally { setWorkingId(null); }
  };

  return (
    <div className="min-h-screen bg-ink-50">
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-7"><p className="text-sm font-semibold text-brand-600">Administration</p><h1 className="mt-1 text-3xl font-bold tracking-tight text-ink-900">Legacy Access Claims</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-ink-500">Review the claim, request additional evidence when needed, reject invalid claims, or complete platform checks and assign an approved Lawyer.</p></div>
        {error && <div className="alert-error mb-5">{error}</div>}
        {loading ? <div className="card flex items-center justify-center gap-2 py-16 text-sm text-ink-500"><Loader2 size={18} className="animate-spin" /> Loading Legacy Access Claims…</div> : claims.length === 0 ? <div className="card py-16 text-center"><Clock3 size={32} className="mx-auto text-ink-300" /><p className="mt-3 font-semibold text-ink-800">No Legacy Access Claims yet</p></div> : <div className="space-y-5">{claims.map((claim) => {
          const summary = claim.recordSummary || { total: 0, assets: 0, liabilities: 0, general: 0 };
          const records = claim.assignedRecords || claim.assignedDocuments || [];
          return <section key={claim.id} className="overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-sm">
            <div className="flex flex-col gap-3 border-b border-ink-100 bg-ink-50/50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"><div><div className="flex items-center gap-2"><ShieldCheck size={17} className="text-brand-600" /><h2 className="font-semibold text-ink-900">{claim.beneficiary?.name || 'Beneficiary'} → {claim.owner?.name || 'Owner'}</h2></div><p className="mt-1 text-xs text-ink-400">Claim ID: {claim.id}</p></div><Badge status={claim.status} /></div>
            <div className="grid gap-5 p-5 lg:grid-cols-2">
              <div><h3 className="text-sm font-semibold text-ink-800">Platform relationship</h3><dl className="mt-3 grid grid-cols-2 gap-3 text-sm"><div><dt className="text-xs text-ink-400">Beneficiary account</dt><dd className="font-medium text-ink-700">{claim.beneficiary?.email}</dd></div><div><dt className="text-xs text-ink-400">Owner account</dt><dd className="font-medium text-ink-700">{claim.owner?.email}</dd></div><div><dt className="text-xs text-ink-400">Identity proof type</dt><dd className="font-medium text-ink-700">{claim.identityProofType}</dd></div><div><dt className="text-xs text-ink-400">Assigned Lawyer</dt><dd className="font-medium text-ink-700">{claim.assignedLawyer?.name || 'Not assigned'}</dd></div></dl>{claim.beneficiaryRemarks && <p className="mt-4 text-sm text-ink-600"><span className="font-semibold">Beneficiary remarks:</span> {claim.beneficiaryRemarks}</p>}</div>
              <div><h3 className="text-sm font-semibold text-ink-800">Submitted evidence</h3><div className="mt-3 flex flex-wrap gap-2"><button onClick={() => openBlob(() => getClaimFileUrl(claim.id, 'death-certificate'))} className="btn-secondary"><FileText size={15} /> Death certificate <Eye size={14} /></button><button onClick={() => openBlob(() => getClaimFileUrl(claim.id, 'identity-proof'))} className="btn-secondary"><FileText size={15} /> Identity proof <Eye size={14} /></button>{claim.supportingDocument?.available && <button onClick={() => openBlob(() => getClaimFileUrl(claim.id, 'supporting-document'))} className="btn-secondary"><FileText size={15} /> Supporting document <Eye size={14} /></button>}</div></div>
            </div>
            {claim.informationRequests?.length > 0 && <div className="border-t border-ink-100 bg-orange-50/40 px-5 py-4"><div className="flex items-center gap-2 text-sm font-semibold text-orange-800"><MessageSquareMore size={16} /> Additional information history</div><div className="mt-3 space-y-3">{claim.informationRequests.map((request) => <div key={request.id} className="rounded-xl border border-orange-100 bg-white p-3 text-sm"><p className="font-semibold text-ink-800">Requested by {request.requestedByRole === 'ADMIN' ? 'Admin' : 'Lawyer'}</p><p className="mt-1 text-ink-600">{request.message}</p><p className="mt-1 text-xs text-ink-400">Status: {request.status === 'SUBMITTED' ? 'Beneficiary resubmitted' : 'Waiting for Beneficiary'}</p>{request.responseMessage && <p className="mt-2 text-ink-600"><span className="font-semibold">Beneficiary response:</span> {request.responseMessage}</p>}{request.additionalDocuments?.length > 0 && <div className="mt-2 flex flex-wrap gap-2">{request.additionalDocuments.map((file) => <button key={`${request.id}-${file.index}`} onClick={() => openBlob(() => getAdditionalClaimFile(claim.id, request.id, file.index))} className="btn-secondary"><Eye size={14} /> {file.originalName}</button>)}</div>}</div>)}</div></div>}
            <div className="border-t border-ink-100 bg-ink-50/30 px-5 py-5"><div className="flex items-center justify-between gap-3"><div><h3 className="text-sm font-semibold text-ink-800">Owner-assigned Vault records</h3><p className="mt-1 text-xs text-ink-400">Only these pre-assigned records can be released after verification.</p></div><span className="badge bg-brand-50 text-brand-700">{summary.total} total</span></div><div className="mt-4 grid gap-3 sm:grid-cols-4"><SummaryCard Icon={Landmark} label="Assets" value={summary.assets} /><SummaryCard Icon={CreditCard} label="Liabilities" value={summary.liabilities} /><SummaryCard Icon={FolderOpen} label="General" value={summary.general} /><SummaryCard Icon={FileText} label="Total" value={summary.total} /></div>{records.length > 0 && <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{records.map((record) => <div key={record.id} className="rounded-xl border border-ink-100 bg-white px-3 py-3"><div className="flex items-center justify-between gap-2"><p className="truncate text-sm font-semibold text-ink-800">{record.title}</p><span className="text-[10px] font-semibold text-brand-700">{record.recordType || 'GENERAL'}</span></div><p className="mt-1 text-xs text-ink-400">{record.category}</p></div>)}</div>}</div>
            {claim.status === 'UNDER_ADMIN_REVIEW' && <div className="flex flex-wrap justify-end gap-2 border-t border-ink-100 bg-white px-5 py-4"><button disabled={workingId === claim.id} onClick={() => requestInfo(claim)} className="rounded-lg border border-orange-200 px-3 py-2 text-xs font-semibold text-orange-700 hover:bg-orange-50"><MessageSquareMore size={14} className="inline" /> Request More Information</button><button disabled={workingId === claim.id} onClick={() => reject(claim)} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"><XCircle size={14} className="inline" /> Reject</button><button disabled={workingId === claim.id || summary.total === 0} onClick={() => forward(claim)} className="btn-primary"><CheckCircle2 size={15} /> Complete platform checks</button></div>}
            {claim.status === 'LEGACY_ACCESS_REQUESTED' && <div className="flex flex-col gap-3 border-t border-ink-100 bg-white px-5 py-4 sm:flex-row sm:items-center sm:justify-end"><select value={selectedLawyers[claim.id] || ''} onChange={(e) => setSelectedLawyers((current) => ({ ...current, [claim.id]: e.target.value }))} className="field-input sm:max-w-sm"><option value="">Select approved Lawyer</option>{lawyers.map((lawyer) => <option key={lawyer.id} value={lawyer.id}>{lawyer.name} · {lawyer.city || 'City not set'} · {lawyer.enrollmentNumber || 'Enrollment unavailable'}</option>)}</select><button disabled={workingId === claim.id} onClick={() => assign(claim)} className="btn-primary"><Scale size={15} /> Assign to Lawyer</button></div>}
            {claim.adminReview?.remarks && <div className="border-t border-ink-100 px-5 py-3 text-sm text-ink-600"><span className="font-semibold">Admin review:</span> {claim.adminReview.remarks}</div>}
            {claim.lawyerReview?.remarks && <div className="border-t border-ink-100 px-5 py-3 text-sm text-ink-600"><span className="font-semibold">Lawyer review:</span> {claim.lawyerReview.remarks}</div>}
          </section>;
        })}</div>}
      </main>
    </div>
  );
}
