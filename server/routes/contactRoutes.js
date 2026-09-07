import { Router } from 'express';
import { submitContactMessage } from '../controllers/contactController.js';

const router = Router();
router.post('/', submitContactMessage);

export default router;
