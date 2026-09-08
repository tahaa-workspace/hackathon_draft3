import bcrypt from 'bcryptjs';
import streamifier from 'streamifier';
import User from '../models/User.js';
import generateToken from '../utils/generateToken.js';
import cloudinary from '../config/cloudinary.js';
import crypto from "crypto";
import PasswordChangeOTP from "../models/PasswordChangeOTP.js";
import transporter from "../config/mailer.js";
import {
  encryptAadhaarBuffer,
  uploadEncryptedAadhaar,
} from "../services/aadhaarEncryptionService.js";

const SALT_ROUNDS = 12;

function publicUser(user) {
  return {
    id: user._id.toString(),
    name: user.name,
    username: user.username,
    email: user.email,
    role: user.role,
    status: user.status,
    mustChangePassword: user.mustChangePassword,
    createdAt: user.createdAt,
  };
}

async function uploadAuthenticatedFile(file, folder) {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
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

// async function uploadAadhaar(file) {
//   return uploadAuthenticatedFile(file, 'digital-legacy/aadhaar');
// }

async function uploadLawyerCredential(file) {
  return uploadAuthenticatedFile(file, 'digital-legacy/lawyer-credentials');
}

function parsePracticeAreas(value) {
  if (!value) return [];

  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }

  const raw = String(value).trim();
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.map((item) => String(item).trim()).filter(Boolean);
    }
  } catch {
    // Fall back to comma-separated values.
  }

  return raw.split(',').map((item) => item.trim()).filter(Boolean);
}

export async function register(req, res) {
  const { name, username, email, password, confirmPassword } = req.body;

  if (!name || !username || !email || !password || !confirmPassword) {
    return res.status(400).json({ message: 'All fields are required.' });
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

  const normalizedUsername = username.trim().toLowerCase();
  const normalizedEmail = email.trim().toLowerCase();
  const existing = await User.findOne({
    $or: [{ username: normalizedUsername }, { email: normalizedEmail }],
  }).lean();

  if (existing) {
    return res.status(409).json({ message: 'A user with that username or email already exists.' });
  }

  let uploadResult;
  try {
    const {
  encrypted,
  encryption,
} =
  encryptAadhaarBuffer(
    req.file.buffer
  );

uploadResult =
  await uploadEncryptedAadhaar(
    encrypted,
    "digital-legacy/encrypted-aadhaar/owners"
  );
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    const user = await User.create({
      name: name.trim(),
      username: normalizedUsername,
      email: normalizedEmail,
      passwordHash,
      role: 'OWNER',
      status: 'PENDING',
      createdBy: null,
      mustChangePassword: false,
aadhaarDocument: {

  publicId:
    uploadResult.public_id,

  resourceType:
    "raw",

  deliveryType:
    "authenticated",

  originalName:
    req.file.originalname,

  mimeType:
    req.file.mimetype,

  fileSize:
    req.file.size,

  encryptedSize:
    encrypted.length,

  encryption,
},
      verification: {
        reviewedBy: null,
        reviewedAt: null,
        rejectionReason: null,
      },
    });

    return res.status(201).json({
      message: 'Registration received. An administrator must review your Aadhaar card and approve your account before you can log in.',
      user: publicUser(user),
    });
  } catch (error) {
    if (uploadResult?.public_id) {
      await cloudinary.uploader.destroy(uploadResult.public_id, {
       resource_type:
  "raw",
        type: 'authenticated',
      }).catch(() => {});
    }

    console.error('Owner registration error:', error);
    return res.status(500).json({ message: 'Registration failed. Please try again.' });
  }
}

export async function registerLawyer(req, res) {
  const {
    name,
    username,
    email,
    password,
    confirmPassword,
    phone,
    city,
    state,
    enrollmentNumber,
    stateBarCouncil,
    yearsOfExperience,
    practiceAreas,
  } = req.body;

  const requiredFields = {
    name,
    username,
    email,
    password,
    confirmPassword,
    phone,
    city,
    state,
    enrollmentNumber,
    stateBarCouncil,
  };

  const missingField = Object.entries(requiredFields).find(([, value]) => !String(value ?? '').trim());
  if (missingField) {
    return res.status(400).json({ message: `${missingField[0]} is required.` });
  }

  if (!req.file) {
    return res.status(400).json({ message: 'Professional credential proof image or PDF is required for lawyer registration.' });
  }

  if (password !== confirmPassword) {
    return res.status(400).json({ message: 'Password and confirm password do not match.' });
  }

  if (password.length < 8) {
    return res.status(400).json({ message: 'Password must be at least 8 characters long.' });
  }

  let parsedYears = null;
  if (yearsOfExperience !== undefined && String(yearsOfExperience).trim() !== '') {
    parsedYears = Number(yearsOfExperience);
    if (!Number.isFinite(parsedYears) || parsedYears < 0) {
      return res.status(400).json({ message: 'Years of experience must be a non-negative number.' });
    }
  }

  const normalizedUsername = username.trim().toLowerCase();
  const normalizedEmail = email.trim().toLowerCase();
  const normalizedEnrollmentNumber = enrollmentNumber.trim();

  const existing = await User.findOne({
    $or: [
      { username: normalizedUsername },
      { email: normalizedEmail },
      {
        role: 'LAWYER',
        'lawyerProfile.enrollmentNumber': normalizedEnrollmentNumber,
      },
    ],
  }).lean();

  if (existing) {
    if (existing.username === normalizedUsername || existing.email === normalizedEmail) {
      return res.status(409).json({ message: 'A user with that username or email already exists.' });
    }
    return res.status(409).json({ message: 'A lawyer with that enrollment number is already registered.' });
  }

  let uploadResult;
  try {
    uploadResult = await uploadLawyerCredential(req.file);
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    const user = await User.create({
      name: name.trim(),
      username: normalizedUsername,
      email: normalizedEmail,
      passwordHash,
      role: 'LAWYER',
      status: 'PENDING',
      createdBy: null,
      mustChangePassword: false,
      lawyerProfile: {
        phone: phone.trim(),
        city: city.trim(),
        state: state.trim(),
        enrollmentNumber: normalizedEnrollmentNumber,
        stateBarCouncil: stateBarCouncil.trim(),
        yearsOfExperience: parsedYears,
        practiceAreas: parsePracticeAreas(practiceAreas),
        credentialDocument: {
          publicId: uploadResult.public_id,
          resourceType: uploadResult.resource_type,
          originalName: req.file.originalname,
          mimeType: req.file.mimetype,
          fileSize: req.file.size,
        },
      },
      verification: {
        reviewedBy: null,
        reviewedAt: null,
        rejectionReason: null,
      },
    });

    return res.status(201).json({
      message: 'Lawyer registration received. An administrator must review your professional credentials and approve your account before you can log in.',
      user: publicUser(user),
    });
  } catch (error) {
    if (uploadResult?.public_id) {
      await cloudinary.uploader.destroy(uploadResult.public_id, {
        resource_type: uploadResult.resource_type || 'image',
        type: 'authenticated',
      }).catch(() => {});
    }

    console.error('Lawyer registration error:', error);
    return res.status(500).json({ message: 'Lawyer registration failed. Please try again.' });
  }
}

export async function login(req, res) {
  const { identifier, password } = req.body;
  if (!identifier || !password) {
    return res.status(400).json({ message: 'Username/email and password are required.' });
  }

  const user = await User.findOne({
    $or: [{ username: identifier.toLowerCase() }, { email: identifier.toLowerCase() }],
  }).select('+passwordHash');

  if (!user) {
    return res.status(401).json({ message: 'Invalid credentials.' });
  }

  const isMatch = await bcrypt.compare(password, user.passwordHash);
  if (!isMatch) {
    return res.status(401).json({ message: 'Invalid credentials.' });
  }

  if (user.status === 'PENDING') {
    return res.status(403).json({ message: 'Your account is pending administrator approval.' });
  }
  if (user.status === 'REJECTED') {
    const reason = user.verification?.rejectionReason;
    return res.status(403).json({
      message: reason
        ? `Your registration was rejected: ${reason}`
        : 'Your registration was rejected. Contact an administrator.',
    });
  }
  if (user.status !== 'ACTIVE') {
    return res.status(403).json({ message: 'Your account is not active.' });
  }

  const token = generateToken(user);

  return res.status(200).json({
    message: 'Login successful.',
    token,
    user: publicUser(user),
  });
}

// export async function changePassword(req, res) {
//   const { currentPassword, newPassword, confirmNewPassword } = req.body;

//   if (!currentPassword || !newPassword || !confirmNewPassword) {
//     return res.status(400).json({ message: 'All password fields are required.' });
//   }
//   if (newPassword !== confirmNewPassword) {
//     return res.status(400).json({ message: 'New password and confirm password do not match.' });
//   }
//   if (newPassword.length < 8) {
//     return res.status(400).json({ message: 'New password must be at least 8 characters long.' });
//   }

//   const user = await User.findById(req.user.id).select('+passwordHash');
//   if (!user) {
//     return res.status(404).json({ message: 'User not found.' });
//   }

//   const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
//   if (!isMatch) {
//     return res.status(401).json({ message: 'Current password is incorrect.' });
//   }

//   user.passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
//   user.mustChangePassword = false;
//   await user.save();

//   return res.status(200).json({ message: 'Password updated successfully.' });
// }





/*
======================
PASSWORD CHANGE CONFIG
======================
*/

const PASSWORD_OTP_EXPIRY_MS =
    5 * 60 * 1000;

const PASSWORD_OTP_VERIFIED_SESSION_MS =
    10 * 60 * 1000;

const MAX_OTP_ATTEMPTS = 5;

const MAX_OTP_RESENDS = 2;


/*
=========================================================
SEND PASSWORD CHANGE OTP
=========================================================
*/

export const requestPasswordChangeOTP =
    async (req, res) => {

    try {
        /*
        =========================================
        FIND LOGGED-IN USER
        =========================================
        */

        const user =
            await User.findById(
                req.user.id
            ).select(
                "name username email role status"
            );

        if (!user) {
            return res.status(404).json({
                message:
                    "User not found.",
            });
        }

        if (
            user.status !== "ACTIVE"
        ) {
            return res.status(403).json({
                message:
                    "Only active accounts can change their password.",
            });
        }

        if (!user.email) {
            return res.status(400).json({
                message:
                    "No registered email address is available for this account.",
            });
        }

        /*
        =========================================
        CHECK EXISTING OTP SESSION
        =========================================
        */

        let otpRequest =
            await PasswordChangeOTP.findOne({
                userId: user._id,
            });

        const now = new Date();

        /*
        If OTP was already verified, password
        form should be completed instead of
        requesting another OTP.
        */

        if (
            otpRequest?.otpVerified &&
            otpRequest.verifiedAt
        ) {
            const verifiedUntil =
                new Date(
                    otpRequest.verifiedAt.getTime() +
                    PASSWORD_OTP_VERIFIED_SESSION_MS
                );

            if (
                now <= verifiedUntil
            ) {
                return res.status(409).json({
                    message:
                        "Your email has already been verified. Complete the password change form.",

                    verified: true,
                });
            }

            /*
            Verified session expired.
            Start a completely new OTP session.
            */

            await PasswordChangeOTP.deleteOne({
                _id: otpRequest._id,
            });

            otpRequest = null;
        }

        /*
        If an OTP session exists but its OTP
        expired, end that session and create a
        fresh one.

        This counts as a new password-change
        session.
        */

        if (
            otpRequest &&
            now > otpRequest.expiresAt
        ) {
            await PasswordChangeOTP.deleteOne({
                _id: otpRequest._id,
            });

            otpRequest = null;
        }

        /*
        =========================================
        RESEND LIMIT
        =========================================

        First request:
        resendCount = 0

        First resend:
        resendCount = 1

        Second resend:
        resendCount = 2

        Third resend:
        BLOCK
        */

        let resendCount = 0;

        if (otpRequest) {

            if (
                otpRequest.resendCount >=
                MAX_OTP_RESENDS
            ) {
                return res.status(429).json({
                    message:
                        "You have reached the maximum OTP resend limit for this password-change session.",

                    resendsRemaining: 0,
                });
            }

            resendCount =
                otpRequest.resendCount + 1;
        }

        /*
        =========================================
        GENERATE NEW OTP
        =========================================
        */

        const otp =
            crypto.randomInt(
                100000,
                1000000
            ).toString();

        const otpHash =
            await bcrypt.hash(
                otp,
                12
            );

        const expiresAt =
            new Date(
                Date.now() +
                PASSWORD_OTP_EXPIRY_MS
            );

        /*
        =========================================
        CREATE / UPDATE OTP SESSION
        =========================================
        */

        if (!otpRequest) {

            otpRequest =
                await PasswordChangeOTP.create({
                    userId:
                        user._id,

                    otpHash,

                    expiresAt,

                    attempts:
                        0,

                    resendCount:
                        0,

                    otpVerified:
                        false,

                    verifiedAt:
                        null,
                });

        } else {

            otpRequest.otpHash =
                otpHash;

            otpRequest.expiresAt =
                expiresAt;

            otpRequest.attempts =
                0;

            otpRequest.resendCount =
                resendCount;

            otpRequest.otpVerified =
                false;

            otpRequest.verifiedAt =
                null;

            await otpRequest.save();
        }

        /*
        =========================================
        SEND OTP EMAIL
        =========================================
        */

        try {

            await transporter.sendMail({

                from: {
                    name:
                        "NextGen Vault",

                    address:
                        process.env.EMAIL_USER,
                },

                to:
                    user.email,

                subject:
                    "NextGen Vault - Password Change Verification",

                text: `
Hello ${user.name || user.username},

Your password change verification code is:

${otp}

This OTP will expire in 5 minutes.

If you did not request this password change, please ignore this email.

NextGen Vault
                `.trim(),

                html: `
                    <div style="
                        font-family: Arial, sans-serif;
                        max-width: 600px;
                        margin: auto;
                        padding: 24px;
                    ">

                        <div style="
                            background: #ffffff;
                            border: 1px solid #e2e8f0;
                            border-radius: 14px;
                            padding: 28px;
                        ">

                            <h2 style="
                                color: #0f172a;
                                margin-top: 0;
                            ">
                                NextGen Vault
                            </h2>

                            <p style="
                                color: #475569;
                            ">
                                Hello
                                <strong>
                                    ${user.name || user.username}
                                </strong>,
                            </p>

                            <p style="
                                color: #475569;
                            ">
                                Use this verification code to
                                continue changing your password.
                            </p>

                            <div style="
                                margin: 24px 0;
                                padding: 18px;
                                background: #f1f5f9;
                                border-radius: 10px;
                                text-align: center;
                            ">

                                <div style="
                                    font-size: 32px;
                                    letter-spacing: 10px;
                                    font-weight: bold;
                                    color: #0f172a;
                                ">
                                    ${otp}
                                </div>

                            </div>

                            <p style="
                                color: #64748b;
                            ">
                                This OTP expires in
                                <strong>5 minutes</strong>.
                            </p>

                            <p style="
                                color: #64748b;
                                font-size: 13px;
                            ">
                                If you did not request a password
                                change, you can safely ignore this
                                message.
                            </p>

                        </div>

                    </div>
                `,
            });

        } catch (mailError) {

            /*
            If initial email cannot be sent,
            delete the fresh OTP session.

            If it was a resend, keeping the
            generated unusable OTP would also
            invalidate the previous OTP, so
            delete the session and let the
            user start again.
            */

            await PasswordChangeOTP.deleteOne({
                userId:
                    user._id,
            });

            console.error(
                "Password change OTP email error:",
                mailError
            );

            return res.status(500).json({
                message:
                    "Unable to send the verification OTP. Please try again.",
            });
        }

        const resendsRemaining =
            Math.max(
                0,
                MAX_OTP_RESENDS -
                otpRequest.resendCount
            );

        return res.status(200).json({

            message:
                otpRequest.resendCount > 0
                    ? "A new OTP has been sent to your registered email address."
                    : "OTP sent to your registered email address.",

            expiresInSeconds:
                PASSWORD_OTP_EXPIRY_MS /
                1000,

            resendsRemaining,

        });

    } catch (error) {

        console.error(
            "Password change OTP request error:",
            error
        );

        return res.status(500).json({
            message:
                "Failed to send verification OTP.",

            error:
                error.message,
        });
    }
};


/*
=========================================================
VERIFY PASSWORD CHANGE OTP
=========================================================
*/

export const verifyPasswordChangeOTP =
    async (req, res) => {

    try {

        const { otp } =
            req.body || {};

        if (
            !otp ||
            !/^\d{6}$/.test(
                String(otp)
            )
        ) {
            return res.status(400).json({
                message:
                    "Please enter a valid 6-digit OTP.",
            });
        }

        const otpRequest =
            await PasswordChangeOTP.findOne({
                userId:
                    req.user.id,
            });

        if (!otpRequest) {
            return res.status(404).json({
                message:
                    "No active password-change verification session was found.",
            });
        }

        /*
        Already verified.
        */

        if (otpRequest.otpVerified) {

            return res.status(200).json({
                message:
                    "Email verification is already complete.",

                verified:
                    true,
            });
        }

        /*
        OTP expiry.
        */

        if (
            new Date() >
            otpRequest.expiresAt
        ) {

            await PasswordChangeOTP.deleteOne({
                _id:
                    otpRequest._id,
            });

            return res.status(400).json({
                message:
                    "OTP has expired. Please send a new OTP.",
            });
        }

        /*
        Too many invalid attempts.
        */

        if (
            otpRequest.attempts >=
            MAX_OTP_ATTEMPTS
        ) {

            await PasswordChangeOTP.deleteOne({
                _id:
                    otpRequest._id,
            });

            return res.status(429).json({
                message:
                    "Maximum OTP attempts exceeded. Start the password-change verification again.",
            });
        }

        /*
        Compare hashed OTP.
        */

        const otpMatch =
            await bcrypt.compare(
                String(otp),
                otpRequest.otpHash
            );

        if (!otpMatch) {

            otpRequest.attempts += 1;

            await otpRequest.save();

            const attemptsRemaining =
                MAX_OTP_ATTEMPTS -
                otpRequest.attempts;

            if (
                attemptsRemaining <= 0
            ) {

                await PasswordChangeOTP.deleteOne({
                    _id:
                        otpRequest._id,
                });

                return res.status(429).json({
                    message:
                        "Maximum OTP attempts exceeded. Start the verification again.",
                });
            }

            return res.status(400).json({
                message:
                    `Invalid OTP. ${attemptsRemaining} attempt${attemptsRemaining === 1 ? "" : "s"} remaining.`,
            });
        }

        /*
        =========================================
        OTP CORRECT
        =========================================
        */

        otpRequest.otpVerified =
            true;

        otpRequest.verifiedAt =
            new Date();

        otpRequest.attempts =
            0;

        await otpRequest.save();

        return res.status(200).json({

            message:
                "Email verified successfully.",

            verified:
                true,

        });

    } catch (error) {

        console.error(
            "Password OTP verification error:",
            error
        );

        return res.status(500).json({
            message:
                "Failed to verify OTP.",

            error:
                error.message,
        });
    }
};


/*
=========================================================
COMPLETE PASSWORD CHANGE
=========================================================
*/

export const completePasswordChange =
    async (req, res) => {

    try {

        const {
            currentPassword,
            newPassword,
            confirmNewPassword,
        } =
            req.body || {};

        /*
        =========================================
        VALIDATION
        =========================================
        */

        if (
            !currentPassword ||
            !newPassword ||
            !confirmNewPassword
        ) {
            return res.status(400).json({
                message:
                    "Current password, new password, and confirmation password are required.",
            });
        }

        if (
            newPassword !==
            confirmNewPassword
        ) {
            return res.status(400).json({
                message:
                    "New password and confirm new password do not match.",
            });
        }

        if (
            newPassword.length < 8
        ) {
            return res.status(400).json({
                message:
                    "New password must be at least 8 characters long.",
            });
        }

        /*
        =========================================
        VERIFY OTP SESSION
        =========================================
        */

        const otpRequest =
            await PasswordChangeOTP.findOne({
                userId:
                    req.user.id,
            });

        if (
            !otpRequest ||
            !otpRequest.otpVerified ||
            !otpRequest.verifiedAt
        ) {
            return res.status(403).json({
                message:
                    "Email verification is required before changing your password.",
            });
        }

        const verifiedUntil =
            new Date(
                otpRequest.verifiedAt.getTime() +
                PASSWORD_OTP_VERIFIED_SESSION_MS
            );

        if (
            new Date() >
            verifiedUntil
        ) {

            await PasswordChangeOTP.deleteOne({
                _id:
                    otpRequest._id,
            });

            return res.status(403).json({
                message:
                    "Your verified password-change session has expired. Please verify your email again.",
            });
        }

        /*
        =========================================
        GET CURRENT PASSWORD HASH
        =========================================
        */

        const user =
            await User.findById(
                req.user.id
            ).select(
                "+passwordHash"
            );

        if (!user) {
            return res.status(404).json({
                message:
                    "User not found.",
            });
        }

        if (!user.passwordHash) {
            return res.status(500).json({
                message:
                    "Password information is missing for this account.",
            });
        }

        /*
        =========================================
        CHECK CURRENT PASSWORD
        =========================================
        */

        const currentMatches =
            await bcrypt.compare(
                currentPassword,
                user.passwordHash
            );

        if (!currentMatches) {
            return res.status(401).json({
                message:
                    "Current password is incorrect.",
            });
        }

        /*
        =========================================
        PREVENT SAME PASSWORD
        =========================================
        */

        const samePassword =
            await bcrypt.compare(
                newPassword,

                user.passwordHash
            );

        if (samePassword) {
            return res.status(400).json({
                message:
                    "New password cannot be the same as your current password.",
            });
        }

        /*
        =========================================
        SAVE NEW PASSWORD
        =========================================
        */

        user.passwordHash =
            await bcrypt.hash(
                newPassword,
                SALT_ROUNDS
            );

        /*
        Important for Beneficiary first login.
        */

        user.mustChangePassword =
            false;

        await user.save();

        /*
        OTP is single-use.
        */

        await PasswordChangeOTP.deleteOne({
            _id:
                otpRequest._id,
        });

        return res.status(200).json({

            message:
                "Password successfully changed.",

            passwordChanged:
                true,

            user: {
                id:
                    user._id.toString(),

                name:
                    user.name,

                username:
                    user.username,

                email:
                    user.email,

                role:
                    user.role,

                status:
                    user.status,

                mustChangePassword:
                    false,

                createdAt:
                    user.createdAt,
            },

        });

    } catch (error) {

        console.error(
            "Complete password change error:",
            error
        );

        return res.status(500).json({
            message:
                "Failed to change password.",

            error:
                error.message,
        });
    }
};