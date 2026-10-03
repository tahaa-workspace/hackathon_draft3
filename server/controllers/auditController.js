import AuditLog from '../models/AuditLog.js';

export async function listAuditLogs(req, res) {
  const { action, entityType, status, actorId, from, to } = req.query;
  const filter = {};

  if (action) filter.action = action;
  if (entityType) filter.entityType = entityType;
  if (status) filter.status = status;
  if (actorId) filter.actorId = actorId;
  if (from || to) {
    filter.createdAt = {};
    if (from) filter.createdAt.$gte = new Date(from);
    if (to) filter.createdAt.$lte = new Date(to);
  }

  const logs = await AuditLog.find(filter)
    .populate('actorId', 'name username email role')
    .sort({ createdAt: -1 })
    .limit(500)
    .lean();

  return res.status(200).json({
    logs: logs.map((log) => ({
      id: log._id.toString(),
      actor: log.actorId,
      actorRole: log.actorRole,
      action: log.action,
      entityType: log.entityType,
      entityId: log.entityId?.toString?.() || log.entityId || null,
      description: log.description,
      metadata: log.metadata,
      status: log.status,
      createdAt: log.createdAt,
    })),
  });
}
