import { ShieldCheck, Briefcase } from 'lucide-react';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';

export default function LawyerDashboard() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-ink-50">
      <Navbar />

      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="rounded-3xl border border-ink-100 bg-white p-8 shadow-sm">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
            <Briefcase size={22} />
          </div>

          <p className="mt-6 text-sm font-semibold text-brand-600">Lawyer workspace</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-ink-900">
            Welcome, {user?.name || 'Lawyer'}
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-ink-500">
            Your professional account has been approved. The Legacy Access case-management dashboard will be added in the next implementation step.
          </p>

          <div className="mt-8 flex items-start gap-3 rounded-2xl border border-green-100 bg-green-50 p-4 text-sm text-green-800">
            <ShieldCheck size={18} className="mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold">Professional account active</p>
              <p className="mt-1 text-green-700">
                Case access will remain empty until an Admin assigns verified Legacy Access Claims to this Lawyer account.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
