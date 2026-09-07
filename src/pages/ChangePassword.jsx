import {
    useEffect,
    useState,
} from "react";

import {
    CheckCircle2,
    Eye,
    EyeOff,
    KeyRound,
    Loader2,
    LockKeyhole,
    Mail,
    RefreshCw,
    ShieldCheck,
    X,
} from "lucide-react";

import {
    useNavigate,
    useSearchParams,
} from "react-router-dom";

import Navbar from "../components/Navbar";

import {
    useAuth,
} from "../context/AuthContext";

import {
    homeForRole,
} from "../components/ProtectedRoute";

import {
    completePasswordChange,
    requestPasswordChangeOTP,
    verifyPasswordChangeOTP,
} from "../services/authService";


export default function ChangePassword() {

    const {
        user,
        updateCurrentUser,
    } =
        useAuth();

    const navigate =
        useNavigate();

    const [searchParams] =
        useSearchParams();

    const forced =
        searchParams.get("force") ===
        "1";


    /*
    =========================================
    OTP STATE
    =========================================
    */

    const [
        otpSent,
        setOtpSent,
    ] =
        useState(false);

    const [
        otp,
        setOtp,
    ] =
        useState("");

    const [
        resendsRemaining,
        setResendsRemaining,
    ] =
        useState(2);

    const [
        otpVerified,
        setOtpVerified,
    ] =
        useState(false);


    /*
    =========================================
    PASSWORD MODAL STATE
    =========================================
    */

    const [
        modalOpen,
        setModalOpen,
    ] =
        useState(false);

    const [
        currentPassword,
        setCurrentPassword,
    ] =
        useState("");

    const [
        newPassword,
        setNewPassword,
    ] =
        useState("");

    const [
        confirmNewPassword,
        setConfirmNewPassword,
    ] =
        useState("");


    /*
    =========================================
    PASSWORD VISIBILITY
    =========================================
    */

    const [
        showCurrent,
        setShowCurrent,
    ] =
        useState(false);

    const [
        showNew,
        setShowNew,
    ] =
        useState(false);

    const [
        showConfirm,
        setShowConfirm,
    ] =
        useState(false);


    /*
    =========================================
    UI STATE
    =========================================
    */

    const [
        loading,
        setLoading,
    ] =
        useState(false);

    const [
        error,
        setError,
    ] =
        useState("");

    const [
        success,
        setSuccess,
    ] =
        useState("");

    const [
        passwordChanged,
        setPasswordChanged,
    ] =
        useState(false);


    /*
    =========================================
    CLEAR TOASTS
    =========================================
    */

    useEffect(() => {

        if (!success) {
            return;
        }

        const timer =
            setTimeout(
                () => {
                    setSuccess("");
                },
                3500
            );

        return () =>
            clearTimeout(
                timer
            );

    }, [success]);


    /*
    =========================================
    SEND OTP
    =========================================
    */

    const sendOTP =
        async () => {

        setError("");
        setSuccess("");

        try {

            setLoading(true);

            const data =
                await requestPasswordChangeOTP();

            setOtpSent(true);

            setOtp("");

            setResendsRemaining(
                data.resendsRemaining ??
                2
            );

            setSuccess(
                data.message ||
                "OTP sent successfully."
            );

        } catch (err) {

            /*
            Backend may tell us the current
            session was already verified.
            */

            if (
                err.payload?.verified
            ) {

                setOtpVerified(true);

                setModalOpen(true);

                return;
            }

            setError(
                err.message ||
                "Unable to send OTP."
            );

        } finally {

            setLoading(false);

        }
    };


    /*
    =========================================
    RESEND OTP
    =========================================
    */

    const resendOTP =
        async () => {

        if (
            resendsRemaining <= 0 ||
            loading
        ) {
            return;
        }

        await sendOTP();
    };


    /*
    =========================================
    VERIFY OTP
    =========================================
    */

    const handleVerifyOTP =
        async (e) => {

        e.preventDefault();

        setError("");
        setSuccess("");

        if (
            !/^\d{6}$/.test(
                otp
            )
        ) {

            setError(
                "Please enter a valid 6-digit OTP."
            );

            return;
        }

        try {

            setLoading(true);

            const data =
                await verifyPasswordChangeOTP(
                    otp
                );

            setOtpVerified(
                true
            );

            setSuccess(
                data.message ||
                "Email verified successfully."
            );

            /*
            Password form only appears AFTER
            successful OTP verification.
            */

            setModalOpen(
                true
            );

        } catch (err) {

            setError(
                err.message ||
                "OTP verification failed."
            );

        } finally {

            setLoading(false);

        }
    };


    /*
    =========================================
    COMPLETE PASSWORD CHANGE
    =========================================
    */

    const handleChangePassword =
        async (e) => {

        e.preventDefault();

        setError("");
        setSuccess("");

        if (
            !currentPassword ||
            !newPassword ||
            !confirmNewPassword
        ) {

            setError(
                "Please complete all password fields."
            );

            return;
        }

        if (
            newPassword.length < 8
        ) {

            setError(
                "New password must be at least 8 characters long."
            );

            return;
        }

        if (
            newPassword !==
            confirmNewPassword
        ) {

            setError(
                "New password and confirm new password do not match."
            );

            return;
        }

        if (
            currentPassword ===
            newPassword
        ) {

            setError(
                "New password cannot be the same as your current password."
            );

            return;
        }

        try {

            setLoading(true);

            const data =
                await completePasswordChange({

                    currentPassword,

                    newPassword,

                    confirmNewPassword,

                });

            /*
            Update React + sessionStorage user
            so forced-change users don't get
            redirected back here.
            */

            if (
                data.user
            ) {

                updateCurrentUser(
                    data.user
                );

            }

            setPasswordChanged(
                true
            );

            setModalOpen(
                false
            );

            setCurrentPassword(
                ""
            );

            setNewPassword(
                ""
            );

            setConfirmNewPassword(
                ""
            );

            setSuccess(
                "Password successfully changed."
            );

            /*
            Green toast stays visible briefly,
            then navigate to role home.
            */

            setTimeout(
                () => {

                    navigate(
                        homeForRole(
                            data.user?.role ||
                            user?.role
                        ),
                        {
                            replace: true,
                        }
                    );

                },
                1800
            );

        } catch (err) {

            setError(
                err.message ||
                "Unable to change password."
            );

        } finally {

            setLoading(false);

        }
    };


    return (

        <div className="
            min-h-screen
            bg-ink-50
        ">

            <Navbar />


            {/* SUCCESS TOAST */}

            {success && (

                <div className="
                    fixed
                    right-5
                    top-24
                    z-[100]
                    flex
                    max-w-sm
                    items-center
                    gap-3
                    rounded-xl
                    border
                    border-green-200
                    bg-white
                    px-4
                    py-3
                    text-sm
                    font-medium
                    text-green-700
                    shadow-xl
                ">

                    <CheckCircle2
                        size={20}
                        className="
                            shrink-0
                            text-green-600
                        "
                    />

                    {success}

                </div>

            )}


            <main className="
                mx-auto
                max-w-xl
                px-4
                py-10
                sm:px-6
            ">

                <div className="
                    overflow-hidden
                    rounded-2xl
                    border
                    border-ink-100
                    bg-white
                    shadow-sm
                ">

                    {/* HEADER */}

                    <div className="
                        border-b
                        border-ink-100
                        bg-ink-50/50
                        px-6
                        py-6
                        text-center
                    ">

                        <div className="
                            mx-auto
                            mb-4
                            flex
                            h-14
                            w-14
                            items-center
                            justify-center
                            rounded-full
                            bg-brand-50
                            text-brand-700
                        ">

                            <ShieldCheck
                                size={28}
                            />

                        </div>

                        <h1 className="
                            text-2xl
                            font-bold
                            text-ink-900
                        ">
                            Change Password
                        </h1>

                        <p className="
                            mt-2
                            text-sm
                            leading-6
                            text-ink-500
                        ">

                            Verify your registered
                            email address before
                            updating your password.

                        </p>

                        {forced && (

                            <p className="
                                mt-3
                                rounded-lg
                                bg-amber-50
                                px-3
                                py-2
                                text-xs
                                font-medium
                                text-amber-700
                            ">

                                You must change your
                                temporary password
                                before continuing.

                            </p>

                        )}

                    </div>


                    <div className="
                        p-6
                    ">

                        {/* ERROR */}

                        {error && (

                            <div className="
                                alert-error
                                mb-5
                            ">
                                {error}
                            </div>

                        )}


                        {!passwordChanged && (

                            <>

                                {/* REGISTERED EMAIL */}

                                <div className="
                                    rounded-xl
                                    border
                                    border-brand-100
                                    bg-brand-50/60
                                    p-4
                                ">

                                    <div className="
                                        flex
                                        items-start
                                        gap-3
                                    ">

                                        <Mail
                                            size={20}
                                            className="
                                                mt-0.5
                                                shrink-0
                                                text-brand-700
                                            "
                                        />

                                        <div>

                                            <p className="
                                                text-xs
                                                font-semibold
                                                uppercase
                                                tracking-wide
                                                text-brand-600
                                            ">
                                                Registered email
                                            </p>

                                            <p className="
                                                mt-1
                                                text-sm
                                                font-semibold
                                                text-ink-800
                                            ">
                                                {user?.email}
                                            </p>

                                            <p className="
                                                mt-1
                                                text-xs
                                                text-ink-500
                                            ">
                                                OTP expires after
                                                5 minutes.
                                            </p>

                                        </div>

                                    </div>

                                </div>


                                {/* BEFORE OTP */}

                                {!otpSent && (

                                    <button
                                        type="button"
                                        onClick={sendOTP}
                                        disabled={loading}
                                        className="
                                            btn-primary
                                            mt-5
                                            w-full
                                        "
                                    >

                                        {loading ? (

                                            <>
                                                <Loader2
                                                    size={16}
                                                    className="
                                                        animate-spin
                                                    "
                                                />

                                                Sending OTP...
                                            </>

                                        ) : (

                                            <>
                                                <Mail
                                                    size={16}
                                                />

                                                Send OTP
                                            </>

                                        )}

                                    </button>

                                )}


                                {/* OTP FORM */}

                                {otpSent &&
                                    !otpVerified && (

                                    <form
                                        onSubmit={
                                            handleVerifyOTP
                                        }
                                        className="
                                            mt-6
                                            space-y-4
                                        "
                                    >

                                        <div>

                                            <label className="
                                                field-label
                                            ">
                                                Enter 6-digit OTP
                                            </label>

                                            <input
                                                type="text"
                                                inputMode="numeric"
                                                autoComplete="one-time-code"
                                                maxLength={6}
                                                value={otp}
                                                onChange={(e) =>
                                                    setOtp(
                                                        e.target.value
                                                            .replace(
                                                                /\D/g,
                                                                ""
                                                            )
                                                            .slice(
                                                                0,
                                                                6
                                                            )
                                                    )
                                                }
                                                placeholder="123456"
                                                className="
                                                    field-input
                                                    text-center
                                                    text-xl
                                                    tracking-[0.45em]
                                                "
                                                required
                                            />

                                        </div>


                                        <button
                                            type="submit"
                                            disabled={loading}
                                            className="
                                                btn-primary
                                                w-full
                                            "
                                        >

                                            {loading ? (

                                                <>
                                                    <Loader2
                                                        size={16}
                                                        className="
                                                            animate-spin
                                                        "
                                                    />

                                                    Verifying...
                                                </>

                                            ) : (

                                                <>
                                                    <KeyRound
                                                        size={16}
                                                    />

                                                    Verify OTP
                                                </>

                                            )}

                                        </button>


                                        <div className="
                                            flex
                                            items-center
                                            justify-between
                                            gap-3
                                            border-t
                                            border-ink-100
                                            pt-4
                                        ">

                                            <p className="
                                                text-xs
                                                text-ink-500
                                            ">

                                                {
                                                    resendsRemaining
                                                } resend{
                                                    resendsRemaining ===
                                                    1
                                                        ? ""
                                                        : "s"
                                                } remaining

                                            </p>

                                            <button
                                                type="button"
                                                onClick={
                                                    resendOTP
                                                }
                                                disabled={
                                                    loading ||
                                                    resendsRemaining <=
                                                        0
                                                }
                                                className="
                                                    inline-flex
                                                    items-center
                                                    gap-1.5
                                                    text-xs
                                                    font-semibold
                                                    text-brand-700
                                                    disabled:cursor-not-allowed
                                                    disabled:text-ink-300
                                                "
                                            >

                                                <RefreshCw
                                                    size={14}
                                                />

                                                Resend OTP

                                            </button>

                                        </div>

                                    </form>

                                )}

                            </>

                        )}


                        {/* SUCCESS STATE */}

                        {passwordChanged && (

                            <div className="
                                py-5
                                text-center
                            ">

                                <div className="
                                    mx-auto
                                    flex
                                    h-16
                                    w-16
                                    items-center
                                    justify-center
                                    rounded-full
                                    bg-green-50
                                    text-green-600
                                ">

                                    <CheckCircle2
                                        size={32}
                                    />

                                </div>

                                <h2 className="
                                    mt-4
                                    text-xl
                                    font-semibold
                                    text-ink-900
                                ">
                                    Password Changed
                                </h2>

                                <p className="
                                    mt-2
                                    text-sm
                                    text-ink-500
                                ">
                                    Your password was updated
                                    successfully. Redirecting you
                                    to your dashboard...
                                </p>

                            </div>

                        )}

                    </div>

                </div>

            </main>


            {/* =================================
                PASSWORD MODAL
               ================================= */}

            {modalOpen && (

                <div className="
                    fixed
                    inset-0
                    z-[90]
                    flex
                    items-center
                    justify-center
                    bg-slate-950/50
                    px-4
                    backdrop-blur-sm
                ">

                    <div className="
                        w-full
                        max-w-md
                        overflow-hidden
                        rounded-2xl
                        bg-white
                        shadow-2xl
                    ">

                        <div className="
                            flex
                            items-center
                            justify-between
                            border-b
                            border-ink-100
                            px-5
                            py-4
                        ">

                            <div className="
                                flex
                                items-center
                                gap-2
                            ">

                                <LockKeyhole
                                    size={19}
                                    className="
                                        text-brand-700
                                    "
                                />

                                <h2 className="
                                    font-semibold
                                    text-ink-900
                                ">
                                    Set New Password
                                </h2>

                            </div>


                            {!forced && (

                                <button
                                    type="button"
                                    onClick={() =>
                                        setModalOpen(
                                            false
                                        )
                                    }
                                    className="
                                        rounded-lg
                                        p-1.5
                                        text-ink-400
                                        transition
                                        hover:bg-ink-50
                                        hover:text-ink-700
                                    "
                                >

                                    <X
                                        size={18}
                                    />

                                </button>

                            )}

                        </div>


                        <form
                            onSubmit={
                                handleChangePassword
                            }
                            className="
                                space-y-4
                                p-5
                            "
                        >

                            {/* CURRENT PASSWORD */}

                            <div>

                                <label className="
                                    field-label
                                ">
                                    Current Password
                                </label>

                                <div className="
                                    relative
                                ">

                                    <input
                                        type={
                                            showCurrent
                                                ? "text"
                                                : "password"
                                        }
                                        value={
                                            currentPassword
                                        }
                                        onChange={(e) =>
                                            setCurrentPassword(
                                                e.target.value
                                            )
                                        }
                                        className="
                                            field-input
                                            pr-11
                                        "
                                        autoComplete="current-password"
                                        required
                                    />

                                    <button
                                        type="button"
                                        onClick={() =>
                                            setShowCurrent(
                                                (value) =>
                                                    !value
                                            )
                                        }
                                        className="
                                            absolute
                                            right-3
                                            top-1/2
                                            -translate-y-1/2
                                            text-ink-400
                                        "
                                    >

                                        {showCurrent ? (
                                            <EyeOff
                                                size={17}
                                            />
                                        ) : (
                                            <Eye
                                                size={17}
                                            />
                                        )}

                                    </button>

                                </div>

                            </div>


                            {/* NEW PASSWORD */}

                            <div>

                                <label className="
                                    field-label
                                ">
                                    New Password
                                </label>

                                <div className="
                                    relative
                                ">

                                    <input
                                        type={
                                            showNew
                                                ? "text"
                                                : "password"
                                        }
                                        value={
                                            newPassword
                                        }
                                        onChange={(e) =>
                                            setNewPassword(
                                                e.target.value
                                            )
                                        }
                                        className="
                                            field-input
                                            pr-11
                                        "
                                        autoComplete="new-password"
                                        minLength={8}
                                        required
                                    />

                                    <button
                                        type="button"
                                        onClick={() =>
                                            setShowNew(
                                                (value) =>
                                                    !value
                                            )
                                        }
                                        className="
                                            absolute
                                            right-3
                                            top-1/2
                                            -translate-y-1/2
                                            text-ink-400
                                        "
                                    >

                                        {showNew ? (
                                            <EyeOff
                                                size={17}
                                            />
                                        ) : (
                                            <Eye
                                                size={17}
                                            />
                                        )}

                                    </button>

                                </div>

                                <p className="
                                    mt-1
                                    text-xs
                                    text-ink-400
                                ">
                                    Minimum 8 characters.
                                </p>

                            </div>


                            {/* CONFIRM PASSWORD */}

                            <div>

                                <label className="
                                    field-label
                                ">
                                    Confirm New Password
                                </label>

                                <div className="
                                    relative
                                ">

                                    <input
                                        type={
                                            showConfirm
                                                ? "text"
                                                : "password"
                                        }
                                        value={
                                            confirmNewPassword
                                        }
                                        onChange={(e) =>
                                            setConfirmNewPassword(
                                                e.target.value
                                            )
                                        }
                                        className="
                                            field-input
                                            pr-11
                                        "
                                        autoComplete="new-password"
                                        minLength={8}
                                        required
                                    />

                                    <button
                                        type="button"
                                        onClick={() =>
                                            setShowConfirm(
                                                (value) =>
                                                    !value
                                            )
                                        }
                                        className="
                                            absolute
                                            right-3
                                            top-1/2
                                            -translate-y-1/2
                                            text-ink-400
                                        "
                                    >

                                        {showConfirm ? (
                                            <EyeOff
                                                size={17}
                                            />
                                        ) : (
                                            <Eye
                                                size={17}
                                            />
                                        )}

                                    </button>

                                </div>

                            </div>


                            {error && (

                                <div className="
                                    alert-error
                                ">
                                    {error}
                                </div>

                            )}


                            <button
                                type="submit"
                                disabled={loading}
                                className="
                                    btn-primary
                                    w-full
                                "
                            >

                                {loading ? (

                                    <>
                                        <Loader2
                                            size={16}
                                            className="
                                                animate-spin
                                            "
                                        />

                                        Changing Password...
                                    </>

                                ) : (

                                    <>
                                        <ShieldCheck
                                            size={16}
                                        />

                                        Change Password
                                    </>

                                )}

                            </button>

                        </form>

                    </div>

                </div>

            )}

        </div>
    );
}