import { useCallback, useEffect, useState } from 'react';
import { Briefcase, Loader2, RefreshCw } from 'lucide-react';

import Navbar from '../components/Navbar';
import { getAdminLegalConsultations } from '../services/legacyService';

const STATUSES = [
  'PENDING',
  'ASSIGNED',
  'ACCEPTED',
  'IN_PROGRESS',
  'COMPLETED',
  'REJECTED',
  'CANCELLED',
];

export default function AdminLegalRequests() {
  const [requests, setRequests] = useState([]);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setMessage('');

    try {
      const data = await getAdminLegalConsultations({
        status,
        limit: 100,
      });

      setRequests(data.requests || []);
    } catch (error) {
      setMessage(
        error.message ||
        'Unable to load legal consultation requests.'
      );
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="flex items-center gap-2 text-indigo-700">
              <Briefcase size={19} />
              <span className="text-xs font-bold uppercase tracking-[0.14em]">
                Administration
              </span>
            </div>
            <h1 className="mt-2 text-3xl font-bold text-slate-900">
              Lifetime Legal Requests
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
              Oversight view for direct user-to-lawyer consultations. Claim-related lawyer review remains in Legacy Claims.
            </p>
          </div>

          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="btn-secondary"
          >
            <RefreshCw
              size={15}
              className={loading ? 'animate-spin' : ''}
            />
            Refresh
          </button>
        </div>

        <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <label className="block max-w-xs text-sm font-medium text-slate-700">
            Status
            <select
              className="field-input mt-1"
              value={status}
              onChange={(event) => setStatus(event.target.value)}
            >
              <option value="">All statuses</option>
              {STATUSES.map((value) => (
                <option key={value} value={value}>
                  {value.replaceAll('_', ' ')}
                </option>
              ))}
            </select>
          </label>
        </section>

        {message && (
          <div className="mt-5 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
            {message}
          </div>
        )}

        <section className="mt-6 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-500">
              <Loader2 size={18} className="animate-spin" />
              Loading legal requests…
            </div>
          ) : requests.length === 0 ? (
            <div className="py-16 text-center text-sm text-slate-400">
              No lifetime legal requests match this filter.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-100">
                <thead className="bg-slate-50">
                  <tr className="text-left text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
                    <th className="px-5 py-3">Requested</th>
                    <th className="px-5 py-3">Requester</th>
                    <th className="px-5 py-3">Lawyer</th>
                    <th className="px-5 py-3">Subject</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3">Lawyer remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {requests.map((request) => (
                    <tr key={request.id} className="align-top text-sm text-slate-600">
                      <td className="whitespace-nowrap px-5 py-4">
                        {new Date(request.createdAt).toLocaleString()}
                      </td>
                      <td className="px-5 py-4">
                        <p className="font-semibold text-slate-800">
                          {request.requester?.name || 'User'}
                        </p>
                        <p className="text-xs text-slate-400">
                          {request.requester?.email || '—'}
                        </p>
                      </td>
                      <td className="px-5 py-4">
                        <p className="font-semibold text-slate-800">
                          {request.lawyer?.name || 'Lawyer'}
                        </p>
                        <p className="text-xs text-slate-400">
                          {request.lawyer?.email || '—'}
                        </p>
                      </td>
                      <td className="max-w-md px-5 py-4">
                        <p className="font-medium text-slate-800">
                          {request.subject}
                        </p>
                        <p className="mt-1 line-clamp-3 text-xs leading-5 text-slate-500">
                          {request.description}
                        </p>
                      </td>
                      <td className="px-5 py-4">
                        <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700">
                          {request.status.replaceAll('_', ' ')}
                        </span>
                      </td>
                      <td className="max-w-sm px-5 py-4 text-xs leading-5">
                        {request.lawyerRemarks || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
