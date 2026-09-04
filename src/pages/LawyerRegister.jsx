import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  BriefcaseBusiness,
  CheckCircle2,
  FileText,
  Loader2,
  ShieldCheck,
  Upload,
  UserRoundPlus,
} from 'lucide-react';
import AuthShell from '../components/auth/AuthShell';
import { registerLawyer } from '../services/authService';
import '../styles/auth.css';

const INITIAL = {
  name: '',
  username: '',
  email: '',
  password: '',
  confirmPassword: '',
  phone: '',
  city: '',
  state: '',
  enrollmentNumber: '',
  stateBarCouncil: '',
  yearsOfExperience: '',
  practiceAreas: '',
};

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];

export default function LawyerRegister() {
  const navigate = useNavigate();
  const [form, setForm] = useState(INITIAL);
  const [credential, setCredential] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const update = (key) => (event) => {
    setForm((current) => ({ ...current, [key]: event.target.value }));
  };

  const handleCredential = (event) => {
    const file = event.target.files?.[0] || null;
    setError('');

    if (!file) {
      setCredential(null);
      return;
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      setError('Credential proof must be a PDF, JPG, JPEG, or PNG file.');
      event.target.value = '';
      setCredential(null);
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setError('Credential proof must be 10 MB or smaller.');
      event.target.value = '';
      setCredential(null);
      return;
    }

    setCredential(file);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    if (form.password !== form.confirmPassword) {
      setError('Password and confirm password do not match.');
      return;
    }

    if (form.password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    if (form.yearsOfExperience !== '' && Number(form.yearsOfExperience) < 0) {
      setError('Years of experience cannot be negative.');
      return;
    }

    if (!credential) {
      setError('Please upload your professional credential proof.');
      return;
    }

    setLoading(true);
    try {
      await registerLawyer({ ...form, credential });
      setDone(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <AuthShell>
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
              <CheckCircle2 size={20} />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-700">
                Registration submitted
              </p>
              <h1 className="mt-1 text-2xl font-bold text-ink-900">Awaiting administrator review</h1>
            </div>
          </div>

          <div className="alert-success flex items-start gap-3">
            <ShieldCheck size={18} className="mt-0.5 shrink-0" />
            <span>
              Your Lawyer account and professional credential have been received. An administrator must
              approve your profile before you can sign in and receive Legacy Access Claims.
            </span>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <button className="btn-secondary flex-1" onClick={() => navigate('/pending-approval')}>
              View approval info
            </button>
            <button className="btn-primary flex-1" onClick={() => navigate('/login')}>
              Go to sign in
            </button>
          </div>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <div>
        <div className="mb-6">
          <div className="auth-eyebrow">
            <BriefcaseBusiness size={13} />
            Professional registration
          </div>
          <h1 className="mt-4 text-3xl font-bold tracking-[-0.025em] text-ink-900">
            Register as a Lawyer
          </h1>
          <p className="mt-2 text-sm leading-6 text-ink-500">
            Create a professional account for post-death Legacy Access Claim review. Your account remains
            inactive until an administrator verifies your credentials.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="alert-error">{error}</div>}

          <div>
            <label className="field-label" htmlFor="lawyer-name">Full name</label>
            <input id="lawyer-name" className="field-input" value={form.name} onChange={update('name')} required />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="field-label" htmlFor="lawyer-username">Username</label>
              <input
                id="lawyer-username"
                className="field-input"
                value={form.username}
                onChange={update('username')}
                autoComplete="username"
                required
              />
            </div>
            <div>
              <label className="field-label" htmlFor="lawyer-email">Email</label>
              <input
                id="lawyer-email"
                type="email"
                className="field-input"
                value={form.email}
                onChange={update('email')}
                autoComplete="email"
                required
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="field-label" htmlFor="lawyer-phone">Phone</label>
              <input id="lawyer-phone" className="field-input" value={form.phone} onChange={update('phone')} required />
            </div>
            <div>
              <label className="field-label" htmlFor="lawyer-enrollment">Enrollment / registration no.</label>
              <input
                id="lawyer-enrollment"
                className="field-input"
                value={form.enrollmentNumber}
                onChange={update('enrollmentNumber')}
                required
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="field-label" htmlFor="lawyer-city">City</label>
              <input id="lawyer-city" className="field-input" value={form.city} onChange={update('city')} required />
            </div>
            <div>
              <label className="field-label" htmlFor="lawyer-state">State</label>
              <input id="lawyer-state" className="field-input" value={form.state} onChange={update('state')} required />
            </div>
          </div>

          <div>
            <label className="field-label" htmlFor="bar-council">State Bar Council</label>
            <input
              id="bar-council"
              className="field-input"
              value={form.stateBarCouncil}
              onChange={update('stateBarCouncil')}
              required
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="field-label" htmlFor="experience">Years of experience <span className="font-normal text-ink-400">(optional)</span></label>
              <input
                id="experience"
                type="number"
                min="0"
                step="1"
                className="field-input"
                value={form.yearsOfExperience}
                onChange={update('yearsOfExperience')}
              />
            </div>
            <div>
              <label className="field-label" htmlFor="practice-areas">Practice areas <span className="font-normal text-ink-400">(optional)</span></label>
              <input
                id="practice-areas"
                className="field-input"
                value={form.practiceAreas}
                onChange={update('practiceAreas')}
                placeholder="Succession, Property Law"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="field-label" htmlFor="lawyer-password">Password</label>
              <input
                id="lawyer-password"
                type="password"
                className="field-input"
                value={form.password}
                onChange={update('password')}
                autoComplete="new-password"
                required
              />
            </div>
            <div>
              <label className="field-label" htmlFor="lawyer-confirm-password">Confirm password</label>
              <input
                id="lawyer-confirm-password"
                type="password"
                className="field-input"
                value={form.confirmPassword}
                onChange={update('confirmPassword')}
                autoComplete="new-password"
                required
              />
            </div>
          </div>

          <div>
            <label className="field-label" htmlFor="credential">Professional credential / proof</label>
            <label
              htmlFor="credential"
              className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-ink-200 bg-white px-4 py-4 transition hover:border-brand-300 hover:bg-brand-50/40"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
                {credential ? <FileText size={18} /> : <Upload size={18} />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-ink-800">
                  {credential ? credential.name : 'Upload Bar Council / enrollment credential'}
                </p>
                <p className="text-xs text-ink-500">PDF, JPG, JPEG or PNG · maximum 10 MB</p>
              </div>
            </label>
            <input
              id="credential"
              type="file"
              accept="application/pdf,image/jpeg,image/png"
              onChange={handleCredential}
              className="sr-only"
              required
            />
            <p className="mt-2 text-xs text-ink-500">
              This document is stored separately and is used only for administrator verification of your professional profile.
            </p>
          </div>

          <button type="submit" className="btn-primary w-full" disabled={loading}>
            {loading ? <Loader2 size={16} className="animate-spin" /> : <UserRoundPlus size={16} />}
            {loading ? 'Submitting…' : 'Submit Lawyer registration'}
          </button>
        </form>

        <div className="mt-6 border-t border-ink-100 pt-5 text-center text-sm text-ink-500">
          <p>
            Registering as an Owner instead?{' '}
            <Link to="/register" className="font-semibold text-brand-700 hover:text-brand-800">
              Create Owner account
            </Link>
          </p>
          <p className="mt-2">
            Already approved?{' '}
            <Link to="/login" className="font-semibold text-brand-700 hover:text-brand-800">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </AuthShell>
  );
}
