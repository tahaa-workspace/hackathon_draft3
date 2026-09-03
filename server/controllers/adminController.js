import cloudinary from '../config/cloudinary.js';
import User from '../models/User.js';

function registrationPayload(user) {
  return {
    id: user._id.toString(),
    name: user.name,
    username: user.username,
    email: user.email,
    role: user.role,
    status: user.status,
    createdAt: user.createdAt,
    aadhaarDocument: user.aadhaarDocument?.publicId
      ? {
          originalName: user.aadhaarDocument.originalName,
          mimeType: user.aadhaarDocument.mimeType,
          fileSize: user.aadhaarDocument.fileSize,
          available: true,
        }
      : { available: false },
  };
}

function accountPayload(user, beneficiaryCounts = new Map()) {
  const creator = user.createdBy && typeof user.createdBy === 'object'
    ? user.createdBy
    : null;

  return {
    id: user._id.toString(),
    name: user.name,
    username: user.username,
    email: user.email,
    role: user.role,
    status: user.status,
    mustChangePassword: user.mustChangePassword,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    beneficiaryCount: user.role === 'OWNER'
      ? (beneficiaryCounts.get(user._id.toString()) || 0)
      : 0,
    owner: user.role === 'BENEFICIARY' && creator
      ? {
          id: creator._id.toString(),
          name: creator.name,
          username: creator.username,
          email: creator.email,
        }
      : null,
  };
}

export async function listPendingRegistrations(req, res) {
  const pending = await User.find({ status: 'PENDING', role: 'OWNER' })
    .sort({ createdAt: 1 })
    .select('-passwordHash');

  return res.status(200).json({
    count: pending.length,
    registrations: pending.map(registrationPayload),
  });
}

export async function listUsers(req, res) {
  const users = await User.find({
    role: { $in: ['OWNER', 'BENEFICIARY'] },
  })
    .populate('createdBy', 'name username email')
    .sort({ createdAt: -1 })
    .select('-passwordHash');

  const beneficiaryCounts = new Map();

  users.forEach((user) => {
    if (user.role !== 'BENEFICIARY' || !user.createdBy?._id) return;

    const ownerId = user.createdBy._id.toString();
    beneficiaryCounts.set(
      ownerId,
      (beneficiaryCounts.get(ownerId) || 0) + 1
    );
  });

  const accounts = users.map((user) => accountPayload(user, beneficiaryCounts));

  return res.status(200).json({
    count: accounts.length,
    summary: {
      owners: accounts.filter((user) => user.role === 'OWNER').length,
      beneficiaries: accounts.filter((user) => user.role === 'BENEFICIARY').length,
      active: accounts.filter((user) => user.status === 'ACTIVE').length,
      suspended: accounts.filter((user) => user.status === 'SUSPENDED').length,
      pending: accounts.filter((user) => user.status === 'PENDING').length,
      rejected: accounts.filter((user) => user.status === 'REJECTED').length,
    },
    users: accounts,
  });
}

export async function updateUserStatus(req, res) {
  const { id } = req.params;
  const { status } = req.body || {};

  if (!['ACTIVE', 'SUSPENDED'].includes(status)) {
    return res.status(400).json({
      message: 'Status must be ACTIVE or SUSPENDED.',
    });
  }

  const user = await User.findById(id).select('-passwordHash');

  if (!user) {
    return res.status(404).json({ message: 'User not found.' });
  }

  if (!['OWNER', 'BENEFICIARY'].includes(user.role)) {
    return res.status(403).json({
      message: 'Administrator accounts cannot be managed from the account directory.',
    });
  }

  if (['PENDING', 'REJECTED'].includes(user.status)) {
    return res.status(400).json({
      message: 'Pending and rejected registrations must be handled through the approval workflow.',
    });
  }

  user.status = status;
  await user.save();

  return res.status(200).json({
    message: status === 'ACTIVE'
      ? 'Account activated successfully.'
      : 'Account suspended successfully.',
    user: accountPayload(user),
  });
}

export async function getAadhaarReviewUrl(req, res) {
  const { id } = req.params;
  const user = await User.findById(id).select('role status aadhaarDocument');

  if (!user || user.role !== 'OWNER') {
    return res.status(404).json({ message: 'Owner registration not found.' });
  }

  if (!user.aadhaarDocument?.publicId) {
    return res.status(404).json({ message: 'No Aadhaar document is attached to this registration.' });
  }

  const expiresAt = Math.floor(Date.now() / 1000) + 5 * 60;
  const url = cloudinary.url(user.aadhaarDocument.publicId, {
    resource_type: user.aadhaarDocument.resourceType || 'image',
    type: 'authenticated',
    sign_url: true,
    secure: true,
    expires_at: expiresAt,
  });

  return res.status(200).json({
    url,
    expiresAt,
    document: {
      originalName: user.aadhaarDocument.originalName,
      mimeType: user.aadhaarDocument.mimeType,
      fileSize: user.aadhaarDocument.fileSize,
    },
  });
}

export async function approveUser(req, res) {
  const { id } = req.params;
  const user = await User.findById(id).select('-passwordHash');

  if (!user) {
    return res.status(404).json({ message: 'User not found.' });
  }
  if (user.status !== 'PENDING') {
    return res.status(400).json({ message: `User is not pending (current status: ${user.status}).` });
  }
  if (user.role !== 'OWNER' || !user.aadhaarDocument?.publicId) {
    return res.status(400).json({ message: 'Owner registration is missing its Aadhaar verification document.' });
  }

  user.status = 'ACTIVE';
  user.role = 'OWNER';
  user.verification = {
    reviewedBy: req.user.id,
    reviewedAt: new Date(),
    rejectionReason: null,
  };
  await user.save();

  return res.status(200).json({
    message: 'User approved. They may now log in.',
    user: registrationPayload(user),
  });
}

export async function rejectUser(req, res) {
  const { id } = req.params;

  const reason =
    typeof req.body?.reason === 'string'
      ? req.body.reason.trim()
      : '';

  const user = await User.findById(id).select('-passwordHash');

  if (!user) {
    return res.status(404).json({
      message: 'User not found.',
    });
  }

  if (user.status !== 'PENDING') {
    return res.status(400).json({
      message: `User is not pending (current status: ${user.status}).`,
    });
  }

  const publicId = user.aadhaarDocument?.publicId;
  const resourceType =
    user.aadhaarDocument?.resourceType || 'image';

  if (publicId) {
    try {
      const deletionResult =
        await cloudinary.uploader.destroy(publicId, {
          resource_type: resourceType,
          type: 'authenticated',
          invalidate: true,
        });

      if (
        deletionResult.result !== 'ok' &&
        deletionResult.result !== 'not found'
      ) {
        console.error(
          'Unexpected Cloudinary deletion result:',
          {
            userId: user._id.toString(),
            publicId,
            resourceType,
            result: deletionResult.result,
          }
        );

        return res.status(502).json({
          message:
            'Unable to remove the verification document from cloud storage. User was not rejected.',
        });
      }
    } catch (error) {
      console.error(
        'Cloudinary verification document deletion failed:',
        {
          userId: user._id.toString(),
          publicId,
          resourceType,
          error: error.message,
        }
      );

      return res.status(502).json({
        message:
          'Unable to remove the verification document from cloud storage. User was not rejected. Please try again.',
      });
    }
  }

  user.aadhaarDocument = {
    publicId: null,
    resourceType: null,
    originalName: null,
    mimeType: null,
    fileSize: null,
  };

  user.status = 'REJECTED';

  user.verification = {
    reviewedBy: req.user.id,
    reviewedAt: new Date(),
    rejectionReason: reason || null,
  };

  await user.save();

  return res.status(200).json({
    message:
      'User rejected and verification document deleted successfully.',
    user: registrationPayload(user),
  });
}
