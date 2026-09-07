import mongoose from "mongoose";

const passwordChangeOTPSchema =
    new mongoose.Schema(
        {
            userId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User",
                required: true,
                unique: true,
                index: true,
            },

            /*
            =========================================
            OTP
            =========================================
            */

            otpHash: {
                type: String,
                required: true,
            },

            /*
            OTP expires after 5 minutes.
            */

            expiresAt: {
                type: Date,
                required: true,
            },

            /*
            Invalid OTP attempts.
            Maximum = 5.
            */

            attempts: {
                type: Number,
                default: 0,
            },

            /*
            Initial OTP email does NOT count.

            resendCount:
            0 = no resend used
            1 = first resend used
            2 = second resend used

            More than 2 is blocked.
            */

            resendCount: {
                type: Number,
                default: 0,
            },

            /*
            =========================================
            OTP VERIFICATION STATE
            =========================================
            */

            otpVerified: {
                type: Boolean,
                default: false,
            },

            verifiedAt: {
                type: Date,
                default: null,
            },
        },
        {
            timestamps: true,
        }
    );

export default mongoose.model(
    "PasswordChangeOTP",
    passwordChangeOTPSchema
);