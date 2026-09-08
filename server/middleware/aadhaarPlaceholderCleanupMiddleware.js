import User from '../models/User.js';
import {
  deleteAadhaarPlaceholder,
  getAadhaarPlaceholderPublicId,
} from '../services/aadhaarEncryptionService.js';

export default async function cleanupOwnerAadhaarPlaceholderOnReject(
  req,
  res,
  next
) {
  try {
    const user = await User.findById(req.params.id)
      .select('role aadhaarDocument')
      .lean();

    if (user?.role === 'OWNER' && user.aadhaarDocument?.publicId) {
      const placeholderPublicId =
        user.aadhaarDocument.placeholderPublicId ||
        getAadhaarPlaceholderPublicId(user.aadhaarDocument.publicId);

      await deleteAadhaarPlaceholder(placeholderPublicId);
    }

    return next();
  } catch (error) {
    console.error('Aadhaar placeholder cleanup before rejection failed:', error);

    return res.status(502).json({
      message:
        'Unable to remove the Aadhaar placeholder from cloud storage. Registration was not rejected.',
    });
  }
}
