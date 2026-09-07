import mongoose from 'mongoose';

const { Schema } = mongoose;

const registrationEmailVerificationSchema = new Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
      lowercase: true,
    },
    otpHash: {
      type: String,
      default: null,
      select: false,
    },
    attempts: {
      type: Number,
      default: 0,
      min: 0,
    },
    resendCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    lastSentAt: {
      type: Date,
      default: null,
    },
    tokenHash: {
      type: String,
      default: null,
      select: false,
    },
    verifiedAt: {
      type: Date,
      default: null,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: 0 },
    },
  },
  { timestamps: true }
);

export default mongoose.model(
  'RegistrationEmailVerification',
  registrationEmailVerificationSchema
);
