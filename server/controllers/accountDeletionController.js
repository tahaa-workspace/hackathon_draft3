import bcrypt from 'bcryptjs';

import User from '../models/User.js';

import {
  deleteAccountCascade,
} from '../services/accountDeletionService.js';

export async function deleteOwnAccount(req, res) {
  try {
    const confirmation = String(
      req.body?.confirmation || ''
    ).trim();

    const password = String(
      req.body?.password || ''
    );

    if (confirmation !== 'DELETE') {
      return res.status(400).json({
        message:
          'Type DELETE exactly to confirm permanent account deletion.',
      });
    }

    if (!password) {
      return res.status(400).json({
        message:
          'Enter your current password to confirm account deletion.',
      });
    }

    const user = await User.findById(
      req.user.id
    ).select('+passwordHash');

    if (!user) {
      return res.status(404).json({
        message: 'Account not found.',
      });
    }

    if (user.role === 'ADMIN') {
      return res.status(403).json({
        message:
          'Administrator accounts cannot be self-deleted.',
      });
    }

    const passwordMatches = await bcrypt.compare(
      password,
      user.passwordHash
    );

    if (!passwordMatches) {
      return res.status(401).json({
        message: 'Current password is incorrect.',
      });
    }

    const summary = await deleteAccountCascade(
      user._id
    );

    return res.status(200).json({
      message:
        'Your account and associated stored data were permanently deleted.',
      deleted: true,
      summary,
    });
  } catch (error) {
    console.error(
      'Self account deletion error:',
      error
    );

    return res
      .status(error.status || 500)
      .json({
        message:
          error.message ||
          'Unable to delete the account.',
      });
  }
}
