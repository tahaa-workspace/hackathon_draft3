import type { ReactNode } from 'react';
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
} from 'react-router-dom';

import { AuthProvider, useAuth } from './context/AuthContext';

import ProtectedRoute, {
  homeForRole,
} from './components/ProtectedRoute';

import LandingPage from './pages/LandingPage';
import Login from './pages/Login';
import Register from './pages/Register';
import PendingApproval from './pages/PendingApproval';
import ChangePassword from './pages/ChangePassword';
import AdminDashboard from './pages/AdminDashboard';
import OwnerDashboard from './pages/OwnerDashboard';
import BeneficiaryDashboard from './pages/BeneficiaryDashboard';
import Profile from './pages/Profile';

/*
 * TypeScript user definition.
 *
 * AuthContext.jsx is JavaScript, so App.tsx needs this type
 * information to understand user.role and
 * user.mustChangePassword.
 */
type UserRole = 'ADMIN' | 'OWNER' | 'BENEFICIARY';

type AuthUser = {
  id: string;
  name: string;
  username: string;
  email: string;
  role: UserRole;
  status: string;
  mustChangePassword: boolean;
  createdAt?: string;
};


type PublicOnlyRouteProps = {
  children: ReactNode;
};


/*
 * Used for unknown URLs.
 *
 * Example:
 * /something-that-does-not-exist
 *
 * Logged-in users are sent to their dashboard.
 * Logged-out users return to the landing page.
 */
function SessionAwareRedirect() {
  const auth = useAuth() as any;
  const hydrated = auth.hydrated;
  const isAuthenticated = auth.isAuthenticated;

  /*
   * AuthContext is currently a .jsx file,
   * therefore TypeScript needs us to specify
   * the user structure here.
   */
  const user = auth.user as AuthUser | null;

  if (!hydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ink-50">
        <div className="text-sm text-ink-500">
          Loading…
        </div>
      </div>
    );
  }

  /*
   * User is not logged in.
   *
   * Send them to the new landing page,
   * NOT directly to login.
   */
  if (!isAuthenticated || !user) {
    return (
      <Navigate
        to="/"
        replace
      />
    );
  }

  /*
   * Beneficiary using temporary password.
   */
  if (user.mustChangePassword) {
    return (
      <Navigate
        to="/change-password?force=1"
        replace
      />
    );
  }

  /*
   * Send authenticated user to their
   * role-specific dashboard.
   */
  return (
    <Navigate
      to={homeForRole(user.role)}
      replace
    />
  );
}


/*
 * Prevent logged-in users from reopening
 * login/register pages.
 */
function PublicOnlyRoute({
  children,
}: PublicOnlyRouteProps) {
const auth = useAuth() as any;
  const hydrated = auth.hydrated;
  const isAuthenticated = auth.isAuthenticated;

  const user = auth.user as AuthUser | null;

  if (!hydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ink-50">
        <div className="text-sm text-ink-500">
          Loading…
        </div>
      </div>
    );
  }

  if (isAuthenticated && user) {

    /*
     * Beneficiary must replace temporary
     * password first.
     */
    if (user.mustChangePassword) {
      return (
        <Navigate
          to="/change-password?force=1"
          replace
        />
      );
    }

    /*
     * Already logged in.
     * Do not show login/register again.
     */
    return (
      <Navigate
        to={homeForRole(user.role)}
        replace
      />
    );
  }

  return <>{children}</>;
}


export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>

          {/* ========================= */}
          {/* LANDING PAGE              */}
          {/* ========================= */}

          <Route
            path="/"
            element={<LandingPage />}
          />


          {/* ========================= */}
          {/* PUBLIC AUTH ROUTES        */}
          {/* ========================= */}

          <Route
            path="/login"
            element={
              <PublicOnlyRoute>
                <Login />
              </PublicOnlyRoute>
            }
          />

          <Route
            path="/register"
            element={
              <PublicOnlyRoute>
                <Register />
              </PublicOnlyRoute>
            }
          />

          <Route
            path="/pending-approval"
            element={<PendingApproval />}
          />


          {/* ========================= */}
          {/* PASSWORD CHANGE           */}
          {/* ========================= */}

          <Route
  path="/profile"
  element={
    <ProtectedRoute
      allowedRoles={[
        'OWNER',
        'BENEFICIARY',
      ]}
    >
      <Profile />
    </ProtectedRoute>
  }
/>


          {/* ========================= */}
          {/* ADMIN                     */}
          {/* ========================= */}

          <Route
            path="/admin/*"
            element={
              <ProtectedRoute
                allowedRoles={['ADMIN']}
              >
                <AdminDashboard />
              </ProtectedRoute>
            }
          />


          {/* ========================= */}
          {/* OWNER                     */}
          {/* ========================= */}

          <Route
            path="/owner"
            element={
              <ProtectedRoute
                allowedRoles={['OWNER']}
              >
                <OwnerDashboard />
              </ProtectedRoute>
            }
          />


          {/* ========================= */}
          {/* BENEFICIARY               */}
          {/* ========================= */}

          <Route
            path="/beneficiary"
            element={
              <ProtectedRoute
                allowedRoles={['BENEFICIARY']}
              >
                <BeneficiaryDashboard />
              </ProtectedRoute>
            }
          />


          {/* ========================= */}
          {/* UNKNOWN URL               */}
          {/* ========================= */}

          <Route
            path="*"
            element={<SessionAwareRedirect />}
          />

        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}