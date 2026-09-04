import mongoose from 'mongoose';

const { Schema } = mongoose;

const FILE_SCHEMA = new Schema(
  {
    publicId: { type: String, required: true },
    resourceType: { type: String, default: 'image' },
    originalName: { type: String, required: true },
    mimeType: { type: String, required: true },
    fileSize: { type: Number, required: true },
  },
  { _id: false }
);

export const LEGACY_CLAIM_STATUSES = [
  'LEGACY_ACCESS_REQUESTED',
  'UNDER_ADMIN_REVIEW',
  'MORE_INFORMATION_REQUIRED',
  'UNDER_LAWYER_REVIEW',
  'APPROVED_INFORMATION_RELEASED',
  'ON_HOLD_DISPUTED',
  'REJECTED_PLATFORM_CLAIM',
];

const legacyClaimSchema = new Schema(
  {
    ownerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    beneficiaryId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    assignedLawyerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    identityProofType: {
      type: String,
      required: true,
      enum: ['AADHAAR', 'PASSPORT', 'DRIVING_LICENCE', 'VOTER_ID', 'OTHER'],
    },
    deathCertificate: { type: FILE_SCHEMA, required: true },
    identityProof: { type: FILE_SCHEMA, required: true },
    supportingDocument: { type: FILE_SCHEMA, default: null },
    beneficiaryRemarks: { type: String, default: '', trim: true, maxlength: 2000 },
    status: {
      type: String,
      enum: LEGACY_CLAIM_STATUSES,
      default: 'LEGACY_ACCESS_REQUESTED',
      index: true,
    },
    adminReview: {
      reviewedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
      reviewedAt: { type: Date, default: null },
      remarks: { type: String, default: '', trim: true, maxlength: 2000 },
    },
    lawyerReview: {
      reviewedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
      reviewedAt: { type: Date, default: null },
      remarks: { type: String, default: '', trim: true, maxlength: 2000 },
      action: {
        type: String,
        enum: ['REQUEST_MORE_INFORMATION', 'APPROVE', 'HOLD', null],
        default: null,
      },
    },
    releasedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

legacyClaimSchema.index({ ownerId: 1, beneficiaryId: 1, status: 1 });

export default mongoose.model('LegacyClaim', legacyClaimSchema);
