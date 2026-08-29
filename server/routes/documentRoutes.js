import express from "express";

import {
    uploadDocument,
} from "../controllers/documentController.js";

import upload from "../middleware/uploadMiddleware.js";

import protect from "../middleware/authMiddleware.js";

const router = express.Router();

router.post(
    "/",
    protect,
    upload.single("file"),
    uploadDocument
);

export default router;