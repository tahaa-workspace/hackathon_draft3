import { useState } from "react";
import { ShieldCheck, KeyRound, Mail, Loader2 } from "lucide-react";

import Navbar from "../components/Navbar";
import { useAuth } from "../context/AuthContext";

import {
    requestPasswordChangeOTP,
    verifyPasswordChangeOTP,
} from "../services/authService";

export default function ChangePassword() {
    const { token, user } = useAuth();

    const [step, setStep] = useState(1);

    const [currentPassword, setCurrentPassword] =
        useState("");

    const [newPassword, setNewPassword] =
        useState("");

    const [confirmPassword, setConfirmPassword] =
        useState("");

    const [otp, setOtp] = useState("");

    const [loading, setLoading] =
        useState(false);

    const [error, setError] =
        useState("");

    const [success, setSuccess] =
        useState("");

    const handleRequestOTP = async (e) => {
        e.preventDefault();

        setError("");
        setSuccess("");

        if (newPassword !== confirmPassword) {
            setError("New passwords do not match.");
            return;
        }

        if (newPassword.length < 8) {
            setError(
                "New password must be at least 8 characters long."
            );
            return;
        }

        try {
            setLoading(true);

            const data =
                await requestPasswordChangeOTP(
                    currentPassword,
                    newPassword,
                    token
                );

            setSuccess(data.message);

            setStep(2);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOTP = async (e) => {
        e.preventDefault();

        setError("");
        setSuccess("");

        if (otp.length !== 6) {
            setError("Please enter a valid 6-digit OTP.");
            return;
        }

        try {
            setLoading(true);

            const data =
                await verifyPasswordChangeOTP(
                    otp,
                    token
                );

            setSuccess(data.message);

            setCurrentPassword("");
            setNewPassword("");
            setConfirmPassword("");
            setOtp("");

            setStep(3);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-ink-50">
            <Navbar />

            <main className="mx-auto max-w-lg px-4 py-10">

                <div className="card">

                    {/* HEADER */}

                    <div className="mb-6 text-center">

                        <div className="
                            mx-auto mb-3
                            flex h-14 w-14
                            items-center justify-center
                            rounded-full
                            bg-brand-50
                            text-brand-700
                        ">
                            <ShieldCheck size={28} />
                        </div>

                        <h1 className="
                            text-2xl
                            font-semibold
                            text-ink-900
                        ">
                            Secure Password Change
                        </h1>

                        <p className="
                            mt-2
                            text-sm
                            text-ink-500
                        ">
                            Multi-factor authentication is
                            required to change your password.
                        </p>

                    </div>


                    {/* ERROR */}

                    {error && (
                        <div className="alert-error mb-4">
                            {error}
                        </div>
                    )}


                    {/* SUCCESS */}

                    {success && (
                        <div className="
                            alert-success
                            mb-4
                        ">
                            {success}
                        </div>
                    )}


                    {/* STEP 1 */}

                    {step === 1 && (

                        <form
                            onSubmit={handleRequestOTP}
                            className="space-y-4"
                        >

                            <div>

                                <label className="field-label">
                                    Current Password
                                </label>

                                <input
                                    type="password"
                                    className="field-input"
                                    value={currentPassword}
                                    onChange={(e) =>
                                        setCurrentPassword(
                                            e.target.value
                                        )
                                    }
                                    required
                                />

                            </div>


                            <div>

                                <label className="field-label">
                                    New Password
                                </label>

                                <input
                                    type="password"
                                    className="field-input"
                                    value={newPassword}
                                    onChange={(e) =>
                                        setNewPassword(
                                            e.target.value
                                        )
                                    }
                                    required
                                />

                            </div>


                            <div>

                                <label className="field-label">
                                    Confirm New Password
                                </label>

                                <input
                                    type="password"
                                    className="field-input"
                                    value={confirmPassword}
                                    onChange={(e) =>
                                        setConfirmPassword(
                                            e.target.value
                                        )
                                    }
                                    required
                                />

                            </div>


                            <button
                                type="submit"
                                className="btn-primary w-full"
                                disabled={loading}
                            >

                                {loading ? (
                                    <>
                                        <Loader2
                                            size={16}
                                            className="animate-spin"
                                        />

                                        Sending OTP...
                                    </>
                                ) : (
                                    <>
                                        <Mail size={16} />

                                        Send Verification OTP
                                    </>
                                )}

                            </button>

                        </form>

                    )}


                    {/* STEP 2 */}

                    {step === 2 && (

                        <form
                            onSubmit={handleVerifyOTP}
                            className="space-y-4"
                        >

                            <div className="
                                rounded-lg
                                bg-brand-50
                                p-4
                                text-center
                            ">

                                <Mail
                                    className="
                                        mx-auto
                                        mb-2
                                        text-brand-700
                                    "
                                    size={24}
                                />

                                <p className="
                                    text-sm
                                    text-ink-600
                                ">

                                    A 6-digit verification code
                                    has been sent to:

                                </p>

                                <p className="
                                    mt-1
                                    font-semibold
                                    text-ink-900
                                ">

                                    {user?.email}

                                </p>

                                <p className="
                                    mt-2
                                    text-xs
                                    text-ink-500
                                ">

                                    The OTP expires in 5 minutes.

                                </p>

                            </div>


                            <div>

                                <label className="field-label">
                                    Enter 6-digit OTP
                                </label>

                                <input
                                    type="text"
                                    inputMode="numeric"
                                    maxLength="6"
                                    placeholder="123456"
                                    className="
                                        field-input
                                        text-center
                                        text-xl
                                        tracking-[0.5em]
                                    "
                                    value={otp}
                                    onChange={(e) =>
                                        setOtp(
                                            e.target.value.replace(
                                                /\D/g,
                                                ""
                                            )
                                        )
                                    }
                                    required
                                />

                            </div>


                            <button
                                type="submit"
                                className="btn-primary w-full"
                                disabled={loading}
                            >

                                {loading ? (
                                    <>
                                        <Loader2
                                            size={16}
                                            className="animate-spin"
                                        />

                                        Verifying...
                                    </>
                                ) : (
                                    <>
                                        <KeyRound size={16} />

                                        Verify & Change Password
                                    </>
                                )}

                            </button>

                        </form>

                    )}


                    {/* STEP 3 */}

                    {step === 3 && (

                        <div className="py-6 text-center">

                            <div className="
                                mx-auto mb-4
                                flex h-16 w-16
                                items-center justify-center
                                rounded-full
                                bg-green-50
                                text-green-600
                            ">

                                <ShieldCheck size={32} />

                            </div>

                            <h2 className="
                                text-xl
                                font-semibold
                                text-ink-900
                            ">
                                Password Changed Successfully
                            </h2>

                            <p className="
                                mt-2
                                text-sm
                                text-ink-500
                            ">

                                Your password was changed after
                                successful multi-factor verification.

                            </p>

                        </div>

                    )}

                </div>

            </main>

        </div>
    );
}