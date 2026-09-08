import { Router } from "express";

import {
    login,
    requestPasswordChangeOTP,
    verifyPasswordChangeOTP,
    completePasswordChange,
} from "../controllers/authController.js";

import { registerLawyer } from "../controllers/lawyerRegistrationController.js";

import {
    registerOwner,
    requestRegistrationOTP,
    verifyRegistrationOTP,
    requestRegistrationEmailOTP,
    verifyRegistrationEmailOTP,
} from "../controllers/registrationController.js";

import {
    requestForgotPasswordOTP,
    verifyForgotPasswordOTP,
    completeForgotPasswordReset,
} from "../controllers/forgotPasswordController.js";

import protect from "../middleware/authMiddleware.js";
import upload from "../middleware/uploadMiddleware.js";

import {
    requireExactRegistrationMobile,
    requireStrongRegistrationPassword,
} from "../middleware/registrationValidationMiddleware.js";

const router = Router();

/*
=========================================================
REGISTRATION
=========================================================
*/

router.post(
    "/registration/send-otp",
    requireExactRegistrationMobile,
    requestRegistrationOTP
);

router.post(
    "/registration/verify-otp",
    requireExactRegistrationMobile,
    verifyRegistrationOTP
);

router.post(
    "/registration/email/send-otp",
    requestRegistrationEmailOTP
);

router.post(
    "/registration/email/verify-otp",
    verifyRegistrationEmailOTP
);

router.post(
    "/register",
    upload.single("aadhaar"),
    requireExactRegistrationMobile,
    requireStrongRegistrationPassword,
    registerOwner
);

router.post(
    "/register-lawyer",
    upload.single("credential"),
    registerLawyer
);

/*
=========================================================
LOGIN
=========================================================
*/

router.post(
    "/login",
    login
);

/*
=========================================================
FORGOT PASSWORD - PUBLIC RECOVERY FLOW
=========================================================
*/

router.post(
    "/forgot-password/request-otp",
    requestForgotPasswordOTP
);

router.post(
    "/forgot-password/verify-otp",
    verifyForgotPasswordOTP
);

router.post(
    "/forgot-password/reset",
    completeForgotPasswordReset
);

/*
=========================================================
PASSWORD CHANGE - SEND / RESEND OTP
=========================================================
*/

router.post(
    "/change-password/request-otp",
    protect,
    requestPasswordChangeOTP
);

router.post(
    "/change-password/verify-otp",
    protect,
    verifyPasswordChangeOTP
);

router.post(
    "/change-password/complete",
    protect,
    completePasswordChange
);

export default router;
