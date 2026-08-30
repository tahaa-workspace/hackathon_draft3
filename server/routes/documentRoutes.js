import express from "express";

import {
    uploadDocument,
    getDocuments,
    getDocumentAccessUrl,
} from "../controllers/documentController.js";

import upload from "../middleware/uploadMiddleware.js";
import protect from "../middleware/authMiddleware.js";
import { authorize } from "../middleware/roleMiddleware.js";

const router = express.Router();


/*
=================================
UPLOAD DOCUMENT
POST /api/documents
=================================
*/

router.post(
    "/",
    protect,
    authorize("OWNER"),
    upload.single("file"),
    uploadDocument
);


/*
=================================
GET OWNER DOCUMENTS
GET /api/documents
=================================
*/

router.get(
    "/",
    protect,
    authorize("OWNER"),
    getDocuments
);


/*
=================================
ACCESS SINGLE DOCUMENT
GET /api/documents/:id/access
=================================
*/

router.get(
    "/:id/access",
    protect,
    authorize("OWNER"),
    getDocumentAccessUrl
);

export default router;