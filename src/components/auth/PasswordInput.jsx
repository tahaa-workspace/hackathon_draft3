import { useState } from "react";

import {
  Eye,
  EyeOff,
  LockKeyhole,
} from "lucide-react";

export default function PasswordInput({
  id,
  label,
  ...inputProps
}) {
  const [showPassword, setShowPassword] =
    useState(false);

  return (
    <div>

      <label
        htmlFor={id}
        className="auth-field-label"
      >
        {label}
      </label>


      <div className="auth-input-wrapper">

        <LockKeyhole
          size={17}
          className="auth-input-icon"
        />


        <input
          id={id}
          type={
            showPassword
              ? "text"
              : "password"
          }
          className="auth-input auth-input-password"
          {...inputProps}
        />


        <button
          type="button"
          onClick={() =>
            setShowPassword(
              (current) => !current
            )
          }
          className="auth-password-toggle"
          aria-label={
            showPassword
              ? "Hide password"
              : "Show password"
          }
        >

          {showPassword ? (
            <EyeOff size={16} />
          ) : (
            <Eye size={16} />
          )}

        </button>

      </div>

    </div>
  );
}