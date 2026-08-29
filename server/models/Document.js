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

        fileUrl: {
            type: String,
            required: true,
        },

        publicId: {
            type: String,
            required: true,
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