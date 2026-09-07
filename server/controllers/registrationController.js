import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import streamifier from 'streamifier';
import User from '../models/User.js';
import RegistrationPhoneVerification from '../models/RegistrationPhoneVerification.js';
import RegistrationEmailVerification from '../models/RegistrationEmailVerification.js';
import cloudinary from '../config/cloudinary.js';
import transporter from '../config/mailer.js';

const SALT_ROUNDS = 12;
const DEMO_MOBILES = new Set([
  '+919054559272',
  '+916352522036',
  '+918238387089',
  '+919106882453',
  '+919316744194',
]);
const OTP_EXPIRY_MS = 5 * 60 * 1000;
const VERIFICATION_PROOF_EXPIRY_MS = 10 * 60 * 1000;
const OTP_RESEND_COOLDOWN_MS = 60 * 1000;
const MAX_OTP_ATTEMPTS = 5;

function normalizePhone(value) {
  const raw = String(value || '').trim().replace(/[\s()-]/g, '');

  if (/^\d{10}$/.test(raw)) return `+91${raw}`;
  if (/^91\d{10}$/.test(raw)) return `+${raw}`;
  if (/^\+[1-9]\d{7,14}$/.test(raw)) return raw;

  return null;
}

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
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
    emailVerified: user.emailVerified,
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

function getRetryAfterSeconds(lastSentAt) {
  if (!lastSentAt) return 0;
  const elapsed = Date.now() - new Date(lastSentAt).getTime();
  if (elapsed >= OTP_RESEND_COOLDOWN_MS) return 0;
  return Math.ceil((OTP_RESEND_COOLDOWN_MS - elapsed) / 1000);
}

export async function requestRegistrationOTP(req, res) {
  try {
    const phone = normalizePhone(req.body?.phone);

    if (!phone) {
      return res.status(400).json({ message: 'Enter a valid 10-digit Indian mobile number.' });
    }

    if (!isAllowedDemoMobile(phone)) {
      return res.status(400).json({
        message: 'Demo mode: please use one of the configured test mobile numbers shown on the registration page.',
      });
    }

    const existing = await User.findOne({ phone }).lean();
    if (existing) {
      return res.status(409).json({
        message: 'An account with this mobile number already exists. Use another configured demo number or delete the previous demo owner before testing again.',
      });
    }

    let session = await RegistrationPhoneVerification.findOne({ phone }).select('+otpHash +tokenHash');
    const retryAfterSeconds = getRetryAfterSeconds(session?.lastSentAt);

    if (retryAfterSeconds > 0) {
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
    return res.status(500).json({ message: 'Unable to generate the demo OTP. Please try again.' });
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
        message: 'Demo mode: please use one of the configured test mobile numbers shown on the registration page.',
      });
    }

    if (!/^\d{6}$/.test(otp)) {
      return res.status(400).json({ message: 'Enter the 6-digit OTP shown in the backend terminal.' });
    }

    const session = await RegistrationPhoneVerification.findOne({ phone }).select('+otpHash +tokenHash');

    if (!session || !session.otpHash) {
      return res.status(404).json({ message: 'No active registration OTP was found. Please send a new OTP.' });
    }

    if (new Date() > session.expiresAt) {
      await RegistrationPhoneVerification.deleteOne({ _id: session._id });
      return res.status(400).json({ message: 'OTP has expired. Please send a new OTP.' });
    }

    if (session.attempts >= MAX_OTP_ATTEMPTS) {
      await RegistrationPhoneVerification.deleteOne({ _id: session._id });
      return res.status(429).json({ message: 'Maximum OTP attempts exceeded. Please start verification again.' });
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
    session.otpHash = null;
    session.attempts = 0;
    session.tokenHash = hashToken(verificationToken);
    session.verifiedAt = new Date();
    session.expiresAt = new Date(Date.now() + VERIFICATION_PROOF_EXPIRY_MS);
    await session.save();

    return res.status(200).json({
      message: 'Mobile number verified successfully.',
      verified: true,
      phone,
      verificationToken,
      expiresInSeconds: VERIFICATION_PROOF_EXPIRY_MS / 1000,
    });
  } catch (error) {
    console.error('Registration OTP verification error:', error);
    return res.status(500).json({ message: 'Failed to verify the demo OTP. Please try again.' });
  }
}

export async function requestRegistrationEmailOTP(req, res) {
  try {
    const email = normalizeEmail(req.body?.email);

    if (!email || !isValidEmail(email)) {
      return res.status(400).json({ message: 'Enter a valid email address.' });
    }

    const existing = await User.findOne({ email }).lean();
    if (existing) {
      return res.status(409).json({ message: 'An account with this email address already exists.' });
    }

    let session = await RegistrationEmailVerification.findOne({ email }).select('+otpHash +tokenHash');
    const retryAfterSeconds = getRetryAfterSeconds(session?.lastSentAt);

    if (retryAfterSeconds > 0) {
      return res.status(429).json({
        message: `Please wait ${retryAfterSeconds} seconds before requesting another email OTP.`,
        retryAfterSeconds,
      });
    }

    const otp = crypto.randomInt(100000, 1000000).toString();
    const otpHash = await bcrypt.hash(otp, SALT_ROUNDS);
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MS);

    if (!session) {
      session = await RegistrationEmailVerification.create({
        email,
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

    try {
      await transporter.sendMail({
        from: {
          name: 'NextGen Vault',
          address: process.env.EMAIL_USER,
        },
        to: email,
        subject: 'NextGen Vault - Verify Your Email',
        text: `Your NextGen Vault email verification OTP is ${otp}. It expires in 5 minutes.`,
        html: `
          <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:24px">
            <div style="border:1px solid #e2e8f0;border-radius:14px;padding:28px">
              <h2 style="margin-top:0;color:#0f172a">NextGen Vault</h2>
              <p style="color:#475569">Use this OTP to verify your email address for owner registration.</p>
              <div style="margin:24px 0;padding:18px;background:#f1f5f9;border-radius:10px;text-align:center;font-size:32px;letter-spacing:10px;font-weight:bold;color:#0f172a">${otp}</div>
              <p style="color:#64748b">This OTP expires in <strong>5 minutes</strong>.</p>
              <p style="color:#64748b;font-size:13px">If you did not request this registration, you can ignore this email.</p>
            </div>
          </div>
        `,
      });
    } catch (mailError) {
      await RegistrationEmailVerification.deleteOne({ email });
      console.error('Registration email OTP send error:', mailError);
      return res.status(500).json({ message: 'Unable to send the email OTP. Please check the email configuration and try again.' });
    }

    return res.status(200).json({
      message: 'OTP sent to your email address.',
      email,
      expiresInSeconds: OTP_EXPIRY_MS / 1000,
    });
  } catch (error) {
    console.error('Registration email OTP request error:', error);
    return res.status(500).json({ message: 'Failed to send the email verification OTP.' });
  }
}

export async function verifyRegistrationEmailOTP(req, res) {
  try {
    const email = normalizeEmail(req.body?.email);
    const otp = String(req.body?.otp || '').trim();

    if (!email || !isValidEmail(email)) {
      return res.status(400).json({ message: 'Enter a valid email address.' });
    }

    if (!/^\d{6}$/.test(otp)) {
      return res.status(400).json({ message: 'Enter the 6-digit OTP sent to your email address.' });
    }

    const session = await RegistrationEmailVerification.findOne({ email }).select('+otpHash +tokenHash');

    if (!session || !session.otpHash) {
      return res.status(404).json({ message: 'No active email verification OTP was found. Please send a new OTP.' });
    }

    if (new Date() > session.expiresAt) {
      await RegistrationEmailVerification.deleteOne({ _id: session._id });
      return res.status(400).json({ message: 'Email OTP has expired. Please send a new OTP.' });
    }

    if (session.attempts >= MAX_OTP_ATTEMPTS) {
      await RegistrationEmailVerification.deleteOne({ _id: session._id });
      return res.status(429).json({ message: 'Maximum email OTP attempts exceeded. Please start email verification again.' });
    }

    const approved = await bcrypt.compare(otp, session.otpHash);

    if (!approved) {
      session.attempts += 1;
      await session.save();
      const attemptsRemaining = MAX_OTP_ATTEMPTS - session.attempts;
      return res.status(400).json({
        message: `Invalid email OTP. ${attemptsRemaining} attempt${attemptsRemaining === 1 ? '' : 's'} remaining.`,
      });
    }

    const verificationToken = crypto.randomBytes(32).toString('hex');
    session.otpHash = null;
    session.attempts = 0;
    session.tokenHash = hashToken(verificationToken);
    session.verifiedAt = new Date();
    session.expiresAt = new Date(Date.now() + VERIFICATION_PROOF_EXPIRY_MS);
    await session.save();

    return res.status(200).json({
      message: 'Email address verified successfully.',
      verified: true,
      email,
      verificationToken,
      expiresInSeconds: VERIFICATION_PROOF_EXPIRY_MS / 1000,
    });
  } catch (error) {
    console.error('Registration email OTP verification error:', error);
    return res.status(500).json({ message: 'Failed to verify the email OTP. Please try again.' });
  }
}

export async function registerOwner(req, res) {
  const {
    name,
    username,
    email: rawEmail,
    emailVerificationToken,
    phone: rawPhone,
    phoneVerificationToken,
    password,
    confirmPassword,
  } = req.body;

  const phone = normalizePhone(rawPhone);
  const email = normalizeEmail(rawEmail);

  if (
    !name ||
    !username ||
    !email ||
    !emailVerificationToken ||
    !phone ||
    !phoneVerificationToken ||
    !password ||
    !confirmPassword
  ) {
    return res.status(400).json({
      message: 'All fields, including email and mobile verification, are required.',
    });
  }

  if (!isValidEmail(email)) {
    return res.status(400).json({ message: 'Enter a valid email address.' });
  }

  if (!isAllowedDemoMobile(phone)) {
    return res.status(400).json({
      message: 'Demo mode: please use one of the configured test mobile numbers shown on the registration page.',
    });
  }

  if (!req.file) {
    return res.status(400).json({ message: 'Aadhaar card image or PDF is required for owner registration.' });
  }

  if (password !== confirmPassword) {
    return res.status(400).json({ message: 'Password and confirm password do not match.' });
  }

  if (password.length < 8) {
    return res.status(400).json({ message: 'Password must be at least 8 characters long.' });
  }

  const phoneProof = await RegistrationPhoneVerification.findOne({
    phone,
    tokenHash: hashToken(String(phoneVerificationToken)),
    verifiedAt: { $ne: null },
    expiresAt: { $gt: new Date() },
  }).select('+tokenHash');

  if (!phoneProof) {
    return res.status(403).json({
      message: 'Mobile verification is missing or expired. Verify your mobile number again.',
    });
  }

  const emailProof = await RegistrationEmailVerification.findOne({
    email,
    tokenHash: hashToken(String(emailVerificationToken)),
    verifiedAt: { $ne: null },
    expiresAt: { $gt: new Date() },
  }).select('+tokenHash');

  if (!emailProof) {
    return res.status(403).json({
      message: 'Email verification is missing or expired. Verify your email address again.',
    });
  }

  const normalizedUsername = username.trim().toLowerCase();

  const existing = await User.findOne({
    $or: [
      { username: normalizedUsername },
      { email },
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
      email,
      emailVerified: true,
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

    await Promise.all([
      RegistrationPhoneVerification.deleteOne({ _id: phoneProof._id }),
      RegistrationEmailVerification.deleteOne({ _id: emailProof._id }),
    ]);

    return res.status(201).json({
      message: 'Registration received. Your email and mobile number are verified. An administrator must review your Aadhaar card and approve your account before you can log in.',
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
    return res.status(500).json({ message: 'Registration failed. Please try again.' });
  }
}
