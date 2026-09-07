import mongoose from 'mongoose';

const { Schema } = mongoose;

const FILE_SCHEMA = new Schema(
  {
    publicId: { type: String, required: true },
    placeholderPublicId: { type: String, default: null },
    resourceType: { type: String, default: 'raw' },
    deliveryType: { type: String, default: 'authenticated' },
    originalName: { type: String, required: true },
    mimeType: { type: String, required: true },
    fileSize: { type: Number, required: true },
    encryptedSize: { type: Number, required: true },
    encryption: {
      algorithm: { type: String, default: 'aes-256-gcm' },
      iv: { type: String, required: true },
      authTag: { type: String, required: true },
      version: { type: Number, default: 1 },
    },
  },
  { _id: false }
);

const INFORMATION_REQUEST_SCHEMA = new Schema(
  {
    requestedByRole: {
      type: String,
      required: true,
      enum: ['ADMIN', 'LAWYER'],
    },
    requestedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },
    returnStatus: {
      type: String,
      required: true,
      enum: ['UNDER_ADMIN_REVIEW', 'UNDER_LAWYER_REVIEW'],
    },
    status: {
      type: String,
      enum: ['PENDING', 'SUBMITTED'],
      default: 'PENDING',
    },
    requestedAt: { type: Date, default: Date.now },
    responseMessage: {
      type: String,
      default: '',
      trim: true,
      maxlength: 2000,
    },
    respondedAt: { type: Date, default: null },
    additionalDocuments: { type: [FILE_SCHEMA], default: [] },
  },
  { _id: true }
);

export const LEGACY_CLAIM_STATUSES = [
  'LEGACY_ACCESS_REQUESTED',
  'UNDER_ADMIN_REVIEW',
  'MORE_INFORMATION_REQUIRED',
  'UNDER_LAWYER_REVIEW',
  'APPROVED_INFORMATION_RELEASED',
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
    beneficiaryRemarks: {
      type: String,
      default: '',
      trim: true,
      maxlength: 2000,
    },
    status: {
      type: String,
      enum: LEGACY_CLAIM_STATUSES,
      default: 'LEGACY_ACCESS_REQUESTED',
      index: true,
    },
    informationRequests: { type: [INFORMATION_REQUEST_SCHEMA], default: [] },
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
        enum: ['REQUEST_MORE_INFORMATION', 'APPROVE', 'REJECT', null],
        default: null,
      },
    },
    releasedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

legacyClaimSchema.index({ ownerId: 1, beneficiaryId: 1, status: 1 });

export default mongoose.model('LegacyClaim', legacyClaimSchema);
