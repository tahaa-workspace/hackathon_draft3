import {
  ArrowLeft,
  BadgeCheck,
} from 'lucide-react';

import { useNavigate } from 'react-router-dom';

import { homeForRole } from '../ProtectedRoute';

export default function ProfileHero({
  user,
  role,
}) {
  const navigate = useNavigate();

  const RoleIcon = role.Icon;

  const initial =
    user.name?.charAt(0)?.toUpperCase() ||
    user.username?.charAt(0)?.toUpperCase() ||
    'U';

  return (
    <section className="profile-hero">

      <div className="profile-hero-grid" />
      <div className="profile-hero-glow" />


      {/* <button
        type="button"
        onClick={() =>
          navigate(homeForRole(user.role))
        }
        className="profile-back-button"
      >
        <ArrowLeft size={15} />
        Dashboard
      </button> */}


      <div className="relative z-10 mt-8 flex flex-col gap-6 sm:flex-row sm:items-center">

        <div className="profile-avatar">
          {initial}
        </div>


        <div className="min-w-0 flex-1">

          <div className="flex flex-wrap items-center gap-2">

            <h1 className="truncate text-2xl font-bold tracking-tight text-white sm:text-3xl">
              {user.name}
            </h1>

            <BadgeCheck
              size={19}
              className="text-cyan-300"
            />

          </div>


          <p className="mt-1 text-sm text-brand-100/80">
            @{user.username}
          </p>


          <div className="mt-4 flex flex-wrap gap-2">

            <div className="profile-role-badge">

              <RoleIcon size={13} />

              {role.label}

            </div>


            <div className="profile-active-badge">

              <span className="profile-active-dot" />

              {user.status || 'ACTIVE'}

            </div>

          </div>

        </div>

      </div>

    </section>
  );
}