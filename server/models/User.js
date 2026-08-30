import mongoose from 'mongoose';

const { Schema } = mongoose;

const ALLOWED_ROLES = ['ADMIN', 'OWNER', 'BENEFICIARY'];
const ALLOWED_STATUSES = ['PENDING', 'ACTIVE', 'REJECTED'];

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    username: { type: String, required: true, unique: true, trim: true, lowercase: true },
    email: { type: String, required: true, unique: true, trim: true, lowercase: true },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ALLOWED_ROLES, required: true },
    status: { type: String, enum: ALLOWED_STATUSES, required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    mustChangePassword: { type: Boolean, default: false },
    aadhaarDocument: {
      publicId: { type: String, default: null },
      resourceType: { type: String, default: null },
      originalName: { type: String, default: null },
      mimeType: { type: String, default: null },
      fileSize: { type: Number, default: null },
    },
    verification: {
      reviewedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
      reviewedAt: { type: Date, default: null },
      rejectionReason: { type: String, default: null, trim: true },
    },
  },
  { timestamps: true }
);

userSchema.set('toJSON', {
  versionKey: false,
  transform: (_doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.passwordHash;
    if (ret.aadhaarDocument) {
      delete ret.aadhaarDocument.publicId;
    }
    return ret;
  },
});

export default mongoose.model('User', userSchema);
export { ALLOWED_ROLES, ALLOWED_STATUSES };
