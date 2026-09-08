import { Router } from 'express';
import {
  listPendingRegistrations,
  listUsers,
  updateUserStatus,
  getAadhaarReviewUrl,
  approveUser,
  rejectUser,
} from '../controllers/adminController.js';
import {
  getLawyerCredentialReviewUrl,
  viewLawyerCredential,
} from '../controllers/lawyerCredentialReviewController.js';
import protect from '../middleware/authMiddleware.js';
import { authorize } from '../middleware/roleMiddleware.js';
import cleanupOwnerAadhaarPlaceholderOnReject from '../middleware/aadhaarPlaceholderCleanupMiddleware.js';

const router = Router();

router.get('/registrations', protect, authorize('ADMIN'), listPendingRegistrations);
router.get('/users', protect, authorize('ADMIN'), listUsers);
router.put('/users/:id/status', protect, authorize('ADMIN'), updateUserStatus);
router.get('/users/:id/aadhaar', protect, authorize('ADMIN'), getAadhaarReviewUrl);
router.get(
  '/users/:id/lawyer-credential',
  protect,
  authorize('ADMIN'),
  getLawyerCredentialReviewUrl
);

// The browser opens this URL in a new tab, so it cannot reuse the API Bearer header.
// Access is therefore limited by a short-lived HMAC token issued only to an authenticated Admin.
router.get('/lawyer-credential-view/:id', viewLawyerCredential);

router.put('/users/:id/approve', protect, authorize('ADMIN'), approveUser);
router.put(
  '/users/:id/reject',
  protect,
  authorize('ADMIN'),
  cleanupOwnerAadhaarPlaceholderOnReject,
  rejectUser
);

export default router;
