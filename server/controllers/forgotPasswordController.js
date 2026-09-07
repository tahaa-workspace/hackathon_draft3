import bcrypt from "bcryptjs";
import crypto from "crypto";

import User from "../models/User.js";
import ForgotPasswordOTP from "../models/ForgotPasswordOTP.js";
import transporter from "../config/mailer.js";

const SALT_ROUNDS = 12;
const OTP_EXPIRY_MS = 5 * 60 * 1000;
const VERIFIED_SESSION_MS = 10 * 60 * 1000;
const MAX_OTP_ATTEMPTS = 5;
const MAX_OTP_RESENDS = 2;

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function hashResetToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function requestForgotPasswordOTP(req, res) {
  try {
    const email = normalizeEmail(req.body?.email);

    if (!email) {
      return res.status(400).json({ message: "Registered email is required." });
    }

    const user = await User.findOne({ email }).select("name username email role status");

    if (!user) {
      return res.status(404).json({ message: "No account was found with this email address." });
    }

    if (user.status !== "ACTIVE") {
      return res.status(403).json({ message: "This account is not active and cannot reset its password." });
    }

    let otpRequest = await ForgotPasswordOTP.findOne({ userId: user._id });
    const now = new Date();

    if (otpRequest?.otpVerified && otpRequest.verifiedAt) {
      const verifiedUntil = new Date(otpRequest.verifiedAt.getTime() + VERIFIED_SESSION_MS);

      if (now <= verifiedUntil && otpRequest.resetTokenHash) {
        return res.status(409).json({
          message: "OTP is already verified. Continue to set your new password.",
          verified: true,
        });
      }

      await ForgotPasswordOTP.deleteOne({ _id: otpRequest._id });
      otpRequest = null;
    }

    if (otpRequest && now > otpRequest.expiresAt) {
      await ForgotPasswordOTP.deleteOne({ _id: otpRequest._id });
      otpRequest = null;
    }

    let resendCount = 0;

    if (otpRequest) {
      if (otpRequest.resendCount >= MAX_OTP_RESENDS) {
        return res.status(429).json({
          message: "Maximum OTP resend limit reached for this reset session.",
          resendsRemaining: 0,
        });
      }

      resendCount = otpRequest.resendCount + 1;
    }

    const otp = crypto.randomInt(100000, 1000000).toString();
    const otpHash = await bcrypt.hash(otp, SALT_ROUNDS);
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MS);

    if (!otpRequest) {
      otpRequest = await ForgotPasswordOTP.create({
        userId: user._id,
        otpHash,
        expiresAt,
        attempts: 0,
        resendCount: 0,
        otpVerified: false,
        verifiedAt: null,
        resetTokenHash: null,
      });
    } else {
      otpRequest.otpHash = otpHash;
      otpRequest.expiresAt = expiresAt;
      otpRequest.attempts = 0;
      otpRequest.resendCount = resendCount;
      otpRequest.otpVerified = false;
      otpRequest.verifiedAt = null;
      otpRequest.resetTokenHash = null;
      await otpRequest.save();
    }

    try {
      await transporter.sendMail({
        from: {
          name: "NextGen Vault",
          address: process.env.EMAIL_USER,
        },
        to: user.email,
        subject: "NextGen Vault - Password Reset OTP",
        text: `Hello ${user.name || user.username},\n\nYour password reset OTP is: ${otp}\n\nThis OTP expires in 5 minutes.\n\nIf you did not request this reset, please ignore this email.\n\nNextGen Vault`,
        html: `
          <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:24px">
            <div style="background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:28px">
              <h2 style="color:#0f172a;margin-top:0">NextGen Vault</h2>
              <p style="color:#475569">Hello <strong>${user.name || user.username}</strong>,</p>
              <p style="color:#475569">Use this verification code to reset your password.</p>
              <div style="margin:24px 0;padding:18px;background:#f1f5f9;border-radius:10px;text-align:center">
                <div style="font-size:32px;letter-spacing:10px;font-weight:bold;color:#0f172a">${otp}</div>
              </div>
              <p style="color:#64748b">This OTP expires in <strong>5 minutes</strong>.</p>
              <p style="color:#64748b;font-size:13px">If you did not request a password reset, you can safely ignore this message.</p>
            </div>
          </div>
        `,
      });
    } catch (mailError) {
      await ForgotPasswordOTP.deleteOne({ userId: user._id });
      console.error("Forgot password OTP email error:", mailError);
      return res.status(500).json({ message: "Unable to send the reset OTP. Please try again." });
    }

    return res.status(200).json({
      message:
        otpRequest.resendCount > 0
          ? "A new OTP has been sent to your registered email address."
          : "OTP sent to your registered email address.",
      expiresInSeconds: OTP_EXPIRY_MS / 1000,
      resendsRemaining: Math.max(0, MAX_OTP_RESENDS - otpRequest.resendCount),
    });
  } catch (error) {
    console.error("Forgot password OTP request error:", error);
    return res.status(500).json({ message: "Failed to send password reset OTP." });
  }
}

export async function verifyForgotPasswordOTP(req, res) {
  try {
    const email = normalizeEmail(req.body?.email);
    const otp = String(req.body?.otp || "").trim();

    if (!email) {
      return res.status(400).json({ message: "Registered email is required." });
    }

    if (!/^\d{6}$/.test(otp)) {
      return res.status(400).json({ message: "Please enter a valid 6-digit OTP." });
    }

    const user = await User.findOne({ email }).select("status");

    if (!user || user.status !== "ACTIVE") {
      return res.status(404).json({ message: "No active account was found with this email address." });
    }

    const otpRequest = await ForgotPasswordOTP.findOne({ userId: user._id });

    if (!otpRequest) {
      return res.status(404).json({ message: "No active password reset session was found." });
    }

    if (otpRequest.otpVerified && otpRequest.verifiedAt && otpRequest.resetTokenHash) {
      return res.status(409).json({ message: "OTP is already verified. Please restart the reset flow if needed." });
    }

    if (new Date() > otpRequest.expiresAt) {
      await ForgotPasswordOTP.deleteOne({ _id: otpRequest._id });
      return res.status(400).json({ message: "OTP has expired. Please request a new OTP." });
    }

    if (otpRequest.attempts >= MAX_OTP_ATTEMPTS) {
      await ForgotPasswordOTP.deleteOne({ _id: otpRequest._id });
      return res.status(429).json({ message: "Maximum OTP attempts exceeded. Start the reset process again." });
    }

    const otpMatches = await bcrypt.compare(otp, otpRequest.otpHash);

    if (!otpMatches) {
      otpRequest.attempts += 1;
      await otpRequest.save();

      const attemptsRemaining = MAX_OTP_ATTEMPTS - otpRequest.attempts;

      if (attemptsRemaining <= 0) {
        await ForgotPasswordOTP.deleteOne({ _id: otpRequest._id });
        return res.status(429).json({ message: "Maximum OTP attempts exceeded. Start the reset process again." });
      }

      return res.status(400).json({
        message: `Invalid OTP. ${attemptsRemaining} attempt${attemptsRemaining === 1 ? "" : "s"} remaining.`,
      });
    }

    const resetToken = crypto.randomBytes(32).toString("hex");

    otpRequest.otpVerified = true;
    otpRequest.verifiedAt = new Date();
    otpRequest.attempts = 0;
    otpRequest.resetTokenHash = hashResetToken(resetToken);
    await otpRequest.save();

    return res.status(200).json({
      message: "Email verified successfully.",
      verified: true,
      resetToken,
      expiresInSeconds: VERIFIED_SESSION_MS / 1000,
    });
  } catch (error) {
    console.error("Forgot password OTP verification error:", error);
    return res.status(500).json({ message: "Failed to verify password reset OTP." });
  }
}

export async function completeForgotPasswordReset(req, res) {
  try {
    const email = normalizeEmail(req.body?.email);
    const resetToken = String(req.body?.resetToken || "").trim();
    const { newPassword, confirmNewPassword } = req.body || {};

    if (!email || !resetToken || !newPassword || !confirmNewPassword) {
      return res.status(400).json({
        message: "Email, verified reset session, new password, and confirmation password are required.",
      });
    }

    if (newPassword !== confirmNewPassword) {
      return res.status(400).json({ message: "New password and confirm new password do not match." });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ message: "New password must be at least 8 characters long." });
    }

    const user = await User.findOne({ email }).select("+passwordHash status");

    if (!user || user.status !== "ACTIVE") {
      return res.status(404).json({ message: "No active account was found with this email address." });
    }

    const otpRequest = await ForgotPasswordOTP.findOne({ userId: user._id });

    if (!otpRequest?.otpVerified || !otpRequest.verifiedAt || !otpRequest.resetTokenHash) {
      return res.status(403).json({ message: "OTP verification is required before resetting your password." });
    }

    const verifiedUntil = new Date(otpRequest.verifiedAt.getTime() + VERIFIED_SESSION_MS);

    if (new Date() > verifiedUntil) {
      await ForgotPasswordOTP.deleteOne({ _id: otpRequest._id });
      return res.status(403).json({ message: "Your verified reset session has expired. Please start again." });
    }

    if (hashResetToken(resetToken) !== otpRequest.resetTokenHash) {
      return res.status(403).json({ message: "Invalid password reset session." });
    }

    if (user.passwordHash) {
      const samePassword = await bcrypt.compare(newPassword, user.passwordHash);

      if (samePassword) {
        return res.status(400).json({ message: "New password cannot be the same as your current password." });
      }
    }

    user.passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
    user.mustChangePassword = false;
    await user.save();

    await ForgotPasswordOTP.deleteOne({ _id: otpRequest._id });

    return res.status(200).json({
      message: "Password reset successfully. You can now sign in with your new password.",
      passwordReset: true,
    });
  } catch (error) {
    console.error("Complete forgot password reset error:", error);
    return res.status(500).json({ message: "Failed to reset password." });
  }
}
