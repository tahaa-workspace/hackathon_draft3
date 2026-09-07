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
import {
  getClaimInformationRequests,
  requestMoreInformation,
  submitAdditionalInformation,
  rejectLegacyClaim,
  getAdditionalEvidenceFile,
} from '../controllers/legacyClaimInformationController.js';

const router = Router();

function blockDeprecatedReviewActions(req, res, next) {
  const action = String(req.body?.action || '').toUpperCase();

  if (action === 'HOLD') {
    return res.status(400).json({
      message: 'Hold is no longer supported. Use Request More Information or Reject.',
    });
  }

  if (action === 'REQUEST_CORRECTION' || action === 'REQUEST_MORE_INFORMATION') {
    return res.status(400).json({
      message: 'Use the Request More Information workflow so the Beneficiary can upload additional evidence and preserve the claim history.',
    });
  }

  return next();
}

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
router.put('/admin/:id/review', protect, authorize('ADMIN'), blockDeprecatedReviewActions, adminReviewClaim);
router.put('/admin/:id/assign-lawyer', protect, authorize('ADMIN'), assignClaimLawyer);
router.get('/lawyer', protect, authorize('LAWYER'), listLawyerClaims);
router.put('/lawyer/:id/review', protect, authorize('LAWYER'), blockDeprecatedReviewActions, lawyerReviewClaim);

router.get('/:id/information-requests', protect, authorize('ADMIN', 'BENEFICIARY', 'LAWYER'), getClaimInformationRequests);
router.put('/:id/request-more-information', protect, authorize('ADMIN', 'LAWYER'), requestMoreInformation);
router.put('/:id/reject', protect, authorize('ADMIN', 'LAWYER'), rejectLegacyClaim);
router.post(
  '/:id/additional-information',
  protect,
  authorize('BENEFICIARY'),
  upload.array('additionalDocuments', 5),
  submitAdditionalInformation
);
router.get(
  '/:id/additional-files/:requestId/:fileIndex',
  protect,
  authorize('ADMIN', 'BENEFICIARY', 'LAWYER'),
  getAdditionalEvidenceFile
);

router.get('/:id/files/:kind', protect, authorize('ADMIN', 'BENEFICIARY', 'LAWYER'), getClaimFileUrl);

export default router;
