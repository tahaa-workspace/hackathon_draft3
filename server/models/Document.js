import mongoose from "mongoose";

const documentSchema = new mongoose.Schema(
    {
        ownerId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },

        title: {
            type: String,
            required: true,
            trim: true,
        },

        category: {
            type: String,
            required: true,
            enum: [
                "Personal",
                "Financial",
                "Legal",
                "Insurance",
                "Property",
                "Family",
                "Other",
            ],
        },

        originalName: {
            type: String,
            required: true,
        },

        // Legacy compatibility only. New vault files never store a usable
        // original-document URL in MongoDB.
        fileUrl: {
            type: String,
        },

        // Points to the real encrypted RAW .vault asset in Cloudinary.
        publicId: {
            type: String,
            required: true,
        },

        // Points to the harmless dummy image shown in digital-legacy/documents.
        placeholderPublicId: {
            type: String,
        },

        resourceType: {
            type: String,
            default: "raw",
        },

        deliveryType: {
            type: String,
            default: "authenticated",
        },

        fileType: {
            type: String,
        },

        fileSize: {
            type: Number,
        },

        encryptedSize: {
            type: Number,
        },

        encryption: {
            algorithm: {
                type: String,
                default: "aes-256-gcm",
            },
            iv: {
                type: String,
            },
            authTag: {
                type: String,
            },
            version: {
                type: Number,
                default: 1,
            },
        },
    },
    {
        timestamps: true,
    }
);

export default mongoose.model("Document", documentSchema);
