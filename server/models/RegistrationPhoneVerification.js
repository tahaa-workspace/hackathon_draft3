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
    tokenHash: {
      type: String,
      required: true,
      select: false,
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
