import LegacyAllocation from '../models/LegacyAllocation.js';
import Document from '../models/Document.js';
import User from '../models/User.js';
import Notification from '../models/Notification.js';
import { sendTransactionalEmail } from '../services/mailService.js';
import { legacyAllocationTemplate } from '../services/emailTemplates.js';
import { writeAudit } from '../services/auditService.js';

function allocationPayload(allocation) {
  return {
    id: allocation._id.toString(),
    asset: allocation.assetId && typeof allocation.assetId === 'object'
      ? {
          id: allocation.assetId._id.toString(),
          title: allocation.assetId.title,
          category: allocation.assetId.category,
          recordType: allocation.assetId.recordType || 'GENERAL',
        }
      : allocation.assetId,
    allocatedBy: allocation.allocatedBy && typeof allocation.allocatedBy === 'object'
      ? {
          id: allocation.allocatedBy._id.toString(),
          name: allocation.allocatedBy.name,
          username: allocation.allocatedBy.username,
          email: allocation.allocatedBy.email,
        }
      : allocation.allocatedBy,
    allocatedTo: allocation.allocatedTo && typeof allocation.allocatedTo === 'object'
      ? {
          id: allocation.allocatedTo._id.toString(),
          name: allocation.allocatedTo.name,
          username: allocation.allocatedTo.username,
          email: allocation.allocatedTo.email,
        }
      : allocation.allocatedTo,
    permissions: allocation.permissions,
    status: allocation.status,
    releaseCondition: allocation.releaseCondition,
    releaseDate: allocation.releaseDate,
    revokedAt: allocation.revokedAt,
    createdAt: allocation.createdAt,
    updatedAt: allocation.updatedAt,
  };
}

function populate(query) {
  return query
    .populate('assetId', 'title category recordType')
    .populate('allocatedBy', 'name username email')
    .populate('allocatedTo', 'name username email');
}

export async function searchAllocationUsers(req, res) {
  const q = String(req.query.q || '').trim();
  if (q.length < 2) return res.status(200).json({ users: [] });

  const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(escaped, 'i');
  const users = await User.find({
    _id: { $ne: req.user.id },
    role: 'USER',
    status: 'ACTIVE',
    $or: [{ email: pattern }, { username: pattern }, { name: pattern }],
  }).select('name username email').limit(10).lean();

  return res.status(200).json({
    users: users.map((user) => ({
      id: user._id.toString(),
      name: user.name,
      username: user.username,
      email: user.email,
    })),
  });
}

export async function createLegacyAllocation(req, res) {
  try {
    const {
      assetId,
      allocatedTo,
      permissions = {},
      releaseCondition = 'LEGACY_CLAIM',
      releaseDate = null,
    } = req.body;

    if (!assetId || !allocatedTo) {
      return res.status(400).json({ message: 'assetId and allocatedTo are required.' });
    }
    if (String(allocatedTo) === req.user.id) {
      return res.status(400).json({ message: 'You cannot allocate a legacy asset to yourself.' });
    }

    const [asset, recipient, sender] = await Promise.all([
      Document.findById(assetId),
      User.findOne({ _id: allocatedTo, role: 'USER', status: 'ACTIVE' }).select('name username email'),
      User.findById(req.user.id).select('name'),
    ]);

    if (!asset) return res.status(404).json({ message: 'Asset not found.' });
    if (asset.ownerId.toString() !== req.user.id) {
      await writeAudit(req, {
        action: 'LEGACY_ALLOCATION_CREATED',
        entityType: 'Document',
        entityId: asset._id,
        description: 'Attempted to allocate an asset not owned by the authenticated user.',
        status: 'FAILED',
      });
      return res.status(403).json({ message: 'You can allocate only assets that you own.' });
    }
    if (!recipient) {
      return res.status(404).json({ message: 'Recipient user not found or is not active.' });
    }

    const validConditions = ['LEGACY_CLAIM', 'DATE', 'IMMEDIATE'];
    if (!validConditions.includes(releaseCondition)) {
      return res.status(400).json({ message: 'Invalid release condition.' });
    }
    if (releaseCondition === 'DATE' && !releaseDate) {
      return res.status(400).json({ message: 'releaseDate is required for DATE-based release.' });
    }

    const normalizedPermissions = {
      view: permissions.view !== false,
      download: permissions.download !== false,
    };

    const existingAllocation = await LegacyAllocation.exists({
      assetId: asset._id,
      allocatedTo: recipient._id,
      status: { $nin: ['REVOKED', 'EXPIRED'] },
      releaseCondition,
      releaseDate:
        releaseCondition === 'DATE'
          ? new Date(releaseDate)
          : null,
      'permissions.view': normalizedPermissions.view,
      'permissions.download': normalizedPermissions.download,
    });

    if (existingAllocation) {
      return res.status(409).json({
        message:
          'An active allocation with the same asset, recipient, permissions, and release condition already exists.',
      });
    }

    const allocation = await LegacyAllocation.create({
      assetId: asset._id,
      allocatedBy: req.user.id,
      allocatedTo: recipient._id,
      permissions: normalizedPermissions,
      releaseCondition,
      releaseDate: releaseCondition === 'DATE' ? new Date(releaseDate) : null,
      status: releaseCondition === 'IMMEDIATE' ? 'RELEASED' : 'ACTIVE',
    });

    const notification = await Notification.create({
      recipientId: recipient._id,
      type: 'LEGACY_ALLOCATION',
      title: 'New Legacy Asset Allocated',
      message: (sender?.name || 'A user') + ' has allocated "' + asset.title + '" to you. The asset is protected; open Legacy Access to review its status and claim requirements.',
      relatedEntityType: 'LegacyAllocation',
      relatedEntityId: allocation._id,
    });

    await writeAudit(req, {
      action: 'LEGACY_ALLOCATION_CREATED',
      entityType: 'LegacyAllocation',
      entityId: allocation._id,
      description: 'Legacy asset allocated to ' + recipient.email + '.',
      metadata: { assetId: asset._id.toString(), recipientId: recipient._id.toString() },
    });

    try {
      const appUrl =
        (process.env.APP_BASE_URL || process.env.FRONTEND_URL || 'http://localhost:5173')
          .replace(/\/$/, '') + '/legacy-access';

      const emailContent = legacyAllocationTemplate({
        recipientName: recipient.name,
        allocatorName: sender?.name || 'A user',
        assetName: asset.title,
        allocationDate: new Date(allocation.createdAt).toLocaleString('en-IN'),
        status:
          allocation.releaseCondition === 'LEGACY_CLAIM'
            ? 'Locked / Awaiting Claim'
            : allocation.status,
        appUrl,
      });

      await sendTransactionalEmail({
        to: recipient.email,
        ...emailContent,
      });

      notification.emailSent = true;
      notification.emailSentAt = new Date();
      await notification.save();

      await writeAudit(req, {
        action: 'EMAIL_SENT',
        entityType: 'Notification',
        entityId: notification._id,
        description: 'Legacy allocation email sent successfully.',
      });
    } catch (mailError) {
      console.error('Legacy allocation email failed:', mailError);
      await writeAudit(req, {
        action: 'EMAIL_FAILED',
        entityType: 'Notification',
        entityId: notification._id,
        description: 'Legacy allocation email delivery failed.',
        metadata: { reason: mailError.message },
        status: 'FAILED',
      });
    }

    const populated = await populate(LegacyAllocation.findById(allocation._id));
    return res.status(201).json({
      message: 'Legacy access allocated successfully.',
      allocation: allocationPayload(populated),
    });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({ message: 'This user already has an active allocation for this asset.' });
    }
    console.error('Create legacy allocation error:', error);
    return res.status(500).json({ message: 'Failed to create legacy allocation.' });
  }
}

export async function listIncomingAllocations(req, res) {
  const allocations = await populate(
    LegacyAllocation.find({ allocatedTo: req.user.id, status: { $ne: 'REVOKED' } })
      .sort({ createdAt: -1 })
  );
  return res.status(200).json({ allocations: allocations.map(allocationPayload) });
}

export async function listOutgoingAllocations(req, res) {
  const allocations = await populate(
    LegacyAllocation.find({ allocatedBy: req.user.id }).sort({ createdAt: -1 })
  );
  return res.status(200).json({ allocations: allocations.map(allocationPayload) });
}

export async function revokeLegacyAllocation(req, res) {
  const allocation = await LegacyAllocation.findOne({
    _id: req.params.id,
    allocatedBy: req.user.id,
  }).populate('allocatedTo', 'name email');

  if (!allocation) return res.status(404).json({ message: 'Legacy allocation not found.' });
  if (allocation.status === 'REVOKED') {
    return res.status(200).json({ message: 'Legacy allocation is already revoked.' });
  }

  allocation.status = 'REVOKED';
  allocation.revokedAt = new Date();
  await allocation.save();

  await Notification.create({
    recipientId: allocation.allocatedTo._id,
    type: 'LEGACY_ALLOCATION',
    title: 'Legacy Allocation Revoked',
    message: 'A legacy allocation previously assigned to you has been revoked.',
    relatedEntityType: 'LegacyAllocation',
    relatedEntityId: allocation._id,
  });

  await writeAudit(req, {
    action: 'LEGACY_ALLOCATION_REVOKED',
    entityType: 'LegacyAllocation',
    entityId: allocation._id,
    description: 'Legacy allocation revoked by allocating user.',
  });

  return res.status(200).json({ message: 'Legacy allocation revoked successfully.' });
}
