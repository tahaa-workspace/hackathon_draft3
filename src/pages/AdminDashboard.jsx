import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Check,
  X,
  Loader2,
  ShieldCheck,
  Inbox,
  Eye,
  FileText,
  Search,
  Users,
  UserRoundCheck,
  UserRoundX,
  Filter,
  RefreshCw,
  Link2,
  Clock3,
} from 'lucide-react';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import {
  approveUser,
  rejectUser,
  getAadhaarReviewUrl,
  getPendingRegistrations,
  getAllUsers,
  updateUserStatus,
} from '../services/authService';

function StatusBadge({ status }) {
  const map = {
    PENDING: 'bg-amber-50 text-amber-700',
    ACTIVE: 'bg-green-50 text-green-700',
    SUSPENDED: 'bg-red-50 text-red-700',
    REJECTED: 'bg-slate-100 text-slate-600',
  };

  return (
    <span className={`badge ${map[status] || 'bg-ink-100 text-ink-600'}`}>
      {status}
    </span>
  );
}

function formatDate(value) {
  if (!value) return '—';

  return new Date(value).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatFileSize(bytes) {
  if (!bytes) return '';
  if (bytes < 1024 * 1024) return `${Math.ceil(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function StatCard({ icon: Icon, label, value, helper }) {
  return (
    <div className="group rounded-2xl border border-ink-100 bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-400">
            {label}
          </p>
          <p className="mt-2 text-3xl font-bold text-ink-900">{value}</p>
          <p className="mt-1 text-xs text-ink-400">{helper}</p>
        </div>

        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600 transition group-hover:scale-105 group-hover:bg-brand-100">
          <Icon size={20} />
        </div>
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const { user } = useAuth();

  const [pending, setPending] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [documentLoadingId, setDocumentLoadingId] = useState(null);

  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const [pendingData, usersData] = await Promise.all([
        getPendingRegistrations(),
        getAllUsers(),
      ]);

      setPending(pendingData);
      setAccounts(usersData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const stats = useMemo(() => {
    return {
      owners: accounts.filter((item) => item.role === 'OWNER').length,
      beneficiaries: accounts.filter((item) => item.role === 'BENEFICIARY').length,
      active: accounts.filter((item) => item.status === 'ACTIVE').length,
      suspended: accounts.filter((item) => item.status === 'SUSPENDED').length,
    };
  }, [accounts]);

  const filteredAccounts = useMemo(() => {
    const needle = search.trim().toLowerCase();

    return accounts.filter((item) => {
      const searchValues = [
        item.name,
        item.username,
        item.email,
        item.owner?.name,
        item.owner?.username,
        item.owner?.email,
      ].filter(Boolean);

      const matchesSearch =
        !needle ||
        searchValues.some((value) =>
          value.toLowerCase().includes(needle)
        );

      const matchesRole =
        roleFilter === 'ALL' || item.role === roleFilter;

      const matchesStatus =
        statusFilter === 'ALL' || item.status === statusFilter;

      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [accounts, search, roleFilter, statusFilter]);

  const handleApprove = async (id) => {
    setActionLoadingId(id);
    setError('');

    try {
      await approveUser(id);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleReject = async (id) => {
    const confirmed = window.confirm(
      'Reject this owner registration? The uploaded Aadhaar verification document will also be deleted from Cloudinary.'
    );

    if (!confirmed) return;

    setActionLoadingId(id);
    setError('');

    try {
      await rejectUser(id);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleStatusChange = async (item, nextStatus) => {
    const verb = nextStatus === 'ACTIVE' ? 'activate' : 'suspend';
    const confirmed = window.confirm(
      `${verb.charAt(0).toUpperCase() + verb.slice(1)} ${item.name}'s ${item.role.toLowerCase()} account?`
    );

    if (!confirmed) return;

    setActionLoadingId(item.id);
    setError('');

    try {
      await updateUserStatus(item.id, nextStatus);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleViewAadhaar = async (item) => {
    setDocumentLoadingId(item.id);
    setError('');

    try {
      const { url } = await getAadhaarReviewUrl(item.id);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (err) {
      setError(err.message);
    } finally {
      setDocumentLoadingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-ink-50">
      <Navbar />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="mb-1 text-sm font-semibold text-brand-600">
              Administration
            </p>

            <h1 className="text-3xl font-bold tracking-tight text-ink-900">
              Account control center
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-500">
              Review owner registrations, search platform accounts, inspect owner-beneficiary relationships, and control account access from one place.
            </p>
          </div>

          <div className="flex items-center gap-3 rounded-2xl border border-ink-100 bg-white px-4 py-3 shadow-sm">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
              <ShieldCheck size={19} />
            </div>

            <div>
              <p className="text-xs text-ink-400">Administrator</p>
              <p className="text-sm font-semibold text-ink-800">
                {user?.name || user?.username}
              </p>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <section className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            icon={Users}
            label="Total accounts"
            value={accounts.length}
            helper={`${stats.active} active · ${stats.suspended} suspended`}
          />

          <StatCard
            icon={UserRoundCheck}
            label="Owners"
            value={stats.owners}
            helper="Registered vault owners"
          />

          <StatCard
            icon={Link2}
            label="Beneficiaries"
            value={stats.beneficiaries}
            helper="Owner-created beneficiary accounts"
          />

          <StatCard
            icon={Clock3}
            label="Pending review"
            value={pending.length}
            helper="Owner identity approvals"
          />
        </section>

        <section className="mb-8 overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-sm">
          <div className="flex flex-col gap-4 border-b border-ink-100 px-5 py-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-ink-900">
                Account directory
              </h2>
              <p className="mt-1 text-sm text-ink-400">
                Search owners and beneficiaries, view relationships, and manage access status.
              </p>
            </div>

            <button
              type="button"
              onClick={load}
              disabled={loading}
              className="inline-flex items-center gap-2 self-start rounded-xl border border-ink-100 px-3 py-2 text-sm font-semibold text-ink-600 transition hover:bg-ink-50 disabled:opacity-50"
            >
              <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
              Refresh
            </button>
          </div>

          <div className="grid gap-3 border-b border-ink-100 bg-ink-50/40 px-5 py-4 md:grid-cols-[1fr_180px_180px]">
            <label className="relative">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400"
              />

              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search account or linked owner"
                className="w-full rounded-xl border border-ink-100 bg-white py-2.5 pl-10 pr-3 text-sm text-ink-800 outline-none transition focus:border-brand-300 focus:ring-2 focus:ring-brand-100"
              />
            </label>

            <label className="relative">
              <Filter
                size={15}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400"
              />

              <select
                value={roleFilter}
                onChange={(event) => setRoleFilter(event.target.value)}
                className="w-full appearance-none rounded-xl border border-ink-100 bg-white py-2.5 pl-9 pr-3 text-sm text-ink-700 outline-none focus:border-brand-300"
              >
                <option value="ALL">All roles</option>
                <option value="OWNER">Owners</option>
                <option value="BENEFICIARY">Beneficiaries</option>
              </select>
            </label>

            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="w-full rounded-xl border border-ink-100 bg-white px-3 py-2.5 text-sm text-ink-700 outline-none focus:border-brand-300"
            >
              <option value="ALL">All statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="SUSPENDED">Suspended</option>
              <option value="PENDING">Pending</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </div>

          {loading ? (
            <div className="flex items-center justify-center gap-2 px-5 py-16 text-sm text-ink-500">
              <Loader2 size={18} className="animate-spin" />
              Loading accounts…
            </div>
          ) : filteredAccounts.length === 0 ? (
            <div className="px-5 py-14 text-center text-sm text-ink-400">
              No accounts match your search and filters.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-ink-100">
                <thead className="bg-white">
                  <tr className="text-left text-xs font-semibold uppercase tracking-wide text-ink-400">
                    <th className="px-5 py-3">Account</th>
                    <th className="px-5 py-3">Role</th>
                    <th className="px-5 py-3">Relationship</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3">Created</th>
                    <th className="px-5 py-3 text-right">Control</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-ink-100">
                  {filteredAccounts.map((item) => (
                    <tr
                      key={item.id}
                      className="transition hover:bg-ink-50/50"
                    >
                      <td className="px-5 py-4">
                        <p className="font-semibold text-ink-800">{item.name}</p>
                        <p className="text-xs text-ink-400">{item.email}</p>
                        <p className="text-xs text-ink-400">@{item.username}</p>
                      </td>

                      <td className="px-5 py-4 text-sm font-medium text-ink-600">
                        {item.role === 'OWNER' ? 'Owner' : 'Beneficiary'}
                      </td>

                      <td className="px-5 py-4">
                        {item.role === 'OWNER' ? (
                          <div>
                            <p className="text-sm font-medium text-ink-700">
                              {item.beneficiaryCount} {item.beneficiaryCount === 1 ? 'beneficiary' : 'beneficiaries'}
                            </p>
                            <p className="text-xs text-ink-400">Created by owner</p>
                          </div>
                        ) : item.owner ? (
                          <div>
                            <p className="text-xs text-ink-400">Owner</p>
                            <p className="text-sm font-semibold text-ink-700">
                              {item.owner.name}
                            </p>
                            <p className="text-xs text-ink-400">@{item.owner.username}</p>
                          </div>
                        ) : (
                          <span className="text-xs text-ink-400">Owner unavailable</span>
                        )}
                      </td>

                      <td className="px-5 py-4">
                        <StatusBadge status={item.status} />
                      </td>

                      <td className="px-5 py-4 text-sm text-ink-500">
                        {formatDate(item.createdAt)}
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex justify-end">
                          {item.status === 'ACTIVE' ? (
                            <button
                              type="button"
                              onClick={() => handleStatusChange(item, 'SUSPENDED')}
                              disabled={actionLoadingId === item.id}
                              className="inline-flex items-center gap-2 rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                            >
                              {actionLoadingId === item.id ? (
                                <Loader2 size={14} className="animate-spin" />
                              ) : (
                                <UserRoundX size={14} />
                              )}
                              Suspend
                            </button>
                          ) : item.status === 'SUSPENDED' ? (
                            <button
                              type="button"
                              onClick={() => handleStatusChange(item, 'ACTIVE')}
                              disabled={actionLoadingId === item.id}
                              className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-brand-700 disabled:opacity-50"
                            >
                              {actionLoadingId === item.id ? (
                                <Loader2 size={14} className="animate-spin" />
                              ) : (
                                <UserRoundCheck size={14} />
                              )}
                              Activate
                            </button>
                          ) : (
                            <span className="text-xs text-ink-400">
                              Approval workflow
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-ink-100 px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                <Inbox size={18} />
              </div>

              <div>
                <h2 className="font-semibold text-ink-900">
                  Pending owner approvals
                </h2>
                <p className="text-xs text-ink-400">
                  {pending.length} waiting for identity review
                </p>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center gap-2 px-5 py-16 text-sm text-ink-500">
              <Loader2 size={18} className="animate-spin" />
              Loading registrations…
            </div>
          ) : pending.length === 0 ? (
            <div className="px-5 py-14 text-center">
              <ShieldCheck size={34} className="mx-auto mb-3 text-green-500" />
              <p className="font-semibold text-ink-800">All caught up</p>
              <p className="mt-1 text-sm text-ink-400">
                There are no pending owner registrations.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-ink-100">
                <thead className="bg-ink-50/70">
                  <tr className="text-left text-xs font-semibold uppercase tracking-wide text-ink-400">
                    <th className="px-5 py-3">Applicant</th>
                    <th className="px-5 py-3">Submitted</th>
                    <th className="px-5 py-3">Identity document</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3 text-right">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-ink-100 bg-white">
                  {pending.map((item) => {
                    const aadhaar = item.aadhaarDocument;

                    return (
                      <tr
                        key={item.id}
                        className="align-middle transition hover:bg-ink-50/40"
                      >
                        <td className="px-5 py-4">
                          <p className="font-semibold text-ink-800">{item.name}</p>
                          <p className="text-xs text-ink-400">{item.email}</p>
                          <p className="text-xs text-ink-400">@{item.username}</p>
                        </td>

                        <td className="px-5 py-4 text-sm text-ink-500">
                          {formatDate(item.createdAt)}
                        </td>

                        <td className="px-5 py-4">
                          {aadhaar?.available ? (
                            <div className="flex items-center gap-3">
                              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                                <FileText size={16} />
                              </div>

                              <div className="min-w-0">
                                <p className="max-w-[180px] truncate text-sm font-medium text-ink-700">
                                  {aadhaar.originalName || 'Aadhaar document'}
                                </p>
                                <p className="text-xs text-ink-400">
                                  {formatFileSize(aadhaar.fileSize)}
                                </p>
                              </div>

                              <button
                                type="button"
                                onClick={() => handleViewAadhaar(item)}
                                disabled={documentLoadingId === item.id}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-ink-100 px-2.5 py-2 text-xs font-semibold text-ink-600 transition hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700 disabled:opacity-50"
                              >
                                {documentLoadingId === item.id ? (
                                  <Loader2 size={14} className="animate-spin" />
                                ) : (
                                  <Eye size={14} />
                                )}
                                View
                              </button>
                            </div>
                          ) : (
                            <span className="text-xs text-ink-400">
                              No document
                            </span>
                          )}
                        </td>

                        <td className="px-5 py-4">
                          <StatusBadge status={item.status} />
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => handleReject(item.id)}
                              disabled={actionLoadingId === item.id}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                            >
                              <X size={14} />
                              Reject
                            </button>

                            <button
                              type="button"
                              onClick={() => handleApprove(item.id)}
                              disabled={actionLoadingId === item.id}
                              className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-brand-700 disabled:opacity-50"
                            >
                              {actionLoadingId === item.id ? (
                                <Loader2 size={14} className="animate-spin" />
                              ) : (
                                <Check size={14} />
                              )}
                              Approve
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
