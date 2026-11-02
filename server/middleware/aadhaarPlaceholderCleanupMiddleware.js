import User from '../models/User.js';
import {
  deleteAadhaarPlaceholder,
  getAadhaarPlaceholderPublicId,
} from '../services/aadhaarEncryptionService.js';

export default async function cleanupUserAadhaarPlaceholderOnReject(
  req,
  res,
  next
) {
  try {
    const user = await User.findById(req.params.id)
      .select('role aadhaarDocument')
      .lean();

    if (user?.role === 'USER' && user.aadhaarDocument?.publicId) {
      const placeholderPublicId =
        user.aadhaarDocument.placeholderPublicId ||
        getAadhaarPlaceholderPublicId(user.aadhaarDocument.publicId);

      await deleteAadhaarPlaceholder(placeholderPublicId);
    }

    return next();
  } catch (error) {
    // Log the cleanup failure but do NOT block the rejection.
    // An orphan placeholder is preferable to a permanently-stuck PENDING registration.
    console.error(
      'Aadhaar placeholder cleanup before rejection failed (proceeding anyway):',
      error.message
    );

    return next();
  }
}
