import UploadDocument from "../components/UploadDocument";

import {
  useCallback,
  useEffect,
  useState
} from "react";

import {
  UserPlus,
  Loader2,
  Users,
  CheckCircle2,
  Key,
  FileText,
  Eye
} from "lucide-react";

import Navbar from "../components/Navbar";

import { useAuth } from "../context/AuthContext";

import {
  createBeneficiary,
  listBeneficiaries
} from "../services/authService";


const EMPTY = {
  name: "",
  username: "",
  email: "",
  initialPassword: ""
};


function formatDate(value) {

  return new Date(value).toLocaleString(
    undefined,
    {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    }
  );

}


export default function OwnerDashboard() {

  const {
    user,
    token
  } = useAuth();


  // ==========================
  // BENEFICIARY STATES
  // ==========================

  const [form, setForm] =
    useState(EMPTY);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const [beneficiaries, setBeneficiaries] =
    useState([]);

  const [listLoading, setListLoading] =
    useState(true);


  // ==========================
  // DOCUMENT STATES
  // ==========================

  const [documents, setDocuments] =
    useState([]);

  const [documentsLoading, setDocumentsLoading] =
    useState(true);

  const [documentError, setDocumentError] =
    useState("");


  // ==========================
  // UPDATE BENEFICIARY FORM
  // ==========================

  const update =
    (key) =>
      (e) =>
        setForm((f) => ({
          ...f,
          [key]: e.target.value
        }));


  // ==========================
  // LOAD BENEFICIARIES
  // ==========================

  const load = useCallback(async () => {

    setListLoading(true);

    try {

      const data =
        await listBeneficiaries();

      setBeneficiaries(
        data.beneficiaries
      );

    } catch (error) {

      console.error(
        "Beneficiary loading error:",
        error
      );

    } finally {

      setListLoading(false);

    }

  }, []);


  // ==========================
  // LOAD OWNER DOCUMENTS
  // ==========================

  const loadDocuments =
    useCallback(async () => {

      if (!token) {
        setDocumentsLoading(false);
        return;
      }

      setDocumentsLoading(true);

      try {

        setDocumentError("");


        const response =
          await fetch(
            "/api/documents",
            {
              headers: {
                Authorization:
                  `Bearer ${token}`
              }
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


      } catch (error) {

        console.error(
          "Document loading error:",
          error
        );

        setDocumentError(
          error.message ||
          "Failed to fetch documents."
        );

      } finally {

        setDocumentsLoading(false);

      }

    }, [token]);


  // ==========================
  // LOAD DATA
  // ==========================

  useEffect(() => {

    load();

    loadDocuments();

  }, [
    load,
    loadDocuments
  ]);


  // ==========================
  // CREATE BENEFICIARY
  // ==========================

  const handleSubmit =
    async (e) => {

      e.preventDefault();

      setError("");

      setSuccess("");


      if (
        form.initialPassword.length < 8
      ) {

        setError(
          "Initial password must be at least 8 characters long."
        );

        return;

      }


      setLoading(true);


      try {

        await createBeneficiary(form);


        setSuccess(
          "Beneficiary created. They must change their password on first login."
        );


        setForm(EMPTY);


        await load();


      } catch (err) {

        setError(
          err.message
        );

      } finally {

        setLoading(false);

      }

    };


  // ==========================
  // VIEW DOCUMENT
  // ==========================

  const viewDocument =
    async (documentId) => {

      try {

        setDocumentError("");


        const response =
          await fetch(
            `/api/documents/${documentId}/access`,
            {
              headers: {
                Authorization:
                  `Bearer ${token}`
              }
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

            // Ignore JSON parsing errors

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


        // Clean up after one minute
        setTimeout(() => {

          URL.revokeObjectURL(
            url
          );

        }, 60000);


      } catch (error) {

        console.error(
          "Document access error:",
          error
        );


        setDocumentError(
          error.message ||
          "Unable to access document."
        );

      }

    };


  // ==========================
  // UI
  // ==========================

  return (

    <div className="min-h-screen bg-ink-50">

      <Navbar />


      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6">


        {/* HEADER */}

        <div className="mb-6 flex items-center gap-3">

          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-700">

            <UserPlus size={20} />

          </div>


          <div>

            <h1 className="text-2xl font-semibold text-ink-900">

              Owner Dashboard

            </h1>


            <p className="text-sm text-ink-500">

              Welcome, {user?.name}.
              Manage beneficiaries and securely store your documents.

            </p>

          </div>

        </div>



        {/* ============================= */}
        {/* BENEFICIARY SECTION */}
        {/* ============================= */}

        <div className="grid gap-6 lg:grid-cols-5">


          {/* CREATE BENEFICIARY */}

          <section className="card lg:col-span-3">

            <h2 className="mb-1 text-lg font-semibold text-ink-800">

              Create Beneficiary

            </h2>


            <p className="mb-5 text-sm text-ink-500">

              Beneficiaries cannot self-register.
              They must use credentials created by the owner.

            </p>


            <form
              onSubmit={handleSubmit}
              className="space-y-4"
            >


              {error && (

                <div className="alert-error">

                  {error}

                </div>

              )}


              {success && (

                <div className="alert-success flex items-center gap-2">

                  <CheckCircle2 size={16} />

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
                  value={form.name}
                  onChange={update("name")}
                  required
                />

              </div>


              <div className="grid gap-4 sm:grid-cols-2">


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
                    value={form.username}
                    onChange={update("username")}
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
                    value={form.email}
                    onChange={update("email")}
                    required
                  />

                </div>


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
                  value={form.initialPassword}
                  onChange={update("initialPassword")}
                  required
                />


                <p className="mt-1.5 text-xs text-ink-400">

                  The beneficiary must change this password
                  on first login.

                </p>

              </div>


              <button
                type="submit"
                className="btn-primary"
                disabled={loading}
              >

                {loading ? (

                  <Loader2
                    size={16}
                    className="animate-spin"
                  />

                ) : (

                  <UserPlus size={16} />

                )}


                {loading
                  ? "Creating..."
                  : "Create Beneficiary"}

              </button>


            </form>

          </section>



          {/* BENEFICIARY LIST */}

          <section className="card lg:col-span-2">


            <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-ink-800">

              <Users size={18} />

              Your Beneficiaries

            </h2>


            {listLoading ? (

              <div className="flex items-center justify-center gap-2 py-10 text-sm text-ink-500">

                <Loader2
                  size={16}
                  className="animate-spin"
                />

                Loading...

              </div>

            ) : beneficiaries.length === 0 ? (

              <p className="py-10 text-center text-sm text-ink-500">

                No beneficiaries yet.

              </p>

            ) : (

              <ul className="space-y-3">


                {beneficiaries.map((b) => (

                  <li
                    key={b.id}
                    className="rounded-xl border border-ink-100 p-4"
                  >


                    <div className="flex items-center justify-between">


                      <span className="font-semibold text-ink-800">

                        {b.name}

                      </span>


                      {b.mustChangePassword ? (

                        <span className="badge bg-amber-50 text-amber-700">

                          <Key
                            size={12}
                            className="mr-1"
                          />

                          Pending change

                        </span>

                      ) : (

                        <span className="badge bg-green-50 text-green-700">

                          Active

                        </span>

                      )}


                    </div>


                    <div className="mt-1 text-sm text-ink-500">

                      @{b.username} · {b.email}

                    </div>


                    <div className="mt-0.5 text-xs text-ink-400">

                      Created {formatDate(b.createdAt)}

                    </div>


                  </li>

                ))}


              </ul>

            )}

          </section>

        </div>



        {/* ============================= */}
        {/* DOCUMENT SECTION */}
        {/* ============================= */}

        <div className="mt-6 grid gap-6 lg:grid-cols-2">


          {/* UPLOAD */}

          <section className="card">

            <div className="mb-4 flex items-center gap-2">

              <FileText size={20} />

              <h2 className="text-lg font-semibold text-ink-800">

                Upload Document

              </h2>

            </div>


            <UploadDocument
              onUploadSuccess={loadDocuments}
            />

          </section>



          {/* DOCUMENT LIST */}

          <section className="card">

            <div className="mb-4 flex items-center gap-2">

              <FileText size={20} />

              <h2 className="text-lg font-semibold text-ink-800">

                My Documents

              </h2>

            </div>


            {documentError && (

              <div className="alert-error mb-4">

                {documentError}

              </div>

            )}


            {documentsLoading ? (

              <div className="flex items-center justify-center gap-2 py-10 text-sm text-ink-500">

                <Loader2
                  size={16}
                  className="animate-spin"
                />

                Loading documents...

              </div>

            ) : documents.length === 0 ? (

              <p className="py-10 text-center text-sm text-ink-500">

                No documents uploaded yet.

              </p>

            ) : (

              <ul className="space-y-3">


                {documents.map((document) => (

                  <li
                    key={document.id}
                    className="flex items-center justify-between gap-4 rounded-xl border border-ink-100 p-4"
                  >


                    <div className="min-w-0">


                      <p className="truncate font-semibold text-ink-800">

                        {document.title}

                      </p>


                      <p className="text-sm text-ink-500">

                        {document.category}

                      </p>


                      <p className="truncate text-xs text-ink-400">

                        {document.originalName}

                      </p>


                      <p className="mt-1 text-xs text-ink-400">

                        Uploaded{" "}

                        {formatDate(
                          document.createdAt
                        )}

                      </p>


                    </div>


                    <button
                      onClick={() =>
                        viewDocument(
                          document.id
                        )
                      }
                      className="btn-primary flex shrink-0 items-center gap-2"
                    >

                      <Eye size={16} />

                      View

                    </button>


                  </li>

                ))}


              </ul>

            )}

          </section>


        </div>


      </main>

    </div>

  );

}