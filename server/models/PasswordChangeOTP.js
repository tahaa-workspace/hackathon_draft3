import mongoose from "mongoose";

const passwordChangeOTPSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            unique: true,
        },

        otpHash: {
            type: String,
            required: true,
        },

        // New password is stored only as a bcrypt hash.
        // Plain password is NEVER stored.
        newPasswordHash: {
            type: String,
            required: true,
        },

        expiresAt: {
            type: Date,
            required: true,
        },

        attempts: {
            type: Number,
            default: 0,
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