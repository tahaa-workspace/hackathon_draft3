import { useState } from "react";
import {
  useNavigate,
  useLocation,
  Link,
} from "react-router-dom";

import {
  AlertCircle,
  ArrowRight,
  Loader2,
  LogIn,
  Mail,
  ShieldCheck,
} from "lucide-react";

import { motion, AnimatePresence } from "framer-motion";

import { useAuth } from "../context/AuthContext";
import { homeForRole } from "../components/ProtectedRoute";

import AuthShell from "../components/auth/AuthShell";
import AuthInput from "../components/auth/AuthInput";
import PasswordInput from "../components/auth/PasswordInput";

import "../styles/auth.css";

export default function Login() {
  const { login } = useAuth();

  const navigate = useNavigate();
  const location = useLocation();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");
    setLoading(true);

    try {
      const user = await login({
        identifier,
        password,
      });

      const dest = user.mustChangePassword
        ? "/change-password?force=1"
        : location.state?.from ||
          homeForRole(user.role);

      navigate(dest, {
        replace: true,
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell>

      <motion.div
        initial={{
          opacity: 0,
          y: 22,
        }}
        animate={{
          opacity: 1,
          y: 0,
        }}
        transition={{
          duration: 0.55,
          ease: [0.22, 1, 0.36, 1],
        }}
      >

        {/* Mobile logo */}
        <div className="mb-8 flex items-center gap-3 lg:hidden">

          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-brand-600 to-accent-violet text-white shadow-lg shadow-brand-600/20">
            <ShieldCheck size={20} />
          </div>

          <div>
            <p className="text-sm font-bold text-ink-900">
              Digital Legacy
            </p>

            <p className="text-xs text-ink-400">
              Next Gen Vault
            </p>
          </div>

        </div>


        {/* Heading */}
        <div className="mb-8">

          <div className="auth-eyebrow">
            <ShieldCheck size={13} />
            Secure authentication
          </div>

          <h1 className="mt-4 text-3xl font-bold tracking-[-0.025em] text-ink-900 sm:text-[34px]">
            Welcome back
          </h1>

          <p className="mt-2 max-w-md text-sm leading-6 text-ink-500">
            Sign in to securely access your Digital
            Legacy account.
          </p>

        </div>


        {/* Error */}
        <AnimatePresence mode="wait">

          {error && (
            <motion.div
              key="login-error"
              initial={{
                opacity: 0,
                y: -8,
                scale: 0.98,
              }}
              animate={{
                opacity: 1,
                y: 0,
                scale: 1,
              }}
              exit={{
                opacity: 0,
                y: -5,
              }}
              className="auth-error"
            >
              <div className="auth-error-icon">
                <AlertCircle size={16} />
              </div>

              <div>
                <p className="text-xs font-semibold">
                  Unable to sign in
                </p>

                <p className="mt-0.5 text-xs opacity-80">
                  {error}
                </p>
              </div>
            </motion.div>
          )}

        </AnimatePresence>


        {/* Login Form */}
        <form
          onSubmit={handleSubmit}
          className="mt-6 space-y-5"
        >

          <AuthInput
            id="identifier"
            label="Username or email"
            icon={Mail}
            value={identifier}
            onChange={(e) =>
              setIdentifier(e.target.value)
            }
            placeholder="you@example.com"
            autoComplete="username"
            disabled={loading}
            required
          />


          <PasswordInput
            id="password"
            label="Password"
            value={password}
            onChange={(e) =>
              setPassword(e.target.value)
            }
            placeholder="Enter your password"
            autoComplete="current-password"
            disabled={loading}
            required
          />


          {/* Small security information */}
          <div className="flex items-center gap-2 text-xs text-ink-400">
            <ShieldCheck
              size={13}
              className="text-green-500"
            />

            Your credentials are sent through a
            protected authentication flow.
          </div>


          {/* Sign in button */}
          <motion.button
            type="submit"
            disabled={loading}
            whileTap={
              loading
                ? undefined
                : {
                    scale: 0.985,
                  }
            }
            className="auth-submit-button"
          >

            <span className="auth-button-shine" />

            <span className="relative z-10 flex items-center justify-center gap-2">

              {loading ? (
                <>
                  <Loader2
                    size={17}
                    className="animate-spin"
                  />

                  Signing in...
                </>
              ) : (
                <>
                  <LogIn size={17} />

                  Sign in

                  <ArrowRight
                    size={16}
                    className="auth-submit-arrow"
                  />
                </>
              )}

            </span>

          </motion.button>

        </form>


        {/* Registration */}
        <div className="auth-divider">
          <span>New to Next Gen Vault?</span>
        </div>

        <Link
          to="/register"
          className="auth-create-button group"
        >
          Create an Owner account

          <ArrowRight
            size={15}
            className="transition-transform duration-200 group-hover:translate-x-1"
          />
        </Link>


        {/* Footer */}
        <p className="mt-8 text-center text-[11px] leading-5 text-ink-400">
          Access is protected according to your
          assigned role and permissions.
        </p>

      </motion.div>

    </AuthShell>
  );
}