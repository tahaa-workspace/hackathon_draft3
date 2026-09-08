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

  if (file.publicId) {
    try {
      await cloudinary.uploader.destroy(file.publicId, {
        resource_type: file.resourceType || 'raw',
        type: file.deliveryType || 'authenticated',
        invalidate: true,
      });
    } catch (error) {
      console.warn(
        `Unable to remove orphan legacy-claim encrypted file ${file.publicId}:`,
        error?.message || error
      );
    }
  }

  // Claim placeholders are uploaded separately as normal Cloudinary images.
  if (file.placeholderPublicId) {
    try {
      await cloudinary.uploader.destroy(file.placeholderPublicId, {
        resource_type: 'image',
        type: 'upload',
        invalidate: true,
      });
    } catch (error) {
      console.warn(
        `Unable to remove orphan legacy-claim placeholder ${file.placeholderPublicId}:`,
        error?.message || error
      );
    }
  }
}

export async function cleanupOrphanLegacyClaims(_req, _res, next) {
  try {
    const claims = await LegacyClaim.find({})
      .select(
        'ownerId beneficiaryId deathCertificate identityProof supportingDocument informationRequests'
      )
      .lean();

    if (!claims.length) return next();

    const requiredUserIds = [
      ...new Set(
        claims
          .flatMap((claim) => [
            claim.ownerId?.toString(),
            claim.beneficiaryId?.toString(),
          ])
          .filter(Boolean)
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

    if (!orphanClaims.length) return next();

    // Remove evidence first, then remove the orphan database records. A Cloudinary
    // cleanup failure is logged but does not keep an invalid claim in the Admin list.
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
  } catch (error) {
    // Cleanup must not make the Admin page unavailable if a separate cleanup
    // operation fails. The existing list controller is still allowed to run.
    console.error('Legacy claim orphan cleanup error:', error);
  }

  return next();
}
