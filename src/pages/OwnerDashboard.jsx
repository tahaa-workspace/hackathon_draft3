import UploadDocument from "../components/UploadDocument";
import { useCallback, useEffect, useState } from "react";
import {
  UserPlus,
  Loader2,
  Users,
  CheckCircle2,
  Key,
  FileText,
  Eye,
  Share2,
  Save,
  X,
} from "lucide-react";
import Navbar from "../components/Navbar";
import { useAuth } from "../context/AuthContext";
import {
  createBeneficiary,
  listBeneficiaries,
} from "../services/authService";

const EMPTY = {
  name: "",
  username: "",
  email: "",
  initialPassword: "",
};

function formatDate(value) {
  return new Date(value).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function OwnerDashboard() {
  const { user, token } = useAuth();

  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [beneficiaries, setBeneficiaries] = useState([]);
  const [listLoading, setListLoading] = useState(true);

  const [documents, setDocuments] = useState([]);
  const [documentsLoading, setDocumentsLoading] = useState(true);
  const [documentError, setDocumentError] = useState("");

  const [managingDocumentId, setManagingDocumentId] = useState(null);
  const [selectedBeneficiaryIds, setSelectedBeneficiaryIds] = useState([]);
  const [accessSaving, setAccessSaving] = useState(false);
  const [accessMessage, setAccessMessage] = useState("");

  const update = (key) => (e) =>
    setForm((current) => ({
      ...current,
      [key]: e.target.value,
    }));

  const loadBeneficiaries = useCallback(async () => {
    setListLoading(true);

    try {
      const data = await listBeneficiaries();
      setBeneficiaries(data.beneficiaries || []);
    } catch (loadError) {
      console.error("Beneficiary loading error:", loadError);
    } finally {
      setListLoading(false);
    }
  }, []);

  const loadDocuments = useCallback(async () => {
    if (!token) {
      setDocumentsLoading(false);
      return;
    }

    setDocumentsLoading(true);

    try {
      setDocumentError("");

      const response = await fetch("/api/documents", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to fetch documents.");
      }

      setDocuments(data.documents || []);
    } catch (loadError) {
      console.error("Document loading error:", loadError);
      setDocumentError(loadError.message || "Failed to fetch documents.");
    } finally {
      setDocumentsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadBeneficiaries();
    loadDocuments();
  }, [loadBeneficiaries, loadDocuments]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (form.initialPassword.length < 8) {
      setError("Initial password must be at least 8 characters long.");
      return;
    }

    setLoading(true);

    try {
      await createBeneficiary(form);
      setSuccess(
        "Beneficiary created. They must change their password on first login."
      );
      setForm(EMPTY);
      await loadBeneficiaries();
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setLoading(false);
    }
  };

  const viewDocument = async (documentId) => {
    try {
      setDocumentError("");

      const response = await fetch(`/api/documents/${documentId}/access`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        let message = "Unable to access document.";

        try {
          const data = await response.json();
          message = data.message || message;
        } catch {
          // Response may be binary, so JSON parsing is optional here.
        }

        throw new Error(message);
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");

      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (viewError) {
      console.error("Document access error:", viewError);
      setDocumentError(viewError.message || "Unable to access document.");
    }
  };

  const openAccessManager = (document) => {
    setManagingDocumentId(document.id);
    setSelectedBeneficiaryIds(document.assignedBeneficiaryIds || []);
    setAccessMessage("");
  };

  const closeAccessManager = () => {
    setManagingDocumentId(null);
    setSelectedBeneficiaryIds([]);
    setAccessMessage("");
  };

  const toggleBeneficiary = (beneficiaryId) => {
    setSelectedBeneficiaryIds((current) =>
      current.includes(beneficiaryId)
        ? current.filter((id) => id !== beneficiaryId)
        : [...current, beneficiaryId]
    );
  };

  const saveDocumentAccess = async (documentId) => {
    setAccessSaving(true);
    setDocumentError("");
    setAccessMessage("");

    try {
      const response = await fetch(
        `/api/documents/${documentId}/beneficiaries`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            beneficiaryIds: selectedBeneficiaryIds,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to update document access.");
      }

      setDocuments((current) =>
        current.map((document) =>
          document.id === documentId ? data.document : document
        )
      );

      setAccessMessage("Access updated successfully.");
    } catch (saveError) {
      console.error("Document sharing error:", saveError);
      setDocumentError(saveError.message || "Failed to update document access.");
    } finally {
      setAccessSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-ink-50">
      <Navbar />

      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
            <UserPlus size={20} />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-ink-900">
              Owner Dashboard
            </h1>
            <p className="text-sm text-ink-500">
              Welcome, {user?.name}. Manage beneficiaries and securely store your documents.
            </p>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-5">
          <section className="card lg:col-span-3">
            <h2 className="mb-1 text-lg font-semibold text-ink-800">
              Create Beneficiary
            </h2>
            <p className="mb-5 text-sm text-ink-500">
              Beneficiaries cannot self-register. They must use credentials created by the owner.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              {error && <div className="alert-error">{error}</div>}

              {success && (
                <div className="alert-success flex items-center gap-2">
                  <CheckCircle2 size={16} />
                  {success}
                </div>
              )}

              <div>
                <label className="field-label" htmlFor="b-name">
                  Full Name
                </label>
                <input
                  id="b-name"
                  className="field-input"
                  value={form.name}
                  onChange={update("name")}
                  required
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="field-label" htmlFor="b-username">
                    Username
                  </label>
                  <input
                    id="b-username"
                    className="field-input"
                    value={form.username}
                    onChange={update("username")}
                    required
                  />
                </div>

                <div>
                  <label className="field-label" htmlFor="b-email">
                    Email
                  </label>
                  <input
                    id="b-email"
                    type="email"
                    className="field-input"
                    value={form.email}
                    onChange={update("email")}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="field-label" htmlFor="b-pass">
                  Initial Password
                </label>
                <input
                  id="b-pass"
                  type="password"
                  className="field-input"
                  value={form.initialPassword}
                  onChange={update("initialPassword")}
                  required
                />
                <p className="mt-1.5 text-xs text-ink-400">
                  The beneficiary must change this password on first login.
                </p>
              </div>

              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <UserPlus size={16} />
                )}
                {loading ? "Creating..." : "Create Beneficiary"}
              </button>
            </form>
          </section>

          <section className="card lg:col-span-2">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-ink-800">
              <Users size={18} />
              Your Beneficiaries
            </h2>

            {listLoading ? (
              <div className="flex items-center justify-center gap-2 py-10 text-sm text-ink-500">
                <Loader2 size={16} className="animate-spin" />
                Loading...
              </div>
            ) : beneficiaries.length === 0 ? (
              <p className="py-10 text-center text-sm text-ink-500">
                No beneficiaries yet.
              </p>
            ) : (
              <ul className="space-y-3">
                {beneficiaries.map((beneficiary) => (
                  <li
                    key={beneficiary.id}
                    className="rounded-xl border border-ink-100 p-4"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-ink-800">
                        {beneficiary.name}
                      </span>

                      {beneficiary.mustChangePassword ? (
                        <span className="badge bg-amber-50 text-amber-700">
                          <Key size={12} className="mr-1" />
                          Pending change
                        </span>
                      ) : (
                        <span className="badge bg-green-50 text-green-700">
                          Active
                        </span>
                      )}
                    </div>

                    <div className="mt-1 text-sm text-ink-500">
                      @{beneficiary.username} · {beneficiary.email}
                    </div>
                    <div className="mt-0.5 text-xs text-ink-400">
                      Created {formatDate(beneficiary.createdAt)}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <section className="card">
            <div className="mb-4 flex items-center gap-2">
              <FileText size={20} />
              <h2 className="text-lg font-semibold text-ink-800">
                Upload Document
              </h2>
            </div>

            <UploadDocument onUploadSuccess={loadDocuments} />
          </section>

          <section className="card">
            <div className="mb-4 flex items-center gap-2">
              <FileText size={20} />
              <h2 className="text-lg font-semibold text-ink-800">
                My Documents
              </h2>
            </div>

            {documentError && (
              <div className="alert-error mb-4">{documentError}</div>
            )}

            {documentsLoading ? (
              <div className="flex items-center justify-center gap-2 py-10 text-sm text-ink-500">
                <Loader2 size={16} className="animate-spin" />
                Loading documents...
              </div>
            ) : documents.length === 0 ? (
              <p className="py-10 text-center text-sm text-ink-500">
                No documents uploaded yet.
              </p>
            ) : (
              <ul className="space-y-3">
                {documents.map((document) => {
                  const isManaging = managingDocumentId === document.id;
                  const assignedCount = document.assignedBeneficiaryIds?.length || 0;

                  return (
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
                          <p className="truncate text-xs text-ink-400">
                            {document.originalName}
                          </p>
                          <p className="mt-1 text-xs text-ink-400">
                            Uploaded {formatDate(document.createdAt)}
                          </p>
                          <p className="mt-1 text-xs font-medium text-brand-700">
                            Shared with {assignedCount} {assignedCount === 1 ? "beneficiary" : "beneficiaries"}
                          </p>
                        </div>

                        <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
                          <button
                            onClick={() => viewDocument(document.id)}
                            className="btn-primary flex items-center gap-2"
                          >
                            <Eye size={16} />
                            View
                          </button>

                          <button
                            onClick={() =>
                              isManaging
                                ? closeAccessManager()
                                : openAccessManager(document)
                            }
                            className="btn-secondary flex items-center gap-2"
                          >
                            {isManaging ? <X size={16} /> : <Share2 size={16} />}
                            {isManaging ? "Close" : "Manage Access"}
                          </button>
                        </div>
                      </div>

                      {isManaging && (
                        <div className="mt-4 border-t border-ink-100 pt-4">
                          <p className="text-sm font-semibold text-ink-800">
                            Select beneficiaries who can view this document
                          </p>
                          <p className="mt-1 text-xs text-ink-500">
                            For this prototype, selected beneficiaries get access immediately.
                          </p>

                          {beneficiaries.length === 0 ? (
                            <p className="mt-4 text-sm text-ink-500">
                              Create a beneficiary first before assigning document access.
                            </p>
                          ) : (
                            <div className="mt-4 space-y-2">
                              {beneficiaries.map((beneficiary) => (
                                <label
                                  key={beneficiary.id}
                                  className="flex cursor-pointer items-center gap-3 rounded-lg border border-ink-100 px-3 py-2"
                                >
                                  <input
                                    type="checkbox"
                                    checked={selectedBeneficiaryIds.includes(
                                      beneficiary.id
                                    )}
                                    onChange={() =>
                                      toggleBeneficiary(beneficiary.id)
                                    }
                                  />
                                  <div>
                                    <div className="text-sm font-medium text-ink-800">
                                      {beneficiary.name}
                                    </div>
                                    <div className="text-xs text-ink-400">
                                      @{beneficiary.username}
                                    </div>
                                  </div>
                                </label>
                              ))}
                            </div>
                          )}

                          {accessMessage && (
                            <div className="alert-success mt-4">
                              {accessMessage}
                            </div>
                          )}

                          <button
                            type="button"
                            onClick={() => saveDocumentAccess(document.id)}
                            className="btn-primary mt-4"
                            disabled={accessSaving || beneficiaries.length === 0}
                          >
                            {accessSaving ? (
                              <Loader2 size={16} className="animate-spin" />
                            ) : (
                              <Save size={16} />
                            )}
                            {accessSaving ? "Saving..." : "Save Access"}
                          </button>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
