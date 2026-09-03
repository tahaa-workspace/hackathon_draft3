import { Router } from 'express';
import {
  listPendingRegistrations,
  listUsers,
  updateUserStatus,
  getAadhaarReviewUrl,
  approveUser,
  rejectUser,
} from '../controllers/adminController.js';
import protect from '../middleware/authMiddleware.js';
import { authorize } from '../middleware/roleMiddleware.js';

const router = Router();

router.get('/registrations', protect, authorize('ADMIN'), listPendingRegistrations);
router.get('/users', protect, authorize('ADMIN'), listUsers);
router.put('/users/:id/status', protect, authorize('ADMIN'), updateUserStatus);
router.get('/users/:id/aadhaar', protect, authorize('ADMIN'), getAadhaarReviewUrl);
router.put('/users/:id/approve', protect, authorize('ADMIN'), approveUser);
router.put('/users/:id/reject', protect, authorize('ADMIN'), rejectUser);

export default router;
