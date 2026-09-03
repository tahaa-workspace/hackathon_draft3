import { useRef, useState } from "react";
import {
  UploadCloud,
  FileText,
  Loader2,
  CheckCircle2,
  AlertCircle,
  X,
  ShieldCheck,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

const CATEGORIES = [
  "Personal",
  "Financial",
  "Legal",
  "Insurance",
  "Property",
  "Family",
  "Other",
];

function formatFileSize(bytes) {
  if (!bytes) return "";

  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${Math.ceil(bytes / 1024)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function UploadDocument({
  onUploadSuccess,
}) {
  const { token } = useAuth();

  const fileInputRef = useRef(null);

  const [title, setTitle] = useState("");
  const [category, setCategory] =
    useState("Personal");

  const [file, setFile] = useState(null);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] =
    useState("");

  const [uploading, setUploading] =
    useState(false);

  const chooseFile = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (selectedFile) => {
    if (!selectedFile) return;

    setFile(selectedFile);
    setMessage("");
    setMessageType("");
  };

  const removeFile = () => {
    setFile(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();

    setMessage("");
    setMessageType("");

    if (!title.trim()) {
      setMessage(
        "Please enter a document title."
      );
      setMessageType("error");
      return;
    }

    if (!file) {
      setMessage(
        "Please select a document to upload."
      );
      setMessageType("error");
      return;
    }

    if (!token) {
      setMessage(
        "You must be logged in to upload a document."
      );
      setMessageType("error");
      return;
    }

    try {
      setUploading(true);

      const formData = new FormData();

      formData.append(
        "title",
        title.trim()
      );

      formData.append(
        "category",
        category
      );

      formData.append(
        "file",
        file
      );

      const response = await fetch(
        "/api/documents",
        {
          method: "POST",

          headers: {
            Authorization: `Bearer ${token}`,
          },

          body: formData,
        }
      );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Upload failed."
        );
      }

      setMessage(
        "Document uploaded securely."
      );

      setMessageType("success");

      setTitle("");
      setCategory("Personal");
      setFile(null);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      if (onUploadSuccess) {
        await onUploadSuccess();
      }
    } catch (error) {
      setMessage(
        error.message ||
          "Unable to upload document."
      );

      setMessageType("error");
    } finally {
      setUploading(false);
    }
  };

  return (
    <form
      onSubmit={handleUpload}
      className="space-y-5"
    >
      {/* Title */}
      <div>
        <label
          className="field-label"
          htmlFor="document-title"
        >
          Document title
        </label>

        <input
          id="document-title"
          type="text"
          className="field-input"
          placeholder="Example: Property Agreement"
          value={title}
          onChange={(e) =>
            setTitle(e.target.value)
          }
          required
        />
      </div>

      {/* Category */}
      <div>
        <label
          className="field-label"
          htmlFor="document-category"
        >
          Category
        </label>

        <select
          id="document-category"
          className="field-input"
          value={category}
          onChange={(e) =>
            setCategory(
              e.target.value
            )
          }
        >
          {CATEGORIES.map(
            (item) => (
              <option
                key={item}
                value={item}
              >
                {item}
              </option>
            )
          )}
        </select>
      </div>

      {/* File Selection */}
      <div>
        <label className="field-label">
          Select document
        </label>

        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png"
          className="hidden"
          onChange={(e) =>
            handleFileChange(
              e.target.files?.[0]
            )
          }
        />

        {!file ? (
          <button
            type="button"
            onClick={chooseFile}
            className="group flex w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed border-ink-200 bg-ink-50/60 px-6 py-9 text-center transition hover:border-brand-300 hover:bg-brand-50/40"
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-700 transition group-hover:bg-brand-100">
              <UploadCloud
                size={22}
              />
            </span>

            <span className="mt-4 text-sm font-semibold text-ink-800">
              Choose a file to upload
            </span>

            <span className="mt-1 max-w-sm text-xs leading-5 text-ink-400">
              PDF, JPG, JPEG or PNG.
              Your file will be
              securely processed before
              storage.
            </span>
          </button>
        ) : (
          <div className="rounded-2xl border border-brand-100 bg-brand-50/50 p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-brand-700 shadow-sm">
                <FileText
                  size={19}
                />
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-ink-800">
                  {file.name}
                </p>

                <p className="mt-0.5 text-xs text-ink-400">
                  {formatFileSize(
                    file.size
                  )}
                  {file.type
                    ? ` · ${file.type}`
                    : ""}
                </p>
              </div>

              <button
                type="button"
                onClick={removeFile}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-ink-400 transition hover:bg-white hover:text-red-600"
                title="Remove selected file"
              >
                <X size={17} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Security Note */}
      <div className="flex items-start gap-3 rounded-xl border border-green-100 bg-green-50 px-4 py-3">
        <ShieldCheck
          size={17}
          className="mt-0.5 shrink-0 text-green-700"
        />

        <div>
          <p className="text-xs font-semibold text-green-800">
            Secure document storage
          </p>

          <p className="mt-0.5 text-xs leading-5 text-green-700">
            Your document is handled
            through the protected owner
            vault and is not directly
            exposed through the frontend.
          </p>
        </div>
      </div>

      {/* Message */}
      {message && (
        <div
          className={
            messageType ===
            "success"
              ? "alert-success flex items-center gap-2"
              : "alert-error flex items-center gap-2"
          }
        >
          {messageType ===
          "success" ? (
            <CheckCircle2
              size={16}
            />
          ) : (
            <AlertCircle
              size={16}
            />
          )}

          {message}
        </div>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={uploading}
        className="btn-primary w-full !py-3"
      >
        {uploading ? (
          <Loader2
            size={17}
            className="animate-spin"
          />
        ) : (
          <UploadCloud
            size={17}
          />
        )}

        {uploading
          ? "Uploading securely..."
          : "Upload Document"}
      </button>
    </form>
  );
}