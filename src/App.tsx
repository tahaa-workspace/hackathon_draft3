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

function SessionAwareRedirect() {
  const auth = useAuth() as any;
  const hydrated = auth.hydrated;
  const isAuthenticated = auth.isAuthenticated;
  const user = auth.user as AuthUser | null;

  if (!hydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ink-50">
        <div className="text-sm text-ink-500">Loading…</div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/" replace />;
  }

  if (user.mustChangePassword) {
    return <Navigate to="/change-password?force=1" replace />;
  }

  return <Navigate to={homeForRole(user.role)} replace />;
}

function PublicOnlyRoute({ children }: PublicOnlyRouteProps) {
  const auth = useAuth() as any;
  const hydrated = auth.hydrated;
  const isAuthenticated = auth.isAuthenticated;
  const user = auth.user as AuthUser | null;

  if (!hydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ink-50">
        <div className="text-sm text-ink-500">Loading…</div>
      </div>
    );
  }

  if (isAuthenticated && user) {
    if (user.mustChangePassword) {
      return <Navigate to="/change-password?force=1" replace />;
    }

    return <Navigate to={homeForRole(user.role)} replace />;
  }

  return <>{children}</>;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />

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

          <Route
            path="/change-password"
            element={
              <ProtectedRoute
                allowedRoles={['ADMIN', 'OWNER', 'BENEFICIARY']}
              >
                <ChangePassword />
              </ProtectedRoute>
            }
          />

          <Route
            path="/profile"
            element={
              <ProtectedRoute
                allowedRoles={['ADMIN', 'OWNER', 'BENEFICIARY']}
              >
                <Profile />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/*"
            element={
              <ProtectedRoute allowedRoles={['ADMIN']}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/owner"
            element={
              <ProtectedRoute allowedRoles={['OWNER']}>
                <OwnerDashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/beneficiary"
            element={
              <ProtectedRoute allowedRoles={['BENEFICIARY']}>
                <BeneficiaryDashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="*"
            element={<SessionAwareRedirect />}
          />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
