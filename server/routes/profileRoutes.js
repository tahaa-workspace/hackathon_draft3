import { Router } from 'express';

import protect from '../middleware/authMiddleware.js';
import { getCurrentProfile } from '../controllers/profileReadController.js';
import {
  requestEmailChangeOTP,
  verifyEmailChangeOTP,
  requestPhoneChangeOTP,
  verifyPhoneChangeOTP,
} from '../controllers/profileController.js';
import {
  deleteOwnAccount,
} from '../controllers/accountDeletionController.js';

const router = Router();

router.get('/', protect, getCurrentProfile);

router.post(
  '/contact/email/request-otp',
  protect,
  requestEmailChangeOTP
);

router.post(
  '/contact/email/verify',
  protect,
  verifyEmailChangeOTP
);

router.post(
  '/contact/phone/request-otp',
  protect,
  requestPhoneChangeOTP
);

router.post(
  '/contact/phone/verify',
  protect,
  verifyPhoneChangeOTP
);

router.delete(
  '/',
  protect,
  deleteOwnAccount
);

export default router;
