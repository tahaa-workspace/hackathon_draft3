import express from "express";

import {
    uploadDocument,
    getDocuments,
    getAssignedDocuments,
    getDocumentAccessUrl,
    deleteDocument,
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
    authorize("USER"),
    upload.single("file"),
    uploadDocument
);

/*
=================================
GET USER-OWNED DOCUMENTS
GET /api/documents
=================================
*/
router.get(
    "/",
    protect,
    authorize("USER"),
    getDocuments
);

/*
=================================
GET LEGACY-ALLOCATED DOCUMENTS
GET /api/documents/assigned-to-me
=================================
*/
router.get(
    "/assigned-to-me",
    protect,
    authorize("USER"),
    getAssignedDocuments
);

/*
=================================
ACCESS SINGLE DOCUMENT
GET /api/documents/:id/access
Owner OR authorized legacy allocation recipient
=================================
*/
router.get(
    "/:id/access",
    protect,
    authorize("USER"),
    getDocumentAccessUrl
);



/*
=================================
DELETE USER-OWNED DOCUMENT
DELETE /api/documents/:id
=================================
*/
router.delete(
    "/:id",
    protect,
    authorize("USER"),
    deleteDocument
);
export default router;
