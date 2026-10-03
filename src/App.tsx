import type { ReactNode } from 'react';
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
} from 'react-router-dom';

import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute, { homeForRole } from './components/ProtectedRoute';

import ContactUs from './pages/ContactUs';
import LandingPage from './pages/LandingPage';
import AboutUs from './pages/AboutUs';
import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import Register from './pages/Register';
import LawyerRegister from './pages/LawyerRegister';
import PendingApproval from './pages/PendingApproval';
import VerifyEmail from './pages/VerifyEmail';
import ChangePassword from './pages/ChangePassword';
import AdminDashboard from './pages/AdminDashboard';
import AdminLegacyClaims from './pages/AdminLegacyClaims';
import AdminAuditLogs from './pages/AdminAuditLogs';
import AdminRecords from './pages/AdminRecords';
import AdminLegalRequests from './pages/AdminLegalRequests';
import UserDashboard from './pages/UserDashboard';
import LegacyAccess from './pages/LegacyAccess';
import Notifications from './pages/Notifications';
import LegalAssistance from './pages/LegalAssistance';
import LawyerConsultations from './pages/LawyerConsultations';
import LawyerDashboard from './pages/LawyerDashboard';
import Profile from './pages/Profile';

type UserRole = 'ADMIN' | 'USER' | 'LAWYER';

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
          <Route path="/about" element={<AboutUs />} />
          <Route path="/contact" element={<ContactUs />} />

          <Route
            path="/login"
            element={
              <PublicOnlyRoute>
                <Login />
              </PublicOnlyRoute>
            }
          />

          <Route
            path="/forgot-password"
            element={
              <PublicOnlyRoute>
                <ForgotPassword />
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

          <Route path="/register-owner" element={<Navigate to="/register" replace />} />

          <Route
            path="/register-lawyer"
            element={
              <PublicOnlyRoute>
                <LawyerRegister />
              </PublicOnlyRoute>
            }
          />

          <Route path="/pending-approval" element={<PendingApproval />} />

          <Route
            path="/verify-email"
            element={
              <PublicOnlyRoute>
                <VerifyEmail />
              </PublicOnlyRoute>
            }
          />

          <Route
            path="/change-password"
            element={
              <ProtectedRoute allowedRoles={['ADMIN', 'USER', 'LAWYER']}>
                <ChangePassword />
              </ProtectedRoute>
            }
          />

          <Route
            path="/profile"
            element={
              <ProtectedRoute allowedRoles={['ADMIN', 'USER', 'LAWYER']}>
                <Profile />
              </ProtectedRoute>
            }
          />

          <Route
            path="/user"
            element={
              <ProtectedRoute allowedRoles={['USER']}>
                <UserDashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/legacy-access"
            element={
              <ProtectedRoute allowedRoles={['USER']}>
                <LegacyAccess />
              </ProtectedRoute>
            }
          />

          <Route
            path="/legal-assistance"
            element={
              <ProtectedRoute allowedRoles={['USER']}>
                <LegalAssistance />
              </ProtectedRoute>
            }
          />

          <Route
            path="/notifications"
            element={
              <ProtectedRoute allowedRoles={['USER', 'LAWYER', 'ADMIN']}>
                <Notifications />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/legacy-claims"
            element={
              <ProtectedRoute allowedRoles={['ADMIN']}>
                <AdminLegacyClaims />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/records"
            element={
              <ProtectedRoute allowedRoles={['ADMIN']}>
                <AdminRecords />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/legal-requests"
            element={
              <ProtectedRoute allowedRoles={['ADMIN']}>
                <AdminLegalRequests />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/audit-logs"
            element={
              <ProtectedRoute allowedRoles={['ADMIN']}>
                <AdminAuditLogs />
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
            path="/lawyer/consultations"
            element={
              <ProtectedRoute allowedRoles={['LAWYER']}>
                <LawyerConsultations />
              </ProtectedRoute>
            }
          />

          <Route
            path="/lawyer"
            element={
              <ProtectedRoute allowedRoles={['LAWYER']}>
                <LawyerDashboard />
              </ProtectedRoute>
            }
          />

          <Route path="/owner/*" element={<Navigate to="/user" replace />} />
          <Route path="/beneficiary/*" element={<Navigate to="/legacy-access" replace />} />

          <Route path="*" element={<SessionAwareRedirect />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
