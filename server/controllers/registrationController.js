import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import streamifier from 'streamifier';
import User from '../models/User.js';
import RegistrationPhoneVerification from '../models/RegistrationPhoneVerification.js';
import cloudinary from '../config/cloudinary.js';
import {
  sendRegistrationOTP as sendSmsOTP,
  verifyRegistrationOTP as verifySmsOTP,
} from '../services/smsService.js';

const SALT_ROUNDS = 12;
const PHONE_PROOF_EXPIRY_MS = 10 * 60 * 1000;

function normalizePhone(value) {
  const raw = String(value || '').trim().replace(/[\s()-]/g, '');

  if (/^\d{10}$/.test(raw)) return `+91${raw}`;
  if (/^91\d{10}$/.test(raw)) return `+${raw}`;
  if (/^\+[1-9]\d{7,14}$/.test(raw)) return raw;

  return null;
}

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function publicUser(user) {
  return {
    id: user._id.toString(),
    name: user.name,
    username: user.username,
    email: user.email,
    phone: user.phone,
    phoneVerified: user.phoneVerified,
    role: user.role,
    status: user.status,
    mustChangePassword: user.mustChangePassword,
    createdAt: user.createdAt,
  };
}

async function uploadAadhaar(file) {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: 'digital-legacy/aadhaar',
        resource_type: 'auto',
        type: 'authenticated',
        use_filename: false,
        unique_filename: true,
      },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );

    streamifier.createReadStream(file.buffer).pipe(uploadStream);
  });
}

export async function requestRegistrationOTP(req, res) {
  try {
    const phone = normalizePhone(req.body?.phone);

    if (!phone) {
      return res.status(400).json({
        message: 'Enter a valid mobile number. Indian 10-digit numbers are accepted.',
      });
    }

    const existing = await User.findOne({ phone }).lean();
    if (existing) {
      return res.status(409).json({
        message: 'An account with this mobile number already exists.',
      });
    }

    await sendSmsOTP(phone);

    return res.status(200).json({
      message: 'OTP sent successfully to your mobile number.',
      phone,
    });
  } catch (error) {
    console.error('Registration OTP send error:', error);

    return res.status(error.status === 429 ? 429 : 500).json({
      message:
        error.status === 429
          ? 'Too many OTP requests. Please try again later.'
          : 'Unable to send OTP. Please check the mobile number and SMS configuration.',
    });
  }
}

export async function verifyRegistrationOTP(req, res) {
  try {
    const phone = normalizePhone(req.body?.phone);
    const otp = String(req.body?.otp || '').trim();

    if (!phone) {
      return res.status(400).json({ message: 'Enter a valid mobile number.' });
    }

    if (!/^\d{4,10}$/.test(otp)) {
      return res.status(400).json({ message: 'Enter the OTP sent to your mobile number.' });
    }

    const approved = await verifySmsOTP(phone, otp);

    if (!approved) {
      return res.status(400).json({ message: 'Invalid or expired OTP.' });
    }

    const verificationToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = hashToken(verificationToken);
    const expiresAt = new Date(Date.now() + PHONE_PROOF_EXPIRY_MS);

    await RegistrationPhoneVerification.findOneAndUpdate(
      { phone },
      { phone, tokenHash, expiresAt },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return res.status(200).json({
      message: 'Mobile number verified successfully.',
      verified: true,
      phone,
      verificationToken,
      expiresInSeconds: PHONE_PROOF_EXPIRY_MS / 1000,
    });
  } catch (error) {
    console.error('Registration OTP verification error:', error);

    return res.status(400).json({
      message: 'Invalid or expired OTP. Please request a new OTP and try again.',
    });
  }
}

export async function registerOwner(req, res) {
  const {
    name,
    username,
    email,
    phone: rawPhone,
    phoneVerificationToken,
    password,
    confirmPassword,
  } = req.body;

  const phone = normalizePhone(rawPhone);

  if (
    !name ||
    !username ||
    !email ||
    !phone ||
    !phoneVerificationToken ||
    !password ||
    !confirmPassword
  ) {
    return res.status(400).json({
      message: 'All fields, including mobile verification, are required.',
    });
  }

  if (!req.file) {
    return res.status(400).json({
      message: 'Aadhaar card image or PDF is required for owner registration.',
    });
  }

  if (password !== confirmPassword) {
    return res.status(400).json({
      message: 'Password and confirm password do not match.',
    });
  }

  if (password.length < 8) {
    return res.status(400).json({
      message: 'Password must be at least 8 characters long.',
    });
  }

  const tokenHash = hashToken(String(phoneVerificationToken));
  const proof = await RegistrationPhoneVerification.findOne({
    phone,
    tokenHash,
    expiresAt: { $gt: new Date() },
  }).select('+tokenHash');

  if (!proof) {
    return res.status(403).json({
      message: 'Mobile verification is missing or expired. Verify your mobile number again.',
    });
  }

  const normalizedUsername = username.trim().toLowerCase();
  const normalizedEmail = email.trim().toLowerCase();

  const existing = await User.findOne({
    $or: [
      { username: normalizedUsername },
      { email: normalizedEmail },
      { phone },
    ],
  }).lean();

  if (existing) {
    return res.status(409).json({
      message: 'A user with that username, email, or mobile number already exists.',
    });
  }

  let uploadResult;

  try {
    uploadResult = await uploadAadhaar(req.file);
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    const user = await User.create({
      name: name.trim(),
      username: normalizedUsername,
      email: normalizedEmail,
      phone,
      phoneVerified: true,
      passwordHash,
      role: 'OWNER',
      status: 'PENDING',
      createdBy: null,
      mustChangePassword: false,
      aadhaarDocument: {
        publicId: uploadResult.public_id,
        resourceType: uploadResult.resource_type,
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        fileSize: req.file.size,
      },
      verification: {
        reviewedBy: null,
        reviewedAt: null,
        rejectionReason: null,
      },
    });

    await RegistrationPhoneVerification.deleteOne({ _id: proof._id });

    return res.status(201).json({
      message:
        'Registration received. Your mobile number is verified. An administrator must review your Aadhaar card and approve your account before you can log in.',
      user: publicUser(user),
    });
  } catch (error) {
    if (uploadResult?.public_id) {
      await cloudinary.uploader
        .destroy(uploadResult.public_id, {
          resource_type: uploadResult.resource_type || 'image',
          type: 'authenticated',
        })
        .catch(() => {});
    }

    console.error('Owner registration error:', error);
    return res.status(500).json({
      message: 'Registration failed. Please try again.',
    });
  }
}
