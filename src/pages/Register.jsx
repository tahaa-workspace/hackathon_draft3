import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { UserPlus, Loader2, CheckCircle2, Upload, FileText } from 'lucide-react';
import { registerUser } from '../services/authService';
import { AuthShell } from './Login';

const INITIAL = {
  name: '',
  username: '',
  email: '',
  password: '',
  confirmPassword: '',
};

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];

export default function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState(INITIAL);
  const [aadhaar, setAadhaar] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const update = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleFile = (e) => {
    const file = e.target.files?.[0] || null;
    setError('');

    if (!file) {
      setAadhaar(null);
      return;
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      setError('Aadhaar must be a PDF, JPG, JPEG, or PNG file.');
      e.target.value = '';
      setAadhaar(null);
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setError('Aadhaar file must be 10 MB or smaller.');
      e.target.value = '';
      setAadhaar(null);
      return;
    }

    setAadhaar(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (form.password !== form.confirmPassword) {
      setError('Password and confirm password do not match.');
      return;
    }
    if (form.password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }
    if (!aadhaar) {
      setError('Please upload your Aadhaar card before submitting registration.');
      return;
    }

    setLoading(true);
    try {
      await registerUser({ ...form, aadhaar });
      setDone(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <AuthShell title="Registration submitted" subtitle="Awaiting administrator verification">
        <div className="space-y-5">
          <div className="alert-success flex items-start gap-3">
            <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
            <span>
              Your registration and Aadhaar document have been received. An administrator will
              review your identity document and approve or reject your owner account.
            </span>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <button className="btn-secondary flex-1" onClick={() => navigate('/pending-approval')}>
              View status
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
    <AuthShell
      title="Create an owner account"
      subtitle="Owner registrations require Aadhaar verification by an administrator"
      footer={
        <p className="text-sm text-ink-500">
          Already approved?{' '}
          <Link to="/login" className="font-semibold text-brand-700 hover:text-brand-800">
            Sign in
          </Link>
        </p>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <div className="alert-error">{error}</div>}

        <div>
          <label className="field-label" htmlFor="name">Full name</label>
          <input id="name" className="field-input" value={form.name} onChange={update('name')} required />
        </div>

        <div>
          <label className="field-label" htmlFor="username">Username</label>
          <input
            id="username"
            className="field-input"
            value={form.username}
            onChange={update('username')}
            autoComplete="username"
            required
          />
        </div>

        <div>
          <label className="field-label" htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            className="field-input"
            value={form.email}
            onChange={update('email')}
            autoComplete="email"
            required
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="field-label" htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              className="field-input"
              value={form.password}
              onChange={update('password')}
              autoComplete="new-password"
              required
            />
          </div>
          <div>
            <label className="field-label" htmlFor="confirmPassword">Confirm password</label>
            <input
              id="confirmPassword"
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
          <label className="field-label" htmlFor="aadhaar">Aadhaar card</label>
          <label
            htmlFor="aadhaar"
            className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-ink-200 bg-white px-4 py-4 transition hover:border-brand-300 hover:bg-brand-50/40"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
              {aadhaar ? <FileText size={18} /> : <Upload size={18} />}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-ink-800">
                {aadhaar ? aadhaar.name : 'Upload Aadhaar image or PDF'}
              </p>
              <p className="text-xs text-ink-500">PDF, JPG, JPEG or PNG · maximum 10 MB</p>
            </div>
          </label>
          <input
            id="aadhaar"
            type="file"
            accept="application/pdf,image/jpeg,image/png"
            onChange={handleFile}
            className="sr-only"
            required
          />
          <p className="mt-2 text-xs text-ink-500">
            This document is used only for administrator identity verification and is stored separately from your account data.
          </p>
        </div>

        <button type="submit" className="btn-primary w-full" disabled={loading}>
          {loading ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={16} />}
          {loading ? 'Submitting…' : 'Submit registration request'}
        </button>
      </form>
    </AuthShell>
  );
}
