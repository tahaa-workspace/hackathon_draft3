import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

import AuthBrandPanel from "./AuthBrandPanel";

export default function AuthShell({
  children,
  variant = "default",
}) {
  const isWide = variant === "wide";

  return (
    <div
      className={`auth-page ${
        isWide ? "auth-page-wide" : ""
      }`}
    >
      {/* Background */}
      <div className="auth-background">
        <div className="auth-grid" />

        <div className="auth-orb auth-orb-one" />
        <div className="auth-orb auth-orb-two" />
        <div className="auth-orb auth-orb-three" />
      </div>

      <div
        className={`
          relative z-10 grid min-h-screen
          ${
            isWide
              ? "lg:grid-cols-[0.95fr_1.05fr]"
              : "lg:grid-cols-[1.05fr_0.95fr]"
          }
        `}
      >
        {/* Left visual side */}
        <AuthBrandPanel />

        {/* Right form side */}
        <main
          className={`
            auth-form-side
            relative flex min-h-screen
            justify-center
            px-5 sm:px-8 lg:px-10 xl:px-12

            ${
              isWide
                ? "items-start py-24 lg:py-20"
                : "items-center py-10"
            }
          `}
        >
          <Link
            to="/"
            className="auth-home-link"
          >
            <ArrowLeft size={15} />
            <span>Back to home</span>
          </Link>

          <div
            className={
              isWide
                ? "auth-form-wrapper auth-form-wrapper-wide"
                : "auth-form-wrapper"
            }
          >
            <div
              className={`
                auth-form-card
                ${isWide ? "auth-form-card-wide" : ""}
              `}
            >
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}