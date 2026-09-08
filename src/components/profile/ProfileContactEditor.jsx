import { useEffect, useState } from 'react';
import { CheckCircle2, Loader2, Mail, Smartphone } from 'lucide-react';

import {
  requestProfileEmailOTP,
  verifyProfileEmailOTP,
  requestProfilePhoneOTP,
  verifyProfilePhoneOTP,
} from '../../services/authService';
import { useAuth } from '../../context/AuthContext';

const RESEND_SECONDS = 60;

export default function ProfileContactEditor() {
  const { user, updateCurrentUser } = useAuth();

  const [mode, setMode] = useState('email');
  const [value, setValue] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [resendIn, setResendIn] = useState(0);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (resendIn <= 0) return undefined;

    const timer = window.setInterval(() => {
      setResendIn((current) => Math.max(0, current - 1));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [resendIn]);

  const reset = (nextMode = mode) => {
    setMode(nextMode);
    setValue('');
    setOtp('');
    setOtpSent(false);
    setResendIn(0);
    setError('');
    setMessage('');
  };

  const handleMode = (nextMode) => {
    if (nextMode !== mode) reset(nextMode);
  };

  const handleSend = async () => {
    setError('');
    setMessage('');

    if (!value.trim()) {
      setError(mode === 'email' ? 'Enter your new email address.' : 'Enter your new mobile number.');
      return;
    }

    setLoading(true);

    try {
      const result =
        mode === 'email'
          ? await requestProfileEmailOTP(value.trim())
          : await requestProfilePhoneOTP(value.trim());

      setOtp('');
      setOtpSent(true);
      setResendIn(RESEND_SECONDS);
      setMessage(result.message || 'OTP sent successfully.');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    setError('');
    setMessage('');

    if (otp.length !== 6) {
      setError('Enter the 6-digit OTP.');
      return;
    }

    setVerifyLoading(true);

    try {
      const result =
        mode === 'email'
          ? await verifyProfileEmailOTP(value.trim(), otp)
          : await verifyProfilePhoneOTP(value.trim(), otp);

      if (result.user) updateCurrentUser(result.user);

      setMessage(result.message || 'Contact information updated successfully.');
      setOtpSent(false);
      setOtp('');
      setValue('');
      setResendIn(0);
    } catch (err) {
      setError(err.message);
    } finally {
      setVerifyLoading(false);
    }
  };

  const currentValue = mode === 'email' ? user?.email : user?.phone;
  const Icon = mode === 'email' ? Mail : Smartphone;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => handleMode('email')}
          className={
            mode === 'email'
              ? 'rounded-lg bg-brand-600 px-3 py-2 text-xs font-semibold text-white'
              : 'rounded-lg border border-ink-200 bg-white px-3 py-2 text-xs font-semibold text-ink-600 hover:bg-ink-50'
          }
        >
          Update email
        </button>
        <button
          type="button"
          onClick={() => handleMode('phone')}
          className={
            mode === 'phone'
              ? 'rounded-lg bg-brand-600 px-3 py-2 text-xs font-semibold text-white'
              : 'rounded-lg border border-ink-200 bg-white px-3 py-2 text-xs font-semibold text-ink-600 hover:bg-ink-50'
          }
        >
          Update mobile
        </button>
      </div>

      <div className="rounded-xl border border-ink-100 bg-ink-50/60 p-4">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink-800">
          <Icon size={17} className="text-brand-700" />
          {mode === 'email' ? 'Verify a new email address' : 'Verify a new mobile number'}
        </div>

        <p className="mb-3 text-xs leading-5 text-ink-500">
          Current: <span className="font-semibold text-ink-700">{currentValue || 'Not available'}</span>. Your current contact remains unchanged until the new value is verified successfully.
        </p>

        {error && <div className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-700">{error}</div>}
        {message && (
          <div className="mb-3 flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700">
            <CheckCircle2 size={14} />
            {message}
          </div>
        )}

        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            type={mode === 'email' ? 'email' : 'tel'}
            inputMode={mode === 'email' ? 'email' : 'tel'}
            value={value}
            onChange={(event) => {
              setValue(event.target.value);
              setOtp('');
              setOtpSent(false);
              setResendIn(0);
              setError('');
              setMessage('');
            }}
            className="min-w-0 flex-1 rounded-lg border border-ink-200 bg-white px-3 py-2.5 text-sm text-ink-800 outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
            placeholder={mode === 'email' ? 'newemail@example.com' : '9054559272'}
          />

          <button
            type="button"
            onClick={handleSend}
            disabled={loading || (otpSent && resendIn > 0)}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-brand-200 bg-white px-4 py-2.5 text-sm font-semibold text-brand-700 transition hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading && <Loader2 size={15} className="animate-spin" />}
            {otpSent
              ? resendIn > 0
                ? `Resend in ${resendIn}s`
                : 'Resend OTP'
              : 'Send OTP'}
          </button>
        </div>

        {otpSent && (
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={otp}
              onChange={(event) => setOtp(event.target.value.replace(/\D/g, '').slice(0, 6))}
              className="min-w-0 flex-1 rounded-lg border border-ink-200 bg-white px-3 py-2.5 text-sm text-ink-800 outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
              placeholder="Enter 6-digit OTP"
            />

            <button
              type="button"
              onClick={handleVerify}
              disabled={verifyLoading || otp.length !== 6}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {verifyLoading && <Loader2 size={15} className="animate-spin" />}
              Verify and update
            </button>
          </div>
        )}

        <p className="mt-3 text-[11px] leading-5 text-ink-400">
          Email OTP is sent to the new email address. Mobile OTP uses the configured demo mobile numbers and is shown in the backend terminal.
        </p>
      </div>
    </div>
  );
}
