import mongoose from 'mongoose';

const { Schema } = mongoose;

const profileContactVerificationSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['EMAIL', 'PHONE'],
      required: true,
    },
    value: {
      type: String,
      required: true,
      trim: true,
    },
    otpHash: {
      type: String,
      required: true,
      select: false,
    },
    attempts: {
      type: Number,
      default: 0,
    },
    lastSentAt: {
      type: Date,
      default: Date.now,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: 0 },
    },
  },
  { timestamps: true }
);

profileContactVerificationSchema.index(
  { userId: 1, type: 1 },
  { unique: true }
);

export default mongoose.model(
  'ProfileContactVerification',
  profileContactVerificationSchema
);
