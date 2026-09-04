import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  KeyRound,
  Mail,
  User,
  ShieldCheck,
  FileText,
  Eye,
  Loader2,
  Upload,
  LockKeyhole,
  CheckCircle2,
  Clock3,
} from 'lucide-react';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import { getMyLegacyClaims, submitLegacyClaim } from '../services/legacyService';

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];

function Row({ Icon, label, value }) {
  return (
    <div className="flex items-center gap-3 border-b border-ink-100 py-3 last:border-0">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-ink-50 text-ink-500">
        <Icon size={16} />
      </div>
      <div>
        <div className="text-xs font-medium uppercase tracking-wide text-ink-400">{label}</div>
        <div className="text-sm font-semibold text-ink-800">{value}</div>
      </div>
    </div>
  );
}

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
    LEGACY_ACCESS_REQUESTED: 'Admin Verified - Awaiting Lawyer Assignment',
    UNDER_LAWYER_REVIEW: 'Under Lawyer Review',
    MORE_INFORMATION_REQUIRED: 'More Information Required',
    APPROVED_INFORMATION_RELEASED: 'Approved - Information Released',
    ON_HOLD_DISPUTED: 'On Hold / Disputed',
    REJECTED_PLATFORM_CLAIM: 'Rejected Platform Claim',
  };
  return map[status] || status;
}

function fileIsValid(file) {
  return file && ALLOWED_TYPES.includes(file.type) && file.size <= MAX_FILE_SIZE;
}

export default function BeneficiaryDashboard() {
  const { user, token } = useAuth();
  const navigate = useNavigate();

  const [documents, setDocuments] = useState([]);
  const [documentsLoading, setDocumentsLoading] = useState(true);
  const [documentError, setDocumentError] = useState('');
  const [claims, setClaims] = useState([]);
  const [claimsLoading, setClaimsLoading] = useState(true);
  const [claimError, setClaimError] = useState('');
  const [claimSubmitting, setClaimSubmitting] = useState(false);

  const [identityProofType, setIdentityProofType] = useState('AADHAAR');
  const [deathCertificate, setDeathCertificate] = useState(null);
  const [identityProof, setIdentityProof] = useState(null);
  const [supportingDocument, setSupportingDocument] = useState(null);
  const [remarks, setRemarks] = useState('');

  const loadAssignedDocuments = useCallback(async () => {
    if (!token) {
      setDocumentsLoading(false);
      return;
    }

    setDocumentsLoading(true);
    try {
      setDocumentError('');
      const response = await fetch('/api/documents/assigned-to-me', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to fetch assigned documents.');
      setDocuments(data.documents || []);
    } catch (error) {
      setDocumentError(error.message || 'Failed to fetch assigned documents.');
    } finally {
      setDocumentsLoading(false);
    }
  }, [token]);

  const loadClaims = useCallback(async () => {
    setClaimsLoading(true);
    try {
      setClaimError('');
      const data = await getMyLegacyClaims();
      setClaims(data);
    } catch (error) {
      setClaimError(error.message || 'Unable to load Legacy Access Claims.');
    } finally {
      setClaimsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAssignedDocuments();
    loadClaims();
  }, [loadAssignedDocuments, loadClaims]);

  const activeClaim = claims[0] || null;
  const hasReleasedClaim = claims.some((claim) => claim.status === 'APPROVED_INFORMATION_RELEASED');

  const handleSubmitClaim = async (event) => {
    event.preventDefault();
    setClaimError('');

    if (!fileIsValid(deathCertificate) || !fileIsValid(identityProof)) {
      setClaimError('Death certificate and identity proof must be PDF, JPG/JPEG, or PNG files up to 10 MB each.');
      return;
    }
    if (supportingDocument && !fileIsValid(supportingDocument)) {
      setClaimError('Supporting document must be PDF, JPG/JPEG, or PNG and no larger than 10 MB.');
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

  const viewDocument = async (documentId) => {
    try {
      setDocumentError('');
      const response = await fetch(`/api/documents/${documentId}/access`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        let message = 'Unable to access document.';
        try {
          const data = await response.json();
          message = data.message || message;
        } catch {
          // Binary response path.
        }
        throw new Error(message);
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (error) {
      setDocumentError(error.message || 'Unable to access document.');
    }
  };

  return (
    <div className="min-h-screen bg-ink-50">
      <Navbar />
      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
            <Users size={20} />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-ink-900">Beneficiary dashboard</h1>
            <p className="text-sm text-ink-500">Welcome, {user?.name}.</p>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="card lg:col-span-1">
            <div className="flex items-center gap-2 text-brand-700">
              <ShieldCheck size={18} />
              <h2 className="text-base font-semibold">Your account</h2>
            </div>
            <p className="mt-1 text-sm text-ink-500">
              This linked account establishes the pre-existing Owner-Beneficiary relationship.
            </p>
            <div className="mt-5">
              <Row Icon={User} label="Name" value={user?.name} />
              <Row Icon={User} label="Username" value={`@${user?.username}`} />
              <Row Icon={Mail} label="Email" value={user?.email} />
            </div>
            {user?.mustChangePassword && (
              <div className="alert-info mt-5">You must change your initial password before this account is fully usable.</div>
            )}
            <button onClick={() => navigate('/change-password')} className="btn-primary mt-6">
              <KeyRound size={16} /> Change password
            </button>
          </div>

          <div className="card lg:col-span-2">
            <div className="flex items-center gap-2 text-brand-700">
              <Clock3 size={18} />
              <h2 className="text-base font-semibold">Legacy Access Claim</h2>
            </div>
            <p className="mt-1 text-sm text-ink-500">
              Submit this only after the Owner's death. The Admin performs platform checks, then an approved Lawyer performs professional review.
            </p>

            {claimError && <div className="alert-error mt-4">{claimError}</div>}

            {claimsLoading ? (
              <div className="flex items-center gap-2 py-8 text-sm text-ink-500"><Loader2 size={16} className="animate-spin" /> Loading claim status…</div>
            ) : activeClaim && activeClaim.status !== 'REJECTED_PLATFORM_CLAIM' ? (
              <div className="mt-5 rounded-2xl border border-ink-100 bg-ink-50 p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">Current status</p>
                    <p className="mt-1 font-semibold text-ink-900">{statusLabel(activeClaim.status)}</p>
                    <p className="mt-1 text-xs text-ink-500">Submitted {formatDate(activeClaim.createdAt)}</p>
                  </div>
                  {activeClaim.status === 'APPROVED_INFORMATION_RELEASED' ? (
                    <CheckCircle2 className="text-green-600" size={24} />
                  ) : (
                    <LockKeyhole className="text-amber-600" size={24} />
                  )}
                </div>
                {activeClaim.adminReview?.remarks && (
                  <p className="mt-4 text-sm text-ink-600"><span className="font-semibold">Admin remarks:</span> {activeClaim.adminReview.remarks}</p>
                )}
                {activeClaim.lawyerReview?.remarks && (
                  <p className="mt-2 text-sm text-ink-600"><span className="font-semibold">Lawyer remarks:</span> {activeClaim.lawyerReview.remarks}</p>
                )}
                {activeClaim.assignedLawyer && (
                  <p className="mt-2 text-sm text-ink-600">Assigned Lawyer: <span className="font-semibold">{activeClaim.assignedLawyer.name}</span></p>
                )}
              </div>
            ) : (
              <form onSubmit={handleSubmitClaim} className="mt-5 space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="text-sm font-medium text-ink-700">
                    Identity proof type
                    <select
                      value={identityProofType}
                      onChange={(e) => setIdentityProofType(e.target.value)}
                      className="field-input mt-1"
                    >
                      <option value="AADHAAR">Aadhaar / Masked Aadhaar</option>
                      <option value="PASSPORT">Passport</option>
                      <option value="DRIVING_LICENCE">Driving Licence</option>
                      <option value="VOTER_ID">Voter ID</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </label>
                  <label className="text-sm font-medium text-ink-700">
                    Remarks (optional)
                    <input value={remarks} onChange={(e) => setRemarks(e.target.value)} className="field-input mt-1" placeholder="Anything relevant to the claim" />
                  </label>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  {[
                    ['Death certificate', deathCertificate, setDeathCertificate, true],
                    ['Identity proof', identityProof, setIdentityProof, true],
                    ['Supporting document', supportingDocument, setSupportingDocument, false],
                  ].map(([label, file, setter, required]) => (
                    <label key={label} className="cursor-pointer rounded-xl border border-dashed border-ink-200 bg-white p-4 hover:border-brand-300">
                      <div className="flex items-center gap-2 text-sm font-semibold text-ink-700"><Upload size={15} /> {label}{required ? ' *' : ''}</div>
                      <p className="mt-2 truncate text-xs text-ink-500">{file?.name || 'PDF/JPG/PNG up to 10 MB'}</p>
                      <input
                        type="file"
                        accept="application/pdf,image/jpeg,image/png"
                        className="sr-only"
                        required={required}
                        onChange={(e) => setter(e.target.files?.[0] || null)}
                      />
                    </label>
                  ))}
                </div>

                <button type="submit" className="btn-primary" disabled={claimSubmitting}>
                  {claimSubmitting ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
                  {claimSubmitting ? 'Submitting claim…' : 'Request Legacy Access'}
                </button>
              </form>
            )}
          </div>
        </div>

        <div className="card mt-6">
          <div className="flex items-center gap-2 text-brand-700">
            {hasReleasedClaim ? <FileText size={18} /> : <LockKeyhole size={18} />}
            <h2 className="text-base font-semibold">Owner-assigned information</h2>
          </div>
          <p className="mt-1 text-sm text-ink-500">
            Assigned documents remain locked until the Legacy Access workflow is approved. After approval, only documents explicitly assigned to you appear here.
          </p>

          {documentError && <div className="alert-error mt-4">{documentError}</div>}

          {documentsLoading ? (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-ink-500">
              <Loader2 size={16} className="animate-spin" /> Loading documents...
            </div>
          ) : documents.length === 0 ? (
            <div className="py-10 text-center">
              <LockKeyhole size={28} className="mx-auto text-ink-300" />
              <p className="mt-2 text-sm text-ink-500">
                {hasReleasedClaim ? 'No assigned documents are available.' : 'Documents are locked until claim approval.'}
              </p>
            </div>
          ) : (
            <ul className="mt-4 grid gap-3 md:grid-cols-2">
              {documents.map((document) => (
                <li key={document.id} className="rounded-xl border border-ink-100 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-ink-800">{document.title}</p>
                      <p className="text-sm text-ink-500">{document.category}</p>
                      <p className="mt-1 text-xs text-ink-400">From {document.ownerName}{document.ownerUsername ? ` (@${document.ownerUsername})` : ''}</p>
                    </div>
                    <button onClick={() => viewDocument(document.id)} className="btn-primary flex shrink-0 items-center gap-2">
                      <Eye size={16} /> View
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
    </div>
  );
}
