import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  CheckCircle2,
  Eye,
  EyeOff,
  FileText,
  Loader2,
  Mail,
  Upload,
} from 'lucide-react';

import {
  registerUser,
  resendRegistrationVerification,
} from '../services/authService';

import AuthShell from '../components/auth/AuthShell';

const INITIAL = {
  name: '',
  username: '',
  email: '',
  phone: '',
  password: '',
  confirmPassword: '',
};

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];

const PASSWORD_RULES = [
  {
    key: 'length',
    label: 'Minimum 8 characters',
    test: (value) => value.length >= 8,
  },
  {
    key: 'uppercase',
    label: 'At least one uppercase letter',
    test: (value) => /[A-Z]/.test(value),
  },
  {
    key: 'number',
    label: 'At least one number',
    test: (value) => /\d/.test(value),
  },
  {
    key: 'special',
    label: 'At least one special character',
    test: (value) => /[^A-Za-z0-9]/.test(value),
  },
];

const isValidIndianMobile = (value) => /^\d{10}$/.test(value);
const isStrongPassword = (value) =>
  PASSWORD_RULES.every((rule) => rule.test(value));

export default function Register() {
  const navigate = useNavigate();

  const [form, setForm] = useState(INITIAL);
  const [aadhaar, setAadhaar] = useState(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [verificationEmailSent, setVerificationEmailSent] = useState(false);
  const [resendEmailLoading, setResendEmailLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const update = (key) => (event) => {
    let value = event.target.value;

    if (key === 'phone') {
      value = value.replace(/\D/g, '').slice(0, 10);
    }

    setForm((current) => ({
      ...current,
      [key]: value,
    }));

    setError('');
    setMessage('');
  };

  const handleFile = (event) => {
    const file = event.target.files?.[0] || null;
    setError('');

    if (!file) {
      setAadhaar(null);
      return;
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      setError('Aadhaar must be a PDF, JPG, JPEG, or PNG file.');
      event.target.value = '';
      setAadhaar(null);
      return;
    }

    if (!file.size) {
      setError('Aadhaar file cannot be empty.');
      event.target.value = '';
      setAadhaar(null);
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setError('Aadhaar file must be 10 MB or smaller.');
      event.target.value = '';
      setAadhaar(null);
      return;
    }

    setAadhaar(file);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setMessage('');

    if (!form.email.trim()) {
      setError('Email address is required.');
      return;
    }

    if (!isValidIndianMobile(form.phone)) {
      setError('Mobile number must contain exactly 10 digits.');
      return;
    }

    if (!isStrongPassword(form.password)) {
      setError(
        'Password must be at least 8 characters and include an uppercase letter, a number, and a special character.'
      );
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError('Password and confirm password do not match.');
      return;
    }

    if (!aadhaar) {
      setError('Upload your Aadhaar card before submitting registration.');
      return;
    }

    setLoading(true);

    try {
      const result = await registerUser({
        ...form,
        aadhaar,
      });

      setVerificationEmailSent(Boolean(result.verificationEmailSent));
      setDone(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const resendVerification = async () => {
    setError('');
    setMessage('');
    setResendEmailLoading(true);

    try {
      const result = await resendRegistrationVerification(form.email);
      setVerificationEmailSent(true);
      setMessage(result.message || 'Verification email sent.');
    } catch (err) {
      setError(err.message);
    } finally {
      setResendEmailLoading(false);
    }
  };

  if (done) {
    return (
      <AuthShell
        title="Registration submitted"
        subtitle="Verify your email and await administrator approval"
      >
        <div className="space-y-5">
          {error && <div className="alert-error">{error}</div>}
          {message && <div className="alert-success">{message}</div>}

          <div className="alert-success flex items-start gap-3">
            <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
            <span>
              Your account and encrypted Aadhaar submission were created successfully.{' '}
              {verificationEmailSent
                ? `A single-use verification link was sent to ${form.email}.`
                : 'The verification email could not be delivered yet.'}
              {' '}Administrator approval is also required before login.
            </span>
          </div>

          <button
            type="button"
            className="btn-secondary w-full"
            onClick={resendVerification}
            disabled={resendEmailLoading}
          >
            {resendEmailLoading && (
              <Loader2 size={16} className="animate-spin" />
            )}
            Resend verification email
          </button>

          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              className="btn-secondary flex-1"
              onClick={() => navigate('/pending-approval')}
            >
              View approval status
            </button>

            <button
              className="btn-primary flex-1"
              onClick={() => navigate('/login')}
            >
              Go to sign in
            </button>
          </div>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      variant="wide"
      title="Create a user account"
      subtitle="Register once, verify your email from the secure link we send, and use the same account to own and receive legacy assets"
      footer={
        <p className="text-sm text-ink-500">
          Already registered?{' '}
          <Link
            to="/login"
            className="font-semibold text-brand-700 hover:text-brand-800"
          >
            Sign in
          </Link>
        </p>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <div className="alert-error">{error}</div>}
        {message && <div className="alert-success">{message}</div>}

        <div className="registration-two-column">
          <div>
            <label className="field-label" htmlFor="name">
              Full name
            </label>
            <input
              id="name"
              className="field-input"
              value={form.name}
              onChange={update('name')}
              autoComplete="name"
              required
            />
          </div>

          <div>
            <label className="field-label" htmlFor="username">
              Username
            </label>
            <input
              id="username"
              className="field-input"
              value={form.username}
              onChange={update('username')}
              autoComplete="username"
              required
            />
          </div>
        </div>

        <div className="registration-two-column">
          <div>
            <label className="field-label" htmlFor="email">
              Email
            </label>
            <div className="relative">
              <Mail size={16} className="absolute left-3 top-3.5 text-ink-400" />
              <input
                id="email"
                type="email"
                className="field-input pl-10"
                value={form.email}
                onChange={update('email')}
                autoComplete="email"
                required
              />
            </div>
            <p className="mt-1 text-xs text-ink-400">
              A single-use verification link will be sent here after registration.
            </p>
          </div>

          <div>
            <label className="field-label" htmlFor="phone">
              Mobile number
            </label>
            <input
              id="phone"
              type="tel"
              inputMode="numeric"
              className="field-input"
              value={form.phone}
              onChange={update('phone')}
              placeholder="10-digit mobile number"
              autoComplete="tel"
              minLength={10}
              maxLength={10}
              required
            />
            <p className="mt-1 text-xs text-ink-400">
              Stored for account contact. This build does not claim SMS verification without a configured SMS provider.
            </p>
          </div>
        </div>

        <div>
          <label className="field-label" htmlFor="aadhaar">
            Aadhaar document
          </label>
          <label className="mt-1 flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-ink-200 bg-ink-50 px-4 py-4 transition hover:border-brand-300 hover:bg-brand-50/40">
            <Upload size={18} className="text-brand-600" />
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-ink-700">
                {aadhaar ? aadhaar.name : 'Choose PDF, JPG, JPEG, or PNG'}
              </span>
              <span className="mt-1 block text-xs text-ink-400">
                Maximum file size: 10 MB
              </span>
            </span>
            <FileText size={17} className="text-ink-400" />
            <input
              id="aadhaar"
              type="file"
              className="hidden"
              accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
              onChange={handleFile}
              required
            />
          </label>
        </div>

        <div className="registration-two-column">
          <div>
            <label className="field-label" htmlFor="password">
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                className="field-input pr-10"
                value={form.password}
                onChange={update('password')}
                autoComplete="new-password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-400"
                aria-label="Toggle password visibility"
              >
                {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
          </div>

          <div>
            <label className="field-label" htmlFor="confirmPassword">
              Confirm password
            </label>
            <div className="relative">
              <input
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                className="field-input pr-10"
                value={form.confirmPassword}
                onChange={update('confirmPassword')}
                autoComplete="new-password"
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((value) => !value)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-400"
                aria-label="Toggle confirmation password visibility"
              >
                {showConfirmPassword ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
          </div>
        </div>

        <div className="rounded-xl bg-ink-50 p-3">
          <p className="text-xs font-semibold text-ink-700">Password requirements</p>
          <div className="mt-2 grid gap-1 sm:grid-cols-2">
            {PASSWORD_RULES.map((rule) => (
              <p
                key={rule.key}
                className={
                  'text-xs ' +
                  (rule.test(form.password) ? 'text-emerald-600' : 'text-ink-400')
                }
              >
                {rule.test(form.password) ? '✓' : '○'} {rule.label}
              </p>
            ))}
          </div>
        </div>

        <button
          type="submit"
          className="btn-primary w-full"
          disabled={loading}
        >
          {loading && <Loader2 size={16} className="animate-spin" />}
          {loading ? 'Submitting registration…' : 'Create account'}
        </button>
      </form>
    </AuthShell>
  );
}
