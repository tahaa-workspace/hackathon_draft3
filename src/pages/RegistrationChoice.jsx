import { Gavel, ShieldCheck, UserRound } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

import AuthShell from '../components/auth/AuthShell';

export default function RegistrationChoice() {
  const navigate = useNavigate();

  return (
    <AuthShell
      variant="wide"
      title="Create your account"
      subtitle="Choose how you want to join Next Gen Vault"
      footer={
        <p className="text-sm text-ink-500">
          Already have an account?{' '}
          <Link
            to="/login"
            className="font-semibold text-brand-700 hover:text-brand-800"
          >
            Sign in
          </Link>
        </p>
      }
    >
      <div className="space-y-4">
        <button
          type="button"
          onClick={() => navigate('/register-owner')}
          className="w-full rounded-2xl border border-ink-100 bg-white p-5 text-left shadow-sm transition hover:border-brand-200 hover:shadow-md"
        >
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
              <UserRound size={21} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-base font-semibold text-ink-900">Register as Owner</h2>
                <span className="rounded-full bg-brand-50 px-2.5 py-1 text-[11px] font-semibold text-brand-700">
                  Vault account
                </span>
              </div>
              <p className="mt-2 text-sm leading-6 text-ink-500">
                Create your digital vault, upload records, add beneficiaries and control what can be released later.
              </p>
              <div className="mt-3 flex items-center gap-2 text-xs font-medium text-ink-500">
                <ShieldCheck size={15} className="text-emerald-600" />
                Email, mobile and Aadhaar verification required
              </div>
            </div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => navigate('/register-lawyer')}
          className="w-full rounded-2xl border border-ink-100 bg-white p-5 text-left shadow-sm transition hover:border-brand-200 hover:shadow-md"
        >
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
              <Gavel size={21} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-base font-semibold text-ink-900">Register as Lawyer</h2>
                <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700">
                  Professional account
                </span>
              </div>
              <p className="mt-2 text-sm leading-6 text-ink-500">
                Submit your professional details and credential proof for administrator approval before reviewing claims.
              </p>
              <div className="mt-3 flex items-center gap-2 text-xs font-medium text-ink-500">
                <ShieldCheck size={15} className="text-emerald-600" />
                Lawyer credentials are reviewed by Admin
              </div>
            </div>
          </div>
        </button>

        <div className="rounded-xl border border-ink-100 bg-ink-50/70 px-4 py-3 text-xs leading-5 text-ink-500">
          Beneficiary accounts are created through an Owner relationship. Administrator accounts are system-managed and are not publicly registered.
        </div>
      </div>
    </AuthShell>
  );
}
