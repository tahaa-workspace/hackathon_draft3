import bcrypt from 'bcryptjs';
import crypto from 'crypto';

import User from '../models/User.js';

import RegistrationPhoneVerification from '../models/RegistrationPhoneVerification.js';
import RegistrationEmailVerification from '../models/RegistrationEmailVerification.js';

import { sendTransactionalEmail } from '../services/mailService.js';
import { writeAudit } from '../services/auditService.js';
import { registrationOtpTemplate, registrationVerificationLinkTemplate } from '../services/emailTemplates.js';

import {
  encryptAadhaarBuffer,
  uploadEncryptedAadhaar,
  deleteEncryptedAadhaar,
} from '../services/aadhaarEncryptionService.js';
import { validateUploadedFile } from '../services/fileValidationService.js';


const SALT_ROUNDS = 12;

const DEMO_MOBILES = new Set([
  '+919054559272',
  '+916352522036',
  '+918238387089',
  '+919106882453',
  '+919316744194',
  '+919999999999',
  '+918888888888',
  '+917777777777',
  '+916666666666',
]);

const OTP_EXPIRY_MS =
  5 * 60 * 1000;

const VERIFICATION_PROOF_EXPIRY_MS =
  10 * 60 * 1000;

const EMAIL_LINK_EXPIRY_MS =
  30 * 60 * 1000;

const OTP_RESEND_COOLDOWN_MS =
  60 * 1000;

const MAX_OTP_ATTEMPTS = 5;


/*
|--------------------------------------------------------------------------
| NORMALIZE PHONE
|--------------------------------------------------------------------------
*/

function normalizePhone(value) {
  const raw =
    String(value || '')
      .trim()
      .replace(
        /[\s()-]/g,
        ''
      );

  if (
    /^\d{10}$/.test(
      raw
    )
  ) {
    return `+91${raw}`;
  }

  if (
    /^91\d{10}$/.test(
      raw
    )
  ) {
    return `+${raw}`;
  }

  if (
    /^\+[1-9]\d{7,14}$/.test(
      raw
    )
  ) {
    return raw;
  }

  return null;
}


/*
|--------------------------------------------------------------------------
| NORMALIZE EMAIL
|--------------------------------------------------------------------------
*/

function normalizeEmail(value) {
  return String(
    value || ''
  )
    .trim()
    .toLowerCase();
}


function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
    email
  );
}


function isAllowedDemoMobile(
  phone
) {
  return DEMO_MOBILES.has(
    phone
  );
}


function displayPhone(phone) {
  return phone.startsWith(
    '+91'
  )
    ? phone.slice(3)
    : phone;
}


function hashToken(token) {
  return crypto
    .createHash(
      'sha256'
    )
    .update(token)
    .digest('hex');
}

function getFrontendBaseUrl() {
  return String(
    process.env.APP_BASE_URL ||
    process.env.FRONTEND_URL ||
    'http://localhost:5173'
  ).replace(/\/$/, '');
}

async function createEmailVerificationSession(user) {
  const token =
    crypto
      .randomBytes(32)
      .toString('hex');

  const expiresAt =
    new Date(
      Date.now() +
      EMAIL_LINK_EXPIRY_MS
    );

  await RegistrationEmailVerification.findOneAndUpdate(
    { email: user.email },
    {
      $set: {
        otpHash: null,
        attempts: 0,
        lastSentAt: new Date(),
        tokenHash: hashToken(token),
        verifiedAt: null,
        expiresAt,
      },
      $inc: {
        resendCount: 1,
      },
    },
    {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true,
    }
  );

  const verificationUrl =
    getFrontendBaseUrl() +
    '/verify-email?token=' +
    encodeURIComponent(token);

  const content =
    registrationVerificationLinkTemplate({
      name: user.name || user.username,
      verificationUrl,
    });

  await sendTransactionalEmail({
    to: user.email,
    ...content,
  });

  return {
    expiresAt,
    verificationUrl,
  };
}


/*
|--------------------------------------------------------------------------
| PUBLIC USER PAYLOAD
|--------------------------------------------------------------------------
*/

function publicUser(user) {
  return {
    id:
      user._id.toString(),

    name:
      user.name,

    username:
      user.username,

    email:
      user.email,

    emailVerified:
      user.emailVerified,

    phone:
      user.phone,

    phoneVerified:
      user.phoneVerified,

    role:
      user.role,

    status:
      user.status,

    mustChangePassword:
      user.mustChangePassword,

    createdAt:
      user.createdAt,
  };
}


/*
|--------------------------------------------------------------------------
| OTP RETRY HELPER
|--------------------------------------------------------------------------
*/

function getRetryAfterSeconds(
  lastSentAt
) {
  if (!lastSentAt) {
    return 0;
  }

  const elapsed =
    Date.now() -
    new Date(
      lastSentAt
    ).getTime();

  if (
    elapsed >=
    OTP_RESEND_COOLDOWN_MS
  ) {
    return 0;
  }

  return Math.ceil(
    (
      OTP_RESEND_COOLDOWN_MS -
      elapsed
    ) / 1000
  );
}


/*
|--------------------------------------------------------------------------
| SEND MOBILE OTP
|--------------------------------------------------------------------------
*/

export async function requestRegistrationOTP(
  req,
  res
) {
  try {

    const phone =
      normalizePhone(
        req.body?.phone
      );


    if (!phone) {
      return res
        .status(400)
        .json({
          message:
            'Enter a valid 10-digit Indian mobile number.',
        });
    }


    if (
      !isAllowedDemoMobile(
        phone
      )
    ) {
      return res
        .status(400)
        .json({
          message:
            'Demo mode: please use one of the configured test mobile numbers shown on the registration page.',
        });
    }


    const existing =
      await User.findOne({
        phone,
      }).lean();


    if (existing) {
      return res
        .status(409)
        .json({
          message:
            'An account with this mobile number already exists. Use another configured demo number or delete the previous demo owner before testing again.',
        });
    }


    let session =
      await RegistrationPhoneVerification
        .findOne({
          phone,
        })
        .select(
          '+otpHash +tokenHash'
        );


    const retryAfterSeconds =
      getRetryAfterSeconds(
        session?.lastSentAt
      );


    if (
      retryAfterSeconds >
      0
    ) {
      return res
        .status(429)
        .json({
          message:
            `Please wait ${retryAfterSeconds} seconds before requesting another OTP.`,

          retryAfterSeconds,
        });
    }


    const otp =
      crypto
        .randomInt(
          100000,
          1000000
        )
        .toString();


    const otpHash =
      await bcrypt.hash(
        otp,
        SALT_ROUNDS
      );


    const expiresAt =
      new Date(
        Date.now() +
        OTP_EXPIRY_MS
      );


    if (!session) {

      session =
        await RegistrationPhoneVerification.create({
          phone,
          otpHash,
          attempts: 0,
          resendCount: 0,
          lastSentAt:
            new Date(),
          tokenHash: null,
          verifiedAt: null,
          expiresAt,
        });

    } else {

      session.otpHash =
        otpHash;

      session.attempts =
        0;

      session.resendCount =
        (
          session.resendCount ||
          0
        ) + 1;

      session.lastSentAt =
        new Date();

      session.tokenHash =
        null;

      session.verifiedAt =
        null;

      session.expiresAt =
        expiresAt;

      await session.save();
    }


    console.log(
      '\n==============================================='
    );

    console.log(
      'NEXT GEN VAULT - DEMO REGISTRATION OTP'
    );

    console.log(
      `Mobile: ${displayPhone(
        phone
      )}`
    );

    console.log(
      `OTP: ${otp}`
    );

    console.log(
      'Valid for: 5 minutes'
    );

    console.log(
      '===============================================\n'
    );


    return res
      .status(200)
      .json({
        message:
          'Demo OTP generated. Check the backend terminal for the 6-digit OTP.',

        phone,

        expiresInSeconds:
          OTP_EXPIRY_MS /
          1000,
      });

  } catch (error) {

    console.error(
      'Registration OTP generation error:',
      error
    );

    return res
      .status(500)
      .json({
        message:
          'Unable to generate the demo OTP. Please try again.',
      });
  }
}


/*
|--------------------------------------------------------------------------
| VERIFY MOBILE OTP
|--------------------------------------------------------------------------
*/

export async function verifyRegistrationOTP(
  req,
  res
) {
  try {

    const phone =
      normalizePhone(
        req.body?.phone
      );

    const otp =
      String(
        req.body?.otp ||
        ''
      ).trim();


    if (!phone) {
      return res
        .status(400)
        .json({
          message:
            'Enter a valid mobile number.',
        });
    }


    if (
      !isAllowedDemoMobile(
        phone
      )
    ) {
      return res
        .status(400)
        .json({
          message:
            'Demo mode: please use one of the configured test mobile numbers shown on the registration page.',
        });
    }


    if (
      !/^\d{6}$/.test(
        otp
      )
    ) {
      return res
        .status(400)
        .json({
          message:
            'Enter the 6-digit OTP shown in the backend terminal.',
        });
    }


    const session =
      await RegistrationPhoneVerification
        .findOne({
          phone,
        })
        .select(
          '+otpHash +tokenHash'
        );


    if (
      !session ||
      !session.otpHash
    ) {
      return res
        .status(404)
        .json({
          message:
            'No active registration OTP was found. Please send a new OTP.',
        });
    }


    if (
      new Date() >
      session.expiresAt
    ) {

      await RegistrationPhoneVerification.deleteOne({
        _id:
          session._id,
      });

      return res
        .status(400)
        .json({
          message:
            'OTP has expired. Please send a new OTP.',
        });
    }


    if (
      session.attempts >=
      MAX_OTP_ATTEMPTS
    ) {

      await RegistrationPhoneVerification.deleteOne({
        _id:
          session._id,
      });

      return res
        .status(429)
        .json({
          message:
            'Maximum OTP attempts exceeded. Please start verification again.',
        });
    }


    const approved =
      await bcrypt.compare(
        otp,
        session.otpHash
      );


    if (!approved) {

      session.attempts +=
        1;

      await session.save();

      const attemptsRemaining =
        MAX_OTP_ATTEMPTS -
        session.attempts;


      return res
        .status(400)
        .json({
          message:
            `Invalid OTP. ${attemptsRemaining} attempt${attemptsRemaining === 1 ? '' : 's'} remaining.`,
        });
    }


    const verificationToken =
      crypto
        .randomBytes(32)
        .toString('hex');


    session.otpHash =
      null;

    session.attempts =
      0;

    session.tokenHash =
      hashToken(
        verificationToken
      );

    session.verifiedAt =
      new Date();

    session.expiresAt =
      new Date(
        Date.now() +
        VERIFICATION_PROOF_EXPIRY_MS
      );


    await session.save();


    return res
      .status(200)
      .json({
        message:
          'Mobile number verified successfully.',

        verified:
          true,

        phone,

        verificationToken,

        expiresInSeconds:
          VERIFICATION_PROOF_EXPIRY_MS /
          1000,
      });

  } catch (error) {

    console.error(
      'Registration OTP verification error:',
      error
    );

    return res
      .status(500)
      .json({
        message:
          'Failed to verify the demo OTP. Please try again.',
      });
  }
}


/*
|--------------------------------------------------------------------------
| SEND EMAIL OTP
|--------------------------------------------------------------------------
*/

export async function requestRegistrationEmailOTP(
  req,
  res
) {
  try {

    const email =
      normalizeEmail(
        req.body?.email
      );


    if (
      !email ||
      !isValidEmail(
        email
      )
    ) {
      return res
        .status(400)
        .json({
          message:
            'Enter a valid email address.',
        });
    }


    const existing =
      await User.findOne({
        email,
      }).lean();


    if (existing) {
      return res
        .status(409)
        .json({
          message:
            'An account with this email address already exists.',
        });
    }


    let session =
      await RegistrationEmailVerification
        .findOne({
          email,
        })
        .select(
          '+otpHash +tokenHash'
        );


    const retryAfterSeconds =
      getRetryAfterSeconds(
        session?.lastSentAt
      );


    if (
      retryAfterSeconds >
      0
    ) {
      return res
        .status(429)
        .json({
          message:
            `Please wait ${retryAfterSeconds} seconds before requesting another email OTP.`,

          retryAfterSeconds,
        });
    }


    const otp =
      crypto
        .randomInt(
          100000,
          1000000
        )
        .toString();


    const otpHash =
      await bcrypt.hash(
        otp,
        SALT_ROUNDS
      );


    const expiresAt =
      new Date(
        Date.now() +
        OTP_EXPIRY_MS
      );


    if (!session) {

      session =
        await RegistrationEmailVerification.create({
          email,
          otpHash,
          attempts:
            0,
          resendCount:
            0,
          lastSentAt:
            new Date(),
          tokenHash:
            null,
          verifiedAt:
            null,
          expiresAt,
        });

    } else {

      session.otpHash =
        otpHash;

      session.attempts =
        0;

      session.resendCount =
        (
          session.resendCount ||
          0
        ) + 1;

      session.lastSentAt =
        new Date();

      session.tokenHash =
        null;

      session.verifiedAt =
        null;

      session.expiresAt =
        expiresAt;

      await session.save();
    }


    try {
      const emailContent = registrationOtpTemplate({
        name: email,
        otp,
      });

      await sendTransactionalEmail({
        to: email,
        ...emailContent,
      });
    } catch (mailError) {
      await RegistrationEmailVerification.deleteOne({
        email,
      });

      console.error(
        'Registration email OTP send error:',
        mailError
      );

      return res
        .status(500)
        .json({
          message:
            'Unable to send the email OTP. Please check the email configuration and try again.',
        });
    }

    return res
      .status(200)
      .json({
        message:
          'OTP sent to your email address.',

        email,

        demoMode:
          false,

        expiresInSeconds:
          OTP_EXPIRY_MS /
          1000,
      });

  } catch (error) {

    console.error(
      'Registration email OTP request error:',
      error
    );

    return res
      .status(500)
      .json({
        message:
          'Failed to send the email verification OTP.',
      });
  }
}


/*
|--------------------------------------------------------------------------
| VERIFY EMAIL OTP
|--------------------------------------------------------------------------
*/

export async function verifyRegistrationEmailOTP(
  req,
  res
) {
  try {

    const email =
      normalizeEmail(
        req.body?.email
      );

    const otp =
      String(
        req.body?.otp ||
        ''
      ).trim();


    if (
      !email ||
      !isValidEmail(
        email
      )
    ) {
      return res
        .status(400)
        .json({
          message:
            'Enter a valid email address.',
        });
    }


    if (
      !/^\d{6}$/.test(
        otp
      )
    ) {
      return res
        .status(400)
        .json({
          message:
            'Enter the 6-digit OTP sent to your email address.',
        });
    }


    const session =
      await RegistrationEmailVerification
        .findOne({
          email,
        })
        .select(
          '+otpHash +tokenHash'
        );


    if (
      !session ||
      !session.otpHash
    ) {
      return res
        .status(404)
        .json({
          message:
            'No active email verification OTP was found. Please send a new OTP.',
        });
    }


    if (
      new Date() >
      session.expiresAt
    ) {

      await RegistrationEmailVerification.deleteOne({
        _id:
          session._id,
      });

      return res
        .status(400)
        .json({
          message:
            'Email OTP has expired. Please send a new OTP.',
        });
    }


    if (
      session.attempts >=
      MAX_OTP_ATTEMPTS
    ) {

      await RegistrationEmailVerification.deleteOne({
        _id:
          session._id,
      });

      return res
        .status(429)
        .json({
          message:
            'Maximum email OTP attempts exceeded. Please start email verification again.',
        });
    }


    const approved =
      await bcrypt.compare(
        otp,
        session.otpHash
      );


    if (!approved) {

      session.attempts +=
        1;

      await session.save();


      const attemptsRemaining =
        MAX_OTP_ATTEMPTS -
        session.attempts;


      return res
        .status(400)
        .json({
          message:
            `Invalid email OTP. ${attemptsRemaining} attempt${attemptsRemaining === 1 ? '' : 's'} remaining.`,
        });
    }


    const verificationToken =
      crypto
        .randomBytes(32)
        .toString('hex');


    session.otpHash =
      null;

    session.attempts =
      0;

    session.tokenHash =
      hashToken(
        verificationToken
      );

    session.verifiedAt =
      new Date();

    session.expiresAt =
      new Date(
        Date.now() +
        VERIFICATION_PROOF_EXPIRY_MS
      );


    await session.save();


    return res
      .status(200)
      .json({
        message:
          'Email address verified successfully.',

        verified:
          true,

        email,

        verificationToken,

        expiresInSeconds:
          VERIFICATION_PROOF_EXPIRY_MS /
          1000,
      });

  } catch (error) {

    console.error(
      'Registration email OTP verification error:',
      error
    );

    return res
      .status(500)
      .json({
        message:
          'Failed to verify the email OTP. Please try again.',
      });
  }
}


/*
|--------------------------------------------------------------------------
| REGISTER USER
|--------------------------------------------------------------------------
*/

export async function registerOwner(
  req,
  res
) {
  const {
    name,
    username,
    email: rawEmail,
    phone: rawPhone,
    password,
    confirmPassword,
  } = req.body;

  const phone =
    normalizePhone(
      rawPhone
    );

  const email =
    normalizeEmail(
      rawEmail
    );

  if (
    !name ||
    !username ||
    !email ||
    !phone ||
    !password ||
    !confirmPassword
  ) {
    return res
      .status(400)
      .json({
        message:
          'Name, username, email, mobile number, password, and confirmation are required.',
      });
  }

  if (
    !isValidEmail(
      email
    )
  ) {
    return res
      .status(400)
      .json({
        message:
          'Enter a valid email address.',
      });
  }

  if (!req.file) {
    return res
      .status(400)
      .json({
        message:
          'Aadhaar card image or PDF is required for user registration.',
      });
  }

  const aadhaarValidation =
    validateUploadedFile(
      req.file
    );

  if (!aadhaarValidation.valid) {
    return res
      .status(400)
      .json({
        message:
          aadhaarValidation.message,
      });
  }

  if (
    password !==
    confirmPassword
  ) {
    return res
      .status(400)
      .json({
        message:
          'Password and confirm password do not match.',
      });
  }

  if (
    password.length <
    8
  ) {
    return res
      .status(400)
      .json({
        message:
          'Password must be at least 8 characters long.',
      });
  }

  const normalizedUsername =
    username
      .trim()
      .toLowerCase();

  const existing =
    await User.findOne({
      $or: [
        { username: normalizedUsername },
        { email },
        { phone },
      ],
    }).lean();

  if (existing) {
    return res
      .status(409)
      .json({
        message:
          'A user with that username, email, or mobile number already exists.',
      });
  }

  let uploadResult =
    null;

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
        'digital-legacy/encrypted-aadhaar/users'
      );

    const passwordHash =
      await bcrypt.hash(
        password,
        SALT_ROUNDS
      );

    const user =
      await User.create({
        name:
          name.trim(),
        username:
          normalizedUsername,
        email,
        emailVerified:
          false,
        phone,
        phoneVerified:
          false,
        passwordHash,
        role:
          'USER',
        status:
          'PENDING',
        createdBy:
          null,
        mustChangePassword:
          false,
        aadhaarDocument: {
          publicId:
            uploadResult.public_id,
          resourceType:
            'raw',
          deliveryType:
            'authenticated',
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
          reviewedBy:
            null,
          reviewedAt:
            null,
          rejectionReason:
            null,
        },
      });

    await RegistrationEmailVerification.deleteOne({
      email:
        user.email,
    });

    let verificationEmailSent =
      false;

    try {
      await createEmailVerificationSession(
        user
      );

      verificationEmailSent =
        true;
    } catch (mailError) {
      console.error(
        'Registration verification email failed:',
        mailError.message
      );
    }

    await writeAudit(req, {
      action:
        'USER_REGISTERED',
      entityType:
        'User',
      entityId:
        user._id,
      description:
        'New user registration created and queued for email/admin verification.',
      metadata: {
        verificationEmailSent,
      },
    });

    return res
      .status(201)
      .json({
        message:
          verificationEmailSent
            ? 'Registration received. A verification link was sent to your email. Your Aadhaar is also awaiting administrator approval.'
            : 'Registration received, but the verification email could not be sent. Use Resend Verification Email before signing in.',

        verificationEmailSent,

        email:
          user.email,

        user:
          publicUser(
            user
          ),
      });
  } catch (error) {
    if (
      uploadResult
        ?.public_id
    ) {
      try {
        await deleteEncryptedAadhaar({
          publicId:
            uploadResult.public_id,
        });
      } catch (
        cleanupError
      ) {
        console.error(
          'Encrypted Aadhaar cleanup failed:',
          cleanupError
        );
      }
    }

    console.error(
      'user registration error:',
      error
    );

    return res
      .status(500)
      .json({
        message:
          'Registration failed. Please try again.',
      });
  }
}

export async function verifyRegistrationEmailLink(
  req,
  res
) {
  try {
    const token =
      String(
        req.body?.token ||
        req.query?.token ||
        ''
      ).trim();

    if (!token) {
      return res
        .status(400)
        .json({
          message:
            'Verification token is required.',
        });
    }

    const tokenHash =
      hashToken(
        token
      );

    const session =
      await RegistrationEmailVerification
        .findOne({
          tokenHash,
          expiresAt: {
            $gt:
              new Date(),
          },
        })
        .select(
          '+tokenHash'
        );

    if (!session) {
      return res
        .status(400)
        .json({
          message:
            'This email verification link is invalid or has expired.',
        });
    }

    const user =
      await User.findOne({
        email:
          session.email,
      });

    if (!user) {
      await RegistrationEmailVerification.deleteOne({
        _id:
          session._id,
      });

      return res
        .status(404)
        .json({
          message:
            'Registration account not found.',
        });
    }

    user.emailVerified =
      true;

    await user.save();

    await RegistrationEmailVerification.deleteOne({
      _id:
        session._id,
    });

    await writeAudit(req, {
      action:
        'EMAIL_VERIFIED',
      entityType:
        'User',
      entityId:
        user._id,
      description:
        'User verified registration email using a single-use link.',
    });

    return res
      .status(200)
      .json({
        message:
          'Email verified successfully. Administrator approval may still be required before login.',
        verified:
          true,
      });
  } catch (error) {
    console.error(
      'Registration email link verification error:',
      error
    );

    return res
      .status(500)
      .json({
        message:
          'Unable to verify this email link.',
      });
  }
}

export async function resendRegistrationVerification(
  req,
  res
) {
  try {
    const email =
      normalizeEmail(
        req.body?.email
      );

    if (
      !email ||
      !isValidEmail(
        email
      )
    ) {
      return res
        .status(400)
        .json({
          message:
            'Enter a valid email address.',
        });
    }

    const user =
      await User.findOne({
        email,
        role:
          'USER',
      }).select(
        'name username email emailVerified'
      );

    if (!user) {
      return res
        .status(200)
        .json({
          message:
            'If a matching unverified account exists, a new verification email will be sent.',
        });
    }

    if (
      user.emailVerified
    ) {
      return res
        .status(200)
        .json({
          message:
            'This email address is already verified.',
          verified:
            true,
        });
    }

    const existing =
      await RegistrationEmailVerification
        .findOne({
          email,
        });

    const retryAfterSeconds =
      getRetryAfterSeconds(
        existing?.lastSentAt
      );

    if (
      retryAfterSeconds >
      0
    ) {
      return res
        .status(429)
        .json({
          message:
            `Please wait ${retryAfterSeconds} seconds before requesting another verification email.`,
          retryAfterSeconds,
        });
    }

    await createEmailVerificationSession(
      user
    );

    return res
      .status(200)
      .json({
        message:
          'A new verification link was sent to your registered email address.',
      });
  } catch (error) {
    console.error(
      'Resend registration verification error:',
      error
    );

    return res
      .status(500)
      .json({
        message:
          'Unable to send a new verification email. Please check the SMTP configuration and try again.',
      });
  }
}
