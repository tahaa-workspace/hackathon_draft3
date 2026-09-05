import { Router } from "express";

import {
    register,
    registerLawyer,
    login,
    //changePassword,
    requestPasswordChangeOTP,
    verifyPasswordChangeOTP,
} from "../controllers/authController.js";

import protect from "../middleware/authMiddleware.js";
import upload from "../middleware/uploadMiddleware.js";

const router = Router();

// Registration
router.post(
    "/register",
    upload.single("aadhaar"),
    register
);

router.post(
    "/register-lawyer",
    upload.single("credential"),
    registerLawyer
);

// Login
router.post("/login", login);

// Existing normal password change route
// router.post(
//     "/change-password",
//     protect,
//     changePassword
// );

// MFA - Request OTP for password change
router.post(
    "/change-password/request-otp",
    protect,
    requestPasswordChangeOTP
);

// MFA - Verify OTP and finally change password
router.post(
    "/change-password/verify-otp",
    protect,
    verifyPasswordChangeOTP
);

export default router;