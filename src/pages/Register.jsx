import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  UserPlus,
  Loader2,
  CheckCircle2,
  Upload,
  FileText,
  Smartphone,
  Mail,
  Eye,
  EyeOff,
} from 'lucide-react';

import {
  registerUser,
  sendRegistrationOTP,
  verifyRegistrationOTP,
  sendRegistrationEmailOTP,
  verifyRegistrationEmailOTP,
} from '../services/authService';

import AuthShell from "../components/auth/AuthShell";

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

const DEMO_MOBILES = [
  '9054559272',
  '6352522036',
  '8238387089',
  '9106882453',
  '9316744194',
  '9999999999',
  '8888888888',
  '7777777777',
  '6666666666',
];

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
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [emailOtp, setEmailOtp] = useState('');
  const [emailOtpSent, setEmailOtpSent] = useState(false);
  const [emailOtpLoading, setEmailOtpLoading] = useState(false);
  const [emailVerifyLoading, setEmailVerifyLoading] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);
  const [emailVerificationToken, setEmailVerificationToken] = useState('');
  const [verifiedEmail, setVerifiedEmail] = useState('');
  const [emailResendIn, setEmailResendIn] = useState(0);
  const [emailOtpMessage, setEmailOtpMessage] = useState('');

  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [phoneVerificationToken, setPhoneVerificationToken] = useState('');
  const [verifiedPhone, setVerifiedPhone] = useState('');
  const [resendIn, setResendIn] = useState(0);
  const [otpMessage, setOtpMessage] = useState('');

  useEffect(() => {
    if (resendIn <= 0) return undefined;

    const timer = window.setInterval(() => {
      setResendIn((value) => Math.max(0, value - 1));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [resendIn]);

  useEffect(() => {
    if (emailResendIn <= 0) return undefined;

    const timer = window.setInterval(() => {
      setEmailResendIn((value) => Math.max(0, value - 1));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [emailResendIn]);

  const update = (key) => (event) => {
    const value = event.target.value;

    setForm((current) => ({
      ...current,
      [key]: value,
    }));

    if (key === 'email' && value !== verifiedEmail) {
      setEmailVerified(false);
      setEmailVerificationToken('');
      setEmailOtp('');
      setEmailOtpSent(false);
      setEmailOtpMessage('');
      setEmailResendIn(0);
    }

    if (error) {
      setError('');
    }
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
      setOtpMessage('');
      setResendIn(0);
    }

    if (error) {
      setError('');
    }
  };

  const handleSendEmailOtp = async () => {
    setError('');
    setEmailOtpMessage('');

    if (!form.email.trim()) {
      setError('Please enter your email address first.');
      return;
    }

    setEmailOtpLoading(true);

    try {
      const result = await sendRegistrationEmailOTP(form.email.trim());

      setEmailOtpSent(true);
      setEmailOtp('');
      setEmailVerified(false);
      setEmailVerificationToken('');
      setVerifiedEmail('');
      setEmailResendIn(RESEND_SECONDS);

      setEmailOtpMessage(
        result.message || 'OTP sent to your email address.'
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setEmailOtpLoading(false);
    }
  };

  const handleVerifyEmailOtp = async () => {
    setError('');
    setEmailOtpMessage('');

    if (!emailOtp.trim()) {
      setError('Please enter the OTP sent to your email address.');
      return;
    }

    setEmailVerifyLoading(true);

    try {
      const result = await verifyRegistrationEmailOTP(
        form.email.trim(),
        emailOtp.trim()
      );

      setEmailVerified(true);
      setEmailVerificationToken(result.verificationToken);
      setVerifiedEmail(form.email);

      // Stop the resend timer immediately after successful verification
      setEmailResendIn(0);

      // Mark the OTP flow as complete
      setEmailOtpSent(false);

      setEmailOtpMessage(
        result.message || 'Email address verified successfully.'
      );
    } catch (err) {
      setEmailVerified(false);
      setEmailVerificationToken('');
      setError(err.message);
    } finally {
      setEmailVerifyLoading(false);
    }
  };

  const handleSendOtp = async () => {
    setError('');
    setOtpMessage('');

    if (!form.phone) {
      setError('Please enter your mobile number first.');
      return;
    }

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

      setOtpMessage(
        result.message ||
          'Demo OTP generated. Check the backend terminal.'
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setOtpLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    setError('');
    setOtpMessage('');

    if (!isValidIndianMobile(form.phone)) {
      setError('Mobile number must contain exactly 10 digits.');
      return;
    }

    if (!otp.trim()) {
      setError('Please enter the OTP shown in the backend terminal.');
      return;
    }

    setVerifyLoading(true);

    try {
      const result = await verifyRegistrationOTP(
        form.phone,
        otp.trim()
      );

      setPhoneVerified(true);
      setPhoneVerificationToken(result.verificationToken);
      setVerifiedPhone(form.phone);

      // Stop the resend timer immediately after successful verification
      setResendIn(0);

      // Mark the OTP flow as complete
      setOtpSent(false);

      setOtpMessage(
        result.message || 'Mobile number verified successfully.'
      );
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

    if (!emailVerified || !emailVerificationToken) {
      setError(
        'Please verify your email address before submitting registration.'
      );
      return;
    }

    if (!isValidIndianMobile(form.phone)) {
      setError('Mobile number must contain exactly 10 digits.');
      return;
    }

    if (!phoneVerified || !phoneVerificationToken) {
      setError(
        'Please verify your mobile number before submitting registration.'
      );
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
      setError(
        'Please upload your Aadhaar card before submitting registration.'
      );
      return;
    }

    setLoading(true);

    try {
      await registerUser({
        ...form,
        emailVerificationToken,
        phoneVerificationToken,
        aadhaar,
      });

      setDone(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <AuthShell
        title="Registration submitted"
        subtitle="Awaiting administrator verification"
      >
        <div className="space-y-5">
          <div className="alert-success flex items-start gap-3">
            <CheckCircle2 size={18} className="mt-0.5 shrink-0" />

            <span>
              Your email and mobile number have been verified, and your
              registration and Aadhaar document have been received. An
              administrator will review your identity document and approve or
              reject your owner account.
            </span>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              className="btn-secondary flex-1"
              onClick={() => navigate('/pending-approval')}
            >
              View status
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
      title="Create an owner account"
      subtitle="Verify your email and mobile number, then submit Aadhaar for administrator approval"
      footer={
        <p className="text-sm text-ink-500">
          Already approved?{' '}
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
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Mail size={17} className="text-brand-700" />

              <p className="text-sm font-semibold text-ink-800">
                Email verification
              </p>
            </div>

            {emailVerified && (
              <span className="registration-verified-badge">
                <CheckCircle2 size={14} />
                Verified
              </span>
            )}
          </div>

          <label className="field-label" htmlFor="email">
            Email
          </label>

          <div className="registration-verification-row">
            <input
              id="email"
              type="email"
              className="field-input"
              value={form.email}
              onChange={update('email')}
              autoComplete="email"
              disabled={emailVerified}
              required
            />

            <button
              type="button"
              className="btn-secondary registration-otp-button"
              onClick={handleSendEmailOtp}
              disabled={
                emailOtpLoading ||
                emailVerified ||
                (emailOtpSent && emailResendIn > 0)
              }
            >
              {emailOtpLoading && (
                <Loader2
                  size={16}
                  className="animate-spin"
                />
              )}

              {emailVerified
                ? 'Verified'
                : emailOtpSent
                  ? emailResendIn > 0
                    ? `Resend in ${emailResendIn}s`
                    : 'Resend OTP'
                  : 'Send OTP'}
            </button>
          </div>

          {emailOtpSent && !emailVerified && (
            <div className="registration-verification-row mt-3">
              <input
                id="registration-email-otp"
                type="text"
                inputMode="numeric"
                className="field-input"
                value={emailOtp}
                onChange={(event) =>
                  setEmailOtp(
                    event.target.value
                      .replace(/\D/g, '')
                      .slice(0, 6)
                  )
                }
                placeholder="Enter 6-digit email OTP"
                autoComplete="one-time-code"
              />

              <button
                type="button"
                className="btn-primary registration-otp-button"
                onClick={handleVerifyEmailOtp}
                disabled={
                  emailVerifyLoading ||
                  emailOtp.length !== 6
                }
              >
                {emailVerifyLoading && (
                  <Loader2
                    size={16}
                    className="animate-spin"
                  />
                )}

                Verify Email
              </button>
            </div>
          )}

          {emailOtpMessage && (
            <p className="mt-2 text-xs text-ink-600">
              {emailOtpMessage}
            </p>
          )}

          <p className="mt-2 text-xs leading-5 text-ink-500">
            {emailVerified
              ? 'Email address verified successfully.'
              : 'A 6-digit OTP is sent to this email address and expires in 5 minutes.'}
          </p>
        </div>

        <div className="registration-verification-card">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Smartphone
                size={17}
                className="text-brand-700"
              />

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
              placeholder="9054559272"
              autoComplete="tel"
              minLength={10}
              maxLength={10}
              pattern="\d{10}"
              title="Enter exactly 10 digits"
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
                form.phone.length !== 10 ||
                (otpSent && resendIn > 0)
              }
            >
              {otpLoading && (
                <Loader2
                  size={16}
                  className="animate-spin"
                />
              )}

              {phoneVerified
                ? 'Verified'
                : otpSent
                  ? resendIn > 0
                    ? `Resend in ${resendIn}s`
                    : 'Resend OTP'
                  : 'Send OTP'}
            </button>
          </div>

          <div className="mt-2 flex items-center justify-between text-xs">
            <span
              className={
                phoneVerified
                  ? 'font-medium text-green-600'
                  : form.phone.length === 10
                    ? 'font-medium text-green-600'
                    : 'text-ink-400'
              }
            >
              {phoneVerified
                ? 'Mobile number verified successfully'
                : form.phone.length === 10
                  ? 'Valid 10-digit number'
                  : 'Enter exactly 10 digits'}
            </span>

            <span className="text-ink-400">
              {form.phone.length}/10
            </span>
          </div>

          {otpSent && !phoneVerified && (
            <div className="registration-verification-row mt-3">
              <input
                id="registration-otp"
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
                disabled={
                  verifyLoading ||
                  otp.length !== 6
                }
              >
                {verifyLoading && (
                  <Loader2
                    size={16}
                    className="animate-spin"
                  />
                )}

                Verify OTP
              </button>
            </div>
          )}

          {otpMessage && (
            <p className="mt-2 text-xs text-ink-600">
              {otpMessage}
            </p>
          )}

          <p className="mt-2 text-xs leading-5 text-ink-500">
            {phoneVerified
              ? 'Mobile number verified successfully.'
              : (
                  <>
                    Demo mode: use one of these test numbers:{' '}
                    {DEMO_MOBILES.join(', ')}. The generated OTP is shown only
                    in the backend terminal and expires in 5 minutes.
                  </>
                )}
          </p>
        </div>

        <div>
          <div className="registration-two-column">
            <div>
              <label className="field-label" htmlFor="password">
                Password
              </label>

              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  className="field-input !pr-11"
                  value={form.password}
                  onChange={update('password')}
                  autoComplete="new-password"
                  required
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowPassword((current) => !current)
                  }
                  className="absolute right-3 top-1/2 flex -translate-y-1/2 items-center justify-center text-ink-400 transition hover:text-brand-700"
                  aria-label={
                    showPassword
                      ? 'Hide password'
                      : 'Show password'
                  }
                >
                  {showPassword ? (
                    <EyeOff size={18} />
                  ) : (
                    <Eye size={18} />
                  )}
                </button>
              </div>
            </div>

            <div>
              <label
                className="field-label"
                htmlFor="confirmPassword"
              >
                Confirm password
              </label>

              <div className="relative">
                <input
                  id="confirmPassword"
                  type={
                    showConfirmPassword
                      ? 'text'
                      : 'password'
                  }
                  className="field-input !pr-11"
                  value={form.confirmPassword}
                  onChange={update('confirmPassword')}
                  autoComplete="new-password"
                  required
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowConfirmPassword(
                      (current) => !current
                    )
                  }
                  className="absolute right-3 top-1/2 flex -translate-y-1/2 items-center justify-center text-ink-400 transition hover:text-brand-700"
                  aria-label={
                    showConfirmPassword
                      ? 'Hide confirm password'
                      : 'Show confirm password'
                  }
                >
                  {showConfirmPassword ? (
                    <EyeOff size={18} />
                  ) : (
                    <Eye size={18} />
                  )}
                </button>
              </div>
            </div>
          </div>

          <div className="mt-3 rounded-2xl border border-ink-100 bg-ink-50/70 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-500">
              Password requirements
            </p>

            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {PASSWORD_RULES.map((rule) => {
                const passed =
                  rule.test(
                    form.password
                  );

                return (
                  <div
                    key={rule.key}
                    className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-medium transition ${
                      passed
                        ? 'border-green-200 bg-green-50 text-green-700'
                        : 'border-red-100 bg-white text-ink-500'
                    }`}
                  >
                    <span
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
                        passed
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-50 text-red-500'
                      }`}
                    >
                      {passed ? (
                        <CheckCircle2 size={13} />
                      ) : (
                        <span className="text-sm font-bold leading-none">
                          ×
                        </span>
                      )}
                    </span>

                    <span>
                      {rule.label}
                    </span>
                  </div>
                );
              })}
            </div>

            {form.confirmPassword && (
              <div
                className={`mt-3 flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-medium ${
                  form.password === form.confirmPassword
                    ? 'border-green-200 bg-green-50 text-green-700'
                    : 'border-red-200 bg-red-50 text-red-600'
                }`}
              >
                {form.password === form.confirmPassword ? (
                  <CheckCircle2 size={14} />
                ) : (
                  <span className="flex h-4 w-4 items-center justify-center rounded-full bg-red-100 text-xs font-bold">
                    ×
                  </span>
                )}

                {form.password === form.confirmPassword
                  ? 'Passwords match'
                  : 'Passwords do not match'}
              </div>
            )}
          </div>
        </div>

        <div>
          <label className="field-label" htmlFor="aadhaar">
            Aadhaar card
          </label>

          <label
            htmlFor="aadhaar"
            className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-ink-200 bg-white px-4 py-4 transition hover:border-brand-300 hover:bg-brand-50/40"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
              {aadhaar ? (
                <FileText size={18} />
              ) : (
                <Upload size={18} />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-ink-800">
                {aadhaar
                  ? aadhaar.name
                  : 'Upload Aadhaar image or PDF'}
              </p>

              <p className="text-xs text-ink-500">
                PDF, JPG, JPEG or PNG · maximum 10 MB
              </p>
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

          <p className="mt-2 text-xs leading-5 text-ink-500">
            This document is used only for administrator identity
            verification and is stored separately from your account data.
          </p>
        </div>

        <button
          type="submit"
          className="btn-primary w-full"
          disabled={
            loading ||
            !emailVerified ||
            !phoneVerified ||
            !isValidIndianMobile(form.phone) ||
            !isStrongPassword(form.password) ||
            form.password !== form.confirmPassword
          }
        >
          {loading ? (
            <Loader2
              size={16}
              className="animate-spin"
            />
          ) : (
            <UserPlus size={16} />
          )}

          {loading
            ? 'Submitting…'
            : 'Submit registration request'}
        </button>
      </form>
    </AuthShell>
  );
}