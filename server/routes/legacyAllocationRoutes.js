import { Router } from 'express';
import protect from '../middleware/authMiddleware.js';
import { authorize } from '../middleware/roleMiddleware.js';
import {
  searchAllocationUsers,
  createLegacyAllocation,
  listIncomingAllocations,
  listOutgoingAllocations,
  revokeLegacyAllocation,
} from '../controllers/legacyAllocationController.js';

const router = Router();

router.get('/users/search', protect, authorize('USER'), searchAllocationUsers);
router.post('/', protect, authorize('USER'), createLegacyAllocation);
router.get('/incoming', protect, authorize('USER'), listIncomingAllocations);
router.get('/outgoing', protect, authorize('USER'), listOutgoingAllocations);
router.delete('/:id', protect, authorize('USER'), revokeLegacyAllocation);

export default router;
