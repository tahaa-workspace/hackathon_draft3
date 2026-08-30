import express from "express";

import {
    uploadDocument,
    getDocuments,
    getAssignedDocuments,
    updateDocumentBeneficiaries,
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
GET BENEFICIARY ASSIGNED DOCUMENTS
GET /api/documents/assigned-to-me
=================================
*/
router.get(
    "/assigned-to-me",
    protect,
    authorize("BENEFICIARY"),
    getAssignedDocuments
);

/*
=================================
UPDATE DOCUMENT BENEFICIARIES
PUT /api/documents/:id/beneficiaries
=================================
*/
router.put(
    "/:id/beneficiaries",
    protect,
    authorize("OWNER"),
    updateDocumentBeneficiaries
);

/*
=================================
ACCESS SINGLE DOCUMENT
GET /api/documents/:id/access
Owner OR explicitly assigned beneficiary
=================================
*/
router.get(
    "/:id/access",
    protect,
    authorize("OWNER", "BENEFICIARY"),
    getDocumentAccessUrl
);

export default router;
