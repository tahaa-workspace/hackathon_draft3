import crypto from "crypto";
import Document from "../models/Document.js";
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
        createdAt: document.createdAt,
        updatedAt: document.updatedAt,
    };
}

function getEncryptionKey() {
    const configuredKey = process.env.DOCUMENT_ENCRYPTION_KEY;

    if (!configuredKey) {
        throw new Error("DOCUMENT_ENCRYPTION_KEY is not configured.");
    }

    // Recommended format: 64 hexadecimal characters = 32 bytes.
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
        const publicId = `digital-legacy/documents/${crypto.randomUUID()}.vault`;

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

        // The original document is encrypted in server memory BEFORE anything
        // is sent to Cloudinary. Cloudinary therefore receives only ciphertext.
        const { encrypted, iv, authTag } = encryptBuffer(req.file.buffer);
        const uploadResult = await uploadEncryptedBlob(encrypted);

        const document = await Document.create({
            ownerId: req.user.id,
            title,
            category,
            originalName: req.file.originalname,
            publicId: uploadResult.public_id,
            resourceType: "raw",
            deliveryType: "authenticated",
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

        return res.status(500).json({
            message: "Failed to upload document.",
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

        // Current prototype rule: only the exact owner may decrypt/view.
        if (document.ownerId.toString() !== req.user.id) {
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

        // Cloudinary returns only the encrypted blob. Decryption happens here,
        // after authentication + OWNER role + ownership checks have passed.
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
