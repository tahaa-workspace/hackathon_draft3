import bcrypt from 'bcryptjs';
import crypto from 'crypto';

import User from '../models/User.js';
import ProfileContactVerification from '../models/ProfileContactVerification.js';
import transporter from '../config/mailer.js';

const SALT_ROUNDS = 12;
const OTP_EXPIRY_MS = 5 * 60 * 1000;
const OTP_RESEND_COOLDOWN_MS = 60 * 1000;
const MAX_OTP_ATTEMPTS = 5;

const DEMO_MOBILES = new Set([
  '+919054559272',
  '+916352522036',
  '+918238387089',
  '+919106882453',
  '+919316744194',
]);

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function normalizePhone(value) {
  const raw = String(value || '').trim().replace(/[\s()-]/g, '');

  if (/^\d{10}$/.test(raw)) return `+91${raw}`;
  if (/^91\d{10}$/.test(raw)) return `+${raw}`;
  if (/^\+[1-9]\d{7,14}$/.test(raw)) return raw;

  return null;
}

function displayPhone(phone) {
  return phone?.startsWith('+91') ? phone.slice(3) : phone;
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

function getRetryAfterSeconds(lastSentAt) {
  if (!lastSentAt) return 0;

  const elapsed = Date.now() - new Date(lastSentAt).getTime();
  if (elapsed >= OTP_RESEND_COOLDOWN_MS) return 0;

  return Math.ceil((OTP_RESEND_COOLDOWN_MS - elapsed) / 1000);
}

async function createOrRefreshOtpSession({ userId, type, value }) {
  let session = await ProfileContactVerification.findOne({ userId, type })
    .select('+otpHash');

  const retryAfterSeconds = getRetryAfterSeconds(session?.lastSentAt);
  if (retryAfterSeconds > 0) {
    return { retryAfterSeconds };
  }

  const otp = crypto.randomInt(100000, 1000000).toString();
  const otpHash = await bcrypt.hash(otp, SALT_ROUNDS);
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MS);

  if (!session) {
    session = await ProfileContactVerification.create({
      userId,
      type,
      value,
      otpHash,
      attempts: 0,
      lastSentAt: new Date(),
      expiresAt,
    });
  } else {
    session.value = value;
    session.otpHash = otpHash;
    session.attempts = 0;
    session.lastSentAt = new Date();
    session.expiresAt = expiresAt;
    await session.save();
  }

  return { otp, session };
}

async function validateOtp({ userId, type, value, otp }) {
  const session = await ProfileContactVerification.findOne({
    userId,
    type,
  }).select('+otpHash');

  if (!session || !session.otpHash || session.value !== value) {
    return {
      error: {
        status: 404,
        message: 'No active verification OTP was found for this value. Please request a new OTP.',
      },
    };
  }

  if (new Date() > session.expiresAt) {
    await ProfileContactVerification.deleteOne({ _id: session._id });
    return {
      error: {
        status: 400,
        message: 'OTP has expired. Please request a new OTP.',
      },
    };
  }

  if (session.attempts >= MAX_OTP_ATTEMPTS) {
    await ProfileContactVerification.deleteOne({ _id: session._id });
    return {
      error: {
        status: 429,
        message: 'Maximum OTP attempts exceeded. Please request a new OTP.',
      },
    };
  }

  const approved = await bcrypt.compare(otp, session.otpHash);

  if (!approved) {
    session.attempts += 1;
    await session.save();

    const attemptsRemaining = MAX_OTP_ATTEMPTS - session.attempts;
    return {
      error: {
        status: 400,
        message: `Invalid OTP. ${attemptsRemaining} attempt${attemptsRemaining === 1 ? '' : 's'} remaining.`,
      },
    };
  }

  return { session };
}

export async function requestEmailChangeOTP(req, res) {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User account not found.' });

    const email = normalizeEmail(req.body?.email);
    if (!email || !isValidEmail(email)) {
      return res.status(400).json({ message: 'Enter a valid email address.' });
    }

    if (email === normalizeEmail(user.email)) {
      return res.status(400).json({
        message: 'New email address must be different from your current email address.',
      });
    }

    const duplicate = await User.findOne({
      email,
      _id: { $ne: user._id },
    }).lean();

    if (duplicate) {
      return res.status(409).json({ message: 'This email address is already registered.' });
    }

    const result = await createOrRefreshOtpSession({
      userId: user._id,
      type: 'EMAIL',
      value: email,
    });

    if (result.retryAfterSeconds) {
      return res.status(429).json({
        message: `Please wait ${result.retryAfterSeconds} seconds before requesting another email OTP.`,
        retryAfterSeconds: result.retryAfterSeconds,
      });
    }

    try {
      await transporter.sendMail({
        from: {
          name: 'NextGen Vault',
          address: process.env.EMAIL_USER,
        },
        to: email,
        subject: 'NextGen Vault - Verify Your New Email',
        text: `Your NextGen Vault email change OTP is ${result.otp}. It expires in 5 minutes.`,
        html: `
          <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:24px">
            <div style="border:1px solid #e2e8f0;border-radius:14px;padding:28px">
              <h2 style="margin-top:0;color:#0f172a">NextGen Vault</h2>
              <p style="color:#475569">Use this OTP to verify your new email address.</p>
              <div style="margin:24px 0;padding:18px;background:#f1f5f9;border-radius:10px;text-align:center;font-size:32px;letter-spacing:10px;font-weight:bold;color:#0f172a">${result.otp}</div>
              <p style="color:#64748b">This OTP expires in <strong>5 minutes</strong>.</p>
            </div>
          </div>
        `,
      });
    } catch (mailError) {
      await ProfileContactVerification.deleteOne({
        userId: user._id,
        type: 'EMAIL',
      });
      console.error('Profile email OTP send error:', mailError);
      return res.status(500).json({
        message: 'Unable to send the email OTP. Please check the email configuration and try again.',
      });
    }

    return res.status(200).json({
      message: 'OTP sent to your new email address.',
      email,
      expiresInSeconds: OTP_EXPIRY_MS / 1000,
    });
  } catch (error) {
    console.error('Request profile email change OTP error:', error);
    return res.status(500).json({ message: 'Unable to start email verification.' });
  }
}

export async function verifyEmailChangeOTP(req, res) {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User account not found.' });

    const email = normalizeEmail(req.body?.email);
    const otp = String(req.body?.otp || '').trim();

    if (!email || !isValidEmail(email)) {
      return res.status(400).json({ message: 'Enter a valid email address.' });
    }

    if (!/^\d{6}$/.test(otp)) {
      return res.status(400).json({ message: 'Enter the 6-digit OTP sent to your email address.' });
    }

    if (email === normalizeEmail(user.email)) {
      return res.status(400).json({
        message: 'New email address must be different from your current email address.',
      });
    }

    const duplicate = await User.findOne({
      email,
      _id: { $ne: user._id },
    }).lean();

    if (duplicate) {
      return res.status(409).json({ message: 'This email address is already registered.' });
    }

    const validation = await validateOtp({
      userId: user._id,
      type: 'EMAIL',
      value: email,
      otp,
    });

    if (validation.error) {
      return res.status(validation.error.status).json({ message: validation.error.message });
    }

    user.email = email;
    user.emailVerified = true;
    await user.save();

    await ProfileContactVerification.deleteOne({ _id: validation.session._id });

    return res.status(200).json({
      message: 'Email address updated and verified successfully.',
      user: publicUser(user),
    });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({ message: 'This email address is already registered.' });
    }
    console.error('Verify profile email change OTP error:', error);
    return res.status(500).json({ message: 'Unable to update the email address.' });
  }
}

export async function requestPhoneChangeOTP(req, res) {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User account not found.' });

    const phone = normalizePhone(req.body?.phone);
    if (!phone) {
      return res.status(400).json({ message: 'Enter a valid 10-digit Indian mobile number.' });
    }

    if (phone === normalizePhone(user.phone)) {
      return res.status(400).json({
        message: 'New mobile number must be different from your current mobile number.',
      });
    }

    if (!DEMO_MOBILES.has(phone)) {
      return res.status(400).json({
        message: 'Demo mode: please use one of the configured test mobile numbers.',
      });
    }

    const duplicate = await User.findOne({
      phone,
      _id: { $ne: user._id },
    }).lean();

    if (duplicate) {
      return res.status(409).json({ message: 'This mobile number is already registered.' });
    }

    const result = await createOrRefreshOtpSession({
      userId: user._id,
      type: 'PHONE',
      value: phone,
    });

    if (result.retryAfterSeconds) {
      return res.status(429).json({
        message: `Please wait ${result.retryAfterSeconds} seconds before requesting another mobile OTP.`,
        retryAfterSeconds: result.retryAfterSeconds,
      });
    }

    console.log('\n===============================================');
    console.log('NEXT GEN VAULT - DEMO PROFILE MOBILE OTP');
    console.log(`Mobile: ${displayPhone(phone)}`);
    console.log(`OTP: ${result.otp}`);
    console.log('Valid for: 5 minutes');
    console.log('===============================================\n');

    return res.status(200).json({
      message: 'Demo OTP generated. Check the backend terminal for the 6-digit OTP.',
      phone,
      expiresInSeconds: OTP_EXPIRY_MS / 1000,
    });
  } catch (error) {
    console.error('Request profile mobile change OTP error:', error);
    return res.status(500).json({ message: 'Unable to start mobile verification.' });
  }
}

export async function verifyPhoneChangeOTP(req, res) {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User account not found.' });

    const phone = normalizePhone(req.body?.phone);
    const otp = String(req.body?.otp || '').trim();

    if (!phone) {
      return res.status(400).json({ message: 'Enter a valid mobile number.' });
    }

    if (!/^\d{6}$/.test(otp)) {
      return res.status(400).json({ message: 'Enter the 6-digit OTP shown in the backend terminal.' });
    }

    if (phone === normalizePhone(user.phone)) {
      return res.status(400).json({
        message: 'New mobile number must be different from your current mobile number.',
      });
    }

    const duplicate = await User.findOne({
      phone,
      _id: { $ne: user._id },
    }).lean();

    if (duplicate) {
      return res.status(409).json({ message: 'This mobile number is already registered.' });
    }

    const validation = await validateOtp({
      userId: user._id,
      type: 'PHONE',
      value: phone,
      otp,
    });

    if (validation.error) {
      return res.status(validation.error.status).json({ message: validation.error.message });
    }

    user.phone = phone;
    user.phoneVerified = true;

    if (user.role === 'LAWYER' && user.lawyerProfile) {
      user.lawyerProfile.phone = phone;
    }

    await user.save();
    await ProfileContactVerification.deleteOne({ _id: validation.session._id });

    return res.status(200).json({
      message: 'Mobile number updated and verified successfully.',
      user: publicUser(user),
    });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({ message: 'This mobile number is already registered.' });
    }
    console.error('Verify profile mobile change OTP error:', error);
    return res.status(500).json({ message: 'Unable to update the mobile number.' });
  }
}
