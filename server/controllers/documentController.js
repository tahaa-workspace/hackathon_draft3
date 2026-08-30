import crypto from "crypto";
import Document from "../models/Document.js";
import User from "../models/User.js";
import cloudinary from "../config/cloudinary.js";
import streamifier from "streamifier";

function documentPayload(document) {
    return {
        id: document._id.toString(),
        ownerId: document.ownerId.toString(),
        title: document.title,
        category: document.category,
        originalName: document.originalName,
        fileType: document.fileType,
        fileSize: document.fileSize,
        assignedBeneficiaryIds: (document.assignedBeneficiaries || []).map((id) =>
            id.toString()
        ),
        createdAt: document.createdAt,
        updatedAt: document.updatedAt,
    };
}

function beneficiaryDocumentPayload(document) {
    return {
        id: document._id.toString(),
        ownerId: document.ownerId?._id
            ? document.ownerId._id.toString()
            : document.ownerId.toString(),
        ownerName: document.ownerId?.name || "Owner",
        ownerUsername: document.ownerId?.username || "",
        title: document.title,
        category: document.category,
        originalName: document.originalName,
        fileType: document.fileType,
        fileSize: document.fileSize,
        createdAt: document.createdAt,
        updatedAt: document.updatedAt,
    };
}

function getEncryptionKey() {
    const configuredKey = process.env.DOCUMENT_ENCRYPTION_KEY;

    if (!configuredKey) {
        throw new Error("DOCUMENT_ENCRYPTION_KEY is not configured.");
    }

    const key = /^[0-9a-fA-F]{64}$/.test(configuredKey)
        ? Buffer.from(configuredKey, "hex")
        : Buffer.from(configuredKey, "base64");

    if (key.length !== 32) {
        throw new Error("DOCUMENT_ENCRYPTION_KEY must decode to exactly 32 bytes.");
    }

    return key;
}

function encryptBuffer(buffer) {
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
    const encrypted = Buffer.concat([cipher.update(buffer), cipher.final()]);
    const authTag = cipher.getAuthTag();

    return {
        encrypted,
        iv: iv.toString("base64"),
        authTag: authTag.toString("base64"),
    };
}

function decryptBuffer(encryptedBuffer, encryption) {
    if (!encryption?.iv || !encryption?.authTag) {
        throw new Error("Document encryption metadata is missing.");
    }

    const key = getEncryptionKey();
    const decipher = crypto.createDecipheriv(
        "aes-256-gcm",
        key,
        Buffer.from(encryption.iv, "base64")
    );

    decipher.setAuthTag(Buffer.from(encryption.authTag, "base64"));

    return Buffer.concat([
        decipher.update(encryptedBuffer),
        decipher.final(),
    ]);
}

async function uploadEncryptedBlob(buffer) {
    return new Promise((resolve, reject) => {
        const publicId = `digital-legacy/encrypted-documents/${crypto.randomUUID()}.vault`;

        const uploadStream = cloudinary.uploader.upload_stream(
            {
                public_id: publicId,
                resource_type: "raw",
                type: "authenticated",
                use_filename: false,
                unique_filename: false,
            },
            (error, result) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(result);
                }
            }
        );

        streamifier.createReadStream(buffer).pipe(uploadStream);
    });
}

function buildPlaceholderSvg() {
    const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" width="900" height="600" viewBox="0 0 900 600">
            <rect width="900" height="600" fill="#f1f5f9"/>
            <rect x="250" y="105" width="400" height="390" rx="24" fill="#ffffff" stroke="#cbd5e1" stroke-width="6"/>
            <path d="M555 105 L650 200 L555 200 Z" fill="#dbeafe"/>
            <rect x="310" y="275" width="280" height="22" rx="11" fill="#94a3b8"/>
            <rect x="310" y="325" width="220" height="18" rx="9" fill="#cbd5e1"/>
            <rect x="310" y="365" width="250" height="18" rx="9" fill="#cbd5e1"/>
            <circle cx="450" cy="225" r="42" fill="#2563eb"/>
            <path d="M430 225 L444 239 L472 208" fill="none" stroke="#ffffff" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/>
            <text x="450" y="445" text-anchor="middle" font-family="Arial, sans-serif" font-size="26" font-weight="700" fill="#1e293b">SECURE VAULT DOCUMENT</text>
            <text x="450" y="478" text-anchor="middle" font-family="Arial, sans-serif" font-size="18" fill="#64748b">Original file is encrypted and protected</text>
        </svg>
    `;

    return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}

async function uploadPlaceholderImage() {
    const placeholderId = `document-${crypto.randomUUID()}`;

    return cloudinary.uploader.upload(buildPlaceholderSvg(), {
        folder: "digital-legacy/documents",
        public_id: placeholderId,
        resource_type: "image",
        type: "upload",
        overwrite: false,
    });
}

async function downloadEncryptedBlob(document) {
    const signedUrl = cloudinary.url(document.publicId, {
        resource_type: "raw",
        type: "authenticated",
        sign_url: true,
        secure: true,
    });

    const response = await fetch(signedUrl);

    if (!response.ok) {
        throw new Error(`Cloudinary encrypted file download failed (${response.status}).`);
    }

    return Buffer.from(await response.arrayBuffer());
}

export const uploadDocument = async (req, res) => {
    let encryptedUpload = null;
    let placeholderUpload = null;

    try {
        if (!req.file) {
            return res.status(400).json({
                message: "Please select a file.",
            });
        }

        const { title, category } = req.body;

        if (!title || !category) {
            return res.status(400).json({
                message: "Title and category are required.",
            });
        }

        const { encrypted, iv, authTag } = encryptBuffer(req.file.buffer);

        encryptedUpload = await uploadEncryptedBlob(encrypted);
        placeholderUpload = await uploadPlaceholderImage();

        const document = await Document.create({
            ownerId: req.user.id,
            title,
            category,
            originalName: req.file.originalname,
            assignedBeneficiaries: [],
            publicId: encryptedUpload.public_id,
            resourceType: "raw",
            deliveryType: "authenticated",
            placeholderPublicId: placeholderUpload.public_id,
            fileType: req.file.mimetype,
            fileSize: req.file.size,
            encryptedSize: encrypted.length,
            encryption: {
                algorithm: "aes-256-gcm",
                iv,
                authTag,
                version: 1,
            },
        });

        return res.status(201).json({
            message: "Document encrypted and uploaded securely.",
            document: documentPayload(document),
        });
    } catch (error) {
        console.error("Document upload error:", error);

        if (placeholderUpload?.public_id) {
            await cloudinary.uploader.destroy(placeholderUpload.public_id, {
                resource_type: "image",
                type: "upload",
            }).catch(() => {});
        }

        if (encryptedUpload?.public_id) {
            await cloudinary.uploader.destroy(encryptedUpload.public_id, {
                resource_type: "raw",
                type: "authenticated",
            }).catch(() => {});
        }

        return res.status(500).json({
            message: "Failed to upload document.",
            error: error.message,
        });
    }
};

export const getDocuments = async (req, res) => {
    try {
        const documents = await Document.find({
            ownerId: req.user.id,
        }).sort({ createdAt: -1 });

        return res.status(200).json({
            documents: documents.map(documentPayload),
        });
    } catch (error) {
        console.error("Get documents error:", error);

        return res.status(500).json({
            message: "Failed to fetch documents.",
            error: error.message,
        });
    }
};

export const updateDocumentBeneficiaries = async (req, res) => {
    try {
        const { beneficiaryIds } = req.body;

        if (!Array.isArray(beneficiaryIds)) {
            return res.status(400).json({
                message: "beneficiaryIds must be an array.",
            });
        }

        const document = await Document.findOne({
            _id: req.params.id,
            ownerId: req.user.id,
        });

        if (!document) {
            return res.status(404).json({
                message: "Document not found.",
            });
        }

        const uniqueIds = [...new Set(beneficiaryIds.map(String))];

        if (uniqueIds.length > 0) {
            const validBeneficiaries = await User.find({
                _id: { $in: uniqueIds },
                role: "BENEFICIARY",
                createdBy: req.user.id,
            }).select("_id");

            if (validBeneficiaries.length !== uniqueIds.length) {
                return res.status(400).json({
                    message: "One or more selected beneficiaries do not belong to this owner.",
                });
            }
        }

        document.assignedBeneficiaries = uniqueIds;
        await document.save();

        return res.status(200).json({
            message: "Document access updated successfully.",
            document: documentPayload(document),
        });
    } catch (error) {
        console.error("Update document beneficiaries error:", error);

        return res.status(500).json({
            message: "Failed to update document access.",
            error: error.message,
        });
    }
};

export const getAssignedDocuments = async (req, res) => {
    try {
        const documents = await Document.find({
            assignedBeneficiaries: req.user.id,
        })
            .populate("ownerId", "name username")
            .sort({ createdAt: -1 });

        return res.status(200).json({
            documents: documents.map(beneficiaryDocumentPayload),
        });
    } catch (error) {
        console.error("Get assigned documents error:", error);

        return res.status(500).json({
            message: "Failed to fetch assigned documents.",
            error: error.message,
        });
    }
};

export const getDocumentAccessUrl = async (req, res) => {
    try {
        const document = await Document.findById(req.params.id);

        if (!document) {
            return res.status(404).json({
                message: "Document not found.",
            });
        }

        const isOwner =
            req.user.role === "OWNER" &&
            document.ownerId.toString() === req.user.id;

        const isAssignedBeneficiary =
            req.user.role === "BENEFICIARY" &&
            (document.assignedBeneficiaries || []).some(
                (beneficiaryId) => beneficiaryId.toString() === req.user.id
            );

        if (!isOwner && !isAssignedBeneficiary) {
            return res.status(403).json({
                message: "You are not authorized to access this document.",
            });
        }

        if (
            document.resourceType !== "raw" ||
            document.deliveryType !== "authenticated" ||
            document.encryption?.algorithm !== "aes-256-gcm" ||
            !document.encryption?.iv ||
            !document.encryption?.authTag
        ) {
            return res.status(409).json({
                message: "This document was uploaded before vault encryption was enabled. Please re-upload it securely.",
            });
        }

        const encryptedBlob = await downloadEncryptedBlob(document);
        const originalFile = decryptBuffer(encryptedBlob, document.encryption);

        res.setHeader("Content-Type", document.fileType || "application/octet-stream");
        res.setHeader("Content-Length", originalFile.length);
        res.setHeader("Cache-Control", "private, no-store, max-age=0");
        res.setHeader("Pragma", "no-cache");
        res.setHeader("X-Content-Type-Options", "nosniff");
        res.setHeader(
            "Content-Disposition",
            `inline; filename*=UTF-8''${encodeURIComponent(document.originalName)}`
        );

        return res.status(200).send(originalFile);
    } catch (error) {
        console.error("Document access error:", error);

        return res.status(500).json({
            message: "Failed to access document.",
            error: error.message,
        });
    }
};

export const getMyDocuments = async (req, res) => {
    return getDocuments(req, res);
};
