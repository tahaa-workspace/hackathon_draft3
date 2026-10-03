import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  CheckCircle2,
  Eye,
  EyeOff,
  FileText,
  Loader2,
  Mail,
  Smartphone,
  Upload,
} from 'lucide-react';

import {
  registerUser,
  resendRegistrationVerification,
  sendRegistrationOTP,
  verifyRegistrationOTP,
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
const RESEND_SECONDS = 60;

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

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [phoneVerificationToken, setPhoneVerificationToken] = useState('');
  const [verifiedPhone, setVerifiedPhone] = useState('');
  const [resendIn, setResendIn] = useState(0);
  const [resendEmailLoading, setResendEmailLoading] = useState(false);

  useEffect(() => {
    if (resendIn <= 0) return undefined;

    const timer = window.setInterval(() => {
      setResendIn((value) => Math.max(0, value - 1));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [resendIn]);

  const update = (key) => (event) => {
    const value = event.target.value;

    setForm((current) => ({
      ...current,
      [key]: value,
    }));

    if (error) setError('');
    if (message) setMessage('');
  };

  const handlePhoneChange = (event) => {
    const value = event.target.value.replace(/\D/g, '').slice(0, 10);

    setForm((current) => ({
      ...current,
      phone: value,
    }));

    if (value !== verifiedPhone) {
      setPhoneVerified(false);
      setPhoneVerificationToken('');
      setOtp('');
      setOtpSent(false);
      setResendIn(0);
    }

    setError('');
    setMessage('');
  };

  const handleSendOtp = async () => {
    setError('');
    setMessage('');

    if (!isValidIndianMobile(form.phone)) {
      setError('Mobile number must contain exactly 10 digits.');
      return;
    }

    setOtpLoading(true);

    try {
      const result = await sendRegistrationOTP(form.phone);
      setOtpSent(true);
      setOtp('');
      setPhoneVerified(false);
      setPhoneVerificationToken('');
      setVerifiedPhone('');
      setResendIn(RESEND_SECONDS);
      setMessage(result.message || 'Verification OTP generated.');
    } catch (err) {
      setError(err.message);
    } finally {
      setOtpLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    setError('');
    setMessage('');

    if (!/^\d{6}$/.test(otp)) {
      setError('Enter the 6-digit mobile verification code.');
      return;
    }

    setVerifyLoading(true);

    try {
      const result = await verifyRegistrationOTP(form.phone, otp);
      setPhoneVerified(true);
      setPhoneVerificationToken(result.verificationToken);
      setVerifiedPhone(form.phone);
      setOtpSent(false);
      setResendIn(0);
      setMessage(result.message || 'Mobile number verified successfully.');
    } catch (err) {
      setPhoneVerified(false);
      setPhoneVerificationToken('');
      setError(err.message);
    } finally {
      setVerifyLoading(false);
    }
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

    if (!phoneVerified || !phoneVerificationToken) {
      setError('Verify your mobile number before submitting registration.');
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
        phoneVerificationToken,
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
              Your account has been created and your Aadhaar document was
              received securely. {verificationEmailSent
                ? `A verification link was sent to ${form.email}.`
                : 'The verification email could not be delivered yet.'}
              {' '}Your account also requires administrator approval before login.
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
      subtitle="Verify your mobile number, upload Aadhaar, and confirm your email from the secure link we send after registration"
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

        <div className="registration-verification-card">
          <div className="mb-3 flex items-center gap-2">
            <Mail size={17} className="text-brand-700" />
            <p className="text-sm font-semibold text-ink-800">
              Email verification
            </p>
          </div>

          <label className="field-label" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            type="email"
            className="field-input"
            value={form.email}
            onChange={update('email')}
            autoComplete="email"
            required
          />
          <p className="mt-2 text-xs leading-5 text-ink-500">
            After registration, NextGen Vault sends a single-use verification
            link to this address. SMTP credentials are used only to send the
            email; this address is always the recipient.
          </p>
        </div>

        <div className="registration-verification-card">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Smartphone size={17} className="text-brand-700" />
              <p className="text-sm font-semibold text-ink-800">
                Mobile verification
              </p>
            </div>

            {phoneVerified && (
              <span className="registration-verified-badge">
                <CheckCircle2 size={14} />
                Verified
              </span>
            )}
          </div>

          <label className="field-label" htmlFor="phone">
            Mobile number
          </label>

          <div className="registration-verification-row">
            <input
              id="phone"
              type="tel"
              inputMode="numeric"
              className="field-input"
              value={form.phone}
              onChange={handlePhoneChange}
              placeholder="10-digit mobile number"
              autoComplete="tel"
              minLength={10}
              maxLength={10}
              disabled={phoneVerified}
              required
            />

            <button
              type="button"
              className="btn-secondary registration-otp-button"
              onClick={handleSendOtp}
              disabled={
                otpLoading ||
                phoneVerified ||
                (otpSent && resendIn > 0)
              }
            >
              {otpLoading && <Loader2 size={16} className="animate-spin" />}
              {phoneVerified
                ? 'Verified'
                : otpSent
                  ? resendIn > 0
                    ? `Resend in ${resendIn}s`
                    : 'Resend OTP'
                  : 'Send OTP'}
            </button>
          </div>

          {otpSent && !phoneVerified && (
            <div className="registration-verification-row mt-3">
              <input
                type="text"
                inputMode="numeric"
                className="field-input"
                value={otp}
                onChange={(event) =>
                  setOtp(
                    event.target.value
                      .replace(/\D/g, '')
                      .slice(0, 6)
                  )
                }
                placeholder="Enter 6-digit OTP"
                autoComplete="one-time-code"
              />

              <button
                type="button"
                className="btn-primary registration-otp-button"
                onClick={handleVerifyOtp}
                disabled={verifyLoading || otp.length !== 6}
              >
                {verifyLoading && <Loader2 size={16} className="animate-spin" />}
                Verify mobile
              </button>
            </div>
          )}
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
