import mongoose from 'mongoose';

const { Schema } = mongoose;

export const LEGACY_ALLOCATION_STATUSES = [
  'ACTIVE',
  'PENDING',
  'RELEASED',
  'CLAIMED',
  'REVOKED',
  'EXPIRED',
];

const legacyAllocationSchema = new Schema(
  {
    assetId: {
      type: Schema.Types.ObjectId,
      ref: 'Document',
      required: true,
      index: true,
    },
    allocatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    allocatedTo: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    permissions: {
      view: { type: Boolean, default: true },
      download: { type: Boolean, default: false },
    },
    status: {
      type: String,
      enum: LEGACY_ALLOCATION_STATUSES,
      default: 'ACTIVE',
      index: true,
    },
    releaseCondition: {
      type: String,
      enum: ['LEGACY_CLAIM', 'DATE', 'IMMEDIATE'],
      default: 'LEGACY_CLAIM',
    },
    releaseDate: { type: Date, default: null },
    revokedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

legacyAllocationSchema.index({ assetId: 1, allocatedTo: 1, status: 1 });
legacyAllocationSchema.index({ allocatedTo: 1, status: 1, createdAt: -1 });
legacyAllocationSchema.index({ allocatedBy: 1, createdAt: -1 });

export default mongoose.model('LegacyAllocation', legacyAllocationSchema);
