import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  Archive,
  Briefcase,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Eye,
  FileSearch2,
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
import { useNavigate } from 'react-router-dom';

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
    USER: {
      label: 'User',
      style:
        'bg-indigo-50 text-indigo-700 ring-indigo-100',
    },
    LAWYER: {
      label: 'Lawyer',
      style:
        'bg-violet-50 text-violet-700 ring-violet-100',
    },
  };

  const value =
    config[role] || config.USER;

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
  const navigate = useNavigate();

  const [pending, setPending] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [pendingLoading, setPendingLoading] =
    useState(true);
  const [accountsLoading, setAccountsLoading] =
    useState(true);
  const [pendingError, setPendingError] = useState('');
  const [pendingSuccess, setPendingSuccess] = useState('');
  const [accountsError, setAccountsError] = useState('');
  const [accountsSuccess, setAccountsSuccess] = useState('');
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [documentLoadingId, setDocumentLoadingId] = useState(null);

  const [pendingFilter, setPendingFilter] = useState('ALL');
  const [pendingSearch, setPendingSearch] = useState('');
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

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
      users: pending.filter(
        (item) => item.role === 'USER'
      ).length,
      lawyers: pending.filter(
        (item) => item.role === 'LAWYER'
      ).length,
    }),
    [pending]
  );

  const filteredPending = useMemo(() => {
    const q = pendingSearch.trim().toLowerCase();
    return pending.filter((item) => {
      const matchesRole =
        pendingFilter === 'ALL' || item.role === pendingFilter;
      const matchesQuery =
        !q ||
        [item.name, item.email, item.username].some((val) =>
          String(val || '').toLowerCase().includes(q)
        );
      return matchesRole && matchesQuery;
    });
  }, [pending, pendingFilter, pendingSearch]);

  const stats = useMemo(
    () => ({
      users: accounts.filter(
        (item) => item.role === 'USER'
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
        : 'user';

    const confirmed = window.confirm(
      `Approve this ${label} registration for ${item.name}?`
    );

    if (!confirmed) return;

    setActionLoadingId(item.id);
    setPendingError('');
    setPendingSuccess('');

    try {
      await approveUser(item.id);
      setPendingSuccess(`Registration for ${item.name} (${item.role}) approved successfully. Account is now active.`);
      await refreshAll();
    } catch (err) {
      setPendingError(err.message || 'Failed to approve registration.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleReject = async (item) => {
    const label =
      item.role === 'LAWYER'
        ? 'lawyer'
        : 'user';

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
    setPendingSuccess('');

    try {
      await rejectUser(item.id, reason);
      setPendingSuccess(`Registration for ${item.name} has been rejected.`);
      await refreshAll();
    } catch (err) {
      setPendingError(err.message || 'Failed to reject registration.');
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
            const a = document.createElement('a');
            a.href = result.url;
            a.target = '_blank';
            a.rel = 'noopener noreferrer';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
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
          const a = document.createElement('a');
          a.href = url;
          a.target = '_blank';
          a.rel = 'noopener noreferrer';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
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
    setAccountsSuccess('');

    try {
      await updateUserStatus(
        item.id,
        nextStatus
      );
      setAccountsSuccess(`${item.name}'s account status updated to ${nextStatus}.`);
      await loadAccounts();
    } catch (err) {
      setAccountsError(err.message || 'Unable to update account status.');
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
            helper={`${pendingCounts.users} users · ${pendingCounts.lawyers} lawyers`}
            accent="amber"
          />
          <StatCard
            icon={UserRoundCheck}
            label="Users"
            value={stats.users}
            helper="Unified normal accounts"
            accent="indigo"
          />
          <StatCard
            icon={CheckCircle2}
            label="Active accounts"
            value={stats.active}
            helper="Fully verified & enabled"
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

        {/* ADMIN MODULES QUICK-ACCESS HUB */}
        <section className="mb-7">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <button
              type="button"
              onClick={() => navigate('/admin/legacy-claims')}
              className="group flex flex-col justify-between rounded-2xl border border-amber-100 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-amber-300 hover:shadow-md"
            >
              <div className="flex items-center justify-between">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 text-amber-700 transition group-hover:bg-amber-600 group-hover:text-white">
                  <FileText size={20} />
                </div>
                <ChevronRight size={17} className="text-slate-400 transition group-hover:translate-x-1 group-hover:text-amber-600" />
              </div>
              <div className="mt-4">
                <h3 className="font-bold text-slate-900 group-hover:text-amber-600">Legacy Claims Review</h3>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Review claim submissions, examine proof of demise, and route to assigned lawyers.
                </p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => navigate('/admin/legal-requests')}
              className="group flex flex-col justify-between rounded-2xl border border-violet-100 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-violet-300 hover:shadow-md"
            >
              <div className="flex items-center justify-between">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-50 text-violet-700 transition group-hover:bg-violet-600 group-hover:text-white">
                  <Briefcase size={20} />
                </div>
                <ChevronRight size={17} className="text-slate-400 transition group-hover:translate-x-1 group-hover:text-violet-600" />
              </div>
              <div className="mt-4">
                <h3 className="font-bold text-slate-900 group-hover:text-violet-600">Legal Consultations</h3>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Monitor lifetime consultation requests submitted by users to registered lawyers.
                </p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => navigate('/admin/audit-logs')}
              className="group flex flex-col justify-between rounded-2xl border border-emerald-100 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-md"
            >
              <div className="flex items-center justify-between">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 transition group-hover:bg-emerald-600 group-hover:text-white">
                  <FileSearch2 size={20} />
                </div>
                <ChevronRight size={17} className="text-slate-400 transition group-hover:translate-x-1 group-hover:text-emerald-600" />
              </div>
              <div className="mt-4">
                <h3 className="font-bold text-slate-900 group-hover:text-emerald-600">Audit & Security Logs</h3>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Complete forensic trail of logins, document access, reviews, and allocations.
                </p>
              </div>
            </button>
          </div>
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
                  Verify User identity proofs and
                  Lawyer professional credentials before
                  activation.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <label className="relative">
                <Search
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  value={pendingSearch}
                  onChange={(e) => setPendingSearch(e.target.value)}
                  placeholder="Search pending applicants…"
                  className="h-9 w-44 rounded-xl border border-amber-200 bg-white pl-8 pr-3 text-xs text-slate-800 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-100 sm:w-56"
                />
              </label>

              {[
                [
                  'ALL',
                  `All (${pending.length})`,
                ],
                [
                  'USER',
                  `Users (${pendingCounts.users})`,
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
                  className={`h-9 rounded-xl border px-3 text-xs font-semibold transition ${
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
                className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-amber-200 bg-white px-3 text-xs font-semibold text-amber-700 transition hover:bg-amber-50 disabled:opacity-50"
              >
                <RefreshCw
                  size={13}
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

          {pendingSuccess && (
            <div className="flex items-center justify-between border-b border-emerald-100 bg-emerald-50 px-5 py-3 text-sm font-medium text-emerald-800">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                <span>{pendingSuccess}</span>
              </div>
              <button
                type="button"
                onClick={() => setPendingSuccess('')}
                className="text-emerald-500 hover:text-emerald-700"
              >
                <X size={15} />
              </button>
            </div>
          )}

          {pendingError && (
            <div className="flex items-center justify-between border-b border-red-100 bg-red-50 px-5 py-3 text-sm text-red-700">
              <div className="flex items-center gap-2">
                <X size={16} className="text-red-500 shrink-0" />
                <span>{pendingError}</span>
              </div>
              <button
                type="button"
                onClick={() => setPendingError('')}
                className="text-red-400 hover:text-red-600"
              >
                <X size={15} />
              </button>
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
                New User and Lawyer registrations
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
                          {item.role === 'USER' && (
                            <p
                              className={
                                'mt-1 text-[11px] font-semibold ' +
                                (item.emailVerified
                                  ? 'text-emerald-600'
                                  : 'text-amber-600')
                              }
                            >
                              {item.emailVerified
                                ? 'Email verified'
                                : 'Email verification pending'}
                            </p>
                          )}
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
                              User identity registration
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
                                actionLoadingId === item.id
                              }
                              className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-700 px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-indigo-800 disabled:opacity-50"
                              title="Approve registration"
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

          {accountsSuccess && (
            <div className="flex items-center justify-between border-b border-emerald-100 bg-emerald-50 px-5 py-3 text-sm font-medium text-emerald-800">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                <span>{accountsSuccess}</span>
              </div>
              <button
                type="button"
                onClick={() => setAccountsSuccess('')}
                className="text-emerald-500 hover:text-emerald-700"
              >
                <X size={15} />
              </button>
            </div>
          )}

          {accountsError && (
            <div className="flex items-center justify-between border-b border-red-100 bg-red-50 px-5 py-3 text-sm text-red-700">
              <div className="flex items-center gap-2">
                <X size={16} className="text-red-500 shrink-0" />
                <span>{accountsError}</span>
              </div>
              <button
                type="button"
                onClick={() => setAccountsError('')}
                className="text-red-400 hover:text-red-600"
              >
                <X size={15} />
              </button>
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
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <select
                value={roleFilter}
                onChange={(event) =>
                  setRoleFilter(
                    event.target.value
                  )
                }
                className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm text-slate-700 outline-none transition focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
              >
                <option value="ALL">
                  All roles
                </option>
                <option value="USER">
                  Users
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
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
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
    item.role === 'LAWYER'
      ? `${item.lawyerProfile?.enrollmentNumber || 'Enrollment unavailable'} · ${[
          item.lawyerProfile?.city,
          item.lawyerProfile?.state,
        ].filter(Boolean).join(', ') || 'Location unavailable'}`
      : 'Unified user account — asset ownership and legacy access are resource relationships.';

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