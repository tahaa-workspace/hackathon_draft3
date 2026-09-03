import UploadDocument from "../components/UploadDocument";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

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
  ShieldCheck,
  FolderLock,
  UserRoundCheck,
  UploadCloud,
  LockKeyhole,
  CalendarDays,
  ChevronDown,
  ChevronUp,
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
  return new Date(
    value
  ).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getCategoryStyle(category) {
  const styles = {
    Personal:
      "bg-blue-50 text-blue-700",
    Financial:
      "bg-emerald-50 text-emerald-700",
    Legal:
      "bg-violet-50 text-violet-700",
    Insurance:
      "bg-amber-50 text-amber-700",
    Property:
      "bg-cyan-50 text-cyan-700",
    Family:
      "bg-pink-50 text-pink-700",
    Other:
      "bg-ink-100 text-ink-600",
  };

  return (
    styles[category] ||
    styles.Other
  );
}

export default function OwnerDashboard() {
  const { user, token } =
    useAuth();

  const [form, setForm] =
    useState(EMPTY);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const [
    beneficiaries,
    setBeneficiaries,
  ] = useState([]);

  const [
    listLoading,
    setListLoading,
  ] = useState(true);

  const [
    documents,
    setDocuments,
  ] = useState([]);

  const [
    documentsLoading,
    setDocumentsLoading,
  ] = useState(true);

  const [
    documentError,
    setDocumentError,
  ] = useState("");

  const [
    managingDocumentId,
    setManagingDocumentId,
  ] = useState(null);

  const [
    selectedBeneficiaryIds,
    setSelectedBeneficiaryIds,
  ] = useState([]);

  const [
    accessSaving,
    setAccessSaving,
  ] = useState(false);

  const [
    accessMessage,
    setAccessMessage,
  ] = useState("");

  const [
    beneficiaryFormOpen,
    setBeneficiaryFormOpen,
  ] = useState(false);

  const update =
    (key) => (e) =>
      setForm((current) => ({
        ...current,
        [key]:
          e.target.value,
      }));

  const loadBeneficiaries =
    useCallback(async () => {
      setListLoading(true);

      try {
        const data =
          await listBeneficiaries();

        setBeneficiaries(
          data.beneficiaries || []
        );
      } catch (loadError) {
        console.error(
          "Beneficiary loading error:",
          loadError
        );
      } finally {
        setListLoading(false);
      }
    }, []);

  const loadDocuments =
    useCallback(async () => {
      if (!token) {
        setDocumentsLoading(
          false
        );

        return;
      }

      setDocumentsLoading(
        true
      );

      try {
        setDocumentError("");

        const response =
          await fetch(
            "/api/documents",
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          );

        const data =
          await response.json();

        if (!response.ok) {
          throw new Error(
            data.message ||
              "Failed to fetch documents."
          );
        }

        setDocuments(
          data.documents || []
        );
      } catch (loadError) {
        console.error(
          "Document loading error:",
          loadError
        );

        setDocumentError(
          loadError.message ||
            "Failed to fetch documents."
        );
      } finally {
        setDocumentsLoading(
          false
        );
      }
    }, [token]);

  useEffect(() => {
    loadBeneficiaries();
    loadDocuments();
  }, [
    loadBeneficiaries,
    loadDocuments,
  ]);

  const handleSubmit =
    async (e) => {
      e.preventDefault();

      setError("");
      setSuccess("");

      if (
        form.initialPassword
          .length < 8
      ) {
        setError(
          "Initial password must be at least 8 characters long."
        );

        return;
      }

      setLoading(true);

      try {
        await createBeneficiary(
          form
        );

        setSuccess(
          "Beneficiary created successfully. They must change their password on first login."
        );

        setForm(EMPTY);

        await loadBeneficiaries();
      } catch (submitError) {
        setError(
          submitError.message
        );
      } finally {
        setLoading(false);
      }
    };

  const viewDocument =
    async (documentId) => {
      try {
        setDocumentError("");

        const response =
          await fetch(
            `/api/documents/${documentId}/access`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          );

        if (!response.ok) {
          let message =
            "Unable to access document.";

          try {
            const data =
              await response.json();

            message =
              data.message ||
              message;
          } catch {
            // Binary response may not be JSON.
          }

          throw new Error(
            message
          );
        }

        const blob =
          await response.blob();

        const url =
          URL.createObjectURL(
            blob
          );

        window.open(
          url,
          "_blank"
        );

        setTimeout(
          () =>
            URL.revokeObjectURL(
              url
            ),
          60000
        );
      } catch (viewError) {
        console.error(
          "Document access error:",
          viewError
        );

        setDocumentError(
          viewError.message ||
            "Unable to access document."
        );
      }
    };

  const openAccessManager = (
    document
  ) => {
    setManagingDocumentId(
      document.id
    );

    setSelectedBeneficiaryIds(
      document.assignedBeneficiaryIds ||
        []
    );

    setAccessMessage("");
  };

  const closeAccessManager =
    () => {
      setManagingDocumentId(
        null
      );

      setSelectedBeneficiaryIds(
        []
      );

      setAccessMessage("");
    };

  const toggleBeneficiary = (
    beneficiaryId
  ) => {
    setSelectedBeneficiaryIds(
      (current) =>
        current.includes(
          beneficiaryId
        )
          ? current.filter(
              (id) =>
                id !==
                beneficiaryId
            )
          : [
              ...current,
              beneficiaryId,
            ]
    );
  };

  const saveDocumentAccess =
    async (documentId) => {
      setAccessSaving(true);

      setDocumentError("");
      setAccessMessage("");

      try {
        const response =
          await fetch(
            `/api/documents/${documentId}/beneficiaries`,
            {
              method: "PUT",

              headers: {
                "Content-Type":
                  "application/json",

                Authorization: `Bearer ${token}`,
              },

              body: JSON.stringify(
                {
                  beneficiaryIds:
                    selectedBeneficiaryIds,
                }
              ),
            }
          );

        const data =
          await response.json();

        if (!response.ok) {
          throw new Error(
            data.message ||
              "Failed to update document access."
          );
        }

        setDocuments(
          (current) =>
            current.map(
              (document) =>
                document.id ===
                documentId
                  ? data.document
                  : document
            )
        );

        setAccessMessage(
          "Access updated successfully."
        );
      } catch (saveError) {
        console.error(
          "Document sharing error:",
          saveError
        );

        setDocumentError(
          saveError.message ||
            "Failed to update document access."
        );
      } finally {
        setAccessSaving(false);
      }
    };

  return (
    <div className="min-h-screen bg-ink-50">
      <Navbar />

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:py-10">

        {/* Dashboard Header */}
        <section className="mb-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">

            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-brand-100 bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700">
                <ShieldCheck
                  size={14}
                />

                Owner Vault
              </div>

              <h1 className="text-3xl font-bold text-ink-900">
                Welcome back,
                {" "}
                {user?.name}
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-500">
                Manage your secure
                documents, beneficiaries,
                and sharing permissions
                from one place.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">

              <StatCard
                icon={
                  <FolderLock
                    size={18}
                  />
                }
                value={
                  documents.length
                }
                label="Documents"
              />

              <StatCard
                icon={
                  <Users
                    size={18}
                  />
                }
                value={
                  beneficiaries.length
                }
                label="Beneficiaries"
              />

              <div className="hidden sm:block">
                <StatCard
                  icon={
                    <LockKeyhole
                      size={18}
                    />
                  }
                  value="Secure"
                  label="Vault status"
                />
              </div>

            </div>
          </div>
        </section>


        {/* Document Vault */}
        <section className="mb-8">

          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">

            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-brand-600">
                Document Vault
              </p>

              <h2 className="mt-1 text-2xl font-semibold text-ink-900">
                Your secure documents
              </h2>

              <p className="mt-1 text-sm text-ink-500">
                Upload files and control
                exactly which
                beneficiaries can view
                them.
              </p>
            </div>

          </div>


          <div className="grid gap-6 xl:grid-cols-[0.9fr_1.4fr]">

            {/* Upload Panel */}
            <section className="overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-card">

              <div className="border-b border-ink-100 bg-gradient-to-r from-brand-50 to-white px-6 py-5">

                <div className="flex items-center gap-3">

                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-600 text-white shadow-sm">
                    <UploadCloud
                      size={20}
                    />
                  </div>

                  <div>
                    <h3 className="font-semibold text-ink-900">
                      Upload document
                    </h3>

                    <p className="mt-0.5 text-xs text-ink-500">
                      Add a new file to
                      your encrypted
                      document vault.
                    </p>
                  </div>

                </div>
              </div>


              <div className="p-6">
                <UploadDocument
                  onUploadSuccess={
                    loadDocuments
                  }
                />
              </div>

            </section>


            {/* My Documents */}
            <section className="overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-card">

              <div className="flex items-center justify-between border-b border-ink-100 px-6 py-5">

                <div className="flex items-center gap-3">

                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-ink-50 text-brand-700">
                    <FileText
                      size={20}
                    />
                  </div>

                  <div>
                    <h3 className="font-semibold text-ink-900">
                      My Documents
                    </h3>

                    <p className="mt-0.5 text-xs text-ink-500">
                      {
                        documents.length
                      }{" "}
                      stored{" "}
                      {documents.length ===
                      1
                        ? "document"
                        : "documents"}
                    </p>
                  </div>

                </div>


                {!documentsLoading &&
                  documents.length >
                    0 && (
                    <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700">
                      {
                        documents.length
                      }{" "}
                      total
                    </span>
                  )}

              </div>


              <div className="p-5 sm:p-6">

                {documentError && (
                  <div className="alert-error mb-4">
                    {documentError}
                  </div>
                )}


                {documentsLoading ? (

                  <div className="flex min-h-[300px] flex-col items-center justify-center gap-3 text-ink-500">

                    <Loader2
                      size={22}
                      className="animate-spin text-brand-600"
                    />

                    <p className="text-sm">
                      Loading your
                      documents...
                    </p>

                  </div>

                ) : documents.length ===
                  0 ? (

                  <div className="flex min-h-[300px] flex-col items-center justify-center rounded-2xl border border-dashed border-ink-200 bg-ink-50/60 px-6 text-center">

                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
                      <FolderLock
                        size={24}
                      />
                    </div>

                    <h4 className="mt-4 text-sm font-semibold text-ink-800">
                      Your vault is empty
                    </h4>

                    <p className="mt-2 max-w-sm text-xs leading-5 text-ink-400">
                      Upload your first
                      important document
                      using the form on
                      the left. It will
                      appear here after
                      upload.
                    </p>

                  </div>

                ) : (

                  <ul className="space-y-4">

                    {documents.map(
                      (document) => {

                        const isManaging =
                          managingDocumentId ===
                          document.id;

                        const assignedCount =
                          document
                            .assignedBeneficiaryIds
                            ?.length ||
                          0;

                        return (
                          <li
                            key={
                              document.id
                            }
                            className="overflow-hidden rounded-2xl border border-ink-100 bg-white transition hover:border-ink-200 hover:shadow-sm"
                          >

                            <div className="p-5">

                              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">

                                <div className="flex min-w-0 gap-4">

                                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                                    <FileText
                                      size={
                                        20
                                      }
                                    />
                                  </div>


                                  <div className="min-w-0">

                                    <div className="flex flex-wrap items-center gap-2">

                                      <p className="max-w-sm truncate font-semibold text-ink-900">
                                        {
                                          document.title
                                        }
                                      </p>


                                      <span
                                        className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${getCategoryStyle(
                                          document.category
                                        )}`}
                                      >
                                        {
                                          document.category
                                        }
                                      </span>

                                    </div>


                                    <p className="mt-1 max-w-md truncate text-xs text-ink-400">
                                      {
                                        document.originalName
                                      }
                                    </p>


                                    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-ink-500">

                                      <span className="flex items-center gap-1.5">
                                        <CalendarDays
                                          size={
                                            13
                                          }
                                        />

                                        {formatDate(
                                          document.createdAt
                                        )}
                                      </span>


                                      <span className="flex items-center gap-1.5 font-medium text-brand-700">
                                        <Users
                                          size={
                                            13
                                          }
                                        />

                                        {assignedCount ===
                                        0
                                          ? "Private"
                                          : `Shared with ${assignedCount}`}
                                      </span>

                                    </div>

                                  </div>

                                </div>


                                <div className="flex shrink-0 flex-wrap gap-2">

                                  <button
                                    type="button"
                                    onClick={() =>
                                      viewDocument(
                                        document.id
                                      )
                                    }
                                    className="btn-primary !px-3.5 !py-2"
                                  >
                                    <Eye
                                      size={
                                        15
                                      }
                                    />

                                    View
                                  </button>


                                  <button
                                    type="button"
                                    onClick={() =>
                                      isManaging
                                        ? closeAccessManager()
                                        : openAccessManager(
                                            document
                                          )
                                    }
                                    className="btn-secondary !px-3.5 !py-2"
                                  >

                                    {isManaging ? (
                                      <ChevronUp
                                        size={
                                          15
                                        }
                                      />
                                    ) : (
                                      <Share2
                                        size={
                                          15
                                        }
                                      />
                                    )}

                                    {isManaging
                                      ? "Close"
                                      : "Share"}

                                  </button>

                                </div>

                              </div>

                            </div>


                            {/* Access Manager */}
                            {isManaging && (

                              <div className="border-t border-ink-100 bg-ink-50/60 px-5 py-5">

                                <div className="flex items-start gap-3">

                                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-brand-700 shadow-sm">
                                    <UserRoundCheck
                                      size={
                                        17
                                      }
                                    />
                                  </div>


                                  <div>

                                    <p className="text-sm font-semibold text-ink-800">
                                      Document
                                      access
                                    </p>

                                    <p className="mt-1 text-xs leading-5 text-ink-500">
                                      Select the
                                      beneficiaries
                                      who should
                                      be allowed
                                      to view this
                                      document.
                                    </p>

                                  </div>

                                </div>


                                {beneficiaries.length ===
                                0 ? (

                                  <div className="mt-4 rounded-xl border border-dashed border-ink-200 bg-white px-4 py-5 text-center">

                                    <p className="text-sm font-medium text-ink-700">
                                      No
                                      beneficiaries
                                      available
                                    </p>

                                    <p className="mt-1 text-xs text-ink-400">
                                      Create a
                                      beneficiary
                                      first before
                                      assigning
                                      access.
                                    </p>

                                  </div>

                                ) : (

                                  <div className="mt-4 grid gap-2 sm:grid-cols-2">

                                    {beneficiaries.map(
                                      (
                                        beneficiary
                                      ) => {

                                        const selected =
                                          selectedBeneficiaryIds.includes(
                                            beneficiary.id
                                          );

                                        return (
                                          <label
                                            key={
                                              beneficiary.id
                                            }
                                            className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-3 transition ${
                                              selected
                                                ? "border-brand-200 bg-brand-50"
                                                : "border-ink-100 bg-white hover:border-ink-200"
                                            }`}
                                          >

                                            <input
                                              type="checkbox"
                                              className="h-4 w-4 accent-brand-600"
                                              checked={
                                                selected
                                              }
                                              onChange={() =>
                                                toggleBeneficiary(
                                                  beneficiary.id
                                                )
                                              }
                                            />

                                            <div className="min-w-0">

                                              <p className="truncate text-sm font-semibold text-ink-800">
                                                {
                                                  beneficiary.name
                                                }
                                              </p>

                                              <p className="truncate text-xs text-ink-400">
                                                @
                                                {
                                                  beneficiary.username
                                                }
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
                                    {
                                      accessMessage
                                    }
                                  </div>
                                )}


                                <div className="mt-4 flex flex-wrap items-center gap-2">

                                  <button
                                    type="button"
                                    onClick={() =>
                                      saveDocumentAccess(
                                        document.id
                                      )
                                    }
                                    className="btn-primary"
                                    disabled={
                                      accessSaving ||
                                      beneficiaries.length ===
                                        0
                                    }
                                  >

                                    {accessSaving ? (
                                      <Loader2
                                        size={
                                          16
                                        }
                                        className="animate-spin"
                                      />
                                    ) : (
                                      <Save
                                        size={
                                          16
                                        }
                                      />
                                    )}

                                    {accessSaving
                                      ? "Saving..."
                                      : "Save Access"}

                                  </button>


                                  <button
                                    type="button"
                                    onClick={
                                      closeAccessManager
                                    }
                                    className="btn-secondary"
                                  >
                                    <X
                                      size={
                                        15
                                      }
                                    />

                                    Cancel
                                  </button>

                                </div>

                              </div>

                            )}

                          </li>
                        );
                      }
                    )}

                  </ul>

                )}

              </div>

            </section>

          </div>

        </section>


        {/* Beneficiary Management */}
        <section>

          <div className="mb-4 flex items-end justify-between gap-4">

            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-brand-600">
                Trusted People
              </p>

              <h2 className="mt-1 text-2xl font-semibold text-ink-900">
                Beneficiaries
              </h2>

              <p className="mt-1 text-sm text-ink-500">
                Create and manage the
                accounts that may receive
                document access.
              </p>
            </div>


            <button
              type="button"
              className="btn-primary"
              onClick={() =>
                setBeneficiaryFormOpen(
                  (current) =>
                    !current
                )
              }
            >

              <UserPlus
                size={16}
              />

              {beneficiaryFormOpen
                ? "Close Form"
                : "Add Beneficiary"}

              {beneficiaryFormOpen ? (
                <ChevronUp
                  size={15}
                />
              ) : (
                <ChevronDown
                  size={15}
                />
              )}

            </button>

          </div>


          <div
            className={`grid gap-6 ${
              beneficiaryFormOpen
                ? "lg:grid-cols-[1.15fr_0.85fr]"
                : ""
            }`}
          >

            {/* Beneficiaries */}
            <section className="rounded-2xl border border-ink-100 bg-white p-6 shadow-card">

              <div className="mb-5 flex items-center justify-between">

                <div className="flex items-center gap-3">

                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                    <Users
                      size={18}
                    />
                  </div>

                  <div>
                    <h3 className="font-semibold text-ink-900">
                      Your
                      Beneficiaries
                    </h3>

                    <p className="text-xs text-ink-400">
                      {
                        beneficiaries.length
                      }{" "}
                      registered
                    </p>
                  </div>

                </div>

              </div>


              {listLoading ? (

                <div className="flex items-center justify-center gap-2 py-12 text-sm text-ink-500">

                  <Loader2
                    size={16}
                    className="animate-spin"
                  />

                  Loading
                  beneficiaries...

                </div>

              ) : beneficiaries.length ===
                0 ? (

                <div className="rounded-2xl border border-dashed border-ink-200 bg-ink-50 py-12 text-center">

                  <Users
                    size={24}
                    className="mx-auto text-ink-300"
                  />

                  <p className="mt-3 text-sm font-semibold text-ink-700">
                    No beneficiaries yet
                  </p>

                  <p className="mt-1 text-xs text-ink-400">
                    Add someone you trust
                    to begin assigning
                    document access.
                  </p>

                </div>

              ) : (

                <div className="grid gap-3 sm:grid-cols-2">

                  {beneficiaries.map(
                    (
                      beneficiary
                    ) => (

                      <div
                        key={
                          beneficiary.id
                        }
                        className="rounded-2xl border border-ink-100 p-4 transition hover:border-ink-200 hover:bg-ink-50/50"
                      >

                        <div className="flex items-start justify-between gap-3">

                          <div className="flex min-w-0 items-center gap-3">

                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-50 text-sm font-bold text-brand-700">
                              {beneficiary.name
                                ?.charAt(
                                  0
                                )
                                ?.toUpperCase() ||
                                "B"}
                            </div>


                            <div className="min-w-0">

                              <p className="truncate text-sm font-semibold text-ink-800">
                                {
                                  beneficiary.name
                                }
                              </p>

                              <p className="truncate text-xs text-ink-400">
                                @
                                {
                                  beneficiary.username
                                }
                              </p>

                            </div>

                          </div>


                          {beneficiary.mustChangePassword ? (

                            <span className="badge shrink-0 bg-amber-50 text-amber-700">
                              <Key
                                size={
                                  11
                                }
                                className="mr-1"
                              />

                              Pending
                            </span>

                          ) : (

                            <span className="badge shrink-0 bg-green-50 text-green-700">
                              Active
                            </span>

                          )}

                        </div>


                        <p className="mt-3 truncate text-xs text-ink-500">
                          {
                            beneficiary.email
                          }
                        </p>

                        <p className="mt-1 text-[11px] text-ink-400">
                          Created{" "}
                          {formatDate(
                            beneficiary.createdAt
                          )}
                        </p>

                      </div>

                    )
                  )}

                </div>

              )}

            </section>


            {/* Create Beneficiary */}
            {beneficiaryFormOpen && (

              <section className="rounded-2xl border border-ink-100 bg-white p-6 shadow-card">

                <div className="mb-5">

                  <h3 className="font-semibold text-ink-900">
                    Create Beneficiary
                  </h3>

                  <p className="mt-1 text-xs leading-5 text-ink-500">
                    Beneficiaries cannot
                    self-register. Create
                    their initial
                    credentials here.
                  </p>

                </div>


                <form
                  onSubmit={
                    handleSubmit
                  }
                  className="space-y-4"
                >

                  {error && (
                    <div className="alert-error">
                      {error}
                    </div>
                  )}


                  {success && (
                    <div className="alert-success flex items-center gap-2">
                      <CheckCircle2
                        size={
                          16
                        }
                      />

                      {success}
                    </div>
                  )}


                  <div>

                    <label
                      className="field-label"
                      htmlFor="b-name"
                    >
                      Full Name
                    </label>

                    <input
                      id="b-name"
                      className="field-input"
                      value={
                        form.name
                      }
                      onChange={update(
                        "name"
                      )}
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
                      value={
                        form.username
                      }
                      onChange={update(
                        "username"
                      )}
                      required
                    />

                  </div>


                  <div>

                    <label
                      className="field-label"
                      htmlFor="b-email"
                    >
                      Email
                    </label>

                    <input
                      id="b-email"
                      type="email"
                      className="field-input"
                      value={
                        form.email
                      }
                      onChange={update(
                        "email"
                      )}
                      required
                    />

                  </div>


                  <div>

                    <label
                      className="field-label"
                      htmlFor="b-pass"
                    >
                      Initial Password
                    </label>

                    <input
                      id="b-pass"
                      type="password"
                      className="field-input"
                      value={
                        form.initialPassword
                      }
                      onChange={update(
                        "initialPassword"
                      )}
                      required
                    />

                    <p className="mt-1.5 text-xs text-ink-400">
                      The beneficiary
                      must change this
                      password after
                      their first login.
                    </p>

                  </div>


                  <button
                    type="submit"
                    className="btn-primary w-full"
                    disabled={
                      loading
                    }
                  >

                    {loading ? (
                      <Loader2
                        size={
                          16
                        }
                        className="animate-spin"
                      />
                    ) : (
                      <UserPlus
                        size={
                          16
                        }
                      />
                    )}

                    {loading
                      ? "Creating..."
                      : "Create Beneficiary"}

                  </button>

                </form>

              </section>

            )}

          </div>

        </section>

      </main>
    </div>
  );
}

function StatCard({
  icon,
  value,
  label,
}) {
  return (
    <div className="min-w-[120px] rounded-2xl border border-ink-100 bg-white px-4 py-3 shadow-sm">

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