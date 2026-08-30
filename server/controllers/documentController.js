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

        const uploadResult = await new Promise((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
                {
                    folder: "digital-legacy/documents",
                    resource_type: "auto",
                    type: "authenticated",
                    use_filename: false,
                    unique_filename: true,
                },
                (error, result) => {
                    if (error) {
                        reject(error);
                    } else {
                        resolve(result);
                    }
                }
            );

            streamifier
                .createReadStream(req.file.buffer)
                .pipe(uploadStream);
        });

        const document = await Document.create({
            ownerId: req.user.id,
            title,
            category,
            originalName: req.file.originalname,
            publicId: uploadResult.public_id,
            resourceType: uploadResult.resource_type,
            deliveryType: uploadResult.type || "authenticated",
            fileType: req.file.mimetype,
            fileSize: req.file.size,
        });

        return res.status(201).json({
            message: "Document uploaded securely.",
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

        // At the current prototype stage, ONLY the owner of the document
        // is allowed to obtain a temporary viewing URL.
        if (document.ownerId.toString() !== req.user.id) {
            return res.status(403).json({
                message: "You are not authorized to access this document.",
            });
        }

        const expiresAt = Math.floor(Date.now() / 1000) + 5 * 60;

        const url = cloudinary.url(document.publicId, {
            resource_type: document.resourceType || "image",
            type: document.deliveryType || "authenticated",
            sign_url: true,
            secure: true,
            expires_at: expiresAt,
        });

        return res.status(200).json({
            url,
            expiresAt,
            document: documentPayload(document),
        });
    } catch (error) {
        console.error("Document access error:", error);

        return res.status(500).json({
            message: "Failed to access document.",
            error: error.message,
        });
    }
};