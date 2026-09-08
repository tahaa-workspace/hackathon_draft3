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
  selectClaimLawyer,
getLawyerAvailability,
updateLawyerAvailability,
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
import { cleanupOrphanLegacyClaims } from '../controllers/legacyClaimCleanupController.js';

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
router.get(
  '/admin',
  protect,
  authorize('ADMIN'),
  cleanupOrphanLegacyClaims,
  listAdminLegacyClaims
);

router.put('/admin/:id/review', protect, authorize('ADMIN'), blockDeprecatedReviewActions, adminReviewClaim);
router.get('/lawyer', protect, authorize('LAWYER'), listLawyerClaims);
router.put('/lawyer/:id/review', protect, authorize('LAWYER'), blockDeprecatedReviewActions, lawyerReviewClaim);

router.get('/:id/information-requests', protect, authorize('ADMIN', 'BENEFICIARY', 'LAWYER'), getClaimInformationRequests);
router.put(
  '/:id/request-more-information',
  protect,
  authorize('LAWYER'),
  requestMoreInformation
);
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
/*
|--------------------------------------------------------------------------
| BENEFICIARY LAWYER SELECTION
|--------------------------------------------------------------------------
*/

router.get(
  '/lawyers',
  protect,
  authorize('BENEFICIARY'),
  listApprovedLawyers
);

router.put(
  '/:id/select-lawyer',
  protect,
  authorize('BENEFICIARY'),
  selectClaimLawyer
);


/*
|--------------------------------------------------------------------------
| LAWYER AVAILABILITY
|--------------------------------------------------------------------------
*/

router.get(
  '/lawyer/availability',
  protect,
  authorize('LAWYER'),
  getLawyerAvailability
);

router.put(
  '/lawyer/availability',
  protect,
  authorize('LAWYER'),
  updateLawyerAvailability
);

export default router;
