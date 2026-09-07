import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import streamifier from 'streamifier';
import User from '../models/User.js';
import RegistrationPhoneVerification from '../models/RegistrationPhoneVerification.js';
import cloudinary from '../config/cloudinary.js';

const SALT_ROUNDS = 12;
const DEMO_MOBILES = new Set([
  '+919054559272',
  '+916352522036',
  '+918238387089',
  '+919106882453',
  '+919316744194',
]);
const OTP_EXPIRY_MS = 5 * 60 * 1000;
const PHONE_PROOF_EXPIRY_MS = 10 * 60 * 1000;
const OTP_RESEND_COOLDOWN_MS = 60 * 1000;
const MAX_OTP_ATTEMPTS = 5;

function normalizePhone(value) {
  const raw = String(value || '').trim().replace(/[\s()-]/g, '');

  if (/^\d{10}$/.test(raw)) return `+91${raw}`;
  if (/^91\d{10}$/.test(raw)) return `+${raw}`;
  if (/^\+[1-9]\d{7,14}$/.test(raw)) return raw;

  return null;
}

function isAllowedDemoMobile(phone) {
  return DEMO_MOBILES.has(phone);
}

function displayPhone(phone) {
  return phone.startsWith('+91') ? phone.slice(3) : phone;
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
        message: 'Enter a valid 10-digit Indian mobile number.',
      });
    }

    if (!isAllowedDemoMobile(phone)) {
      return res.status(400).json({
        message:
          'Demo mode: please use one of the configured test mobile numbers shown on the registration page.',
      });
    }

    const existing = await User.findOne({ phone }).lean();
    if (existing) {
      return res.status(409).json({
        message:
          'An account with this mobile number already exists. Use another configured demo number or delete the previous demo owner before testing again.',
      });
    }

    let session = await RegistrationPhoneVerification.findOne({ phone }).select(
      '+otpHash +tokenHash'
    );
    const now = Date.now();

    if (
      session?.lastSentAt &&
      now - new Date(session.lastSentAt).getTime() < OTP_RESEND_COOLDOWN_MS
    ) {
      const retryAfterSeconds = Math.ceil(
        (OTP_RESEND_COOLDOWN_MS -
          (now - new Date(session.lastSentAt).getTime())) /
          1000
      );

      return res.status(429).json({
        message: `Please wait ${retryAfterSeconds} seconds before requesting another OTP.`,
        retryAfterSeconds,
      });
    }

    const otp = crypto.randomInt(100000, 1000000).toString();
    const otpHash = await bcrypt.hash(otp, SALT_ROUNDS);
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MS);

    if (!session) {
      session = await RegistrationPhoneVerification.create({
        phone,
        otpHash,
        attempts: 0,
        resendCount: 0,
        lastSentAt: new Date(),
        tokenHash: null,
        verifiedAt: null,
        expiresAt,
      });
    } else {
      session.otpHash = otpHash;
      session.attempts = 0;
      session.resendCount = (session.resendCount || 0) + 1;
      session.lastSentAt = new Date();
      session.tokenHash = null;
      session.verifiedAt = null;
      session.expiresAt = expiresAt;
      await session.save();
    }

    console.log('\n===============================================');
    console.log('NEXT GEN VAULT - DEMO REGISTRATION OTP');
    console.log(`Mobile: ${displayPhone(phone)}`);
    console.log(`OTP: ${otp}`);
    console.log('Valid for: 5 minutes');
    console.log('===============================================\n');

    return res.status(200).json({
      message: 'Demo OTP generated. Check the backend terminal for the 6-digit OTP.',
      phone,
      expiresInSeconds: OTP_EXPIRY_MS / 1000,
    });
  } catch (error) {
    console.error('Registration OTP generation error:', error);

    return res.status(500).json({
      message: 'Unable to generate the demo OTP. Please try again.',
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

    if (!isAllowedDemoMobile(phone)) {
      return res.status(400).json({
        message:
          'Demo mode: please use one of the configured test mobile numbers shown on the registration page.',
      });
    }

    if (!/^\d{6}$/.test(otp)) {
      return res.status(400).json({
        message: 'Enter the 6-digit OTP shown in the backend terminal.',
      });
    }

    const session = await RegistrationPhoneVerification.findOne({ phone }).select(
      '+otpHash +tokenHash'
    );

    if (!session || !session.otpHash) {
      return res.status(404).json({
        message: 'No active registration OTP was found. Please send a new OTP.',
      });
    }

    if (new Date() > session.expiresAt) {
      await RegistrationPhoneVerification.deleteOne({ _id: session._id });
      return res.status(400).json({
        message: 'OTP has expired. Please send a new OTP.',
      });
    }

    if (session.attempts >= MAX_OTP_ATTEMPTS) {
      await RegistrationPhoneVerification.deleteOne({ _id: session._id });
      return res.status(429).json({
        message: 'Maximum OTP attempts exceeded. Please start verification again.',
      });
    }

    const approved = await bcrypt.compare(otp, session.otpHash);

    if (!approved) {
      session.attempts += 1;
      await session.save();

      const attemptsRemaining = MAX_OTP_ATTEMPTS - session.attempts;
      return res.status(400).json({
        message: `Invalid OTP. ${attemptsRemaining} attempt${attemptsRemaining === 1 ? '' : 's'} remaining.`,
      });
    }

    const verificationToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = hashToken(verificationToken);

    session.otpHash = null;
    session.attempts = 0;
    session.tokenHash = tokenHash;
    session.verifiedAt = new Date();
    session.expiresAt = new Date(Date.now() + PHONE_PROOF_EXPIRY_MS);
    await session.save();

    return res.status(200).json({
      message: 'Mobile number verified successfully.',
      verified: true,
      phone,
      verificationToken,
      expiresInSeconds: PHONE_PROOF_EXPIRY_MS / 1000,
    });
  } catch (error) {
    console.error('Registration OTP verification error:', error);

    return res.status(500).json({
      message: 'Failed to verify the demo OTP. Please try again.',
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

  if (!isAllowedDemoMobile(phone)) {
    return res.status(400).json({
      message:
        'Demo mode: please use one of the configured test mobile numbers shown on the registration page.',
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
    verifiedAt: { $ne: null },
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
