import mongoose from 'mongoose';

const { Schema } = mongoose;

const registrationPhoneVerificationSchema = new Schema(
  {
    phone: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
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
  'RegistrationPhoneVerification',
  registrationPhoneVerificationSchema
);
