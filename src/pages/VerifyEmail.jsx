import { useEffect, useState } from 'react';
import { CheckCircle2, Loader2, Mail, RefreshCw, XCircle } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';

import AuthShell from '../components/auth/AuthShell';
import {
  resendRegistrationVerification,
  verifyRegistrationEmailLink,
} from '../services/authService';

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const initialEmail = searchParams.get('email') || '';

  const [status, setStatus] = useState(token ? 'VERIFYING' : 'IDLE');
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState(initialEmail);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    if (!token) return;

    let active = true;

    verifyRegistrationEmailLink(token)
      .then((result) => {
        if (!active) return;
        setStatus('VERIFIED');
        setMessage(result.message || 'Email verified successfully.');
      })
      .catch((error) => {
        if (!active) return;
        setStatus('FAILED');
        setMessage(error.message || 'This verification link is invalid or expired.');
      });

    return () => {
      active = false;
    };
  }, [token]);

  const resend = async (event) => {
    event.preventDefault();
    setMessage('');

    if (!email.trim()) {
      setMessage('Enter the email address used during registration.');
      return;
    }

    setResending(true);

    try {
      const result = await resendRegistrationVerification(email.trim());
      setMessage(result.message || 'A new verification email was sent.');
      setStatus('RESENT');
    } catch (error) {
      setMessage(error.message || 'Unable to resend the verification email.');
      setStatus('FAILED');
    } finally {
      setResending(false);
    }
  };

  return (
    <AuthShell
      title="Verify your email"
      subtitle="Secure your NextGen Vault registration"
    >
      <div className="space-y-5">
        {status === 'VERIFYING' && (
          <div className="flex items-center gap-3 rounded-xl bg-brand-50 p-4 text-sm text-brand-800">
            <Loader2 size={18} className="animate-spin" />
            Verifying your secure email link…
          </div>
        )}

        {status === 'VERIFIED' && (
          <div className="alert-success flex items-start gap-3">
            <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
            <span>{message}</span>
          </div>
        )}

        {status === 'FAILED' && message && (
          <div className="alert-error flex items-start gap-3">
            <XCircle size={18} className="mt-0.5 shrink-0" />
            <span>{message}</span>
          </div>
        )}

        {status === 'RESENT' && message && (
          <div className="alert-success flex items-start gap-3">
            <Mail size={18} className="mt-0.5 shrink-0" />
            <span>{message}</span>
          </div>
        )}

        {status !== 'VERIFIED' && status !== 'VERIFYING' && (
          <form onSubmit={resend} className="space-y-3">
            <label className="field-label" htmlFor="verificationEmail">
              Registration email
            </label>
            <input
              id="verificationEmail"
              type="email"
              className="field-input"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              required
            />

            <button
              type="submit"
              className="btn-secondary w-full"
              disabled={resending}
            >
              {resending ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <RefreshCw size={16} />
              )}
              Resend verification email
            </button>
          </form>
        )}

        <div className="flex flex-col gap-2 sm:flex-row">
          <Link to="/login" className="btn-primary flex-1 text-center">
            Go to sign in
          </Link>
          <Link to="/pending-approval" className="btn-secondary flex-1 text-center">
            View approval status
          </Link>
        </div>
      </div>
    </AuthShell>
  );
}
