import express from "express";

import {
    uploadDocument,
    getDocumentAccessUrl,
} from "../controllers/documentController.js";

import upload from "../middleware/uploadMiddleware.js";
import protect from "../middleware/authMiddleware.js";
import { authorize } from "../middleware/roleMiddleware.js";

const router = express.Router();

router.post(
    "/",
    protect,
    authorize("OWNER"),
    upload.single("file"),
    uploadDocument
);

router.get(
    "/:id/access",
    protect,
    authorize("OWNER"),
    getDocumentAccessUrl
);

export default router;