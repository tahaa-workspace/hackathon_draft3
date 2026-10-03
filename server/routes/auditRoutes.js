import { Router } from 'express';
import protect from '../middleware/authMiddleware.js';
import { authorize } from '../middleware/roleMiddleware.js';
import { listAuditLogs } from '../controllers/auditController.js';

const router = Router();

router.get('/', protect, authorize('ADMIN'), listAuditLogs);

export default router;
