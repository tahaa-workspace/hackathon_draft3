import mongoose from 'mongoose';

const contactMessageSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    email: { type: String, required: true, trim: true, lowercase: true, maxlength: 160 },
    category: {
      type: String,
      required: true,
      enum: [
        'GENERAL',
        'ACCOUNT_SUPPORT',
        'BENEFICIARY_SUPPORT',
        'LEGACY_CLAIM_SUPPORT',
        'LEGAL_ADVISOR',
        'TECHNICAL',
      ],
    },
    subject: { type: String, required: true, trim: true, maxlength: 180 },
    message: { type: String, required: true, trim: true, maxlength: 3000 },
    status: {
      type: String,
      enum: ['NEW', 'IN_REVIEW', 'RESOLVED'],
      default: 'NEW',
      index: true,
    },
    source: { type: String, default: 'CONTACT_PAGE' },
  },
  { timestamps: true }
);

contactMessageSchema.index({ createdAt: -1 });

export default mongoose.model('ContactMessage', contactMessageSchema);
