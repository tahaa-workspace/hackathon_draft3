import crypto from 'crypto';
import cloudinary from '../config/cloudinary.js';

import User from '../models/User.js';
import {
  decryptLawyerCredentialBuffer,
  downloadEncryptedLawyerCredential,
} from '../services/lawyerCredentialEncryptionService.js';

const REVIEW_URL_TTL_SECONDS = 5 * 60;

function signingSecret() {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is not configured.');
  }

  return process.env.JWT_SECRET;
}

function createReviewToken({ userId, expiresAt }) {
  return crypto
    .createHmac('sha256', signingSecret())
    .update(`${userId}:${expiresAt}`)
    .digest('hex');
}

function isValidReviewToken({ userId, expiresAt, token }) {
  if (!/^\d+$/.test(String(expiresAt || ''))) return false;

  const expiry = Number(expiresAt);
  if (!Number.isFinite(expiry) || Math.floor(Date.now() / 1000) > expiry) {
    return false;
  }

  const expected = createReviewToken({ userId, expiresAt: expiry });
  const supplied = String(token || '');

  if (supplied.length !== expected.length) return false;

  return crypto.timingSafeEqual(
    Buffer.from(supplied, 'utf8'),
    Buffer.from(expected, 'utf8')
  );
}

function isEncryptedCredential(credential) {
  return Boolean(
    credential?.resourceType === 'raw' &&
      credential?.deliveryType === 'authenticated' &&
      credential?.encryption?.algorithm === 'aes-256-gcm' &&
      credential?.encryption?.iv &&
      credential?.encryption?.authTag
  );
}

export async function getLawyerCredentialReviewUrl(req, res) {
  try {
    const { id } = req.params;

    const user = await User.findById(id).select('role lawyerProfile');

    if (!user || user.role !== 'LAWYER') {
      return res.status(404).json({ message: 'Lawyer registration not found.' });
    }

    const credential = user.lawyerProfile?.credentialDocument;

    if (!credential?.publicId) {
      return res.status(404).json({
        message: 'No professional credential is attached to this registration.',
      });
    }

    const expiresAt = Math.floor(Date.now() / 1000) + REVIEW_URL_TTL_SECONDS;

    // Backward compatibility: credentials uploaded before this encryption change
    // can still be reviewed. Every newly registered Lawyer uses the encrypted path below.
    if (!isEncryptedCredential(credential)) {
      const url = cloudinary.url(credential.publicId, {
        resource_type: credential.resourceType || 'image',
        type: credential.deliveryType || 'authenticated',
        sign_url: true,
        secure: true,
        expires_at: expiresAt,
      });

      return res.status(200).json({
        url,
        expiresAt,
        legacyStorage: true,
        document: {
          originalName: credential.originalName,
          mimeType: credential.mimeType,
          fileSize: credential.fileSize,
        },
      });
    }

    const token = createReviewToken({ userId: user._id.toString(), expiresAt });

    return res.status(200).json({
      url:
        `/api/admin/lawyer-credential-view/${user._id.toString()}` +
        `?expires=${expiresAt}&token=${token}`,
      expiresAt,
      encryptedStorage: true,
      document: {
        originalName: credential.originalName,
        mimeType: credential.mimeType,
        fileSize: credential.fileSize,
      },
    });
  } catch (error) {
    console.error('Create lawyer credential review URL error:', error);

    return res.status(500).json({
      message: 'Unable to prepare lawyer professional credential for review.',
    });
  }
}

export async function viewLawyerCredential(req, res) {
  try {
    const { id } = req.params;
    const { expires, token } = req.query;

    if (
      !isValidReviewToken({
        userId: id,
        expiresAt: expires,
        token,
      })
    ) {
      return res.status(403).json({
        message: 'This credential review link is invalid or has expired.',
      });
    }

    const user = await User.findById(id).select('role lawyerProfile');

    if (!user || user.role !== 'LAWYER') {
      return res.status(404).json({ message: 'Lawyer registration not found.' });
    }

    const credential = user.lawyerProfile?.credentialDocument;

    if (!credential?.publicId) {
      return res.status(404).json({
        message: 'No professional credential is attached to this registration.',
      });
    }

    if (!isEncryptedCredential(credential)) {
      return res.status(400).json({
        message: 'This review route is only for encrypted lawyer credentials.',
      });
    }

    const encryptedBuffer =
      await downloadEncryptedLawyerCredential(credential);

    if (!encryptedBuffer?.length) {
      throw new Error('Encrypted lawyer credential file is empty.');
    }

    const decryptedBuffer = decryptLawyerCredentialBuffer(
      encryptedBuffer,
      credential.encryption
    );

    if (!decryptedBuffer?.length) {
      throw new Error('Lawyer credential decryption produced an empty file.');
    }

    const mimeType = credential.mimeType || 'application/octet-stream';
    const originalName = credential.originalName || 'lawyer-credential';

    res.setHeader('Content-Type', mimeType);
    res.setHeader(
      'Content-Disposition',
      `inline; filename="${encodeURIComponent(originalName)}"`
    );
    res.setHeader('Content-Length', decryptedBuffer.length);
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('X-Content-Type-Options', 'nosniff');

    return res.send(decryptedBuffer);
  } catch (error) {
    console.error('Lawyer credential review error:', error);

    return res.status(500).json({
      message: 'Unable to decrypt and display the lawyer professional credential.',
    });
  }
}
