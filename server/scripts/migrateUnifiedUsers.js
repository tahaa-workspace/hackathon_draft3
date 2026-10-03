import 'dotenv/config';
import mongoose from 'mongoose';
import connectDB from '../config/db.js';
import User from '../models/User.js';
import Document from '../models/Document.js';
import LegacyAllocation from '../models/LegacyAllocation.js';
import LegacyClaim from '../models/LegacyClaim.js';

async function migrate() {
  await connectDB(process.env.MONGO_URI);

  const legacyUsers = await User.find({
    role: { $in: ['OWNER', 'BENEFICIARY'] },
  }).select('_id role');

  if (legacyUsers.length > 0) {
    await User.collection.updateMany(
      { role: { $in: ['OWNER', 'BENEFICIARY'] } },
      { $set: { role: 'USER' } }
    );
  }

  const documents = await Document.find({
    assignedBeneficiaries: { $exists: true, $ne: [] },
  }).select('_id ownerId assignedBeneficiaries');

  let createdAllocations = 0;

  for (const document of documents) {
    for (const recipientId of document.assignedBeneficiaries || []) {
      const exists = await LegacyAllocation.exists({
        assetId: document._id,
        allocatedTo: recipientId,
        status: { $ne: 'REVOKED' },
      });

      if (!exists) {
        await LegacyAllocation.create({
          assetId: document._id,
          allocatedBy: document.ownerId,
          allocatedTo: recipientId,
          permissions: { view: true, download: false },
          releaseCondition: 'LEGACY_CLAIM',
          status: 'ACTIVE',
        });
        createdAllocations += 1;
      }
    }
  }

  /*
  |--------------------------------------------------------------------------
  | MAP LEGACY CLAIMS ONLY WHEN THE RELATIONSHIP IS UNAMBIGUOUS
  |--------------------------------------------------------------------------
  |
  | Old claims were relationship-wide (owner + beneficiary). New claims must
  | reference a specific allocation. If exactly one matching allocation exists,
  | it is safe to attach it. Multiple matches are intentionally left unmapped
  | for manual review rather than guessing which protected asset was claimed.
  |
  */

  const legacyClaims =
    await LegacyClaim.find({
      $or: [
        { allocationId: null },
        { allocationId: { $exists: false } },
      ],
    }).select(
      '_id ownerId beneficiaryId claimantId status'
    );

  let mappedClaims = 0;
  let ambiguousClaims = 0;
  let missingAllocationClaims = 0;

  for (const claim of legacyClaims) {
    const recipientId =
      claim.claimantId ||
      claim.beneficiaryId;

    if (!claim.ownerId || !recipientId) {
      missingAllocationClaims += 1;
      continue;
    }

    const matchingAllocations =
      await LegacyAllocation.find({
        allocatedBy:
          claim.ownerId,
        allocatedTo:
          recipientId,
        status: {
          $ne:
            'REVOKED',
        },
      }).select(
        '_id'
      );

    if (matchingAllocations.length === 1) {
      claim.allocationId =
        matchingAllocations[0]._id;

      claim.claimantId =
        recipientId;

      await claim.save();

      mappedClaims += 1;
    } else if (matchingAllocations.length > 1) {
      ambiguousClaims += 1;
    } else {
      missingAllocationClaims += 1;
    }
  }

  /*
  |--------------------------------------------------------------------------
  | ENFORCE CLAIM-GATED ACCESS FOR PREVIOUS ALLOCATIONS
  |--------------------------------------------------------------------------
  */

  const legacyReleaseAllocations =
    await LegacyAllocation.find({
      releaseCondition: {
        $ne:
          'LEGACY_CLAIM',
      },
      status: {
        $nin: [
          'REVOKED',
          'EXPIRED',
        ],
      },
    });

  let normalizedAllocations = 0;

  for (const allocation of legacyReleaseAllocations) {
    const approvedClaim =
      await LegacyClaim.exists({
        allocationId:
          allocation._id,
        claimantId:
          allocation.allocatedTo,
        status:
          'APPROVED_INFORMATION_RELEASED',
      });

    allocation.releaseCondition =
      'LEGACY_CLAIM';

    allocation.releaseDate =
      null;

    allocation.status =
      approvedClaim
        ? 'RELEASED'
        : 'ACTIVE';

    await allocation.save();

    normalizedAllocations += 1;
  }

  console.log('Unified user migration complete.');
  console.log('Converted user roles:', legacyUsers.length);
  console.log('Created legacy allocations:', createdAllocations);
  console.log('Mapped unambiguous legacy claims:', mappedClaims);
  console.log('Legacy claims requiring manual review:', ambiguousClaims);
  console.log('Legacy claims without a matching allocation:', missingAllocationClaims);
  console.log('Normalized claim-gated allocations:', normalizedAllocations);

  await mongoose.disconnect();
}

migrate().catch(async (error) => {
  console.error('Unified user migration failed:', error);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
