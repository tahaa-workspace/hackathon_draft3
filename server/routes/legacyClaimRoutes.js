import { Router } from 'express';
import protect from '../middleware/authMiddleware.js';
import { authorize } from '../middleware/roleMiddleware.js';
import upload from '../middleware/uploadMiddleware.js';
import {
  createLegacyClaim,
  listMyLegacyClaims,
  listAdminLegacyClaims,
  listApprovedLawyers,
  adminReviewClaim,
  assignClaimLawyer,
  listLawyerClaims,
  lawyerReviewClaim,
  getClaimFileUrl,
} from '../controllers/legacyClaimController.js';

const router = Router();

router.post(
  '/',
  protect,
  authorize('BENEFICIARY'),
  upload.fields([
    { name: 'deathCertificate', maxCount: 1 },
    { name: 'identityProof', maxCount: 1 },
    { name: 'supportingDocument', maxCount: 1 },
  ]),
  createLegacyClaim
);

router.get('/mine', protect, authorize('BENEFICIARY'), listMyLegacyClaims);
router.get('/admin', protect, authorize('ADMIN'), listAdminLegacyClaims);
router.get('/admin/lawyers', protect, authorize('ADMIN'), listApprovedLawyers);
router.put('/admin/:id/review', protect, authorize('ADMIN'), adminReviewClaim);
router.put('/admin/:id/assign-lawyer', protect, authorize('ADMIN'), assignClaimLawyer);
router.get('/lawyer', protect, authorize('LAWYER'), listLawyerClaims);
router.put('/lawyer/:id/review', protect, authorize('LAWYER'), lawyerReviewClaim);
router.get('/:id/files/:kind', protect, authorize('ADMIN', 'BENEFICIARY', 'LAWYER'), getClaimFileUrl);

export default router;
