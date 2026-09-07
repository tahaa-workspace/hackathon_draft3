import { Router } from "express";

import {
    register,
    registerLawyer,
    login,
    requestPasswordChangeOTP,
    verifyPasswordChangeOTP,
    completePasswordChange,
} from "../controllers/authController.js";

import protect from "../middleware/authMiddleware.js";
import upload from "../middleware/uploadMiddleware.js";

const router = Router();

/*
=========================================================
REGISTRATION
=========================================================
*/

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
PASSWORD CHANGE - SEND / RESEND OTP
=========================================================
*/

router.post(
    "/change-password/request-otp",
    protect,
    requestPasswordChangeOTP
);


/*
=========================================================
PASSWORD CHANGE - VERIFY OTP
=========================================================
*/

router.post(
    "/change-password/verify-otp",
    protect,
    verifyPasswordChangeOTP
);


/*
=========================================================
PASSWORD CHANGE - COMPLETE
=========================================================
*/

router.post(
    "/change-password/complete",
    protect,
    completePasswordChange
);


export default router;