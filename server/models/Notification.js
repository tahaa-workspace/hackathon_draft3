import mongoose from 'mongoose';

const { Schema } = mongoose;

const notificationSchema = new Schema(
  {
    recipientId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: {
      type: String,
      enum: [
        'EMAIL_VERIFICATION',
        'LEGACY_ALLOCATION',
        'LEGACY_CLAIM',
        'ADMIN_REVIEW',
        'LAWYER_REVIEW',
        'LEGACY_APPROVED',
        'LEGACY_REJECTED',
        'LEGACY_UNLOCKED',
        'LEGACY_RELEASE',
        'DOCUMENT_VERIFICATION',
        'LEGAL_REQUEST',
        'SECURITY',
        'SYSTEM',
      ],
      required: true,
      index: true,
    },
    title: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    relatedEntityType: { type: String, default: null },
    relatedEntityId: { type: Schema.Types.ObjectId, default: null },
    isRead: { type: Boolean, default: false, index: true },
    emailSent: { type: Boolean, default: false },
    emailSentAt: { type: Date, default: null },
  },
  { timestamps: true }
);

notificationSchema.index({ recipientId: 1, isRead: 1, createdAt: -1 });

export default mongoose.model('Notification', notificationSchema);
