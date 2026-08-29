import bcrypt from 'bcryptjs';
import streamifier from 'streamifier';
import User from '../models/User.js';
import generateToken from '../utils/generateToken.js';
import cloudinary from '../config/cloudinary.js';

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
    uploadResult = await uploadAadhaar(req.file);
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

    return res.status(201).json({
      message: 'Registration received. An administrator must review your Aadhaar card and approve your account before you can log in.',
      user: publicUser(user),
    });
  } catch (error) {
    if (uploadResult?.public_id) {
      await cloudinary.uploader.destroy(uploadResult.public_id, {
        resource_type: uploadResult.resource_type || 'image',
        type: 'authenticated',
      }).catch(() => {});
    }

    console.error('Owner registration error:', error);
    return res.status(500).json({ message: 'Registration failed. Please try again.' });
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

export async function changePassword(req, res) {
  const { currentPassword, newPassword, confirmNewPassword } = req.body;

  if (!currentPassword || !newPassword || !confirmNewPassword) {
    return res.status(400).json({ message: 'All password fields are required.' });
  }
  if (newPassword !== confirmNewPassword) {
    return res.status(400).json({ message: 'New password and confirm password do not match.' });
  }
  if (newPassword.length < 8) {
    return res.status(400).json({ message: 'New password must be at least 8 characters long.' });
  }

  const user = await User.findById(req.user.id).select('+passwordHash');
  if (!user) {
    return res.status(404).json({ message: 'User not found.' });
  }

  const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!isMatch) {
    return res.status(401).json({ message: 'Current password is incorrect.' });
  }

  user.passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
  user.mustChangePassword = false;
  await user.save();

  return res.status(200).json({ message: 'Password updated successfully.' });
}
