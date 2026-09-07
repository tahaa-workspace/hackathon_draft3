import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  KeyRound,
  Loader2,
  Mail,
  ShieldCheck,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

import AuthShell from "../components/auth/AuthShell";
import AuthInput from "../components/auth/AuthInput";
import PasswordInput from "../components/auth/PasswordInput";
import {
  requestForgotPasswordOTP,
  verifyForgotPasswordOTP,
  resetForgottenPassword,
} from "../services/forgotPasswordService";

import "../styles/auth.css";

export default function ForgotPassword() {
  const navigate = useNavigate();

  const [step, setStep] = useState("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const clearFeedback = () => {
    setError("");
    setMessage("");
  };

  const handleRequestOtp = async (event) => {
    event.preventDefault();
    clearFeedback();
    setLoading(true);

    try {
      const data = await requestForgotPasswordOTP(email.trim());
      setMessage(data.message || "OTP sent to your registered email address.");
      setStep("otp");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (event) => {
    event.preventDefault();
    clearFeedback();
    setLoading(true);

    try {
      const data = await verifyForgotPasswordOTP(email.trim(), otp.trim());
      setResetToken(data.resetToken || "");
      setMessage(data.message || "Email verified successfully.");
      setStep("password");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    clearFeedback();
    setLoading(true);

    try {
      const data = await requestForgotPasswordOTP(email.trim());
      setOtp("");
      setMessage(data.message || "A new OTP has been sent.");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (event) => {
    event.preventDefault();
    clearFeedback();

    if (newPassword !== confirmNewPassword) {
      setError("New password and confirm new password do not match.");
      return;
    }

    setLoading(true);

    try {
      await resetForgottenPassword({
        email: email.trim(),
        resetToken,
        newPassword,
        confirmNewPassword,
      });

      navigate("/login", {
        replace: true,
        state: {
          passwordResetSuccess: "Password reset successfully. Sign in with your new password.",
        },
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const title =
    step === "email"
      ? "Forgot your password?"
      : step === "otp"
        ? "Verify your email"
        : "Create a new password";

  const description =
    step === "email"
      ? "Enter the email registered with your Next Gen Vault account."
      : step === "otp"
        ? `Enter the 6-digit OTP sent to ${email}.`
        : "Choose a new password for your account.";

  return (
    <AuthShell>
      <motion.div
        initial={{ opacity: 0, y: 22 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="mb-8 flex items-center gap-3 lg:hidden">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-brand-600 to-accent-violet text-white shadow-lg shadow-brand-600/20">
            <ShieldCheck size={20} />
          </div>
          <div>
            <p className="text-sm font-bold text-ink-900">Digital Legacy</p>
            <p className="text-xs text-ink-400">Next Gen Vault</p>
          </div>
        </div>

        <Link
          to="/login"
          className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-ink-500 transition hover:text-brand-700"
        >
          <ArrowLeft size={16} />
          Back to sign in
        </Link>

        <div className="mb-8">
          <div className="auth-eyebrow">
            <KeyRound size={13} />
            Account recovery
          </div>

          <h1 className="mt-4 text-3xl font-bold tracking-[-0.025em] text-ink-900 sm:text-[34px]">
            {title}
          </h1>

          <p className="mt-2 max-w-md text-sm leading-6 text-ink-500">
            {description}
          </p>
        </div>

        <div className="mb-6 flex items-center gap-2">
          {["email", "otp", "password"].map((item, index) => {
            const order = { email: 0, otp: 1, password: 2 };
            const active = order[step] >= index;

            return (
              <div
                key={item}
                className={`h-1.5 flex-1 rounded-full ${active ? "bg-brand-600" : "bg-ink-100"}`}
              />
            );
          })}
        </div>

        <AnimatePresence mode="wait">
          {error && (
            <motion.div
              key="forgot-error"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="auth-error"
            >
              <div className="auth-error-icon">
                <AlertCircle size={16} />
              </div>
              <div>
                <p className="text-xs font-semibold">Unable to continue</p>
                <p className="mt-0.5 text-xs opacity-80">{error}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {message && (
          <div className="mb-5 flex items-start gap-3 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-green-800">
            <CheckCircle2 size={17} className="mt-0.5 shrink-0" />
            <p className="text-xs leading-5">{message}</p>
          </div>
        )}

        {step === "email" && (
          <form onSubmit={handleRequestOtp} className="space-y-5">
            <AuthInput
              id="forgot-email"
              label="Registered email"
              icon={Mail}
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              disabled={loading}
              required
            />

            <motion.button
              type="submit"
              disabled={loading}
              whileTap={loading ? undefined : { scale: 0.985 }}
              className="auth-submit-button"
            >
              <span className="auth-button-shine" />
              <span className="relative z-10 flex items-center justify-center gap-2">
                {loading ? (
                  <>
                    <Loader2 size={17} className="animate-spin" />
                    Sending OTP...
                  </>
                ) : (
                  <>
                    Send OTP
                    <ArrowRight size={16} />
                  </>
                )}
              </span>
            </motion.button>
          </form>
        )}

        {step === "otp" && (
          <form onSubmit={handleVerifyOtp} className="space-y-5">
            <AuthInput
              id="forgot-otp"
              label="6-digit OTP"
              icon={ShieldCheck}
              value={otp}
              onChange={(event) =>
                setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))
              }
              placeholder="000000"
              inputMode="numeric"
              autoComplete="one-time-code"
              disabled={loading}
              required
            />

            <motion.button
              type="submit"
              disabled={loading || otp.length !== 6}
              whileTap={loading ? undefined : { scale: 0.985 }}
              className="auth-submit-button"
            >
              <span className="relative z-10 flex items-center justify-center gap-2">
                {loading ? (
                  <>
                    <Loader2 size={17} className="animate-spin" />
                    Verifying...
                  </>
                ) : (
                  <>
                    Verify OTP
                    <ArrowRight size={16} />
                  </>
                )}
              </span>
            </motion.button>

            <button
              type="button"
              onClick={handleResendOtp}
              disabled={loading}
              className="w-full text-center text-sm font-semibold text-brand-700 transition hover:text-brand-800 disabled:opacity-50"
            >
              Resend OTP
            </button>
          </form>
        )}

        {step === "password" && (
          <form onSubmit={handleResetPassword} className="space-y-5">
            <PasswordInput
              id="forgot-new-password"
              label="New password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              placeholder="Minimum 8 characters"
              autoComplete="new-password"
              disabled={loading}
              required
            />

            <PasswordInput
              id="forgot-confirm-password"
              label="Confirm new password"
              value={confirmNewPassword}
              onChange={(event) => setConfirmNewPassword(event.target.value)}
              placeholder="Re-enter new password"
              autoComplete="new-password"
              disabled={loading}
              required
            />

            <motion.button
              type="submit"
              disabled={loading}
              whileTap={loading ? undefined : { scale: 0.985 }}
              className="auth-submit-button"
            >
              <span className="relative z-10 flex items-center justify-center gap-2">
                {loading ? (
                  <>
                    <Loader2 size={17} className="animate-spin" />
                    Resetting password...
                  </>
                ) : (
                  <>
                    Reset password
                    <ArrowRight size={16} />
                  </>
                )}
              </span>
            </motion.button>
          </form>
        )}

        <p className="mt-8 text-center text-[11px] leading-5 text-ink-400">
          Password recovery requires access to the email registered with your account.
        </p>
      </motion.div>
    </AuthShell>
  );
}
