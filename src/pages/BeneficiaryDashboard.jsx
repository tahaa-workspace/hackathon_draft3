import { useEffect, useState } from 'react';
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
} from 'lucide-react';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';

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
  return new Date(value).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function BeneficiaryDashboard() {
  const { user, token } = useAuth();
  const navigate = useNavigate();

  const [documents, setDocuments] = useState([]);
  const [documentsLoading, setDocumentsLoading] = useState(true);
  const [documentError, setDocumentError] = useState('');

  useEffect(() => {
    const loadAssignedDocuments = async () => {
      if (!token) {
        setDocumentsLoading(false);
        return;
      }

      setDocumentsLoading(true);

      try {
        setDocumentError('');

        const response = await fetch('/api/documents/assigned-to-me', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || 'Failed to fetch assigned documents.');
        }

        setDocuments(data.documents || []);
      } catch (error) {
        console.error('Assigned document loading error:', error);
        setDocumentError(error.message || 'Failed to fetch assigned documents.');
      } finally {
        setDocumentsLoading(false);
      }
    };

    loadAssignedDocuments();
  }, [token]);

  const viewDocument = async (documentId) => {
    try {
      setDocumentError('');

      const response = await fetch(`/api/documents/${documentId}/access`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        let message = 'Unable to access document.';

        try {
          const data = await response.json();
          message = data.message || message;
        } catch {
          // Binary document responses do not need JSON parsing.
        }

        throw new Error(message);
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');

      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (error) {
      console.error('Beneficiary document access error:', error);
      setDocumentError(error.message || 'Unable to access document.');
    }
  };

  return (
    <div className="min-h-screen bg-ink-50">
      <Navbar />
      <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
            <Users size={20} />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-ink-900">Beneficiary dashboard</h1>
            <p className="text-sm text-ink-500">Welcome, {user?.name}.</p>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="card">
            <div className="flex items-center gap-2 text-brand-700">
              <ShieldCheck size={18} />
              <h2 className="text-base font-semibold">Your account</h2>
            </div>
            <p className="mt-1 text-sm text-ink-500">
              These are the details assigned to you by the owner who created your account.
            </p>

            <div className="mt-5">
              <Row Icon={User} label="Name" value={user?.name} />
              <Row Icon={User} label="Username" value={`@${user?.username}`} />
              <Row Icon={Mail} label="Email" value={user?.email} />
            </div>

            {user?.mustChangePassword && (
              <div className="alert-info mt-5">
                You must change your initial password before this account is fully usable.
              </div>
            )}

            <button
              onClick={() => navigate('/change-password')}
              className="btn-primary mt-6"
            >
              <KeyRound size={16} /> Change password
            </button>
          </div>

          <div className="card">
            <div className="flex items-center gap-2 text-brand-700">
              <FileText size={18} />
              <h2 className="text-base font-semibold">Documents Shared With Me</h2>
            </div>
            <p className="mt-1 text-sm text-ink-500">
              Only documents explicitly assigned to you by an owner are shown here.
            </p>

            {documentError && (
              <div className="alert-error mt-4">{documentError}</div>
            )}

            {documentsLoading ? (
              <div className="flex items-center justify-center gap-2 py-10 text-sm text-ink-500">
                <Loader2 size={16} className="animate-spin" />
                Loading documents...
              </div>
            ) : documents.length === 0 ? (
              <p className="py-10 text-center text-sm text-ink-500">
                No documents have been shared with you yet.
              </p>
            ) : (
              <ul className="mt-4 space-y-3">
                {documents.map((document) => (
                  <li
                    key={document.id}
                    className="rounded-xl border border-ink-100 p-4"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-ink-800">
                          {document.title}
                        </p>
                        <p className="text-sm text-ink-500">{document.category}</p>
                        <p className="mt-1 text-xs text-ink-400">
                          Shared by {document.ownerName}
                          {document.ownerUsername ? ` (@${document.ownerUsername})` : ''}
                        </p>
                        <p className="mt-1 text-xs text-ink-400">
                          Uploaded {formatDate(document.createdAt)}
                        </p>
                      </div>

                      <button
                        onClick={() => viewDocument(document.id)}
                        className="btn-primary flex shrink-0 items-center gap-2"
                      >
                        <Eye size={16} />
                        View
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
