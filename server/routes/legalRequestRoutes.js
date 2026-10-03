import { Router } from 'express';
import protect from '../middleware/authMiddleware.js';
import { authorize } from '../middleware/roleMiddleware.js';
import {
  listAvailableLawyers,
  createLegalRequest,
  listMyLegalRequests,
  listAdminLegalRequests,
  listLawyerLegalRequests,
  updateLawyerLegalRequest,
} from '../controllers/legalRequestController.js';

const router = Router();

router.get('/lawyers', protect, authorize('USER'), listAvailableLawyers);
router.post('/', protect, authorize('USER'), createLegalRequest);
router.get('/mine', protect, authorize('USER'), listMyLegalRequests);
router.get('/admin', protect, authorize('ADMIN'), listAdminLegalRequests);
router.get('/lawyer', protect, authorize('LAWYER'), listLawyerLegalRequests);
router.patch('/lawyer/:id', protect, authorize('LAWYER'), updateLawyerLegalRequest);

export default router;
