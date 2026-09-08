import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  Check,
  Clock3,
  Eye,
  FileText,
  Filter,
  Inbox,
  Link2,
  Loader2,
  RefreshCw,
  Search,
  ShieldCheck,
  UserRoundCheck,
  UserRoundX,
  Users,
  X,
} from 'lucide-react';

import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';

import {
  approveUser,
  rejectUser,
  getAadhaarReviewFile,
  getLawyerCredentialReviewUrl,
  getPendingRegistrations,
  getAllUsers,
  updateUserStatus,
} from '../services/authService';

function StatusBadge({ status }) {
  const map = {
    PENDING:
      'bg-amber-50 text-amber-700 ring-amber-100',
    ACTIVE:
      'bg-emerald-50 text-emerald-700 ring-emerald-100',
    SUSPENDED:
      'bg-rose-50 text-rose-700 ring-rose-100',
    REJECTED:
      'bg-slate-100 text-slate-600 ring-slate-200',
  };

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ring-1 ${
        map[status] ||
        'bg-slate-100 text-slate-600 ring-slate-200'
      }`}
    >
      {status}
    </span>
  );
}

function RoleBadge({ role }) {
  const config = {
    OWNER: {
      label: 'Owner',
      style:
        'bg-indigo-50 text-indigo-700 ring-indigo-100',
    },
    BENEFICIARY: {
      label: 'Beneficiary',
      style:
        'bg-cyan-50 text-cyan-700 ring-cyan-100',
    },
    LAWYER: {
      label: 'Lawyer',
      style:
        'bg-violet-50 text-violet-700 ring-violet-100',
    },
  };

  const value =
    config[role] || config.BENEFICIARY;

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ring-1 ${value.style}`}
    >
      {value.label}
    </span>
  );
}

function formatDate(value) {
  if (!value) return '—';

  return new Date(value).toLocaleString(
    undefined,
    {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }
  );
}

function formatFileSize(bytes) {
  if (!bytes) return '';
  if (bytes < 1024 * 1024) {
    return `${Math.ceil(bytes / 1024)} KB`;
  }

  return `${(
    bytes /
    (1024 * 1024)
  ).toFixed(1)} MB`;
}

export default function AdminDashboard() {
  const { user } = useAuth();

  const [pending, setPending] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [pendingLoading, setPendingLoading] =
    useState(true);
  const [accountsLoading, setAccountsLoading] =
    useState(true);
  const [pendingError, setPendingError] =
    useState('');
  const [accountsError, setAccountsError] =
    useState('');
  const [actionLoadingId, setActionLoadingId] =
    useState(null);
  const [documentLoadingId, setDocumentLoadingId] =
    useState(null);

  const [pendingFilter, setPendingFilter] =
    useState('ALL');
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] =
    useState('ALL');
  const [statusFilter, setStatusFilter] =
    useState('ALL');

  const loadPending = useCallback(async () => {
    setPendingLoading(true);
    setPendingError('');

    try {
      const data =
        await getPendingRegistrations();

      setPending(
        Array.isArray(data) ? data : []
      );
    } catch (err) {
      setPendingError(
        err.message ||
          'Unable to load pending registrations.'
      );
    } finally {
      setPendingLoading(false);
    }
  }, []);

  const loadAccounts = useCallback(async () => {
    setAccountsLoading(true);
    setAccountsError('');

    try {
      const data = await getAllUsers();

      setAccounts(
        Array.isArray(data) ? data : []
      );
    } catch (err) {
      setAccountsError(
        err.message ||
          'Unable to load platform accounts.'
      );
    } finally {
      setAccountsLoading(false);
    }
  }, []);

  const refreshAll = useCallback(async () => {
    await Promise.allSettled([
      loadPending(),
      loadAccounts(),
    ]);
  }, [loadPending, loadAccounts]);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  useEffect(() => {
    const handleFocus = () => {
      loadPending();
      loadAccounts();
    };

    window.addEventListener(
      'focus',
      handleFocus
    );

    return () =>
      window.removeEventListener(
        'focus',
        handleFocus
      );
  }, [loadPending, loadAccounts]);

  const pendingCounts = useMemo(
    () => ({
      owners: pending.filter(
        (item) => item.role === 'OWNER'
      ).length,
      lawyers: pending.filter(
        (item) => item.role === 'LAWYER'
      ).length,
    }),
    [pending]
  );

  const filteredPending = useMemo(
    () =>
      pendingFilter === 'ALL'
        ? pending
        : pending.filter(
            (item) =>
              item.role === pendingFilter
          ),
    [pending, pendingFilter]
  );

  const stats = useMemo(
    () => ({
      owners: accounts.filter(
        (item) => item.role === 'OWNER'
      ).length,
      beneficiaries: accounts.filter(
        (item) =>
          item.role === 'BENEFICIARY'
      ).length,
      lawyers: accounts.filter(
        (item) => item.role === 'LAWYER'
      ).length,
      active: accounts.filter(
        (item) => item.status === 'ACTIVE'
      ).length,
      suspended: accounts.filter(
        (item) =>
          item.status === 'SUSPENDED'
      ).length,
    }),
    [accounts]
  );

  const filteredAccounts = useMemo(() => {
    const needle = search
      .trim()
      .toLowerCase();

    return accounts.filter((item) => {
      const searchable = [
        item.name,
        item.username,
        item.email,
        item.owner?.name,
        item.owner?.username,
        item.owner?.email,
        item.lawyerProfile?.enrollmentNumber,
        item.lawyerProfile?.stateBarCouncil,
        item.lawyerProfile?.city,
        item.lawyerProfile?.state,
      ].filter(Boolean);

      const matchesSearch =
        !needle ||
        searchable.some((value) =>
          String(value)
            .toLowerCase()
            .includes(needle)
        );

      const matchesRole =
        roleFilter === 'ALL' ||
        item.role === roleFilter;

      const matchesStatus =
        statusFilter === 'ALL' ||
        item.status === statusFilter;

      return (
        matchesSearch &&
        matchesRole &&
        matchesStatus
      );
    });
  }, [
    accounts,
    search,
    roleFilter,
    statusFilter,
  ]);

  const handleApprove = async (item) => {
    const label =
      item.role === 'LAWYER'
        ? 'lawyer'
        : 'owner';

    const confirmed = window.confirm(
      `Approve this ${label} registration?`
    );

    if (!confirmed) return;

    setActionLoadingId(item.id);
    setPendingError('');

    try {
      await approveUser(item.id);
      await refreshAll();
    } catch (err) {
      setPendingError(err.message);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleReject = async (item) => {
    const label =
      item.role === 'LAWYER'
        ? 'lawyer'
        : 'owner';

    const documentLabel =
      item.role === 'LAWYER'
        ? 'professional credential'
        : 'Aadhaar verification document';

    const reason = window.prompt(
      `Reject this ${label} registration? The uploaded ${documentLabel} will be deleted from Cloudinary.\n\nOptional rejection reason:`
    );

    if (reason === null) return;

    setActionLoadingId(item.id);
    setPendingError('');

    try {
      await rejectUser(item.id, reason);
      await refreshAll();
    } catch (err) {
      setPendingError(err.message);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleViewVerification =
    async (item) => {
      setDocumentLoadingId(item.id);
      setPendingError('');

      const isLawyer =
        item.role === 'LAWYER';

      const label = isLawyer
        ? 'professional credential'
        : 'Aadhaar document';

      try {
        if (isLawyer) {
          const result =
            await getLawyerCredentialReviewUrl(
              item.id
            );

          const reviewWindow = window.open(
            result.url,
            '_blank',
            'noopener,noreferrer'
          );

          if (!reviewWindow) {
            throw new Error(
              'The browser blocked the professional credential window. Please allow pop-ups and try again.'
            );
          }

          return;
        }

        const blob =
          await getAadhaarReviewFile(item.id);

        const url =
          URL.createObjectURL(blob);

        const popup = window.open(
          url,
          '_blank',
          'noopener,noreferrer'
        );

        if (!popup) {
          URL.revokeObjectURL(url);
          throw new Error(
            'Browser blocked the Aadhaar document window. Please allow pop-ups for this site.'
          );
        }

        setTimeout(
          () => URL.revokeObjectURL(url),
          60000
        );
      } catch (err) {
        setPendingError(
          err.message ||
            `Unable to open ${label}.`
        );
      } finally {
        setDocumentLoadingId(null);
      }
    };

  const handleStatusChange = async (
    item,
    nextStatus
  ) => {
    const verb =
      nextStatus === 'ACTIVE'
        ? 'activate'
        : 'suspend';

    const confirmed = window.confirm(
      `${
        verb.charAt(0).toUpperCase() +
        verb.slice(1)
      } ${item.name}'s ${item.role.toLowerCase()} account?`
    );

    if (!confirmed) return;

    setActionLoadingId(item.id);
    setAccountsError('');

    try {
      await updateUserStatus(
        item.id,
        nextStatus
      );
      await loadAccounts();
    } catch (err) {
      setAccountsError(err.message);
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-indigo-50/30 to-violet-50/40">
      <Navbar />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* HEADER */}
        <section className="relative mb-7 overflow-hidden rounded-3xl border border-indigo-100 bg-gradient-to-r from-slate-950 via-indigo-950 to-violet-950 px-6 py-7 text-white shadow-xl sm:px-8">
          <div className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-violet-500/20 blur-3xl" />
          <div className="pointer-events-none absolute bottom-0 left-1/3 h-32 w-72 rounded-full bg-indigo-400/20 blur-3xl" />

          <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold text-indigo-100">
                <ShieldCheck size={14} />
                Administration
              </div>

              <h1 className="mt-4 text-3xl font-bold tracking-[-0.03em] sm:text-4xl">
                Account control center
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
                Review identity applications,
                professional credentials and account
                access while keeping the existing
                approval workflow intact.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={refreshAll}
                disabled={
                  pendingLoading ||
                  accountsLoading
                }
                className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/15 disabled:opacity-50"
              >
                <RefreshCw
                  size={16}
                  className={
                    pendingLoading ||
                    accountsLoading
                      ? 'animate-spin'
                      : ''
                  }
                />
                Refresh data
              </button>

              <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/10 px-4 py-3 backdrop-blur">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-400/20 text-indigo-100">
                  <ShieldCheck size={19} />
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-[0.12em] text-slate-400">
                    Administrator
                  </p>
                  <p className="text-sm font-semibold">
                    {user?.name ||
                      user?.username}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* STATS */}
        <section className="mb-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <StatCard
            icon={Clock3}
            label="Pending review"
            value={pending.length}
            helper={`${pendingCounts.owners} owners · ${pendingCounts.lawyers} lawyers`}
            accent="amber"
          />
          <StatCard
            icon={UserRoundCheck}
            label="Owners"
            value={stats.owners}
            helper="Registered vault owners"
            accent="indigo"
          />
          <StatCard
            icon={Link2}
            label="Beneficiaries"
            value={stats.beneficiaries}
            helper="Owner-created accounts"
            accent="cyan"
          />
          <StatCard
            icon={ShieldCheck}
            label="Lawyers"
            value={stats.lawyers}
            helper="Professional accounts"
            accent="violet"
          />
          <StatCard
            icon={Users}
            label="Total accounts"
            value={accounts.length}
            helper={`${stats.active} active · ${stats.suspended} suspended`}
            accent="slate"
          />
        </section>

        {/* PENDING APPROVAL FLOW - SAME POSITION */}
        <section className="mb-7 overflow-hidden rounded-3xl border border-amber-200 bg-white shadow-sm">
          <div className="flex flex-col gap-4 border-b border-amber-100 bg-gradient-to-r from-amber-50 via-white to-orange-50 px-5 py-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                <Inbox size={19} />
              </div>

              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-amber-600">
                  Review Queue
                </p>
                <h2 className="mt-0.5 font-semibold text-slate-900">
                  Pending registration approvals
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  Verify Owner identity proofs and
                  Lawyer professional credentials before
                  activation.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {[
                [
                  'ALL',
                  `All (${pending.length})`,
                ],
                [
                  'OWNER',
                  `Owners (${pendingCounts.owners})`,
                ],
                [
                  'LAWYER',
                  `Lawyers (${pendingCounts.lawyers})`,
                ],
              ].map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() =>
                    setPendingFilter(value)
                  }
                  className={`rounded-xl border px-3 py-2 text-xs font-semibold transition ${
                    pendingFilter === value
                      ? 'border-amber-300 bg-amber-100 text-amber-900'
                      : 'border-amber-200 bg-white text-amber-700 hover:bg-amber-50'
                  }`}
                >
                  {label}
                </button>
              ))}

              <button
                type="button"
                onClick={loadPending}
                disabled={pendingLoading}
                className="inline-flex items-center gap-2 rounded-xl border border-amber-200 bg-white px-3 py-2 text-xs font-semibold text-amber-700 transition hover:bg-amber-50 disabled:opacity-50"
              >
                <RefreshCw
                  size={14}
                  className={
                    pendingLoading
                      ? 'animate-spin'
                      : ''
                  }
                />
                Refresh
              </button>
            </div>
          </div>

          {pendingError && (
            <div className="border-b border-red-100 bg-red-50 px-5 py-3 text-sm text-red-700">
              {pendingError}
            </div>
          )}

          {pendingLoading ? (
            <LoadingState text="Checking for pending registrations…" />
          ) : pending.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <ShieldCheck
                size={34}
                className="mx-auto mb-3 text-emerald-500"
              />
              <p className="font-semibold text-slate-800">
                No pending requests
              </p>
              <p className="mt-1 text-sm text-slate-400">
                New Owner and Lawyer registrations
                will appear here for review.
              </p>
            </div>
          ) : filteredPending.length === 0 ? (
            <div className="px-5 py-12 text-center text-sm text-slate-400">
              No pending registrations in this
              category.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-100">
                <thead className="bg-slate-50/70">
                  <tr className="text-left text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
                    <th className="px-5 py-3">
                      Applicant
                    </th>
                    <th className="px-5 py-3">
                      Role
                    </th>
                    <th className="px-5 py-3">
                      Profile details
                    </th>
                    <th className="px-5 py-3">
                      Verification
                    </th>
                    <th className="px-5 py-3">
                      Submitted
                    </th>
                    <th className="px-5 py-3">
                      Status
                    </th>
                    <th className="px-5 py-3 text-right">
                      Decision
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {filteredPending.map((item) => {
                    const isLawyer =
                      item.role === 'LAWYER';

                    const profile =
                      item.lawyerProfile;

                    const verificationDocument =
                      isLawyer
                        ? profile?.credentialDocument
                        : item.aadhaarDocument;

                    return (
                      <tr
                        key={item.id}
                        className="align-top transition hover:bg-indigo-50/30"
                      >
                        <td className="px-5 py-4">
                          <p className="font-semibold text-slate-800">
                            {item.name}
                          </p>
                          <p className="text-xs text-slate-400">
                            {item.email}
                          </p>
                          <p className="text-xs text-slate-400">
                            @{item.username}
                          </p>
                        </td>

                        <td className="px-5 py-4">
                          <RoleBadge
                            role={item.role}
                          />
                        </td>

                        <td className="px-5 py-4 text-xs leading-5 text-slate-500">
                          {isLawyer ? (
                            <div className="min-w-[210px]">
                              <p>
                                <span className="font-semibold text-slate-700">
                                  Enrollment:
                                </span>{' '}
                                {profile?.enrollmentNumber ||
                                  '—'}
                              </p>

                              <p>
                                <span className="font-semibold text-slate-700">
                                  Bar Council:
                                </span>{' '}
                                {profile?.stateBarCouncil ||
                                  '—'}
                              </p>

                              <p>
                                <span className="font-semibold text-slate-700">
                                  Location:
                                </span>{' '}
                                {[
                                  profile?.city,
                                  profile?.state,
                                ]
                                  .filter(Boolean)
                                  .join(', ') || '—'}
                              </p>

                              <p>
                                <span className="font-semibold text-slate-700">
                                  Phone:
                                </span>{' '}
                                {profile?.phone || '—'}
                              </p>
                            </div>
                          ) : (
                            <span>
                              Owner identity registration
                            </span>
                          )}
                        </td>

                        <td className="px-5 py-4">
                          {verificationDocument?.available ? (
                            <div className="flex min-w-[230px] items-center gap-3">
                              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                                <FileText size={16} />
                              </div>

                              <div className="min-w-0 flex-1">
                                <p className="max-w-[145px] truncate text-sm font-medium text-slate-700">
                                  {verificationDocument.originalName ||
                                    (isLawyer
                                      ? 'Professional credential'
                                      : 'Aadhaar document')}
                                </p>
                                <p className="text-xs text-slate-400">
                                  {formatFileSize(
                                    verificationDocument.fileSize
                                  )}
                                </p>
                              </div>

                              <button
                                type="button"
                                onClick={() =>
                                  handleViewVerification(
                                    item
                                  )
                                }
                                disabled={
                                  documentLoadingId ===
                                  item.id
                                }
                                className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-100 bg-indigo-50 px-2.5 py-2 text-xs font-semibold text-indigo-700 transition hover:bg-indigo-100 disabled:opacity-50"
                              >
                                {documentLoadingId ===
                                item.id ? (
                                  <Loader2
                                    size={14}
                                    className="animate-spin"
                                  />
                                ) : (
                                  <Eye size={14} />
                                )}
                                View
                              </button>
                            </div>
                          ) : (
                            <span className="text-xs font-medium text-red-500">
                              Document missing
                            </span>
                          )}
                        </td>

                        <td className="px-5 py-4 text-sm text-slate-500">
                          {formatDate(
                            item.createdAt
                          )}
                        </td>

                        <td className="px-5 py-4">
                          <StatusBadge
                            status={item.status}
                          />
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                handleReject(item)
                              }
                              disabled={
                                actionLoadingId ===
                                item.id
                              }
                              className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-600 transition hover:bg-rose-50 disabled:opacity-50"
                            >
                              <X size={14} />
                              Reject
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                handleApprove(item)
                              }
                              disabled={
                                actionLoadingId ===
                                item.id
                              }
                              className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-700 px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-indigo-800 disabled:opacity-50"
                            >
                              {actionLoadingId ===
                              item.id ? (
                                <Loader2
                                  size={14}
                                  className="animate-spin"
                                />
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

        {/* ACCOUNT DIRECTORY - REDESIGNED */}
        <section className="overflow-hidden rounded-3xl border border-indigo-100 bg-white shadow-sm">
          <div className="border-b border-indigo-100 bg-gradient-to-r from-indigo-50/80 via-white to-violet-50/80 px-5 py-5 sm:px-6">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700">
                <Users size={19} />
              </div>

              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-indigo-600">
                  Directory
                </p>
                <h2 className="mt-0.5 text-lg font-semibold text-slate-900">
                  Platform account directory
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  Search, review relationships and
                  manage active account access.
                </p>
              </div>
            </div>
          </div>

          {accountsError && (
            <div className="border-b border-red-100 bg-red-50 px-5 py-3 text-sm text-red-700">
              {accountsError}
            </div>
          )}

          <div className="grid gap-3 border-b border-indigo-100 bg-slate-50/60 px-5 py-4 md:grid-cols-[1fr_180px_180px]">
            <label className="relative">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="Search name, email, enrollment or location"
                className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm text-slate-800 outline-none transition focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
              />
            </label>

            <label className="relative">
              <Filter
                size={15}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <select
                value={roleFilter}
                onChange={(event) =>
                  setRoleFilter(
                    event.target.value
                  )
                }
                className="w-full appearance-none rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm text-slate-700 outline-none"
              >
                <option value="ALL">
                  All roles
                </option>
                <option value="OWNER">
                  Owners
                </option>
                <option value="BENEFICIARY">
                  Beneficiaries
                </option>
                <option value="LAWYER">
                  Lawyers
                </option>
              </select>
            </label>

            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(
                  event.target.value
                )
              }
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none"
            >
              <option value="ALL">
                All statuses
              </option>
              <option value="ACTIVE">
                Active
              </option>
              <option value="SUSPENDED">
                Suspended
              </option>
              <option value="PENDING">
                Pending
              </option>
              <option value="REJECTED">
                Rejected
              </option>
            </select>
          </div>

          {accountsLoading ? (
            <LoadingState text="Loading accounts…" />
          ) : filteredAccounts.length === 0 ? (
            <div className="px-5 py-12 text-center text-sm text-slate-400">
              No accounts match the selected filters.
            </div>
          ) : (
            <div className="grid gap-4 p-5 sm:grid-cols-2 xl:grid-cols-3 sm:p-6">
              {filteredAccounts.map((item) => (
                <AccountCard
                  key={item.id}
                  item={item}
                  loading={
                    actionLoadingId === item.id
                  }
                  onStatusChange={
                    handleStatusChange
                  }
                />
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  helper,
  accent,
}) {
  const accents = {
    amber:
      'bg-amber-50 text-amber-700 ring-amber-100',
    indigo:
      'bg-indigo-50 text-indigo-700 ring-indigo-100',
    cyan:
      'bg-cyan-50 text-cyan-700 ring-cyan-100',
    violet:
      'bg-violet-50 text-violet-700 ring-violet-100',
    slate:
      'bg-slate-100 text-slate-700 ring-slate-200',
  };

  return (
    <div className="rounded-2xl border border-white bg-white p-5 shadow-sm ring-1 ring-slate-100 transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
            {label}
          </p>
          <p className="mt-2 text-3xl font-bold text-slate-900">
            {value}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            {helper}
          </p>
        </div>

        <div
          className={`flex h-11 w-11 items-center justify-center rounded-xl ring-1 ${
            accents[accent] || accents.indigo
          }`}
        >
          <Icon size={20} />
        </div>
      </div>
    </div>
  );
}

function LoadingState({ text }) {
  return (
    <div className="flex items-center justify-center gap-2 px-5 py-14 text-sm text-slate-500">
      <Loader2
        size={18}
        className="animate-spin text-indigo-600"
      />
      {text}
    </div>
  );
}

function AccountCard({
  item,
  loading,
  onStatusChange,
}) {
  const relationship =
    item.role === 'OWNER'
      ? `${item.beneficiaryCount || 0} ${
          item.beneficiaryCount === 1
            ? 'beneficiary'
            : 'beneficiaries'
        }`
      : item.role === 'BENEFICIARY'
        ? item.owner
          ? `Owner: ${item.owner.name} (@${item.owner.username})`
          : 'Owner unavailable'
        : `${
            item.lawyerProfile
              ?.enrollmentNumber ||
            'Enrollment unavailable'
          } · ${
            [
              item.lawyerProfile?.city,
              item.lawyerProfile?.state,
            ]
              .filter(Boolean)
              .join(', ') ||
            'Location unavailable'
          }`;

  const initial =
    item.name?.charAt(0)?.toUpperCase() || 'U';

  return (
    <article className="rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-4 transition hover:border-indigo-200 hover:shadow-md">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-100 to-violet-100 text-sm font-bold text-indigo-700">
          {initial}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate font-semibold text-slate-900">
              {item.name}
            </p>
            <RoleBadge role={item.role} />
          </div>

          <p className="mt-1 truncate text-xs text-slate-400">
            @{item.username}
          </p>
          <p className="truncate text-xs text-slate-500">
            {item.email}
          </p>
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-slate-100 bg-white px-3 py-3">
        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
          Relationship / professional info
        </p>
        <p className="mt-1 text-xs leading-5 text-slate-600">
          {relationship}
        </p>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <StatusBadge status={item.status} />

        {item.status === 'ACTIVE' ? (
          <button
            type="button"
            onClick={() =>
              onStatusChange(
                item,
                'SUSPENDED'
              )
            }
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-600 transition hover:bg-rose-50 disabled:opacity-50"
          >
            {loading ? (
              <Loader2
                size={14}
                className="animate-spin"
              />
            ) : (
              <UserRoundX size={14} />
            )}
            Suspend
          </button>
        ) : item.status === 'SUSPENDED' ? (
          <button
            type="button"
            onClick={() =>
              onStatusChange(item, 'ACTIVE')
            }
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-700 px-3 py-2 text-xs font-semibold text-white transition hover:bg-indigo-800 disabled:opacity-50"
          >
            {loading ? (
              <Loader2
                size={14}
                className="animate-spin"
              />
            ) : (
              <UserRoundCheck size={14} />
            )}
            Activate
          </button>
        ) : (
          <span className="text-xs text-slate-400">
            Approval workflow
          </span>
        )}
      </div>
    </article>
  );
}