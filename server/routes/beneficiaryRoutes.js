import { Router } from 'express';

import {
  createBeneficiary,
  listBeneficiaries,
} from '../controllers/beneficiaryController.js';

import protect from '../middleware/authMiddleware.js';

import {
  authorize,
} from '../middleware/roleMiddleware.js';

import upload from '../middleware/uploadMiddleware.js';

const router = Router();

/*
=========================================================
CREATE BENEFICIARY
=========================================================

Owner must provide:
- name
- username
- email
- initialPassword
- aadhaar
*/

router.post(
  '/',
  protect,
  authorize('OWNER'),
  upload.single('aadhaar'),
  createBeneficiary
);

/*
=========================================================
LIST OWNER BENEFICIARIES
=========================================================
*/

router.get(
  '/',
  protect,
  authorize('OWNER'),
  listBeneficiaries
);

export default router;