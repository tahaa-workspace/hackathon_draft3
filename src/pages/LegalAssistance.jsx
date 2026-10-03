import { useCallback, useEffect, useState } from 'react';
import { Gavel, Loader2, Send } from 'lucide-react';

import Navbar from '../components/Navbar';
import {
  createLegalConsultation,
  getAvailableConsultationLawyers,
  getMyLegalConsultations,
} from '../services/legacyService';

export default function LegalAssistance() {
  const [lawyers, setLawyers] = useState([]);
  const [requests, setRequests] = useState([]);
  const [form, setForm] = useState({
    lawyerId: '',
    subject: '',
    description: '',
  });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [available, mine] = await Promise.all([
        getAvailableConsultationLawyers(),
        getMyLegalConsultations(),
      ]);
      setLawyers(available);
      setRequests(mine);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const submit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setMessage('');

    try {
      await createLegalConsultation(form);
      setForm({ lawyerId: '', subject: '', description: '' });
      setMessage('Legal consultation request submitted.');
      await refresh();
    } catch (error) {
      setMessage(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      <main className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
        <section className="rounded-3xl bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 p-7 text-white shadow-xl">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-cyan-200">
              <Gavel size={22} />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-cyan-200">Legal Assistance</p>
              <h1 className="mt-2 text-3xl font-bold">Request a lifetime consultation</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
                This flow is independent of legacy claims. You can ask an approved lawyer for help planning or reviewing your digital legacy while you are alive.
              </p>
            </div>
          </div>
        </section>

        {message && (
          <div className="rounded-2xl border border-indigo-100 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm">
            {message}
          </div>
        )}

        <section className="grid gap-6 lg:grid-cols-2">
          <form onSubmit={submit} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">New consultation request</h2>

            <div className="mt-5 space-y-4">
              <label className="block text-sm font-medium text-slate-700">
                Lawyer
                <select
                  className="field-input mt-1"
                  value={form.lawyerId}
                  onChange={(e) => setForm((value) => ({ ...value, lawyerId: e.target.value }))}
                  required
                >
                  <option value="">Select an available lawyer</option>
                  {lawyers.map((lawyer) => (
                    <option key={lawyer.id} value={lawyer.id}>
                      {lawyer.name}{lawyer.city ? ' · ' + lawyer.city : ''}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block text-sm font-medium text-slate-700">
                Subject
                <input
                  className="field-input mt-1"
                  value={form.subject}
                  onChange={(e) => setForm((value) => ({ ...value, subject: e.target.value }))}
                  placeholder="Digital Legacy Planning"
                  required
                />
              </label>

              <label className="block text-sm font-medium text-slate-700">
                Description
                <textarea
                  className="field-input mt-1 min-h-36"
                  value={form.description}
                  onChange={(e) => setForm((value) => ({ ...value, description: e.target.value }))}
                  placeholder="Describe the legal assistance you need."
                  required
                />
              </label>

              <button disabled={submitting} className="btn-primary">
                {submitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                {submitting ? 'Submitting…' : 'Request consultation'}
              </button>
            </div>
          </form>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">My consultation requests</h2>

            {loading ? (
              <div className="flex items-center gap-2 py-10 text-sm text-slate-500">
                <Loader2 size={16} className="animate-spin" />
                Loading…
              </div>
            ) : requests.length === 0 ? (
              <p className="py-10 text-sm text-slate-400">No direct consultation requests yet.</p>
            ) : (
              <div className="mt-4 space-y-3">
                {requests.map((request) => (
                  <article key={request.id} className="rounded-2xl border border-slate-200 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-slate-900">{request.subject}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          Lawyer: {request.lawyer?.name || 'Assigned lawyer'}
                        </p>
                      </div>
                      <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-[11px] font-semibold text-indigo-700">
                        {request.status}
                      </span>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-slate-600">{request.description}</p>
                    {request.lawyerRemarks && (
                      <p className="mt-3 rounded-xl bg-slate-50 p-3 text-xs leading-5 text-slate-600">
                        <strong>Lawyer remarks:</strong> {request.lawyerRemarks}
                      </p>
                    )}
                  </article>
                ))}
              </div>
            )}
          </section>
        </section>
      </main>
    </div>
  );
}
