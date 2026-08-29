import Document from "../models/Document.js";
import cloudinary from "../config/cloudinary.js";
import streamifier from "streamifier";

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
            fileUrl: uploadResult.secure_url,
            publicId: uploadResult.public_id,
            fileType: req.file.mimetype,
            fileSize: req.file.size,
        });

        return res.status(201).json({
            message: "Document uploaded successfully.",
            document,
        });

    } catch (error) {
        console.error("Document upload error:", error);

        return res.status(500).json({
            message: "Failed to upload document.",
            error: error.message,
        });
    }
};