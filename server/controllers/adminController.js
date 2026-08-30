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

export async function listPendingRegistrations(req, res) {
  const pending = await User.find({ status: 'PENDING', role: 'OWNER' })
    .sort({ createdAt: 1 })
    .select('-passwordHash');

  return res.status(200).json({
    count: pending.length,
    registrations: pending.map(registrationPayload),
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
  const reason = typeof req.body?.reason === 'string' ? req.body.reason.trim() : '';
  const user = await User.findById(id).select('-passwordHash');

  if (!user) {
    return res.status(404).json({ message: 'User not found.' });
  }
  if (user.status !== 'PENDING') {
    return res.status(400).json({ message: `User is not pending (current status: ${user.status}).` });
  }

  user.status = 'REJECTED';
  user.verification = {
    reviewedBy: req.user.id,
    reviewedAt: new Date(),
    rejectionReason: reason || null,
  };
  await user.save();

  return res.status(200).json({
    message: 'User rejected.',
    user: registrationPayload(user),
  });
}
