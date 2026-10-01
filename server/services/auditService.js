import AuditLog from '../models/AuditLog.js';

export async function writeAudit(req, {
  action,
  entityType,
  entityId = null,
  description = '',
  metadata = {},
  status = 'SUCCESS',
}) {
  try {
    await AuditLog.create({
      actorId: req?.user?.id || null,
      actorRole: req?.user?.role || null,
      action,
      entityType,
      entityId,
      description,
      metadata,
      ipAddress: req?.ip || null,
      userAgent: req?.get?.('user-agent') || null,
      status,
    });
  } catch (error) {
    console.error('Audit log write failed:', error.message);
  }
}
