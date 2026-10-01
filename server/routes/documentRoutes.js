import express from "express";

import {
    uploadDocument,
    getDocuments,
    getAssignedDocuments,
    updateDocumentBeneficiaries,
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
GET OWNER DOCUMENTS
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
GET BENEFICIARY ASSIGNED DOCUMENTS
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
UPDATE DOCUMENT BENEFICIARIES
PUT /api/documents/:id/beneficiaries
=================================
*/
router.put(
    "/:id/beneficiaries",
    protect,
    authorize("USER"),
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
    authorize("USER"),
    getDocumentAccessUrl
);



/*
=================================
DELETE OWNER DOCUMENT
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
