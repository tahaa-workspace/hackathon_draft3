import { useEffect, useMemo, useState } from 'react';
import { Download, FileQuestion, Loader2, X } from 'lucide-react';

import { downloadDocument, openDocument } from '../services/legacyService';

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const anchor = window.document.createElement('a');
  anchor.href = url;
  anchor.download = filename || 'document';
  window.document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export default function SecureDocumentViewer({
  document,
  allowDownload = true,
  onClose,
}) {
  const [url, setUrl] = useState('');
  const [mimeType, setMimeType] = useState(document?.fileType || '');
  const [loading, setLoading] = useState(Boolean(document));
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState('');

  const documentId = document?.id;
  const filename =
    document?.originalName ||
    document?.title ||
    'document';

  useEffect(() => {
    if (!documentId) return undefined;

    let active = true;
    let objectUrl = '';

    setLoading(true);
    setError('');

    openDocument(documentId)
      .then((blob) => {
        if (!active) return;
        objectUrl = URL.createObjectURL(blob);
        setMimeType(blob.type || document?.fileType || '');
        setUrl(objectUrl);
      })
      .catch((requestError) => {
        if (!active) return;
        setError(
          requestError.message ||
          'Unable to preview this document.'
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [documentId, document?.fileType]);

  useEffect(() => {
    if (!documentId) return undefined;

    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose?.();
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [documentId, onClose]);

  const previewType = useMemo(() => {
    if (mimeType === 'application/pdf') return 'pdf';
    if (mimeType.startsWith('image/')) return 'image';
    return 'unsupported';
  }, [mimeType]);

  if (!documentId) return null;

  const handleDownload = async () => {
    setDownloading(true);
    setError('');

    try {
      const blob = await downloadDocument(documentId);
      triggerDownload(blob, filename);
    } catch (requestError) {
      setError(
        requestError.message ||
        'Unable to download this document.'
      );
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/70 p-3 sm:p-6">
      <div className="flex max-h-[94vh] w-full max-w-6xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 sm:px-5">
          <div className="min-w-0">
            <p className="truncate font-semibold text-slate-900">
              {document.title || filename}
            </p>
            <p className="truncate text-xs text-slate-500">
              {filename}
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {allowDownload && (
              <button
                type="button"
                onClick={handleDownload}
                disabled={downloading}
                className="btn-secondary"
              >
                {downloading ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : (
                  <Download size={15} />
                )}
                <span className="hidden sm:inline">
                  {downloading ? 'Downloading…' : 'Download'}
                </span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50"
              aria-label="Close document preview"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-auto bg-slate-100 p-3 sm:p-5">
          {loading ? (
            <div className="flex min-h-[60vh] items-center justify-center gap-2 text-sm text-slate-500">
              <Loader2 size={20} className="animate-spin" />
              Loading secure preview…
            </div>
          ) : error ? (
            <div className="mx-auto flex min-h-[50vh] max-w-xl flex-col items-center justify-center text-center">
              <FileQuestion size={34} className="text-slate-400" />
              <p className="mt-4 font-semibold text-slate-800">
                Preview unavailable
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                {error}
              </p>
              {allowDownload ? (
                <button
                  type="button"
                  onClick={handleDownload}
                  disabled={downloading}
                  className="btn-primary mt-5"
                >
                  <Download size={16} />
                  Download file
                </button>
              ) : (
                <p className="mt-4 text-xs text-slate-400">
                  Download permission has not been granted for this allocation.
                </p>
              )}
            </div>
          ) : previewType === 'pdf' ? (
            <iframe
              title={document.title || 'Document preview'}
              src={url}
              className="h-[72vh] w-full rounded-2xl bg-white"
            />
          ) : previewType === 'image' ? (
            <div className="flex min-h-[60vh] items-center justify-center">
              <img
                src={url}
                alt={document.title || filename}
                className="max-h-[72vh] max-w-full rounded-2xl object-contain shadow-sm"
              />
            </div>
          ) : (
            <div className="mx-auto flex min-h-[50vh] max-w-xl flex-col items-center justify-center text-center">
              <FileQuestion size={34} className="text-slate-400" />
              <p className="mt-4 font-semibold text-slate-800">
                Preview unavailable
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                This file type cannot be previewed in the browser. You can still download it securely.
              </p>
              {allowDownload ? (
                <button
                  type="button"
                  onClick={handleDownload}
                  disabled={downloading}
                  className="btn-primary mt-5"
                >
                  <Download size={16} />
                  Download file
                </button>
              ) : (
                <p className="mt-4 text-xs text-slate-400">
                  Download permission has not been granted for this allocation.
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
