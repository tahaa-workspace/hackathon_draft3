import {
  AtSign,
  BadgeCheck,
  CalendarDays,
  FileCheck2,
  KeyRound,
  LockKeyhole,
  Mail,
  Shield,
  User,
  UserCog,
  Users,
} from 'lucide-react';

import { useNavigate } from 'react-router-dom';

import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';

import ProfileHero from '../components/profile/ProfileHero';
import ProfileInfoCard from '../components/profile/ProfileInfoCard';

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

  ADMIN: {
    label: 'Administrator',
    description: 'Platform administrator',
    Icon: Shield,
  },
};

export default function Profile() {
  const { user } = useAuth();
  const navigate = useNavigate();

  if (!user) return null;

  const role = ROLE_META[user.role] || ROLE_META.BENEFICIARY;
  const isAdmin = user.role === 'ADMIN';

  return (
    <div className="profile-page">
      <Navbar />

      <main className="profile-container">
        <ProfileHero
          user={user}
          role={role}
        />

        <div className="profile-layout">
          <section className="profile-main-column">
            <ProfileInfoCard
              eyebrow="Account Details"
              title="Personal information"
              description="Basic information associated with your Digital Legacy account."
            >
              <div className="profile-information-grid">
                <ProfileField
                  icon={User}
                  label="Full name"
                  value={user.name}
                />

                <ProfileField
                  icon={AtSign}
                  label="Username"
                  value={user.username}
                />

                <ProfileField
                  icon={Mail}
                  label="Email address"
                  value={user.email}
                />

                <ProfileField
                  icon={BadgeCheck}
                  label="Account role"
                  value={role.label}
                />
              </div>
            </ProfileInfoCard>

            {isAdmin && (
              <ProfileInfoCard
                eyebrow="Administrative Access"
                title="Platform management privileges"
                description="This account is responsible for user governance and identity-review operations."
              >
                <div className="grid gap-3 md:grid-cols-3">
                  <AdminPrivilege
                    icon={UserCog}
                    title="Account control"
                    description="Search, activate, and suspend Owner and Beneficiary accounts."
                  />

                  <AdminPrivilege
                    icon={FileCheck2}
                    title="Identity review"
                    description="Review Owner Aadhaar submissions before approving registrations."
                  />

                  <AdminPrivilege
                    icon={LockKeyhole}
                    title="Privacy boundary"
                    description="Administrative access does not grant access to private Owner vault documents."
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
                  <h3 className="text-sm font-semibold text-ink-900">
                    Password
                  </h3>

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
          </section>

          <aside className="profile-side-column">
            <div className="profile-status-card">
              <div className="profile-status-heading">
                <div className="profile-status-icon">
                  <Shield size={20} />
                </div>

                <div>
                  <p className="text-sm font-semibold text-ink-900">
                    Account Status
                  </p>

                  <p className="text-xs text-ink-400">
                    Current access information
                  </p>
                </div>
              </div>

              <div className="profile-status-divider" />

              <StatusRow
                label="Role"
                value={role.label}
              />

              <StatusRow
                label="Status"
                value={user.status || 'ACTIVE'}
                success={!user.status || user.status === 'ACTIVE'}
              />

              <StatusRow
                label="Access"
                value={isAdmin ? 'Administrative' : 'Protected'}
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
                  {isAdmin ? 'Administrative security boundary' : 'Protected account'}
                </p>

                <p className="mt-1 text-xs leading-5 text-brand-700">
                  {isAdmin
                    ? 'This role can manage accounts and registration verification, while private Owner vault documents remain role-protected.'
                    : 'Your available actions are determined by your authenticated role and assigned permissions.'}
                </p>
              </div>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}

function AdminPrivilege({ icon: Icon, title, description }) {
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

function ProfileField({
  icon: Icon,
  label,
  value,
}) {
  return (
    <div className="profile-field">
      <div className="profile-field-icon">
        <Icon size={17} />
      </div>

      <div className="min-w-0">
        <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-ink-400">
          {label}
        </p>

        <p className="mt-1 truncate text-sm font-semibold text-ink-800">
          {value || 'Not available'}
        </p>
      </div>
    </div>
  );
}

function StatusRow({
  label,
  value,
  success = false,
}) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-xs text-ink-500">
        {label}
      </span>

      <span
        className={
          success
            ? 'profile-status-success'
            : 'profile-status-value'
        }
      >
        {value}
      </span>
    </div>
  );
}
