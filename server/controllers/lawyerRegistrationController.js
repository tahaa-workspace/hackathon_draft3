import bcrypt from 'bcryptjs';

import User from '../models/User.js';
import {
  encryptLawyerCredentialBuffer,
  uploadEncryptedLawyerCredential,
  deleteEncryptedLawyerCredential,
} from '../services/lawyerCredentialEncryptionService.js';

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

  const missingField = Object.entries(requiredFields).find(
    ([, value]) => !String(value ?? '').trim()
  );

  if (missingField) {
    return res.status(400).json({ message: `${missingField[0]} is required.` });
  }

  if (!req.file) {
    return res.status(400).json({
      message: 'Professional credential proof image or PDF is required for lawyer registration.',
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

  let parsedYears = null;

  if (yearsOfExperience !== undefined && String(yearsOfExperience).trim() !== '') {
    parsedYears = Number(yearsOfExperience);

    if (!Number.isFinite(parsedYears) || parsedYears < 0) {
      return res.status(400).json({
        message: 'Years of experience must be a non-negative number.',
      });
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
      return res.status(409).json({
        message: 'A user with that username or email already exists.',
      });
    }

    return res.status(409).json({
      message: 'A lawyer with that enrollment number is already registered.',
    });
  }

  let uploadResult = null;

  try {
    const { encrypted, encryption } =
      encryptLawyerCredentialBuffer(req.file.buffer);

    uploadResult = await uploadEncryptedLawyerCredential(encrypted);

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
          resourceType: 'raw',
          deliveryType: 'authenticated',
          originalName: req.file.originalname,
          mimeType: req.file.mimetype,
          fileSize: req.file.size,
          encryptedSize: encrypted.length,
          encryption,
        },
      },
      verification: {
        reviewedBy: null,
        reviewedAt: null,
        rejectionReason: null,
      },
    });

    return res.status(201).json({
      message:
        'Lawyer registration received. Your professional credential is encrypted before cloud storage. An administrator must review and approve your account before you can log in.',
      user: publicUser(user),
    });
  } catch (error) {
    if (uploadResult?.public_id) {
      await deleteEncryptedLawyerCredential({
        publicId: uploadResult.public_id,
      }).catch(() => {});
    }

    console.error('Lawyer registration error:', error);

    return res.status(500).json({
      message: 'Lawyer registration failed. Please try again.',
    });
  }
}
