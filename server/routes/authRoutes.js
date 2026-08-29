import { Router } from 'express';
import { register, login, changePassword } from '../controllers/authController.js';
import protect from '../middleware/authMiddleware.js';
import upload from '../middleware/uploadMiddleware.js';

const router = Router();

router.post('/register', upload.single('aadhaar'), register);
router.post('/login', login);
router.post('/change-password', protect, changePassword);

export default router;
