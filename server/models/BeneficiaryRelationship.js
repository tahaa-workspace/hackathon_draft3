import mongoose from 'mongoose';

const beneficiaryRelationshipSchema =
  new mongoose.Schema(
    {
      ownerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true,
      },

      beneficiaryId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true,
      },

      status: {
        type: String,
        enum: [
          'ACTIVE',
          'REVOKED',
        ],
        default: 'ACTIVE',
      },
    },
    {
      timestamps: true,
    }
  );

beneficiaryRelationshipSchema.index(
  {
    ownerId: 1,
    beneficiaryId: 1,
  },
  {
    unique: true,
  }
);

export default mongoose.model(
  'BeneficiaryRelationship',
  beneficiaryRelationshipSchema
);