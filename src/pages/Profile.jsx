import { useEffect, useState } from 'react';
import {
  AlertTriangle,
  AtSign,
  BadgeCheck,
  CheckCircle2,
  Eye,
  EyeOff,
  FileCheck2,
  Gavel,
  KeyRound,
  Loader2,
  LockKeyhole,
  Mail,
  Phone,
  Shield,
  Trash2,
  User,
  UserCog,
  Users,
  X,
} from 'lucide-react';

import { useNavigate } from 'react-router-dom';

import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import {
  deleteCurrentAccount,
  getCurrentProfile,
} from '../services/authService';

import ProfileHero from '../components/profile/ProfileHero';
import ProfileInfoCard from '../components/profile/ProfileInfoCard';
import ProfileContactEditor from '../components/profile/ProfileContactEditor';

import '../styles/profile.css';

const ROLE_META = {
  OWNER: {
    label: 'Owner',
    description: 'Vault owner account',
    Icon: User,
  },

  BENEFICIARY: {
    label: 'Beneficiary',
    description: 'Trusted beneficiary account',
    Icon: Users,
  },

  LAWYER: {
    label: 'Lawyer',
    description: 'Approved legal advisor account',
    Icon: Gavel,
  },

  ADMIN: {
    label: 'Administrator',
    description: 'Platform administrator',
    Icon: Shield,
  },
};

const DEFAULT_ROLE_META = {
  label: 'User',
  description: 'Platform account',
  Icon: User,
};

export default function Profile() {
  const { user, updateCurrentUser, logout } = useAuth();
  const navigate = useNavigate();

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [showDeletePassword, setShowDeletePassword] = useState(false);

  useEffect(() => {
    let active = true;

    getCurrentProfile()
      .then((freshUser) => {
        if (active && freshUser) updateCurrentUser(freshUser);
      })
      .catch((error) => {
        console.error('Unable to refresh profile details:', error);
      });

    return () => {
      active = false;
    };
  }, [updateCurrentUser]);

  useEffect(() => {
    if (!deleteOpen) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleEscape = (event) => {
      if (event.key === 'Escape' && !deleteLoading) {
        setDeleteOpen(false);
      }
    };

    window.addEventListener('keydown', handleEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleEscape);
    };
  }, [deleteOpen, deleteLoading]);

  if (!user) return null;

  const role = ROLE_META[user.role] || DEFAULT_ROLE_META;
  const isAdmin = user.role === 'ADMIN';
  const isLawyer = user.role === 'LAWYER';

  const closeDeleteModal = () => {
    if (deleteLoading) return;

    setDeleteOpen(false);
    setDeletePassword('');
    setDeleteConfirmation('');
    setDeleteError('');
    setShowDeletePassword(false);
  };

  const handleDeleteAccount = async (event) => {
    event.preventDefault();
    setDeleteError('');

    if (deleteConfirmation !== 'DELETE') {
      setDeleteError('Type DELETE exactly to continue.');
      return;
    }

    if (!deletePassword) {
      setDeleteError('Enter your current password.');
      return;
    }

    setDeleteLoading(true);

    try {
      await deleteCurrentAccount({
        password: deletePassword,
        confirmation: deleteConfirmation,
      });

      logout();
      navigate('/', { replace: true });
    } catch (error) {
      setDeleteError(
        error.message || 'Unable to delete your account.'
      );
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="profile-page">
      <Navbar />

      <main className="profile-container">
        <ProfileHero user={user} role={role} />

        <div className="profile-layout">
          <section className="profile-main-column">
            <ProfileInfoCard
              eyebrow="Account Details"
              title="Personal information"
              description="Basic information associated with your Digital Legacy account."
            >
              <div className="profile-information-grid">
                <ProfileField icon={User} label="Full name" value={user.name} />
                <ProfileField icon={AtSign} label="Username" value={user.username} />
                <ProfileField
                  icon={Mail}
                  label="Email address"
                  value={user.email}
                  verified={Boolean(user.emailVerified)}
                />
                <ProfileField
                  icon={Phone}
                  label="Mobile number"
                  value={user.phone}
                  verified={Boolean(user.phoneVerified)}
                />
                <ProfileField icon={BadgeCheck} label="Account role" value={role.label} />
              </div>
            </ProfileInfoCard>

            <ProfileInfoCard
              eyebrow="Verified Contact"
              title="Update email or mobile"
              description="A new email address or mobile number is saved only after OTP verification succeeds."
            >
              <ProfileContactEditor />
            </ProfileInfoCard>

            {isAdmin && (
              <ProfileInfoCard
                eyebrow="Administrative Access"
                title="Platform management privileges"
                description="This account is responsible for user governance and identity-review operations."
              >
                <div className="grid gap-3 md:grid-cols-3">
                  <Privilege
                    icon={UserCog}
                    title="Account control"
                    description="Search, activate, and suspend Owner and Beneficiary accounts."
                  />
                  <Privilege
                    icon={FileCheck2}
                    title="Identity review"
                    description="Review Owner Aadhaar submissions before approving registrations."
                  />
                  <Privilege
                    icon={LockKeyhole}
                    title="Privacy boundary"
                    description="Administrative access does not grant access to private Owner vault documents."
                  />
                </div>
              </ProfileInfoCard>
            )}

            {isLawyer && (
              <ProfileInfoCard
                eyebrow="Legal Advisor Access"
                title="Legacy claim review privileges"
                description="This approved Lawyer account can review Legacy Access Claims assigned by the platform administrator."
              >
                <div className="grid gap-3 md:grid-cols-3">
                  <Privilege
                    icon={Gavel}
                    title="Assigned claim review"
                    description="Review Legacy Access Claims specifically assigned to this Lawyer account."
                  />
                  <Privilege
                    icon={FileCheck2}
                    title="Evidence review"
                    description="Review claim documents and additional information submitted through the controlled claim workflow."
                  />
                  <Privilege
                    icon={LockKeyhole}
                    title="Scoped access"
                    description="Legal review access is limited to assigned claims and does not provide unrestricted access to Owner vault records."
                  />
                </div>
              </ProfileInfoCard>
            )}

            <ProfileInfoCard
              eyebrow="Account Security"
              title="Security settings"
              description="Manage credentials and understand the access level assigned to your account."
            >
              <div className="profile-security-card">
                <div className="profile-security-icon">
                  <KeyRound size={21} />
                </div>

                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-semibold text-ink-900">Password</h3>
                  <p className="mt-1 text-xs leading-5 text-ink-500">
                    Keep your account password private and update it when required.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => navigate('/change-password')}
                  className="profile-secondary-button"
                >
                  Change password
                </button>
              </div>
            </ProfileInfoCard>

            {!isAdmin && (
              <ProfileInfoCard
                eyebrow="Danger Zone"
                title="Delete account"
                description="Permanently remove this account and associated stored data."
              >
                <div className="flex flex-col gap-4 rounded-2xl border border-red-200 bg-red-50/60 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-red-600 shadow-sm ring-1 ring-red-100">
                      <Trash2 size={18} />
                    </div>

                    <div>
                      <h3 className="text-sm font-semibold text-red-900">
                        Permanently delete account
                      </h3>
                      <p className="mt-1 max-w-xl text-xs leading-5 text-red-700">
                        This cannot be undone. Stored identity files and account-owned data are removed from Cloudinary and MongoDB Atlas.
                        {user.role === 'OWNER'
                          ? ' Beneficiary accounts created by this Owner are deleted as part of the cascade.'
                          : ''}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setDeleteOpen(true)}
                    className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700"
                  >
                    <Trash2 size={15} />
                    Delete account
                  </button>
                </div>
              </ProfileInfoCard>
            )}
          </section>

          <aside className="profile-side-column">
            <div className="profile-status-card">
              <div className="profile-status-heading">
                <div className="profile-status-icon">
                  <Shield size={20} />
                </div>

                <div>
                  <p className="text-sm font-semibold text-ink-900">Account Status</p>
                  <p className="text-xs text-ink-400">Current access information</p>
                </div>
              </div>

              <div className="profile-status-divider" />

              <StatusRow label="Role" value={role.label} />
              <StatusRow
                label="Status"
                value={user.status || 'ACTIVE'}
                success={!user.status || user.status === 'ACTIVE'}
              />
              <StatusRow
                label="Email"
                value={user.emailVerified ? 'Verified' : 'Not verified'}
                success={Boolean(user.emailVerified)}
              />
              <StatusRow
                label="Mobile"
                value={user.phoneVerified ? 'Verified' : 'Not verified'}
                success={Boolean(user.phoneVerified)}
              />
              <StatusRow
                label="Access"
                value={
                  isAdmin
                    ? 'Administrative'
                    : isLawyer
                      ? 'Legal Review'
                      : 'Protected'
                }
                success
              />

              {user.createdAt && (
                <StatusRow
                  label="Created"
                  value={new Date(user.createdAt).toLocaleDateString()}
                />
              )}
            </div>

            <div className="profile-note-card">
              <Shield size={18} />

              <div>
                <p className="text-xs font-semibold text-brand-900">
                  {isAdmin
                    ? 'Administrative security boundary'
                    : isLawyer
                      ? 'Legal review security boundary'
                      : 'Protected account'}
                </p>

                <p className="mt-1 text-xs leading-5 text-brand-700">
                  {isAdmin
                    ? 'This role can manage accounts and registration verification, while private Owner vault documents remain role-protected.'
                    : isLawyer
                      ? 'This role can review only assigned Legacy Access Claims. Private Owner vault documents remain protected outside the authorized claim workflow.'
                      : 'Your available actions are determined by your authenticated role and assigned permissions.'}
                </p>
              </div>
            </div>
          </aside>
        </div>
      </main>

      {deleteOpen && (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !deleteLoading) {
              closeDeleteModal();
            }
          }}
        >
          <div
            className="w-full max-w-lg overflow-hidden rounded-3xl border border-red-100 bg-white shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-account-title"
          >
            <div className="flex items-start justify-between gap-4 border-b border-red-100 bg-red-50 px-5 py-5 sm:px-6">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-600 text-white">
                  <AlertTriangle size={20} />
                </div>

                <div>
                  <h2 id="delete-account-title" className="font-semibold text-red-950">
                    Permanently delete account?
                  </h2>
                  <p className="mt-1 text-xs leading-5 text-red-700">
                    This action cannot be reversed.
                  </p>
                </div>
              </div>

              <button
                type="button"
                disabled={deleteLoading}
                onClick={closeDeleteModal}
                className="flex h-9 w-9 items-center justify-center rounded-xl text-red-400 transition hover:bg-white hover:text-red-700 disabled:opacity-50"
                aria-label="Close delete account dialog"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleDeleteAccount} className="space-y-4 p-5 sm:p-6">
              <div className="rounded-2xl border border-red-100 bg-red-50/60 p-4 text-xs leading-5 text-red-800">
                <strong>What will be deleted:</strong>

                <p className="mt-2">
                  Your account metadata, identity document, authentication/verification records, and data owned by this account.
                </p>

                {user.role === 'OWNER' && (
                  <p className="mt-2">
                    Owner deletion also removes all vault documents, their Cloudinary placeholders, related Legacy Claim evidence, and Beneficiary accounts created by this Owner.
                  </p>
                )}

                {user.role === 'BENEFICIARY' && (
                  <p className="mt-2">
                    Beneficiary deletion removes your identity file, claim evidence, relationship metadata, and your access references from Owner documents. The Owner's documents themselves are not deleted.
                  </p>
                )}

                {user.role === 'LAWYER' && (
                  <p className="mt-2">
                    Lawyer deletion removes the professional credential. Active assigned claims are returned to Lawyer selection instead of deleting the Beneficiary's claim.
                  </p>
                )}
              </div>

              {deleteError && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {deleteError}
                </div>
              )}

              <div>
                <label className="field-label" htmlFor="delete-password">
                  Current password
                </label>

                <div className="relative">
                  <input
                    id="delete-password"
                    type={showDeletePassword ? 'text' : 'password'}
                    className="field-input !pr-11"
                    value={deletePassword}
                    onChange={(event) => setDeletePassword(event.target.value)}
                    autoComplete="current-password"
                    required
                  />

                  <button
                    type="button"
                    onClick={() => setShowDeletePassword((current) => !current)}
                    className="absolute right-3 top-1/2 flex -translate-y-1/2 items-center justify-center text-ink-400 hover:text-red-600"
                    aria-label={showDeletePassword ? 'Hide password' : 'Show password'}
                  >
                    {showDeletePassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="field-label" htmlFor="delete-confirmation">
                  Type DELETE to confirm
                </label>

                <input
                  id="delete-confirmation"
                  className="field-input"
                  value={deleteConfirmation}
                  onChange={(event) => setDeleteConfirmation(event.target.value)}
                  placeholder="DELETE"
                  autoComplete="off"
                  required
                />
              </div>

              <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  disabled={deleteLoading}
                  onClick={closeDeleteModal}
                  className="btn-secondary"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={
                    deleteLoading ||
                    !deletePassword ||
                    deleteConfirmation !== 'DELETE'
                  }
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {deleteLoading ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Trash2 size={16} />
                  )}

                  {deleteLoading ? 'Deleting permanently...' : 'Delete permanently'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function Privilege({ icon: Icon, title, description }) {
  return (
    <div className="rounded-xl border border-ink-100 bg-ink-50/60 p-4">
      <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-white text-brand-600 shadow-sm">
        <Icon size={17} />
      </div>

      <h3 className="text-sm font-semibold text-ink-900">{title}</h3>
      <p className="mt-1 text-xs leading-5 text-ink-500">{description}</p>
    </div>
  );
}

function ProfileField({ icon: Icon, label, value, verified = false }) {
  return (
    <div className="profile-field">
      <div className="profile-field-icon">
        <Icon size={17} />
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-ink-400">
          {label}
        </p>

        <div className="mt-1 flex min-w-0 items-center gap-2">
          <p className="truncate text-sm font-semibold text-ink-800">
            {value || 'Not available'}
          </p>

          {verified && (
            <span
              className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700"
              title={`${label} verified`}
            >
              <CheckCircle2 size={12} />
              Verified
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function StatusRow({ label, value, success = false }) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-xs text-ink-500">{label}</span>

      <span className={success ? 'profile-status-success' : 'profile-status-value'}>
        {value}
      </span>
    </div>
  );
}
