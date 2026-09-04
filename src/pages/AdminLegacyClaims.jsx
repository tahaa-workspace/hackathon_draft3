import { useCallback, useEffect, useState } from 'react';
import {
  CheckCircle2,
  Clock3,
  Eye,
  FileText,
  Loader2,
  Scale,
  ShieldCheck,
  UserCheck,
  XCircle,
} from 'lucide-react';
import Navbar from '../components/Navbar';
import {
  assignClaimToLawyer,
  getAdminLegacyClaims,
  getApprovedLawyers,
  getClaimFileUrl,
  reviewClaimAsAdmin,
} from '../services/legacyService';

function statusLabel(status) {
  const labels = {
    UNDER_ADMIN_REVIEW: 'Under Admin Review',
    LEGACY_ACCESS_REQUESTED: 'Admin Verified - Awaiting Lawyer',
    UNDER_LAWYER_REVIEW: 'Under Lawyer Review',
    MORE_INFORMATION_REQUIRED: 'More Information Required',
    APPROVED_INFORMATION_RELEASED: 'Approved - Information Released',
    ON_HOLD_DISPUTED: 'On Hold / Disputed',
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
    ON_HOLD_DISPUTED: 'bg-red-50 text-red-700',
    REJECTED_PLATFORM_CLAIM: 'bg-slate-100 text-slate-600',
  };
  return <span className={`badge ${styles[status] || 'bg-ink-100 text-ink-600'}`}>{statusLabel(status)}</span>;
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
      const [claimData, lawyerData] = await Promise.all([
        getAdminLegacyClaims(),
        getApprovedLawyers(),
      ]);
      setClaims(claimData);
      setLawyers(lawyerData);
    } catch (err) {
      setError(err.message || 'Unable to load Legacy Access Claims.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openFile = async (claimId, kind) => {
    try {
      const { url } = await getClaimFileUrl(claimId, kind);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (err) {
      setError(err.message);
    }
  };

  const review = async (claim, action) => {
    const defaultPrompt = action === 'FORWARD'
      ? 'Platform checks completed.'
      : action === 'REQUEST_CORRECTION'
        ? 'Specify what the Beneficiary must correct.'
        : action === 'HOLD'
          ? 'State the reason this claim is being held.'
          : 'State the platform reason for rejection.';
    const remarks = window.prompt(defaultPrompt, '') ?? null;
    if (remarks === null) return;

    setWorkingId(claim.id);
    setError('');
    try {
      await reviewClaimAsAdmin(claim.id, action, remarks);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setWorkingId(null);
    }
  };

  const assign = async (claim) => {
    const lawyerId = selectedLawyers[claim.id];
    if (!lawyerId) {
      setError('Select an approved Lawyer before assigning the claim.');
      return;
    }
    setWorkingId(claim.id);
    setError('');
    try {
      await assignClaimToLawyer(claim.id, lawyerId);
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
        <div className="mb-7">
          <p className="text-sm font-semibold text-brand-600">Administration</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-ink-900">Legacy Access Claims</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-ink-500">
            Verify the pre-existing Owner-Beneficiary link and required claim documents. Admin approval confirms platform checks only; it does not decide inheritance rights.
          </p>
        </div>

        {error && <div className="alert-error mb-5">{error}</div>}

        {loading ? (
          <div className="card flex items-center justify-center gap-2 py-16 text-sm text-ink-500">
            <Loader2 size={18} className="animate-spin" /> Loading Legacy Access Claims…
          </div>
        ) : claims.length === 0 ? (
          <div className="card py-16 text-center">
            <Clock3 size={32} className="mx-auto text-ink-300" />
            <p className="mt-3 font-semibold text-ink-800">No Legacy Access Claims yet</p>
          </div>
        ) : (
          <div className="space-y-5">
            {claims.map((claim) => (
              <section key={claim.id} className="overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-sm">
                <div className="flex flex-col gap-3 border-b border-ink-100 bg-ink-50/50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <ShieldCheck size={17} className="text-brand-600" />
                      <h2 className="font-semibold text-ink-900">{claim.beneficiary?.name || 'Beneficiary'} → {claim.owner?.name || 'Owner'}</h2>
                    </div>
                    <p className="mt-1 text-xs text-ink-400">Claim ID: {claim.id}</p>
                  </div>
                  <Badge status={claim.status} />
                </div>

                <div className="grid gap-5 p-5 lg:grid-cols-[1fr_1fr]">
                  <div>
                    <h3 className="text-sm font-semibold text-ink-800">Platform relationship</h3>
                    <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
                      <div><dt className="text-xs text-ink-400">Beneficiary account</dt><dd className="font-medium text-ink-700">{claim.beneficiary?.email}</dd></div>
                      <div><dt className="text-xs text-ink-400">Owner account</dt><dd className="font-medium text-ink-700">{claim.owner?.email}</dd></div>
                      <div><dt className="text-xs text-ink-400">Identity proof type</dt><dd className="font-medium text-ink-700">{claim.identityProofType}</dd></div>
                      <div><dt className="text-xs text-ink-400">Assigned Lawyer</dt><dd className="font-medium text-ink-700">{claim.assignedLawyer?.name || 'Not assigned'}</dd></div>
                    </dl>
                    {claim.beneficiaryRemarks && <p className="mt-4 text-sm text-ink-600"><span className="font-semibold">Beneficiary remarks:</span> {claim.beneficiaryRemarks}</p>}
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold text-ink-800">Submitted evidence</h3>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button onClick={() => openFile(claim.id, 'death-certificate')} className="btn-secondary"><FileText size={15} /> Death certificate <Eye size={14} /></button>
                      <button onClick={() => openFile(claim.id, 'identity-proof')} className="btn-secondary"><FileText size={15} /> Identity proof <Eye size={14} /></button>
                      {claim.supportingDocument?.available && (
                        <button onClick={() => openFile(claim.id, 'supporting-document')} className="btn-secondary"><FileText size={15} /> Supporting document <Eye size={14} /></button>
                      )}
                    </div>
                  </div>
                </div>

                {['UNDER_ADMIN_REVIEW', 'LEGACY_ACCESS_REQUESTED'].includes(claim.status) && (
                  <div className="border-t border-ink-100 bg-white px-5 py-4">
                    {claim.status === 'UNDER_ADMIN_REVIEW' ? (
                      <div className="flex flex-wrap justify-end gap-2">
                        <button disabled={workingId === claim.id} onClick={() => review(claim, 'REQUEST_CORRECTION')} className="rounded-lg border border-orange-200 px-3 py-2 text-xs font-semibold text-orange-700 hover:bg-orange-50">Request correction</button>
                        <button disabled={workingId === claim.id} onClick={() => review(claim, 'HOLD')} className="rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50">Hold</button>
                        <button disabled={workingId === claim.id} onClick={() => review(claim, 'REJECT')} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"><XCircle size={14} className="inline" /> Reject</button>
                        <button disabled={workingId === claim.id} onClick={() => review(claim, 'FORWARD')} className="btn-primary"><CheckCircle2 size={15} /> Complete platform checks</button>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
                        <select
                          value={selectedLawyers[claim.id] || ''}
                          onChange={(e) => setSelectedLawyers((current) => ({ ...current, [claim.id]: e.target.value }))}
                          className="field-input sm:max-w-sm"
                        >
                          <option value="">Select approved Lawyer</option>
                          {lawyers.map((lawyer) => (
                            <option key={lawyer.id} value={lawyer.id}>{lawyer.name} · {lawyer.city || 'City not set'} · {lawyer.enrollmentNumber || 'Enrollment unavailable'}</option>
                          ))}
                        </select>
                        <button disabled={workingId === claim.id} onClick={() => assign(claim)} className="btn-primary"><Scale size={15} /> Assign to Lawyer</button>
                      </div>
                    )}
                  </div>
                )}

                {claim.adminReview?.remarks && (
                  <div className="border-t border-ink-100 px-5 py-3 text-sm text-ink-600"><span className="font-semibold">Admin review:</span> {claim.adminReview.remarks}</div>
                )}
                {claim.lawyerReview?.remarks && (
                  <div className="border-t border-ink-100 px-5 py-3 text-sm text-ink-600"><span className="font-semibold">Lawyer review:</span> {claim.lawyerReview.remarks}</div>
                )}
              </section>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
