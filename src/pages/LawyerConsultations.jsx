import { useCallback, useEffect, useState } from 'react';
import { Gavel, Loader2 } from 'lucide-react';

import Navbar from '../components/Navbar';
import {
  getLawyerConsultations,
  updateLawyerConsultation,
} from '../services/legacyService';

export default function LawyerConsultations() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [message, setMessage] = useState('');

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setRequests(await getLawyerConsultations());
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const update = async (request, status) => {
    const remarks = window.prompt('Optional remarks for the user:', request.lawyerRemarks || '') ?? request.lawyerRemarks || '';
    setBusyId(request.id);
    setMessage('');

    try {
      await updateLawyerConsultation(request.id, {
        status,
        lawyerRemarks: remarks,
      });
      await refresh();
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <Gavel className="text-indigo-600" size={22} />
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-indigo-600">Lawyer</p>
            <h1 className="mt-1 text-3xl font-bold text-slate-900">Direct consultation requests</h1>
          </div>
        </div>

        {message && (
          <div className="mt-5 rounded-2xl border border-indigo-100 bg-white px-4 py-3 text-sm text-slate-700">
            {message}
          </div>
        )}

        <section className="mt-6 space-y-4">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-500">
              <Loader2 size={18} className="animate-spin" />
              Loading requests…
            </div>
          ) : requests.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center text-sm text-slate-400">
              No lifetime consultation requests assigned to you.
            </div>
          ) : (
            requests.map((request) => (
              <article key={request.id} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
                  <div>
                    <p className="text-lg font-semibold text-slate-900">{request.subject}</p>
                    <p className="mt-1 text-sm text-slate-500">
                      From {request.requester?.name} (@{request.requester?.username})
                    </p>
                    <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-600">{request.description}</p>
                    {request.lawyerRemarks && (
                      <p className="mt-3 text-xs text-slate-500">
                        Current remarks: {request.lawyerRemarks}
                      </p>
                    )}
                  </div>

                  <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
                    {request.status}
                  </span>
                </div>

                <div className="mt-5 flex flex-wrap gap-2">
                  {['ACCEPTED', 'IN_PROGRESS', 'COMPLETED', 'REJECTED'].map((status) => (
                    <button
                      key={status}
                      type="button"
                      disabled={busyId === request.id}
                      onClick={() => update(request, status)}
                      className="btn-secondary"
                    >
                      {busyId === request.id ? <Loader2 size={14} className="animate-spin" /> : null}
                      {status.replaceAll('_', ' ')}
                    </button>
                  ))}
                </div>
              </article>
            ))
          )}
        </section>
      </main>
    </div>
  );
}
