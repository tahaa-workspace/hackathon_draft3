import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  Download,
  Eye,
  FileLock2,
  Loader2,
  LockKeyhole,
  ShieldCheck,
  Upload,
} from 'lucide-react';

import Navbar from '../components/Navbar';
import SecureDocumentViewer from '../components/SecureDocumentViewer';
import {
  downloadDocument,
  getClaimInformationRequests,
  getIncomingAllocations,
  getLawyersForSelection,
  getMyLegacyClaims,
  selectClaimLawyer,
  submitAdditionalClaimInformation,
  submitLegacyClaim,
} from '../services/legacyService';

function claimForAllocation(claims, allocationId) {
  return (
    claims.find(
      (claim) =>
        claim.allocationId === allocationId &&
        claim.status !== 'REJECTED_PLATFORM_CLAIM'
    ) || null
  );
}

function latestRejectedClaimForAllocation(claims, allocationId) {
  return (
    claims.find(
      (claim) =>
        claim.allocationId === allocationId &&
        claim.status === 'REJECTED_PLATFORM_CLAIM'
    ) || null
  );
}

function claimProgress(status) {
  const steps = [
    { key: 'submitted', label: 'Claim submitted' },
    { key: 'admin', label: 'Admin verification' },
    { key: 'lawyer', label: 'Lawyer verification' },
    { key: 'access', label: 'Legacy access' },
  ];

  const completedByStatus = {
    UNDER_ADMIN_REVIEW: 1,
    MORE_INFORMATION_REQUIRED: 1,
    LEGACY_ACCESS_REQUESTED: 2,
    UNDER_LAWYER_REVIEW: 2,
    APPROVED_INFORMATION_RELEASED: 4,
    REJECTED_PLATFORM_CLAIM: 1,
  };

  return {
    steps,
    completed: completedByStatus[status] || 0,
    rejected: status === 'REJECTED_PLATFORM_CLAIM',
  };
}

export default function LegacyAccess() {
  const [allocations, setAllocations] = useState([]);
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [claimingId, setClaimingId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [lawyers, setLawyers] = useState([]);
  const [selectedLawyerByClaim, setSelectedLawyerByClaim] = useState({});
  const [lawyerLoadingId, setLawyerLoadingId] = useState(null);
  const [previewDocument, setPreviewDocument] = useState(null);
  const [additionalFilesByClaim, setAdditionalFilesByClaim] = useState({});
  const [additionalResponseByClaim, setAdditionalResponseByClaim] = useState({});
  const [additionalSubmittingId, setAdditionalSubmittingId] = useState(null);

  const [form, setForm] = useState({
    identityProofType: 'AADHAAR',
    remarks: '',
    deathCertificate: null,
    identityProof: null,
    supportingDocument: null,
  });

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [incoming, myClaims] = await Promise.all([
        getIncomingAllocations(),
        getMyLegacyClaims(),
      ]);
      const enrichedClaims = await Promise.all(
        myClaims.map(async (claim) => {
          if (claim.status !== 'MORE_INFORMATION_REQUIRED') {
            return claim;
          }

          return {
            ...claim,
            informationRequests:
              await getClaimInformationRequests(claim.id).catch(() => []),
          };
        })
      );

      setAllocations(incoming);
      setClaims(enrichedClaims);
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
    if (!claims.some((claim) => claim.status === 'LEGACY_ACCESS_REQUESTED')) {
      return;
    }

    getLawyersForSelection()
      .then(setLawyers)
      .catch(() => setLawyers([]));
  }, [claims]);

  const visibleCount = useMemo(() => allocations.length, [allocations]);

  const handleDownload = async (allocation) => {
    try {
      setMessage('');
      const blob = await downloadDocument(allocation.asset?.id);
      const url = URL.createObjectURL(blob);
      const anchor = window.document.createElement('a');
      anchor.href = url;
      anchor.download = allocation.asset?.title || 'legacy-document';
      window.document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      setMessage(error.message || 'Unable to download legacy document.');
    }
  };

  const handleOpen = (allocation) => {
    setMessage('');
    setPreviewDocument({
      id: allocation.asset?.id,
      title: allocation.asset?.title || 'Legacy document',
      originalName: allocation.asset?.title || 'legacy-document',
      fileType: allocation.asset?.fileType || '',
    });
  };

  const assignLawyer = async (claimId) => {
    const lawyerId = selectedLawyerByClaim[claimId];

    if (!lawyerId) {
      setMessage('Select an available lawyer.');
      return;
    }

    setLawyerLoadingId(claimId);
    setMessage('');

    try {
      await selectClaimLawyer(claimId, lawyerId);
      setMessage('Lawyer selected. Your claim is now under lawyer review.');
      await refresh();
      window.dispatchEvent(new Event('nextgen:notifications-changed'));
    } catch (error) {
      setMessage(error.message || 'Unable to select lawyer.');
    } finally {
      setLawyerLoadingId(null);
    }
  };

  const submitAdditionalEvidence = async (claim) => {
    const files = additionalFilesByClaim[claim.id] || [];

    if (files.length === 0) {
      setMessage('Upload at least one requested supporting document.');
      return;
    }

    setAdditionalSubmittingId(claim.id);
    setMessage('');

    try {
      await submitAdditionalClaimInformation(claim.id, {
        files,
        responseMessage: additionalResponseByClaim[claim.id] || '',
      });

      setAdditionalFilesByClaim((current) => ({
        ...current,
        [claim.id]: [],
      }));
      setAdditionalResponseByClaim((current) => ({
        ...current,
        [claim.id]: '',
      }));

      setMessage('Additional evidence submitted. Your claim has returned to review.');
      await refresh();
      window.dispatchEvent(new Event('nextgen:notifications-changed'));
    } catch (error) {
      setMessage(
        error.message ||
        'Unable to submit the requested additional information.'
      );
    } finally {
      setAdditionalSubmittingId(null);
    }
  };

  const handleClaim = async (event, allocationId) => {
    event.preventDefault();

    if (!form.deathCertificate || !form.identityProof) {
      setMessage('Death certificate and identity proof are required.');
      return;
    }

    setSubmitting(true);
    setMessage('');

    try {
      await submitLegacyClaim({
        allocationId,
        identityProofType: form.identityProofType,
        remarks: form.remarks,
        deathCertificate: form.deathCertificate,
        identityProof: form.identityProof,
        supportingDocument: form.supportingDocument,
      });

      setMessage('Legacy access claim submitted for review.');
      setClaimingId(null);
      setForm({
        identityProofType: 'AADHAAR',
        remarks: '',
        deathCertificate: null,
        identityProof: null,
        supportingDocument: null,
      });
      await refresh();
      window.dispatchEvent(new Event('nextgen:notifications-changed'));
    } catch (error) {
      setMessage(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      <main className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
        <section className="rounded-3xl bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 p-7 text-white shadow-xl">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-cyan-200">
              <FileLock2 size={22} />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.15em] text-cyan-200">Legacy Access</p>
              <h1 className="mt-2 text-3xl font-bold">Allocations made to you</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
                You can see that an asset has been allocated to you without exposing its protected file. Access is released only when the allocation conditions are satisfied.
              </p>
              <p className="mt-4 text-sm font-semibold text-white">
                {visibleCount} allocation{visibleCount === 1 ? '' : 's'} received
              </p>
            </div>
          </div>
        </section>

        {message && (
          <div className="rounded-2xl border border-indigo-100 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm">
            {message}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-500">
            <Loader2 size={18} className="animate-spin" />
            Loading legacy access…
          </div>
        ) : allocations.length === 0 ? (
          <section className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center">
            <LockKeyhole size={28} className="mx-auto text-slate-400" />
            <h2 className="mt-4 font-semibold text-slate-800">No incoming legacy allocations</h2>
            <p className="mt-2 text-sm text-slate-500">
              When another user allocates an asset to you, it will appear here.
            </p>
          </section>
        ) : (
          <div className="space-y-4">
            {allocations.map((allocation) => {
              const claim = claimForAllocation(claims, allocation.id);
              const rejectedClaim =
                latestRejectedClaimForAllocation(claims, allocation.id);
              const claimApproved =
                claim?.status === 'APPROVED_INFORMATION_RELEASED';
              const canOpen =
                allocation.status === 'RELEASED' &&
                claimApproved;

              return (
                <article key={allocation.id} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="flex flex-col justify-between gap-5 md:flex-row md:items-start">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-lg font-semibold text-slate-900">
                          {allocation.asset?.title || 'Legacy Asset'}
                        </h2>
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
                          {allocation.status}
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-slate-500">
                        Allocated by <strong className="text-slate-700">{allocation.allocatedBy?.name || 'User'}</strong>
                        {allocation.allocatedBy?.username ? ' (@' + allocation.allocatedBy.username + ')' : ''}
                      </p>
                      <p className="mt-1 text-xs text-slate-400">
                        {allocation.asset?.category} · {allocation.asset?.recordType}
                      </p>

                      <div className="mt-4 flex items-center gap-2 text-sm">
                        {canOpen ? (
                          <>
                            <CheckCircle2 size={16} className="text-emerald-600" />
                            <span className="font-medium text-emerald-700">Access available</span>
                          </>
                        ) : (
                          <>
                            <LockKeyhole size={16} className="text-indigo-600" />
                            <span className="font-medium text-indigo-700">Protected / locked</span>
                          </>
                        )}
                      </div>

                      {!claim && rejectedClaim && (
                        <div className="mt-4 rounded-xl border border-red-100 bg-red-50 px-3 py-3 text-xs text-red-700">
                          The previous claim was rejected. You may submit a new claim for this allocation with corrected or additional evidence.
                        </div>
                      )}

                      {claim && (() => {
                        const progress = claimProgress(claim.status);
                        return (
                          <div className="mt-4">
                            <p className="text-xs text-slate-500">
                              Claim status: <strong>{claim.status}</strong>
                            </p>
                            <div className="mt-3 grid gap-2 sm:grid-cols-4">
                              {progress.steps.map((step, index) => {
                                const done = index < progress.completed;
                                return (
                                  <div
                                    key={step.key}
                                    className={
                                      'rounded-xl border px-3 py-2 text-xs ' +
                                      (done
                                        ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                        : progress.rejected
                                          ? 'border-red-100 bg-red-50 text-red-600'
                                          : 'border-slate-200 bg-slate-50 text-slate-500')
                                    }
                                  >
                                    {done ? '✓ ' : '○ '}{step.label}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })()}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {canOpen && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleOpen(allocation)}
                            className="btn-primary"
                          >
                            <Eye size={16} />
                            View document
                          </button>
                          {allocation.permissions?.download && (
                            <button
                              type="button"
                              onClick={() => handleDownload(allocation)}
                              className="btn-secondary"
                            >
                              <Download size={16} />
                              Download
                            </button>
                          )}
                        </>
                      )}

                      {claim?.status === 'MORE_INFORMATION_REQUIRED' && (() => {
                        const pendingRequest =
                          [...(claim.informationRequests || [])]
                            .reverse()
                            .find((item) => item.status === 'PENDING');

                        return (
                          <div className="w-full rounded-2xl border border-orange-100 bg-orange-50/60 p-4">
                            <p className="text-sm font-semibold text-orange-900">
                              Additional verification information required
                            </p>
                            <p className="mt-1 text-xs leading-5 text-orange-800">
                              {pendingRequest?.message ||
                                'The reviewer requested additional evidence for this claim.'}
                            </p>

                            <div className="mt-3 grid gap-3">
                              <label className="text-xs font-semibold text-slate-700">
                                Response message
                                <textarea
                                  className="field-input mt-1 min-h-20"
                                  value={additionalResponseByClaim[claim.id] || ''}
                                  onChange={(event) =>
                                    setAdditionalResponseByClaim((current) => ({
                                      ...current,
                                      [claim.id]: event.target.value,
                                    }))
                                  }
                                  placeholder="Explain the additional evidence you are providing."
                                />
                              </label>

                              <label className="cursor-pointer rounded-xl border border-dashed border-orange-200 bg-white p-3">
                                <span className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                                  <Upload size={15} />
                                  Additional evidence (up to 5 files)
                                </span>
                                <input
                                  type="file"
                                  multiple
                                  accept="application/pdf,image/jpeg,image/png"
                                  className="mt-2 block w-full text-xs text-slate-500"
                                  onChange={(event) =>
                                    setAdditionalFilesByClaim((current) => ({
                                      ...current,
                                      [claim.id]:
                                        Array.from(event.target.files || []).slice(0, 5),
                                    }))
                                  }
                                />
                              </label>

                              {(additionalFilesByClaim[claim.id] || []).length > 0 && (
                                <p className="text-xs text-slate-500">
                                  {(additionalFilesByClaim[claim.id] || []).length} file(s) selected.
                                </p>
                              )}

                              <button
                                type="button"
                                onClick={() => submitAdditionalEvidence(claim)}
                                disabled={additionalSubmittingId === claim.id}
                                className="btn-primary w-fit"
                              >
                                {additionalSubmittingId === claim.id ? (
                                  <Loader2 size={16} className="animate-spin" />
                                ) : (
                                  <Upload size={16} />
                                )}
                                {additionalSubmittingId === claim.id
                                  ? 'Submitting…'
                                  : 'Submit additional evidence'}
                              </button>
                            </div>
                          </div>
                        );
                      })()}

                      {claim?.status === 'LEGACY_ACCESS_REQUESTED' && (
                        <div className="w-full rounded-2xl border border-blue-100 bg-blue-50/50 p-4">
                          <p className="text-sm font-semibold text-blue-900">
                            Administrator verification complete
                          </p>
                          <p className="mt-1 text-xs text-blue-700">
                            No lawyer was available for automatic assignment. Select an available lawyer to continue.
                          </p>
                          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                            <select
                              className="field-input flex-1"
                              value={selectedLawyerByClaim[claim.id] || ''}
                              onChange={(event) =>
                                setSelectedLawyerByClaim((current) => ({
                                  ...current,
                                  [claim.id]: event.target.value,
                                }))
                              }
                            >
                              <option value="">Select lawyer</option>
                              {lawyers.map((lawyer) => (
                                <option key={lawyer.id} value={lawyer.id}>
                                  {lawyer.name}{lawyer.city ? ' · ' + lawyer.city : ''}
                                </option>
                              ))}
                            </select>
                            <button
                              type="button"
                              className="btn-primary"
                              disabled={lawyerLoadingId === claim.id}
                              onClick={() => assignLawyer(claim.id)}
                            >
                              {lawyerLoadingId === claim.id ? (
                                <Loader2 size={16} className="animate-spin" />
                              ) : (
                                <ShieldCheck size={16} />
                              )}
                              Continue to lawyer review
                            </button>
                          </div>
                        </div>
                      )}

                      {!canOpen &&
                        !claim &&
                        !['REVOKED', 'EXPIRED'].includes(allocation.status) && (
                        <button
                          type="button"
                          onClick={() => setClaimingId((current) => current === allocation.id ? null : allocation.id)}
                          className="btn-primary"
                        >
                          <ShieldCheck size={16} />
                          Claim Access
                        </button>
                      )}
                    </div>
                  </div>

                  {claimingId === allocation.id && !claim && (
                    <form
                      onSubmit={(event) => handleClaim(event, allocation.id)}
                      className="mt-6 rounded-2xl border border-indigo-100 bg-indigo-50/40 p-5"
                    >
                      <h3 className="font-semibold text-slate-900">Submit Legacy Access Claim</h3>
                      <p className="mt-1 text-xs text-slate-500">
                        The claim is tied specifically to this allocation.
                      </p>

                      <div className="mt-4 grid gap-4 md:grid-cols-2">
                        <label className="text-sm font-medium text-slate-700">
                          Identity proof type
                          <select
                            className="field-input mt-1"
                            value={form.identityProofType}
                            onChange={(e) => setForm((value) => ({ ...value, identityProofType: e.target.value }))}
                          >
                            <option value="AADHAAR">Aadhaar</option>
                            <option value="PASSPORT">Passport</option>
                            <option value="DRIVING_LICENCE">Driving Licence</option>
                            <option value="VOTER_ID">Voter ID</option>
                            <option value="OTHER">Other</option>
                          </select>
                        </label>

                        <label className="text-sm font-medium text-slate-700">
                          Remarks
                          <input
                            className="field-input mt-1"
                            value={form.remarks}
                            onChange={(e) => setForm((value) => ({ ...value, remarks: e.target.value }))}
                            placeholder="Optional context"
                          />
                        </label>
                      </div>

                      <div className="mt-4 grid gap-4 md:grid-cols-3">
                        {[
                          ['Death certificate', 'deathCertificate', true],
                          ['Identity proof', 'identityProof', true],
                          ['Supporting document', 'supportingDocument', false],
                        ].map(([label, key, required]) => (
                          <label key={key} className="cursor-pointer rounded-2xl border border-dashed border-indigo-200 bg-white p-4">
                            <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                              <Upload size={15} />
                              {label}{required ? ' *' : ''}
                            </div>
                            <input
                              type="file"
                              accept="application/pdf,image/jpeg,image/png"
                              className="mt-3 block w-full text-xs text-slate-500"
                              required={required}
                              onChange={(e) => setForm((value) => ({ ...value, [key]: e.target.files?.[0] || null }))}
                            />
                          </label>
                        ))}
                      </div>

                      <button disabled={submitting} className="btn-primary mt-4">
                        {submitting ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
                        {submitting ? 'Submitting…' : 'Submit claim'}
                      </button>
                    </form>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </main>

      {previewDocument && (
        <SecureDocumentViewer
          document={previewDocument}
          allowDownload={
            allocations.find(
              (allocation) =>
                allocation.asset?.id === previewDocument.id
            )?.permissions?.download !== false
          }
          onClose={() => setPreviewDocument(null)}
        />
      )}
    </div>
  );
}
