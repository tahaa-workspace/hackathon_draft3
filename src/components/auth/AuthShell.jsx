import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

import AuthBrandPanel from "./AuthBrandPanel";

export default function AuthShell({
  children,
}) {
  return (
    <div className="auth-page">

      {/* Background */}
      <div className="auth-background">
        <div className="auth-grid" />

        <div className="auth-orb auth-orb-one" />
        <div className="auth-orb auth-orb-two" />
        <div className="auth-orb auth-orb-three" />
      </div>


      <div className="relative z-10 grid min-h-screen lg:grid-cols-[1.05fr_0.95fr]">

        {/* Left visual side */}
        <AuthBrandPanel />


        {/* Right login side */}
        <main className="relative flex min-h-screen items-center justify-center px-5 py-10 sm:px-8 lg:px-12">

          {/* Home button */}
          <Link
            to="/"
            className="auth-home-link"
          >
            <ArrowLeft size={15} />

            <span>Back to home</span>
          </Link>


          <div className="w-full max-w-[450px]">

            <div className="auth-form-card">
              {children}
            </div>

          </div>

        </main>

      </div>

    </div>
  );
}