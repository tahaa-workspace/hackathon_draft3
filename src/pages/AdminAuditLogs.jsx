import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Filter, Loader2, Search, ShieldCheck } from 'lucide-react';

import Navbar from '../components/Navbar';
import { getAdminAuditLogs } from '../services/legacyService';

export default function AdminAuditLogs() {
  const [searchParams] = useSearchParams();
  const [logs, setLogs] = useState([]);
  const [filters, setFilters] = useState({
    action: searchParams.get('action') || '',
    entityType: searchParams.get('entityType') || '',
    entityId: searchParams.get('entityId') || '',
    status: searchParams.get('status') || '',
  });
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setLogs(await getAdminAuditLogs(filters));
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    const timer = setTimeout(refresh, 200);
    return () => clearTimeout(timer);
  }, [refresh]);

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <ShieldCheck className="text-indigo-600" size={23} />
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-indigo-600">Administration</p>
            <h1 className="mt-1 text-3xl font-bold text-slate-900">Audit Logs</h1>
          </div>
        </div>

        <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="grid gap-3 md:grid-cols-4">
            <label className="relative">
              <Search size={15} className="absolute left-3 top-3.5 text-slate-400" />
              <input
                className="field-input pl-9"
                placeholder="Action, e.g. LEGACY_ALLOCATION_CREATED"
                value={filters.action}
                onChange={(e) => setFilters((v) => ({ ...v, action: e.target.value }))}
              />
            </label>

            <label className="relative">
              <Filter size={15} className="absolute left-3 top-3.5 text-slate-400" />
              <input
                className="field-input pl-9"
                placeholder="Entity type"
                value={filters.entityType}
                onChange={(e) => setFilters((v) => ({ ...v, entityType: e.target.value }))}
              />
            </label>

            <input
              className="field-input"
              placeholder="Entity ID"
              value={filters.entityId}
              onChange={(e) => setFilters((v) => ({ ...v, entityId: e.target.value }))}
            />

            <select
              className="field-input"
              value={filters.status}
              onChange={(e) => setFilters((v) => ({ ...v, status: e.target.value }))}
            >
              <option value="">All statuses</option>
              <option value="SUCCESS">Success</option>
              <option value="FAILED">Failed</option>
            </select>
          </div>
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
              Loading audit logs…
            </div>
          ) : logs.length === 0 ? (
            <div className="py-16 text-center text-sm text-slate-400">No audit events match these filters.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-100">
                <thead className="bg-slate-50">
                  <tr className="text-left text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
                    <th className="px-5 py-3">Date</th>
                    <th className="px-5 py-3">Actor</th>
                    <th className="px-5 py-3">Action</th>
                    <th className="px-5 py-3">Entity</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3">Description</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {logs.map((log) => (
                    <tr key={log.id} className="text-sm text-slate-600">
                      <td className="whitespace-nowrap px-5 py-4">{new Date(log.createdAt).toLocaleString()}</td>
                      <td className="px-5 py-4">
                        {log.actor?.name || 'System'}
                        {log.actor?.username ? <div className="text-xs text-slate-400">@{log.actor.username}</div> : null}
                      </td>
                      <td className="px-5 py-4 font-medium text-slate-800">{log.action}</td>
                      <td className="px-5 py-4">{log.entityType}</td>
                      <td className="px-5 py-4">
                        <span className={"rounded-full px-2.5 py-1 text-xs font-semibold " + (log.status === 'FAILED' ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700')}>
                          {log.status}
                        </span>
                      </td>
                      <td className="max-w-md px-5 py-4 text-xs leading-5">{log.description || '—'}</td>
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
