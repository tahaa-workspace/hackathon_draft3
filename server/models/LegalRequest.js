import mongoose from 'mongoose';

const { Schema } = mongoose;

export const LEGAL_REQUEST_STATUSES = [
  'PENDING',
  'ASSIGNED',
  'ACCEPTED',
  'IN_PROGRESS',
  'COMPLETED',
  'REJECTED',
  'CANCELLED',
];

const legalRequestSchema = new Schema(
  {
    requesterId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    lawyerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    requestType: {
      type: String,
      enum: ['LIFETIME_CONSULTATION'],
      default: 'LIFETIME_CONSULTATION',
      index: true,
    },
    subject: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 4000,
    },
    status: {
      type: String,
      enum: LEGAL_REQUEST_STATUSES,
      default: 'PENDING',
      index: true,
    },
    lawyerRemarks: {
      type: String,
      default: '',
      trim: true,
      maxlength: 4000,
    },
  },
  { timestamps: true }
);

legalRequestSchema.index({ lawyerId: 1, status: 1, createdAt: -1 });
legalRequestSchema.index({ requesterId: 1, createdAt: -1 });

export default mongoose.model('LegalRequest', legalRequestSchema);
