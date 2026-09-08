import UploadDocument from "../components/UploadDocument";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  CalendarDays,
  CheckCircle2,
  Eye,
  FileText,
  FolderLock,
  Key,
  Loader2,
  LockKeyhole,
  Plus,
  Save,
  Share2,
  ShieldCheck,
  Trash2,
  UploadCloud,
  UserPlus,
  UserRoundCheck,
  Users,
  X,
} from "lucide-react";

import Navbar from "../components/Navbar";
import { useAuth } from "../context/AuthContext";

import {
  createBeneficiary,
  listBeneficiaries,
} from "../services/authService";

const EMPTY_BENEFICIARY = {
  name: "",
  username: "",
  email: "",
  initialPassword: "",
  aadhaar: null,
};

const TOAST_DURATION = 2800;

function formatDate(value) {
  if (!value) return "—";

  return new Date(value).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getCategoryStyle(category) {
  const styles = {
    Personal: "bg-blue-50 text-blue-700",
    Financial: "bg-emerald-50 text-emerald-700",
    Legal: "bg-violet-50 text-violet-700",
    Insurance: "bg-amber-50 text-amber-700",
    Property: "bg-cyan-50 text-cyan-700",
    Family: "bg-pink-50 text-pink-700",
    Other: "bg-ink-100 text-ink-600",
  };

  return styles[category] || styles.Other;
}

export default function OwnerDashboard() {
  const { user, token } = useAuth();

  const [beneficiaryForm, setBeneficiaryForm] =
    useState(EMPTY_BENEFICIARY);
  const [beneficiaryError, setBeneficiaryError] = useState("");
  const [beneficiaryLoading, setBeneficiaryLoading] = useState(false);
  const [beneficiaryModalOpen, setBeneficiaryModalOpen] = useState(false);

  const [uploadModalOpen, setUploadModalOpen] = useState(false);

  const [beneficiaries, setBeneficiaries] = useState([]);
  const [listLoading, setListLoading] = useState(true);

  const [documents, setDocuments] = useState([]);
  const [documentsLoading, setDocumentsLoading] = useState(true);
  const [documentError, setDocumentError] = useState("");

  const [deletingDocumentId, setDeletingDocumentId] = useState(null);

  const [managingDocumentId, setManagingDocumentId] = useState(null);
  const [selectedBeneficiaryIds, setSelectedBeneficiaryIds] = useState([]);
  const [accessSaving, setAccessSaving] = useState(false);
  const [accessMessage, setAccessMessage] = useState("");

  const [toast, setToast] = useState(null);

  const showToast = useCallback((message, type = "success") => {
    setToast({
      id: Date.now(),
      message,
      type,
    });
  }, []);

  useEffect(() => {
    if (!toast) return undefined;

    const timer = window.setTimeout(() => {
      setToast(null);
    }, TOAST_DURATION);

    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (!beneficiaryModalOpen && !uploadModalOpen) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setBeneficiaryModalOpen(false);
        setUploadModalOpen(false);
      }
    };

    window.addEventListener("keydown", handleEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleEscape);
    };
  }, [beneficiaryModalOpen, uploadModalOpen]);

  const updateBeneficiary =
    (key) =>
    (event) => {
      const value =
        key === "aadhaar"
          ? event.target.files?.[0] || null
          : event.target.value;

      setBeneficiaryForm((current) => ({
        ...current,
        [key]: value,
      }));
    };

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
        throw new Error(
          data.message || "Failed to fetch documents."
        );
      }

      setDocuments(data.documents || []);
    } catch (loadError) {
      console.error("Document loading error:", loadError);
      setDocumentError(
        loadError.message || "Failed to fetch documents."
      );
    } finally {
      setDocumentsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadBeneficiaries();
    loadDocuments();
  }, [loadBeneficiaries, loadDocuments]);

  const handleCreateBeneficiary = async (event) => {
    event.preventDefault();
    setBeneficiaryError("");

    if (!beneficiaryForm.aadhaar) {
      setBeneficiaryError(
        "Please upload the Beneficiary's Aadhaar card."
      );
      return;
    }

    if (beneficiaryForm.initialPassword.length < 8) {
      setBeneficiaryError(
        "Initial password must be at least 8 characters long."
      );
      return;
    }

    setBeneficiaryLoading(true);

    try {
      await createBeneficiary(beneficiaryForm);

      setBeneficiaryForm(EMPTY_BENEFICIARY);
      setBeneficiaryModalOpen(false);

      await loadBeneficiaries();

      showToast(
        "Beneficiary added successfully. Initial login credentials are ready."
      );
    } catch (submitError) {
      setBeneficiaryError(
        submitError.message || "Unable to create beneficiary."
      );
    } finally {
      setBeneficiaryLoading(false);
    }
  };

  const handleDocumentUploaded = async () => {
    await loadDocuments();
    setUploadModalOpen(false);
    showToast("Document uploaded securely to your vault.");
  };

  const viewDocument = async (documentId) => {
    try {
      setDocumentError("");

      const response = await fetch(
        `/api/documents/${documentId}/access`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        let message = "Unable to access document.";

        try {
          const data = await response.json();
          message = data.message || message;
        } catch {
          // Binary/error response.
        }

        throw new Error(message);
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);

      window.open(url, "_blank");

      window.setTimeout(() => {
        URL.revokeObjectURL(url);
      }, 60000);
    } catch (viewError) {
      console.error("Document access error:", viewError);
      setDocumentError(
        viewError.message || "Unable to access document."
      );
    }
  };

  const deleteDocument = async (document) => {
    const confirmed = window.confirm(
      `Permanently delete "${document.title}"?\n\nThis deletes the encrypted document from Cloudinary and removes its metadata from MongoDB Atlas.\n\nThis action cannot be undone.`
    );

    if (!confirmed) return;

    setDeletingDocumentId(document.id);
    setDocumentError("");
    setAccessMessage("");

    try {
      const response = await fetch(
        `/api/documents/${document.id}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data.message || "Failed to delete document."
        );
      }

      setDocuments((current) =>
        current.filter((item) => item.id !== document.id)
      );

      if (managingDocumentId === document.id) {
        setManagingDocumentId(null);
        setSelectedBeneficiaryIds([]);
        setAccessMessage("");
      }

      showToast("Document deleted successfully.");
    } catch (deleteError) {
      console.error("Document deletion error:", deleteError);
      setDocumentError(
        deleteError.message || "Failed to delete document."
      );
    } finally {
      setDeletingDocumentId(null);
    }
  };

  const openAccessManager = (document) => {
    setManagingDocumentId(document.id);
    setSelectedBeneficiaryIds(
      document.assignedBeneficiaryIds || []
    );
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
        throw new Error(
          data.message || "Failed to update document access."
        );
      }

      setDocuments((current) =>
        current.map((document) =>
          document.id === documentId
            ? data.document
            : document
        )
      );

      setAccessMessage("Access updated successfully.");
      showToast("Document access updated.");
    } catch (saveError) {
      console.error("Document sharing error:", saveError);
      setDocumentError(
        saveError.message || "Failed to update document access."
      );
    } finally {
      setAccessSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-ink-50">
      <Navbar />

      <Toast toast={toast} onClose={() => setToast(null)} />

      <main className="mx-auto max-w-7xl px-4 py-7 sm:px-6 lg:px-8 lg:py-9">
        {/* HEADER */}
        <section className="mb-7 overflow-hidden rounded-3xl border border-brand-100 bg-white shadow-card">
          <div className="relative overflow-hidden px-5 py-6 sm:px-7 lg:px-8">
            <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-brand-100/60 blur-3xl" />
            <div className="pointer-events-none absolute bottom-0 left-1/3 h-32 w-72 rounded-full bg-cyan-100/50 blur-3xl" />

            <div className="relative flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
              <div className="max-w-2xl">
                <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-brand-100 bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700">
                  <ShieldCheck size={14} />
                  Owner Vault
                </div>

                <h1 className="text-2xl font-bold tracking-[-0.025em] text-ink-900 sm:text-3xl">
                  Welcome back, {user?.name}
                </h1>

                <p className="mt-2 text-sm leading-6 text-ink-500">
                  Your vault, beneficiaries and sharing controls are
                  now organized into one compact workspace.
                </p>

                <div className="mt-5 flex flex-wrap gap-3">
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={() => setUploadModalOpen(true)}
                  >
                    <UploadCloud size={16} />
                    Upload Document
                  </button>

                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => {
                      setBeneficiaryError("");
                      setBeneficiaryModalOpen(true);
                    }}
                  >
                    <UserPlus size={16} />
                    Add Beneficiary
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <StatCard
                  icon={<FolderLock size={18} />}
                  value={documents.length}
                  label="Documents"
                />

                <StatCard
                  icon={<Users size={18} />}
                  value={beneficiaries.length}
                  label="Beneficiaries"
                />

                <div className="col-span-2 sm:col-span-1">
                  <StatCard
                    icon={<LockKeyhole size={18} />}
                    value="Secure"
                    label="Vault status"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* QUICK ACTIONS */}
        <section className="mb-7 grid gap-4 md:grid-cols-2">
          <QuickAction
            icon={UploadCloud}
            title="Add a vault record"
            text="Upload an Asset, Liability or General document without leaving the dashboard."
            buttonLabel="Upload"
            onClick={() => setUploadModalOpen(true)}
          />

          <QuickAction
            icon={UserRoundCheck}
            title="Add a trusted beneficiary"
            text="Create beneficiary credentials and upload identity documentation in a focused form."
            buttonLabel="Add"
            onClick={() => {
              setBeneficiaryError("");
              setBeneficiaryModalOpen(true);
            }}
          />
        </section>

        {/* MAIN DASHBOARD */}
        <div className="grid gap-7 xl:grid-cols-[1.35fr_0.65fr]">
          {/* DOCUMENTS */}
          <section className="overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-card">
            <div className="flex flex-col gap-4 border-b border-ink-100 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                  <FileText size={20} />
                </div>

                <div>
                  <h2 className="font-semibold text-ink-900">
                    Document Vault
                  </h2>
                  <p className="mt-0.5 text-xs text-ink-400">
                    {documents.length}{" "}
                    {documents.length === 1
                      ? "record"
                      : "records"}{" "}
                    stored
                  </p>
                </div>
              </div>

              <button
                type="button"
                className="btn-secondary !px-3.5 !py-2"
                onClick={() => setUploadModalOpen(true)}
              >
                <Plus size={15} />
                Add document
              </button>
            </div>

            <div className="p-4 sm:p-5">
              {documentError && (
                <div className="alert-error mb-4">
                  {documentError}
                </div>
              )}

              {documentsLoading ? (
                <LoadingState text="Loading your documents..." />
              ) : documents.length === 0 ? (
                <EmptyState
                  icon={FolderLock}
                  title="Your vault is empty"
                  text="Upload your first important document to begin building your secure legacy vault."
                  action="Upload document"
                  onAction={() => setUploadModalOpen(true)}
                />
              ) : (
                <div className="space-y-3">
                  {documents.map((document) => {
                    const isManaging =
                      managingDocumentId === document.id;
                    const assignedCount =
                      document.assignedBeneficiaryIds?.length || 0;
                    const isDeleting =
                      deletingDocumentId === document.id;

                    return (
                      <article
                        key={document.id}
                        className="overflow-hidden rounded-2xl border border-ink-100 bg-white transition hover:border-brand-100 hover:shadow-sm"
                      >
                        <div className="p-4 sm:p-5">
                          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                            <div className="flex min-w-0 gap-3.5">
                              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                                <FileText size={19} />
                              </div>

                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <p className="max-w-sm truncate text-sm font-semibold text-ink-900 sm:text-base">
                                    {document.title}
                                  </p>

                                  <span
                                    className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${getCategoryStyle(
                                      document.category
                                    )}`}
                                  >
                                    {document.category}
                                  </span>
                                </div>

                                <p className="mt-1 max-w-md truncate text-xs text-ink-400">
                                  {document.originalName}
                                </p>

                                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] text-ink-500 sm:text-xs">
                                  <span className="flex items-center gap-1.5">
                                    <CalendarDays size={13} />
                                    {formatDate(document.createdAt)}
                                  </span>

                                  <span className="flex items-center gap-1.5 font-medium text-brand-700">
                                    <Users size={13} />
                                    {assignedCount === 0
                                      ? "Private"
                                      : `Shared with ${assignedCount}`}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="flex shrink-0 flex-wrap gap-2">
                              <button
                                type="button"
                                disabled={isDeleting}
                                onClick={() =>
                                  viewDocument(document.id)
                                }
                                className="btn-primary !px-3 !py-2"
                              >
                                <Eye size={14} />
                                View
                              </button>

                              <button
                                type="button"
                                disabled={isDeleting}
                                onClick={() =>
                                  isManaging
                                    ? closeAccessManager()
                                    : openAccessManager(document)
                                }
                                className="btn-secondary !px-3 !py-2"
                              >
                                <Share2 size={14} />
                                {isManaging
                                  ? "Close access"
                                  : "Manage access"}
                              </button>

                              <button
                                type="button"
                                disabled={isDeleting}
                                onClick={() =>
                                  deleteDocument(document)
                                }
                                className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {isDeleting ? (
                                  <Loader2
                                    size={14}
                                    className="animate-spin"
                                  />
                                ) : (
                                  <Trash2 size={14} />
                                )}

                                {isDeleting
                                  ? "Deleting"
                                  : "Delete"}
                              </button>
                            </div>
                          </div>
                        </div>

                        {isManaging && (
                          <div className="border-t border-ink-100 bg-ink-50/60 p-4 sm:p-5">
                            <div className="flex items-start gap-3">
                              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-brand-700 shadow-sm">
                                <UserRoundCheck size={17} />
                              </div>

                              <div>
                                <p className="text-sm font-semibold text-ink-800">
                                  Document access
                                </p>
                                <p className="mt-1 text-xs leading-5 text-ink-500">
                                  Select the beneficiaries who may
                                  view this document.
                                </p>
                              </div>
                            </div>

                            {beneficiaries.length === 0 ? (
                              <div className="mt-4 rounded-xl border border-dashed border-ink-200 bg-white px-4 py-5 text-center">
                                <p className="text-sm font-medium text-ink-700">
                                  No beneficiaries available
                                </p>
                                <button
                                  type="button"
                                  className="mt-2 text-xs font-semibold text-brand-700 hover:text-brand-800"
                                  onClick={() =>
                                    setBeneficiaryModalOpen(true)
                                  }
                                >
                                  Add your first beneficiary
                                </button>
                              </div>
                            ) : (
                              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                                {beneficiaries.map(
                                  (beneficiary) => {
                                    const selected =
                                      selectedBeneficiaryIds.includes(
                                        beneficiary.id
                                      );

                                    return (
                                      <label
                                        key={beneficiary.id}
                                        className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-3 transition ${
                                          selected
                                            ? "border-brand-200 bg-brand-50"
                                            : "border-ink-100 bg-white hover:border-ink-200"
                                        }`}
                                      >
                                        <input
                                          type="checkbox"
                                          className="h-4 w-4 accent-brand-600"
                                          checked={selected}
                                          onChange={() =>
                                            toggleBeneficiary(
                                              beneficiary.id
                                            )
                                          }
                                        />

                                        <div className="min-w-0">
                                          <p className="truncate text-sm font-semibold text-ink-800">
                                            {beneficiary.name}
                                          </p>
                                          <p className="truncate text-xs text-ink-400">
                                            @{beneficiary.username}
                                          </p>
                                        </div>
                                      </label>
                                    );
                                  }
                                )}
                              </div>
                            )}

                            {accessMessage && (
                              <div className="alert-success mt-4">
                                {accessMessage}
                              </div>
                            )}

                            <div className="mt-4 flex flex-wrap gap-2">
                              <button
                                type="button"
                                className="btn-primary"
                                disabled={
                                  accessSaving ||
                                  beneficiaries.length === 0
                                }
                                onClick={() =>
                                  saveDocumentAccess(document.id)
                                }
                              >
                                {accessSaving ? (
                                  <Loader2
                                    size={16}
                                    className="animate-spin"
                                  />
                                ) : (
                                  <Save size={16} />
                                )}

                                {accessSaving
                                  ? "Saving..."
                                  : "Save Access"}
                              </button>

                              <button
                                type="button"
                                className="btn-secondary"
                                onClick={closeAccessManager}
                              >
                                <X size={15} />
                                Cancel
                              </button>
                            </div>
                          </div>
                        )}
                      </article>
                    );
                  })}
                </div>
              )}
            </div>
          </section>

          {/* BENEFICIARIES */}
          <section className="self-start overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-card">
            <div className="flex items-center justify-between border-b border-ink-100 px-5 py-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                  <Users size={18} />
                </div>

                <div>
                  <h2 className="font-semibold text-ink-900">
                    Beneficiaries
                  </h2>
                  <p className="text-xs text-ink-400">
                    {beneficiaries.length} registered
                  </p>
                </div>
              </div>

              <button
                type="button"
                title="Add beneficiary"
                onClick={() => {
                  setBeneficiaryError("");
                  setBeneficiaryModalOpen(true);
                }}
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 text-brand-700 transition hover:bg-brand-100"
              >
                <Plus size={17} />
              </button>
            </div>

            <div className="p-4">
              {listLoading ? (
                <LoadingState text="Loading beneficiaries..." compact />
              ) : beneficiaries.length === 0 ? (
                <EmptyState
                  icon={Users}
                  title="No beneficiaries yet"
                  text="Add someone you trust to begin assigning access."
                  action="Add beneficiary"
                  onAction={() =>
                    setBeneficiaryModalOpen(true)
                  }
                  compact
                />
              ) : (
                <div className="space-y-2.5">
                  {beneficiaries.map((beneficiary) => (
                    <div
                      key={beneficiary.id}
                      className="rounded-xl border border-ink-100 p-3.5 transition hover:border-brand-100 hover:bg-ink-50/40"
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-50 text-sm font-bold text-brand-700">
                          {beneficiary.name
                            ?.charAt(0)
                            ?.toUpperCase() || "B"}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <p className="truncate text-sm font-semibold text-ink-800">
                              {beneficiary.name}
                            </p>

                            {beneficiary.mustChangePassword ? (
                              <span className="badge shrink-0 bg-amber-50 text-amber-700">
                                <Key size={11} className="mr-1" />
                                Pending
                              </span>
                            ) : (
                              <span className="badge shrink-0 bg-green-50 text-green-700">
                                Active
                              </span>
                            )}
                          </div>

                          <p className="mt-0.5 truncate text-xs text-ink-400">
                            @{beneficiary.username}
                          </p>

                          <p className="mt-2 truncate text-[11px] text-ink-500">
                            {beneficiary.email}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {!listLoading && beneficiaries.length > 0 && (
                <button
                  type="button"
                  className="btn-secondary mt-4 w-full"
                  onClick={() => {
                    setBeneficiaryError("");
                    setBeneficiaryModalOpen(true);
                  }}
                >
                  <UserPlus size={15} />
                  Add Beneficiary
                </button>
              )}
            </div>
          </section>
        </div>
      </main>

      {/* UPLOAD MODAL */}
      {uploadModalOpen && (
        <Modal
          title="Upload vault document"
          subtitle="Add a secure Asset, Liability or General record."
          icon={UploadCloud}
          onClose={() => setUploadModalOpen(false)}
          maxWidth="max-w-xl"
        >
          <UploadDocument
            onUploadSuccess={handleDocumentUploaded}
          />
        </Modal>
      )}

      {/* BENEFICIARY MODAL */}
      {beneficiaryModalOpen && (
        <Modal
          title="Add Beneficiary"
          subtitle="Create trusted access credentials and attach identity verification."
          icon={UserPlus}
          onClose={() => {
            if (!beneficiaryLoading) {
              setBeneficiaryModalOpen(false);
              setBeneficiaryError("");
            }
          }}
          maxWidth="max-w-lg"
        >
          <form
            onSubmit={handleCreateBeneficiary}
            className="space-y-4"
          >
            {beneficiaryError && (
              <div className="alert-error">
                {beneficiaryError}
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="field-label" htmlFor="b-name">
                  Full Name
                </label>
                <input
                  id="b-name"
                  className="field-input"
                  value={beneficiaryForm.name}
                  onChange={updateBeneficiary("name")}
                  required
                />
              </div>

              <div>
                <label
                  className="field-label"
                  htmlFor="b-username"
                >
                  Username
                </label>
                <input
                  id="b-username"
                  className="field-input"
                  value={beneficiaryForm.username}
                  onChange={updateBeneficiary("username")}
                  required
                />
              </div>
            </div>

            <div>
              <label className="field-label" htmlFor="b-email">
                Email
              </label>
              <input
                id="b-email"
                type="email"
                className="field-input"
                value={beneficiaryForm.email}
                onChange={updateBeneficiary("email")}
                required
              />
            </div>

            <div>
              <label className="field-label" htmlFor="b-pass">
                Initial Password
              </label>
              <input
                id="b-pass"
                type="password"
                className="field-input"
                value={beneficiaryForm.initialPassword}
                onChange={updateBeneficiary(
                  "initialPassword"
                )}
                minLength={8}
                required
              />
              <p className="mt-1.5 text-xs text-ink-400">
                Minimum 8 characters. The beneficiary must
                change it after first login.
              </p>
            </div>

            <div>
              <label
                className="field-label"
                htmlFor="b-aadhaar"
              >
                Beneficiary Aadhaar
              </label>

              <label
                htmlFor="b-aadhaar"
                className="mt-1 flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-ink-200 bg-ink-50/60 px-4 py-4 transition hover:border-brand-300 hover:bg-brand-50/50"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white text-brand-700 shadow-sm">
                  <UploadCloud size={18} />
                </div>

                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-ink-700">
                    {beneficiaryForm.aadhaar
                      ? beneficiaryForm.aadhaar.name
                      : "Choose Aadhaar file"}
                  </p>
                  <p className="mt-0.5 text-xs text-ink-400">
                    JPG, PNG or PDF
                  </p>
                </div>
              </label>

              <input
                id="b-aadhaar"
                type="file"
                accept="image/jpeg,image/png,application/pdf"
                className="hidden"
                onChange={updateBeneficiary("aadhaar")}
                required
              />
            </div>

            <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
              <button
                type="button"
                className="btn-secondary"
                disabled={beneficiaryLoading}
                onClick={() => {
                  setBeneficiaryModalOpen(false);
                  setBeneficiaryError("");
                }}
              >
                Cancel
              </button>

              <button
                type="submit"
                className="btn-primary"
                disabled={beneficiaryLoading}
              >
                {beneficiaryLoading ? (
                  <Loader2
                    size={16}
                    className="animate-spin"
                  />
                ) : (
                  <UserPlus size={16} />
                )}

                {beneficiaryLoading
                  ? "Creating..."
                  : "Create Beneficiary"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

function Modal({
  title,
  subtitle,
  icon: Icon,
  onClose,
  children,
  maxWidth = "max-w-lg",
}) {
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className={`max-h-[90vh] w-full ${maxWidth} overflow-hidden rounded-3xl border border-white/70 bg-white shadow-2xl`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="flex items-start justify-between gap-4 border-b border-ink-100 bg-gradient-to-r from-brand-50/80 to-white px-5 py-4 sm:px-6">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-white shadow-sm">
              <Icon size={19} />
            </div>

            <div>
              <h2 className="font-semibold text-ink-900">
                {title}
              </h2>
              <p className="mt-1 text-xs leading-5 text-ink-500">
                {subtitle}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-ink-400 transition hover:bg-white hover:text-ink-700"
            aria-label={`Close ${title}`}
          >
            <X size={18} />
          </button>
        </div>

        <div className="max-h-[calc(90vh-82px)] overflow-y-auto p-5 sm:p-6">
          {children}
        </div>
      </div>
    </div>
  );
}

function Toast({ toast, onClose }) {
  if (!toast) return null;

  const success = toast.type === "success";

  return (
    <div className="pointer-events-none fixed right-4 top-20 z-[120] w-[calc(100%-2rem)] max-w-sm sm:right-6">
      <div
        className={`pointer-events-auto flex items-start gap-3 rounded-2xl border bg-white px-4 py-3.5 shadow-xl ${
          success
            ? "border-emerald-100"
            : "border-red-100"
        }`}
      >
        <div
          className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
            success
              ? "bg-emerald-50 text-emerald-600"
              : "bg-red-50 text-red-600"
          }`}
        >
          <CheckCircle2 size={17} />
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold uppercase tracking-[0.1em] text-ink-400">
            {success ? "Success" : "Notice"}
          </p>
          <p className="mt-1 text-sm font-medium leading-5 text-ink-800">
            {toast.message}
          </p>

          <div className="mt-2 h-1 overflow-hidden rounded-full bg-ink-100">
            <div
              className="h-full rounded-full bg-emerald-500"
              style={{
                animation: `ownerToastProgress ${TOAST_DURATION}ms linear forwards`,
              }}
            />
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-ink-300 transition hover:bg-ink-50 hover:text-ink-600"
          aria-label="Dismiss notification"
        >
          <X size={15} />
        </button>

        <style>{`
          @keyframes ownerToastProgress {
            from { width: 100%; }
            to { width: 0%; }
          }
        `}</style>
      </div>
    </div>
  );
}

function QuickAction({
  icon: Icon,
  title,
  text,
  buttonLabel,
  onClick,
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex items-center gap-4 rounded-2xl border border-ink-100 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-brand-100 hover:shadow-card sm:p-5"
    >
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-700 transition group-hover:bg-brand-100">
        <Icon size={21} />
      </div>

      <div className="min-w-0 flex-1">
        <h3 className="text-sm font-semibold text-ink-900">
          {title}
        </h3>
        <p className="mt-1 text-xs leading-5 text-ink-500">
          {text}
        </p>
      </div>

      <span className="hidden items-center gap-1 text-xs font-semibold text-brand-700 sm:flex">
        {buttonLabel}
        <Plus size={14} />
      </span>
    </button>
  );
}

function LoadingState({ text, compact = false }) {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-3 text-ink-500 ${
        compact ? "min-h-[150px]" : "min-h-[260px]"
      }`}
    >
      <Loader2
        size={21}
        className="animate-spin text-brand-600"
      />
      <p className="text-sm">{text}</p>
    </div>
  );
}

function EmptyState({
  icon: Icon,
  title,
  text,
  action,
  onAction,
  compact = false,
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center rounded-2xl border border-dashed border-ink-200 bg-ink-50/60 px-5 text-center ${
        compact ? "min-h-[180px] py-7" : "min-h-[260px] py-10"
      }`}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
        <Icon size={22} />
      </div>

      <h3 className="mt-3 text-sm font-semibold text-ink-800">
        {title}
      </h3>

      <p className="mt-1.5 max-w-sm text-xs leading-5 text-ink-400">
        {text}
      </p>

      {action && (
        <button
          type="button"
          className="btn-secondary mt-4"
          onClick={onAction}
        >
          <Plus size={14} />
          {action}
        </button>
      )}
    </div>
  );
}

function StatCard({ icon, value, label }) {
  return (
    <div className="min-w-[118px] rounded-2xl border border-ink-100 bg-white/90 px-4 py-3 shadow-sm backdrop-blur">
      <div className="flex items-center gap-2 text-brand-700">
        {icon}
        <span className="text-lg font-bold text-ink-900">
          {value}
        </span>
      </div>

      <p className="mt-1 text-xs text-ink-400">
        {label}
      </p>
    </div>
  );
}
