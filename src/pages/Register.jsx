import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { UserPlus, Loader2, CheckCircle2, Upload, FileText, Smartphone } from 'lucide-react';
import {
  registerUser,
  sendRegistrationOTP,
  verifyRegistrationOTP,
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
];

export default function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState(INITIAL);
  const [aadhaar, setAadhaar] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

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

  const update = (key) => (e) => {
    const value = e.target.value;

    setForm((f) => ({ ...f, [key]: value }));

    if (key === 'phone' && value !== verifiedPhone) {
      setPhoneVerified(false);
      setPhoneVerificationToken('');
      setOtp('');
      setOtpSent(false);
      setOtpMessage('');
      setResendIn(0);
    }
  };

  const handleSendOtp = async () => {
    setError('');
    setOtpMessage('');

    if (!form.phone.trim()) {
      setError('Please enter your mobile number first.');
      return;
    }

    setOtpLoading(true);

    try {
      const result = await sendRegistrationOTP(form.phone.trim());
      setOtpSent(true);
      setOtp('');
      setPhoneVerified(false);
      setPhoneVerificationToken('');
      setVerifiedPhone('');
      setResendIn(RESEND_SECONDS);
      setOtpMessage(result.message || 'Demo OTP generated. Check the backend terminal.');
    } catch (err) {
      setError(err.message);
    } finally {
      setOtpLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    setError('');
    setOtpMessage('');

    if (!otp.trim()) {
      setError('Please enter the OTP shown in the backend terminal.');
      return;
    }

    setVerifyLoading(true);

    try {
      const result = await verifyRegistrationOTP(form.phone.trim(), otp.trim());
      setPhoneVerified(true);
      setPhoneVerificationToken(result.verificationToken);
      setVerifiedPhone(form.phone);
      setOtpMessage(result.message || 'Mobile number verified successfully.');
    } catch (err) {
      setPhoneVerified(false);
      setPhoneVerificationToken('');
      setError(err.message);
    } finally {
      setVerifyLoading(false);
    }
  };

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

    if (!phoneVerified || !phoneVerificationToken) {
      setError('Please verify your mobile number before submitting registration.');
      return;
    }
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
      await registerUser({
        ...form,
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
      <AuthShell title="Registration submitted" subtitle="Awaiting administrator verification">
        <div className="space-y-5">
          <div className="alert-success flex items-start gap-3">
            <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
            <span>
              Your mobile number has been verified and your registration and Aadhaar document have been received.
              An administrator will review your identity document and approve or reject your owner account.
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
      subtitle="Verify your mobile number, then submit Aadhaar for administrator approval"
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

        <div className="rounded-xl border border-ink-200 bg-ink-50/40 p-4">
          <div className="mb-3 flex items-center gap-2">
            <Smartphone size={17} className="text-brand-700" />
            <p className="text-sm font-semibold text-ink-800">Mobile verification</p>
          </div>

          <label className="field-label" htmlFor="phone">Mobile number</label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              id="phone"
              type="tel"
              inputMode="tel"
              className="field-input flex-1"
              value={form.phone}
              onChange={update('phone')}
              placeholder="9054559272"
              autoComplete="tel"
              disabled={phoneVerified}
              required
            />
            <button
              type="button"
              className="btn-secondary whitespace-nowrap"
              onClick={handleSendOtp}
              disabled={otpLoading || phoneVerified || (otpSent && resendIn > 0)}
            >
              {otpLoading ? <Loader2 size={16} className="animate-spin" /> : null}
              {otpSent ? (resendIn > 0 ? `Resend in ${resendIn}s` : 'Resend OTP') : 'Send OTP'}
            </button>
          </div>

          {otpSent && !phoneVerified && (
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <input
                id="registration-otp"
                type="text"
                inputMode="numeric"
                className="field-input flex-1"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="Enter 6-digit OTP"
                autoComplete="one-time-code"
              />
              <button
                type="button"
                className="btn-primary whitespace-nowrap"
                onClick={handleVerifyOtp}
                disabled={verifyLoading || otp.length !== 6}
              >
                {verifyLoading ? <Loader2 size={16} className="animate-spin" /> : null}
                Verify OTP
              </button>
            </div>
          )}

          {phoneVerified && (
            <div className="mt-3 flex items-center gap-2 text-sm font-medium text-emerald-700">
              <CheckCircle2 size={17} />
              Mobile number verified
            </div>
          )}

          {otpMessage && (
            <p className="mt-2 text-xs text-ink-600">{otpMessage}</p>
          )}

          <p className="mt-2 text-xs text-ink-500">
            Demo mode: use one of these test numbers: {DEMO_MOBILES.join(', ')}. The generated OTP is shown only in the backend terminal and expires in 5 minutes.
          </p>
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

        <button type="submit" className="btn-primary w-full" disabled={loading || !phoneVerified}>
          {loading ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={16} />}
          {loading ? 'Submitting…' : 'Submit registration request'}
        </button>
      </form>
    </AuthShell>
  );
}
