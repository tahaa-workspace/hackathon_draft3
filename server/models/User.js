import mongoose from 'mongoose';

const { Schema } = mongoose;

const ALLOWED_ROLES = ['ADMIN', 'OWNER', 'BENEFICIARY', 'LAWYER'];
const ALLOWED_STATUSES = ['PENDING', 'ACTIVE', 'SUSPENDED', 'REJECTED'];

const encryptedDocumentSchema = {
  publicId: { type: String, default: null },
  placeholderPublicId: { type: String, default: null },
  resourceType: { type: String, default: 'raw' },
  deliveryType: { type: String, default: 'authenticated' },
  originalName: { type: String, default: null },
  mimeType: { type: String, default: null },
  fileSize: { type: Number, default: null },
  encryptedSize: { type: Number, default: null },
  encryption: {
    algorithm: { type: String, default: 'aes-256-gcm' },
    iv: { type: String, default: null },
    authTag: { type: String, default: null },
    version: { type: Number, default: 1 },
  },
};

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    emailVerified: { type: Boolean, default: false },
    phone: { type: String, unique: true, sparse: true, trim: true },
    phoneVerified: { type: Boolean, default: false },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ALLOWED_ROLES, required: true },
    status: { type: String, enum: ALLOWED_STATUSES, required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    mustChangePassword: { type: Boolean, default: false },

    aadhaarDocument: encryptedDocumentSchema,

    lawyerProfile: {
      phone: { type: String, default: null, trim: true },
      isAvailable: { type: Boolean, default: true },
      city: { type: String, default: null, trim: true },
      state: { type: String, default: null, trim: true },
      enrollmentNumber: { type: String, default: null, trim: true },
      stateBarCouncil: { type: String, default: null, trim: true },
      yearsOfExperience: { type: Number, default: null, min: 0 },
      practiceAreas: [{ type: String, trim: true }],
      credentialDocument: encryptedDocumentSchema,
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
      delete ret.aadhaarDocument.placeholderPublicId;
    }

    if (ret.lawyerProfile?.credentialDocument) {
      delete ret.lawyerProfile.credentialDocument.publicId;
      delete ret.lawyerProfile.credentialDocument.placeholderPublicId;
    }

    return ret;
  },
});

export default mongoose.model('User', userSchema);
export { ALLOWED_ROLES, ALLOWED_STATUSES };
