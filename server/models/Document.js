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

        // Legacy field kept optional so older records do not break.
        // New private documents must never rely on a permanent Cloudinary URL.
        fileUrl: {
            type: String,
        },

        publicId: {
            type: String,
            required: true,
        },

        resourceType: {
            type: String,
        },

        // New uploads explicitly store "authenticated" here.
        // Leaving this without a default lets us identify older public uploads safely.
        deliveryType: {
            type: String,
        },

        fileType: {
            type: String,
        },

        fileSize: {
            type: Number,
        },
    },
    {
        timestamps: true,
    }
);

export default mongoose.model("Document", documentSchema);