import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { useNavigate } from 'react-router-dom';

import {
  BadgeCheck,
  CheckCircle2,
  Clock3,
  CreditCard,
  Eye,
  FileText,
  FolderOpen,
  KeyRound,
  Landmark,
  Loader2,
  LockKeyhole,
  Mail,
  MessageSquareMore,
  ShieldCheck,
  Upload,
  User,
  Users,
} from 'lucide-react';

import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';

import {
  getAdditionalClaimFile,
  getClaimInformationRequests,
  getMyLegacyClaims,
  submitAdditionalClaimInformation,
  submitLegacyClaim,
  getLawyersForSelection,
  selectClaimLawyer,
} from '../services/legacyService';

const MAX_FILE_SIZE = 10 * 1024 * 1024;

const ALLOWED_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
];

const RECORD_TABS = [
  ['ALL', 'All'],
  ['ASSET', 'Assets'],
  ['LIABILITY', 'Liabilities'],
  ['GENERAL', 'General'],
];

function formatDate(value) {
  if (!value) return '—';

  return new Date(value).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function statusLabel(status) {
  const map = {
    UNDER_ADMIN_REVIEW: 'Under Admin Review',
    LEGACY_ACCESS_REQUESTED:
      'Admin Verified - Awaiting Lawyer Selection',
    UNDER_LAWYER_REVIEW: 'Under Lawyer Review',
    MORE_INFORMATION_REQUIRED:
      'Additional Information Required',
    APPROVED_INFORMATION_RELEASED:
      'Approved - Information Released',
    REJECTED_PLATFORM_CLAIM:
      'Rejected Platform Claim',
  };

  return map[status] || status;
}

function recordTypeLabel(type) {
  if (type === 'ASSET') return 'Asset';
  if (type === 'LIABILITY') return 'Liability';
  return 'General';
}

function recordTypeStyle(type) {
  if (type === 'ASSET') {
    return 'bg-emerald-50 text-emerald-700';
  }

  if (type === 'LIABILITY') {
    return 'bg-rose-50 text-rose-700';
  }

  return 'bg-indigo-50 text-indigo-700';
}

function fileIsValid(file) {
  return (
    file &&
    ALLOWED_TYPES.includes(file.type) &&
    file.size <= MAX_FILE_SIZE
  );
}

export default function BeneficiaryDashboard() {
  const { user, token } = useAuth();
  const navigate = useNavigate();

  const [documents, setDocuments] = useState([]);
  const [documentsLoading, setDocumentsLoading] =
    useState(true);
  const [documentError, setDocumentError] =
    useState('');

  const [claims, setClaims] = useState([]);
  const [claimsLoading, setClaimsLoading] =
    useState(true);
  const [claimError, setClaimError] = useState('');
  const [claimSubmitting, setClaimSubmitting] =
    useState(false);

  const [recordTab, setRecordTab] = useState('ALL');

  const [identityProofType, setIdentityProofType] =
    useState('AADHAAR');
  const [deathCertificate, setDeathCertificate] =
    useState(null);
  const [identityProof, setIdentityProof] =
    useState(null);
  const [supportingDocument, setSupportingDocument] =
    useState(null);
  const [remarks, setRemarks] = useState('');

  const [additionalFiles, setAdditionalFiles] =
    useState([]);
  const [responseMessage, setResponseMessage] =
    useState('');
  const [additionalSubmitting, setAdditionalSubmitting] =
    useState(false);

  const [lawyers, setLawyers] = useState([]);
  const [lawyersLoading, setLawyersLoading] =
    useState(false);
  const [selectedLawyerId, setSelectedLawyerId] =
    useState('');
  const [selectingLawyer, setSelectingLawyer] =
    useState(false);

  const loadAssignedDocuments = useCallback(async () => {
    if (!token) {
      setDocumentsLoading(false);
      return;
    }

    setDocumentsLoading(true);

    try {
      setDocumentError('');

      const response = await fetch(
        '/api/documents/assigned-to-me',
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            'Failed to fetch assigned records.'
        );
      }

      setDocuments(data.documents || []);
    } catch (error) {
      setDocumentError(
        error.message ||
          'Failed to fetch assigned records.'
      );
    } finally {
      setDocumentsLoading(false);
    }
  }, [token]);

  const loadClaims = useCallback(async () => {
    setClaimsLoading(true);

    try {
      setClaimError('');

      const data = await getMyLegacyClaims();

      const enriched = await Promise.all(
        data.map(async (claim) => ({
          ...claim,
          informationRequests:
            await getClaimInformationRequests(
              claim.id
            ).catch(() => []),
        }))
      );

      setClaims(enriched);
    } catch (error) {
      setClaimError(
        error.message ||
          'Unable to load Legacy Access Claims.'
      );
    } finally {
      setClaimsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAssignedDocuments();
    loadClaims();
  }, [loadAssignedDocuments, loadClaims]);

  const activeClaim = claims[0] || null;

  const pendingInformationRequest =
    activeClaim?.informationRequests
      ?.slice()
      .reverse()
      .find((item) => item.status === 'PENDING') ||
    null;

  const hasReleasedClaim = claims.some(
    (claim) =>
      claim.status ===
      'APPROVED_INFORMATION_RELEASED'
  );

  const loadLawyers = useCallback(async () => {
    setLawyersLoading(true);

    try {
      setClaimError('');
      const data = await getLawyersForSelection();
      setLawyers(data || []);
    } catch (error) {
      setClaimError(
        error.message || 'Unable to load Lawyers.'
      );
    } finally {
      setLawyersLoading(false);
    }
  }, []);

  useEffect(() => {
    if (
      activeClaim?.status ===
      'LEGACY_ACCESS_REQUESTED'
    ) {
      loadLawyers();
    }
  }, [activeClaim?.status, loadLawyers]);

  const recordStats = useMemo(
    () => ({
      total: documents.length,
      assets: documents.filter(
        (document) =>
          document.recordType === 'ASSET'
      ).length,
      liabilities: documents.filter(
        (document) =>
          document.recordType === 'LIABILITY'
      ).length,
      general: documents.filter(
        (document) =>
          (document.recordType || 'GENERAL') ===
          'GENERAL'
      ).length,
    }),
    [documents]
  );

  const visibleDocuments = useMemo(
    () =>
      recordTab === 'ALL'
        ? documents
        : documents.filter(
            (document) =>
              (document.recordType || 'GENERAL') ===
              recordTab
          ),
    [documents, recordTab]
  );

  const handleSubmitClaim = async (event) => {
    event.preventDefault();
    setClaimError('');

    if (
      !fileIsValid(deathCertificate) ||
      !fileIsValid(identityProof)
    ) {
      setClaimError(
        'Death certificate and identity proof must be PDF, JPG/JPEG, or PNG files up to 10 MB each.'
      );
      return;
    }

    if (
      supportingDocument &&
      !fileIsValid(supportingDocument)
    ) {
      setClaimError(
        'Supporting document must be PDF, JPG/JPEG, or PNG and no larger than 10 MB.'
      );
      return;
    }

    setClaimSubmitting(true);

    try {
      await submitLegacyClaim({
        identityProofType,
        deathCertificate,
        identityProof,
        supportingDocument,
        remarks,
      });

      setDeathCertificate(null);
      setIdentityProof(null);
      setSupportingDocument(null);
      setRemarks('');

      await loadClaims();
    } catch (error) {
      setClaimError(error.message);
    } finally {
      setClaimSubmitting(false);
    }
  };

  const handleSelectLawyer = async () => {
    setClaimError('');

    if (!activeClaim) {
      setClaimError(
        'Legacy Claim could not be found.'
      );
      return;
    }

    if (!selectedLawyerId) {
      setClaimError(
        'Please select an available Lawyer.'
      );
      return;
    }

    const selectedLawyer = lawyers.find(
      (lawyer) => lawyer.id === selectedLawyerId
    );

    if (!selectedLawyer) {
      setClaimError(
        'Selected Lawyer could not be found.'
      );
      return;
    }

    if (selectedLawyer.isAvailable === false) {
      setClaimError(
        'This Lawyer is currently unavailable. Please select another Lawyer.'
      );
      return;
    }

    const confirmed = window.confirm(
      `Select ${selectedLawyer.name} to review your Legacy Access Claim?`
    );

    if (!confirmed) return;

    setSelectingLawyer(true);

    try {
      await selectClaimLawyer(
        activeClaim.id,
        selectedLawyerId
      );

      setSelectedLawyerId('');
      await loadClaims();
    } catch (error) {
      setClaimError(
        error.message ||
          'Unable to select Lawyer.'
      );
    } finally {
      setSelectingLawyer(false);
    }
  };

  const handleAdditionalSubmit = async (event) => {
    event.preventDefault();
    setClaimError('');

    if (
      !activeClaim ||
      !pendingInformationRequest
    ) {
      setClaimError(
        'No pending additional information request was found.'
      );
      return;
    }

    if (additionalFiles.length === 0) {
      setClaimError(
        'Upload at least one requested document.'
      );
      return;
    }

    if (
      additionalFiles.find(
        (file) => !fileIsValid(file)
      )
    ) {
      setClaimError(
        'Every additional document must be PDF, JPG/JPEG, or PNG and no larger than 10 MB.'
      );
      return;
    }

    setAdditionalSubmitting(true);

    try {
      await submitAdditionalClaimInformation(
        activeClaim.id,
        {
          files: additionalFiles,
          responseMessage,
        }
      );

      setAdditionalFiles([]);
      setResponseMessage('');
      await loadClaims();
    } catch (error) {
      setClaimError(error.message);
    } finally {
      setAdditionalSubmitting(false);
    }
  };

  const openAdditionalEvidence = async (
    claimId,
    requestId,
    fileIndex
  ) => {
    try {
      setClaimError('');

      const blob = await getAdditionalClaimFile(
        claimId,
        requestId,
        fileIndex
      );

      const url = URL.createObjectURL(blob);

      const popup = window.open(
        url,
        '_blank',
        'noopener,noreferrer'
      );

      if (!popup) {
        URL.revokeObjectURL(url);
        throw new Error(
          'The browser blocked the document window. Please allow pop-ups for this site.'
        );
      }

      setTimeout(
        () => URL.revokeObjectURL(url),
        60000
      );
    } catch (error) {
      setClaimError(
        error.message ||
          'Unable to open additional evidence.'
      );
    }
  };

  const viewDocument = async (documentId) => {
    try {
      setDocumentError('');

      const response = await fetch(
        `/api/documents/${documentId}/access`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        let message = 'Unable to access record.';

        try {
          const data = await response.json();
          message = data.message || message;
        } catch {
          // Response can be binary.
        }

        throw new Error(message);
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);

      window.open(url, '_blank');

      setTimeout(
        () => URL.revokeObjectURL(url),
        60000
      );
    } catch (error) {
      setDocumentError(
        error.message ||
          'Unable to access record.'
      );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-cyan-50/70 via-slate-50 to-indigo-50/50">
      <Navbar />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* HERO / ACCOUNT SUMMARY */}
        <section className="relative mb-7 overflow-hidden rounded-3xl border border-cyan-100 bg-gradient-to-r from-slate-950 via-indigo-950 to-cyan-900 px-6 py-7 text-white shadow-xl sm:px-8">
          <div className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-cyan-400/20 blur-3xl" />
          <div className="pointer-events-none absolute bottom-0 left-1/3 h-32 w-72 rounded-full bg-indigo-400/20 blur-3xl" />

          <div className="relative grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold text-cyan-100">
                <ShieldCheck size={14} />
                Beneficiary Access
              </div>

              <h1 className="mt-4 text-3xl font-bold tracking-[-0.03em] sm:text-4xl">
                Welcome, {user?.name}
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
                Review the records assigned to you first.
                Legacy access requests and legal review
                controls remain available below.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-2">
              <HeroStat
                label="Assigned"
                value={recordStats.total}
                icon={FolderOpen}
              />
              <HeroStat
                label="Assets"
                value={recordStats.assets}
                icon={Landmark}
              />
              <HeroStat
                label="Liabilities"
                value={recordStats.liabilities}
                icon={CreditCard}
              />
              <HeroStat
                label="Claim"
                value={
                  activeClaim
                    ? activeClaim.status ===
                      'APPROVED_INFORMATION_RELEASED'
                      ? 'Approved'
                      : 'Active'
                    : 'None'
                }
                icon={BadgeCheck}
              />
            </div>
          </div>
        </section>

        {/* ALLOTTED DOCUMENTS - TOP */}
        <section className="mb-7 overflow-hidden rounded-3xl border border-cyan-100 bg-white shadow-sm">
          <div className="border-b border-cyan-100 bg-gradient-to-r from-cyan-50 via-white to-indigo-50 px-5 py-5 sm:px-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-cyan-100 text-cyan-700">
                  {hasReleasedClaim ? (
                    <FolderOpen size={20} />
                  ) : (
                    <LockKeyhole size={20} />
                  )}
                </div>

                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-cyan-700">
                    Allotted Documents
                  </p>
                  <h2 className="mt-0.5 text-xl font-semibold text-slate-900">
                    Records assigned to you
                  </h2>
                  <p className="mt-1 text-xs text-slate-500">
                    Only Owner-assigned records become
                    viewable after final Lawyer approval.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {RECORD_TABS.map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setRecordTab(value)}
                    className={`rounded-xl px-3 py-2 text-xs font-semibold transition ${
                      recordTab === value
                        ? 'bg-cyan-700 text-white shadow-sm'
                        : 'border border-slate-200 bg-white text-slate-600 hover:border-cyan-200 hover:bg-cyan-50'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {documentError && (
            <div className="mx-5 mt-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700 sm:mx-6">
              {documentError}
            </div>
          )}

          {documentsLoading ? (
            <div className="flex min-h-[260px] items-center justify-center gap-2 text-sm text-slate-500">
              <Loader2
                size={18}
                className="animate-spin text-cyan-700"
              />
              Loading assigned records...
            </div>
          ) : visibleDocuments.length === 0 ? (
            <div className="flex min-h-[260px] flex-col items-center justify-center px-6 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-50 text-cyan-600">
                <LockKeyhole size={25} />
              </div>

              <p className="mt-4 font-semibold text-slate-800">
                {hasReleasedClaim
                  ? 'No records in this category'
                  : 'Assigned records are still locked'}
              </p>

              <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
                {hasReleasedClaim
                  ? 'There are currently no released Owner-assigned records matching this filter.'
                  : 'Records become available after the Legacy Access Claim receives final Lawyer approval.'}
              </p>
            </div>
          ) : (
            <div className="grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-3 sm:p-6">
              {visibleDocuments.map((document) => (
                <article
                  key={document.id}
                  className="group rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-4 transition hover:-translate-y-0.5 hover:border-cyan-200 hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cyan-50 text-cyan-700">
                      <FileText size={18} />
                    </div>

                    <span
                      className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${recordTypeStyle(
                        document.recordType
                      )}`}
                    >
                      {recordTypeLabel(
                        document.recordType
                      )}
                    </span>
                  </div>

                  <h3 className="mt-4 truncate text-sm font-semibold text-slate-900">
                    {document.title}
                  </h3>

                  <p className="mt-1 text-xs text-slate-500">
                    {document.category}
                  </p>

                  <button
                    type="button"
                    onClick={() =>
                      viewDocument(document.id)
                    }
                    className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-3 py-2.5 text-xs font-semibold text-white transition hover:bg-cyan-800"
                  >
                    <Eye size={14} />
                    View assigned record
                  </button>
                </article>
              ))}
            </div>
          )}
        </section>

        {/* ACCOUNT INFORMATION */}
        <section className="mb-7 rounded-3xl border border-indigo-100 bg-white p-5 shadow-sm sm:p-6">
          <div className="grid gap-5 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-indigo-600">
                Account
              </p>
              <h2 className="mt-1 text-lg font-semibold text-slate-900">
                Beneficiary profile
              </h2>
              <p className="mt-1 text-sm leading-6 text-slate-500">
                This linked account establishes your
                Owner-Beneficiary relationship.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <InfoTile
                icon={User}
                label="Name"
                value={user?.name}
              />
              <InfoTile
                icon={User}
                label="Username"
                value={`@${user?.username}`}
              />
              <InfoTile
                icon={Mail}
                label="Email"
                value={user?.email}
              />
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            {user?.mustChangePassword ? (
              <div className="rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                Change your initial password before
                continuing to use the account.
              </div>
            ) : (
              <p className="text-xs text-slate-400">
                Your account credentials are active.
              </p>
            )}

            <button
              type="button"
              onClick={() =>
                navigate('/change-password')
              }
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2.5 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-100"
            >
              <KeyRound size={15} />
              Change password
            </button>
          </div>
        </section>

        {/* LEGACY CLAIM - BOTTOM */}
        <section className="overflow-hidden rounded-3xl border border-indigo-100 bg-white shadow-sm">
          <div className="border-b border-indigo-100 bg-gradient-to-r from-indigo-50 via-white to-violet-50 px-5 py-5 sm:px-6">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700">
                <Clock3 size={20} />
              </div>

              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-indigo-600">
                  Legacy Claim
                </p>
                <h2 className="mt-0.5 text-xl font-semibold text-slate-900">
                  Legacy Access Claim
                </h2>
                <p className="mt-1 max-w-3xl text-xs leading-5 text-slate-500">
                  Submit evidence for Admin verification.
                  After Admin approval, select an available
                  Lawyer for final review.
                </p>
              </div>
            </div>
          </div>

          <div className="p-5 sm:p-6">
            {claimError && (
              <div className="mb-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
                {claimError}
              </div>
            )}

            {claimsLoading ? (
              <div className="flex items-center gap-2 py-8 text-sm text-slate-500">
                <Loader2
                  size={16}
                  className="animate-spin text-indigo-600"
                />
                Loading claim status…
              </div>
            ) : activeClaim &&
              activeClaim.status !==
                'REJECTED_PLATFORM_CLAIM' ? (
              <div className="space-y-5">
                <ClaimStatusCard claim={activeClaim} />

                {activeClaim.status ===
                  'LEGACY_ACCESS_REQUESTED' && (
                  <div className="rounded-2xl border border-cyan-200 bg-cyan-50/60 p-5">
                    <div className="flex items-center gap-2">
                      <CheckCircle2
                        size={18}
                        className="text-emerald-600"
                      />
                      <h3 className="font-semibold text-cyan-950">
                        Admin verification completed
                      </h3>
                    </div>

                    <p className="mt-2 text-sm text-cyan-800">
                      Select an available Lawyer for
                      final review.
                    </p>

                    {lawyersLoading ? (
                      <div className="mt-5 flex items-center gap-2 text-sm text-slate-500">
                        <Loader2
                          size={16}
                          className="animate-spin"
                        />
                        Loading Lawyers…
                      </div>
                    ) : lawyers.length === 0 ? (
                      <div className="mt-5 rounded-xl border border-dashed border-cyan-200 bg-white p-5 text-center">
                        <p className="text-sm font-semibold text-slate-700">
                          No Lawyers registered
                        </p>
                      </div>
                    ) : (
                      <div className="mt-5 grid gap-3 md:grid-cols-2">
                        {lawyers.map((lawyer) => {
                          const available =
                            lawyer.isAvailable !== false;
                          const selected =
                            selectedLawyerId ===
                            lawyer.id;

                          return (
                            <button
                              key={lawyer.id}
                              type="button"
                              disabled={
                                !available ||
                                selectingLawyer
                              }
                              onClick={() =>
                                setSelectedLawyerId(
                                  lawyer.id
                                )
                              }
                              className={`rounded-2xl border bg-white p-4 text-left transition ${
                                selected
                                  ? 'border-indigo-400 ring-2 ring-indigo-100'
                                  : 'border-slate-200'
                              } ${
                                available
                                  ? 'hover:border-indigo-300 hover:shadow-sm'
                                  : 'cursor-not-allowed opacity-60'
                              }`}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <p className="truncate font-semibold text-slate-900">
                                    {lawyer.name}
                                  </p>
                                  <p className="mt-1 text-xs text-slate-500">
                                    {lawyer.city ||
                                      'City not provided'}
                                    {lawyer.state
                                      ? `, ${lawyer.state}`
                                      : ''}
                                  </p>
                                  <p className="mt-1 text-xs text-slate-400">
                                    Enrollment:{' '}
                                    {lawyer.enrollmentNumber ||
                                      'Not provided'}
                                  </p>
                                </div>

                                <span
                                  className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${
                                    available
                                      ? 'bg-emerald-50 text-emerald-700'
                                      : 'bg-red-50 text-red-700'
                                  }`}
                                >
                                  {available
                                    ? 'Available'
                                    : 'Unavailable'}
                                </span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {selectedLawyerId && (
                      <button
                        type="button"
                        onClick={handleSelectLawyer}
                        disabled={selectingLawyer}
                        className="btn-primary mt-5"
                      >
                        {selectingLawyer ? (
                          <Loader2
                            size={16}
                            className="animate-spin"
                          />
                        ) : (
                          <ShieldCheck size={16} />
                        )}

                        {selectingLawyer
                          ? 'Assigning Lawyer…'
                          : 'Confirm Lawyer Selection'}
                      </button>
                    )}
                  </div>
                )}

                {activeClaim.status ===
                  'MORE_INFORMATION_REQUIRED' &&
                  pendingInformationRequest && (
                    <form
                      onSubmit={
                        handleAdditionalSubmit
                      }
                      className="rounded-2xl border border-orange-200 bg-orange-50 p-5"
                    >
                      <div className="flex items-center gap-2 text-orange-800">
                        <MessageSquareMore size={18} />
                        <h3 className="font-semibold">
                          Additional Information Required
                        </h3>
                      </div>

                      <p className="mt-2 text-sm text-orange-900">
                        <span className="font-semibold">
                          Requested by Lawyer:
                        </span>{' '}
                        {
                          pendingInformationRequest.message
                        }
                      </p>

                      <label className="mt-4 block cursor-pointer rounded-xl border border-dashed border-orange-300 bg-white p-4">
                        <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                          <Upload size={15} />
                          Upload requested documents
                        </div>

                        <p className="mt-2 text-xs text-slate-500">
                          {additionalFiles.length > 0
                            ? `${additionalFiles.length} file(s) selected`
                            : 'Select up to 5 PDF/JPG/PNG files, 10 MB each'}
                        </p>

                        <input
                          type="file"
                          multiple
                          accept="application/pdf,image/jpeg,image/png"
                          className="sr-only"
                          onChange={(event) =>
                            setAdditionalFiles(
                              Array.from(
                                event.target.files || []
                              ).slice(0, 5)
                            )
                          }
                        />
                      </label>

                      {additionalFiles.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {additionalFiles.map(
                            (file) => (
                              <p
                                key={`${file.name}-${file.size}`}
                                className="truncate text-xs text-slate-600"
                              >
                                • {file.name}
                              </p>
                            )
                          )}
                        </div>
                      )}

                      <label className="mt-4 block text-sm font-medium text-slate-700">
                        Response / note (optional)
                        <textarea
                          value={responseMessage}
                          onChange={(event) =>
                            setResponseMessage(
                              event.target.value
                            )
                          }
                          className="field-input mt-1 min-h-24"
                          placeholder="Explain what you have uploaded"
                        />
                      </label>

                      <button
                        type="submit"
                        className="btn-primary mt-4"
                        disabled={additionalSubmitting}
                      >
                        {additionalSubmitting ? (
                          <Loader2
                            size={16}
                            className="animate-spin"
                          />
                        ) : (
                          <Upload size={16} />
                        )}

                        {additionalSubmitting
                          ? 'Submitting additional evidence…'
                          : 'Submit Additional Information'}
                      </button>
                    </form>
                  )}

                {activeClaim.informationRequests
                  ?.length > 0 && (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-5">
                    <h3 className="text-sm font-semibold text-slate-800">
                      Information request history
                    </h3>

                    <div className="mt-3 space-y-3">
                      {activeClaim.informationRequests.map(
                        (request) => (
                          <div
                            key={request.id}
                            className="rounded-xl border border-slate-200 bg-white p-4 text-sm"
                          >
                            <p className="font-semibold text-slate-800">
                              Lawyer request
                            </p>

                            <p className="mt-1 text-slate-600">
                              {request.message}
                            </p>

                            <p className="mt-1 text-xs text-slate-400">
                              {request.status ===
                              'SUBMITTED'
                                ? `Submitted ${formatDate(
                                    request.respondedAt
                                  )}`
                                : 'Waiting for your response'}
                            </p>

                            {request.responseMessage && (
                              <p className="mt-2 text-slate-600">
                                <span className="font-semibold">
                                  Your response:
                                </span>{' '}
                                {
                                  request.responseMessage
                                }
                              </p>
                            )}

                            {request.additionalDocuments
                              ?.length > 0 && (
                              <div className="mt-3 flex flex-wrap gap-2">
                                {request.additionalDocuments.map(
                                  (file) => (
                                    <button
                                      key={`${request.id}-${file.index}`}
                                      type="button"
                                      onClick={() =>
                                        openAdditionalEvidence(
                                          activeClaim.id,
                                          request.id,
                                          file.index
                                        )
                                      }
                                      className="btn-secondary"
                                    >
                                      <Eye size={14} />
                                      {file.originalName}
                                    </button>
                                  )
                                )}
                              </div>
                            )}
                          </div>
                        )
                      )}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <form
                onSubmit={handleSubmitClaim}
                className="space-y-5"
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="text-sm font-medium text-slate-700">
                    Identity proof type
                    <select
                      value={identityProofType}
                      onChange={(event) =>
                        setIdentityProofType(
                          event.target.value
                        )
                      }
                      className="field-input mt-1"
                    >
                      <option value="AADHAAR">
                        Aadhaar / Masked Aadhaar
                      </option>
                      <option value="PASSPORT">
                        Passport
                      </option>
                      <option value="DRIVING_LICENCE">
                        Driving Licence
                      </option>
                      <option value="VOTER_ID">
                        Voter ID
                      </option>
                      <option value="OTHER">
                        Other
                      </option>
                    </select>
                  </label>

                  <label className="text-sm font-medium text-slate-700">
                    Remarks (optional)
                    <input
                      value={remarks}
                      onChange={(event) =>
                        setRemarks(event.target.value)
                      }
                      className="field-input mt-1"
                      placeholder="Anything relevant to the claim"
                    />
                  </label>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  {[
                    [
                      'Death certificate',
                      deathCertificate,
                      setDeathCertificate,
                      true,
                    ],
                    [
                      'Identity proof',
                      identityProof,
                      setIdentityProof,
                      true,
                    ],
                    [
                      'Supporting document',
                      supportingDocument,
                      setSupportingDocument,
                      false,
                    ],
                  ].map(
                    ([
                      label,
                      file,
                      setter,
                      required,
                    ]) => (
                      <label
                        key={label}
                        className="cursor-pointer rounded-2xl border border-dashed border-indigo-200 bg-indigo-50/40 p-4 transition hover:border-indigo-300 hover:bg-indigo-50"
                      >
                        <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                          <Upload size={15} />
                          {label}
                          {required ? ' *' : ''}
                        </div>

                        <p className="mt-2 truncate text-xs text-slate-500">
                          {file?.name ||
                            'PDF/JPG/PNG up to 10 MB'}
                        </p>

                        <input
                          type="file"
                          accept="application/pdf,image/jpeg,image/png"
                          className="sr-only"
                          required={required}
                          onChange={(event) =>
                            setter(
                              event.target
                                .files?.[0] || null
                            )
                          }
                        />
                      </label>
                    )
                  )}
                </div>

                <button
                  type="submit"
                  className="btn-primary"
                  disabled={claimSubmitting}
                >
                  {claimSubmitting ? (
                    <Loader2
                      size={16}
                      className="animate-spin"
                    />
                  ) : (
                    <ShieldCheck size={16} />
                  )}

                  {claimSubmitting
                    ? 'Submitting claim…'
                    : 'Request Legacy Access'}
                </button>
              </form>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

function HeroStat({ label, value, icon: Icon }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 backdrop-blur">
      <div className="flex items-center gap-2 text-cyan-200">
        <Icon size={15} />
        <span className="text-[10px] font-semibold uppercase tracking-[0.12em]">
          {label}
        </span>
      </div>
      <p className="mt-2 text-lg font-bold text-white">
        {value}
      </p>
    </div>
  );
}

function InfoTile({ icon: Icon, label, value }) {
  return (
    <div className="rounded-2xl border border-indigo-100 bg-indigo-50/40 p-4">
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-indigo-600 shadow-sm">
        <Icon size={16} />
      </div>
      <p className="mt-3 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
        {label}
      </p>
      <p className="mt-1 truncate text-sm font-semibold text-slate-800">
        {value || '—'}
      </p>
    </div>
  );
}

function ClaimStatusCard({ claim }) {
  const released =
    claim.status ===
    'APPROVED_INFORMATION_RELEASED';

  return (
    <div className="rounded-2xl border border-indigo-100 bg-gradient-to-r from-indigo-50/60 to-white p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-indigo-500">
            Current status
          </p>
          <p className="mt-1 font-semibold text-slate-900">
            {statusLabel(claim.status)}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Submitted {formatDate(claim.createdAt)}
          </p>
        </div>

        {released ? (
          <CheckCircle2
            className="text-emerald-600"
            size={24}
          />
        ) : (
          <LockKeyhole
            className="text-indigo-600"
            size={24}
          />
        )}
      </div>

      {claim.adminReview?.remarks && (
        <p className="mt-4 text-sm text-slate-600">
          <span className="font-semibold">
            Admin remarks:
          </span>{' '}
          {claim.adminReview.remarks}
        </p>
      )}

      {claim.lawyerReview?.remarks && (
        <p className="mt-2 text-sm text-slate-600">
          <span className="font-semibold">
            Lawyer remarks:
          </span>{' '}
          {claim.lawyerReview.remarks}
        </p>
      )}

      {claim.assignedLawyer && (
        <p className="mt-2 text-sm text-slate-600">
          Assigned Lawyer:{' '}
          <span className="font-semibold">
            {claim.assignedLawyer.name}
          </span>
        </p>
      )}
    </div>
  );
}
