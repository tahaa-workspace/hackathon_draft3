import LegacyClaim from '../models/LegacyClaim.js';
import User from '../models/User.js';
import cloudinary from '../config/cloudinary.js';

function collectClaimFiles(claim) {
  const files = [];

  if (claim.deathCertificate) files.push(claim.deathCertificate);
  if (claim.identityProof) files.push(claim.identityProof);
  if (claim.supportingDocument) files.push(claim.supportingDocument);

  for (const request of claim.informationRequests || []) {
    for (const file of request.additionalDocuments || []) {
      files.push(file);
    }
  }

  return files;
}

async function destroyCloudinaryFile(file) {
  if (!file) return;

  const ids = [file.publicId, file.placeholderPublicId].filter(Boolean);

  for (const publicId of ids) {
    try {
      await cloudinary.uploader.destroy(publicId, {
        resource_type: file.resourceType || 'raw',
        type: file.deliveryType || 'authenticated',
        invalidate: true,
      });
    } catch (error) {
      console.warn(
        `Unable to remove orphan legacy-claim Cloudinary file ${publicId}:`,
        error?.message || error
      );
    }
  }
}

export async function cleanupOrphanLegacyClaims(req, _res, next) {
  try {
    const claims = await LegacyClaim.find({})
      .select(
        'ownerId beneficiaryId assignedLawyerId deathCertificate identityProof supportingDocument informationRequests'
      )
      .lean();

    if (!claims.length) return next();

    const requiredUserIds = [
      ...new Set(
        claims.flatMap((claim) => [
          claim.ownerId?.toString(),
          claim.beneficiaryId?.toString(),
        ]).filter(Boolean)
      ),
    ];

    const existingUsers = await User.find({
      _id: { $in: requiredUserIds },
    })
      .select('_id')
      .lean();

    const existingIds = new Set(existingUsers.map((user) => user._id.toString()));

    const orphanClaims = claims.filter((claim) => {
      const ownerExists = claim.ownerId && existingIds.has(claim.ownerId.toString());
      const beneficiaryExists =
        claim.beneficiaryId && existingIds.has(claim.beneficiaryId.toString());

      return !ownerExists || !beneficiaryExists;
    });

    if (orphanClaims.length) {
      for (const claim of orphanClaims) {
        const files = collectClaimFiles(claim);
        await Promise.all(files.map((file) => destroyCloudinaryFile(file)));
      }

      await LegacyClaim.deleteMany({
        _id: { $in: orphanClaims.map((claim) => claim._id) },
      });

      console.log(
        `Removed ${orphanClaims.length} orphan legacy claim${orphanClaims.length === 1 ? '' : 's'} before Admin listing.`
      );
    }

    // A deleted Lawyer must not make an otherwise valid Owner/Beneficiary claim disappear.
    // Clear only the stale Lawyer reference so the claim can be assigned again.
    const assignedLawyerIds = [
      ...new Set(
        claims
          .filter(
            (claim) =>
              claim.assignedLawyerId &&
              !orphanClaims.some((orphan) => orphan._id.toString() === claim._id.toString())
          )
          .map((claim) => claim.assignedLawyerId.toString())
      ),
    ];

    if (assignedLawyerIds.length) {
      const existingLawyers = await User.find({
        _id: { $in: assignedLawyerIds },
        role: 'LAWYER',
      })
        .select('_id')
        .lean();

      const lawyerIds = new Set(existingLawyers.map((lawyer) => lawyer._id.toString()));
      const staleLawyerClaimIds = claims
        .filter(
          (claim) =>
            claim.assignedLawyerId &&
            !lawyerIds.has(claim.assignedLawyerId.toString()) &&
            !orphanClaims.some((orphan) => orphan._id.toString() === claim._id.toString())
        )
        .map((claim) => claim._id);

      if (staleLawyerClaimIds.length) {
        await LegacyClaim.updateMany(
          { _id: { $in: staleLawyerClaimIds } },
          {
            $set: {
              assignedLawyerId: null,
              'lawyerReview.reviewedBy': null,
              'lawyerReview.reviewedAt': null,
              'lawyerReview.action': null,
            },
          }
        );
      }
    }
  } catch (error) {
    // Cleanup should never make the Admin page unavailable. The list controller
    // still runs and the error is logged so it can be investigated separately.
    console.error('Legacy claim orphan cleanup error:', error);
  }

  return next();
}
