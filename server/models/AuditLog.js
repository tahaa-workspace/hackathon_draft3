import mongoose from 'mongoose';

const { Schema } = mongoose;

const auditLogSchema = new Schema(
  {
    actorId: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    actorRole: { type: String, default: null },
    action: { type: String, required: true, index: true },
    entityType: { type: String, required: true, index: true },
    entityId: { type: Schema.Types.ObjectId, default: null, index: true },
    description: { type: String, default: '' },
    metadata: { type: Schema.Types.Mixed, default: {} },
    ipAddress: { type: String, default: null },
    userAgent: { type: String, default: null },
    status: { type: String, enum: ['SUCCESS', 'FAILED'], default: 'SUCCESS', index: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });

export default mongoose.model('AuditLog', auditLogSchema);
