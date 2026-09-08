import mongoose from 'mongoose';

import User from '../models/User.js';
import Document from '../models/Document.js';
import LegacyClaim from '../models/LegacyClaim.js';
import BeneficiaryRelationship from '../models/BeneficiaryRelationship.js';
import ForgotPasswordOTP from '../models/ForgotPasswordOTP.js';
import PasswordChangeOTP from '../models/PasswordChangeOTP.js';
import ProfileContactVerification from '../models/ProfileContactVerification.js';
import RegistrationEmailVerification from '../models/RegistrationEmailVerification.js';
import RegistrationPhoneVerification from '../models/RegistrationPhoneVerification.js';
import ContactMessage from '../models/ContactMessage.js';

import cloudinary from '../config/cloudinary.js';

import {
  deleteEncryptedAadhaar,
} from './aadhaarEncryptionService.js';

import {
  deleteEncryptedLawyerCredential,
} from './lawyerCredentialEncryptionService.js';

function uniqueIds(values = []) {
  return [
    ...new Set(
      values
        .filter(Boolean)
        .map((value) => value.toString())
    ),
  ];
}

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

async function destroyCloudinaryAsset({
  publicId,
  resourceType = 'raw',
  deliveryType = 'authenticated',
}) {
  if (!publicId) return;

  const result = await cloudinary.uploader.destroy(publicId, {
    resource_type: resourceType,
    type: deliveryType,
    invalidate: true,
  });

  if (result.result !== 'ok' && result.result !== 'not found') {
    throw new Error(`Cloudinary asset could not be deleted: ${publicId}`);
  }
}

async function deleteVaultDocumentFiles(document) {
  if (document.publicId) {
    await destroyCloudinaryAsset({
      publicId: document.publicId,
      resourceType: document.resourceType || 'raw',
      deliveryType: document.deliveryType || 'authenticated',
    });
  }

  if (document.placeholderPublicId) {
    await destroyCloudinaryAsset({
      publicId: document.placeholderPublicId,
      resourceType: 'image',
      deliveryType: 'upload',
    });
  }
}

async function deleteLegacyClaimFiles(claim) {
  const files = collectClaimFiles(claim);

  for (const file of files) {
    if (file.publicId) {
      await destroyCloudinaryAsset({
        publicId: file.publicId,
        resourceType: file.resourceType || 'raw',
        deliveryType: file.deliveryType || 'authenticated',
      });
    }

    if (file.placeholderPublicId) {
      await destroyCloudinaryAsset({
        publicId: file.placeholderPublicId,
        resourceType: 'image',
        deliveryType: 'upload',
      });
    }
  }
}

async function deleteIdentityFiles(users) {
  for (const user of users) {
    if (user.aadhaarDocument?.publicId) {
      await deleteEncryptedAadhaar(user.aadhaarDocument);
    }

    if (
      user.role === 'LAWYER' &&
      user.lawyerProfile?.credentialDocument?.publicId
    ) {
      await deleteEncryptedLawyerCredential(
        user.lawyerProfile.credentialDocument
      );
    }
  }
}

async function resetClaimsAssignedToDeletedLawyer(lawyerId, session) {
  await LegacyClaim.updateMany(
    {
      assignedLawyerId: lawyerId,
      status: {
        $in: ['UNDER_LAWYER_REVIEW', 'MORE_INFORMATION_REQUIRED'],
      },
    },
    {
      $set: {
        assignedLawyerId: null,
        status: 'LEGACY_ACCESS_REQUESTED',
        'lawyerReview.reviewedBy': null,
        'lawyerReview.reviewedAt': null,
        'lawyerReview.remarks': '',
        'lawyerReview.action': null,
      },
    },
    { session }
  );

  await LegacyClaim.updateMany(
    {
      assignedLawyerId: lawyerId,
      status: {
        $nin: ['UNDER_LAWYER_REVIEW', 'MORE_INFORMATION_REQUIRED'],
      },
    },
    {
      $set: {
        assignedLawyerId: null,
        'lawyerReview.reviewedBy': null,
      },
    },
    { session }
  );
}

export async function deleteAccountCascade(targetUserId) {
  const target = await User.findById(targetUserId);

  if (!target) {
    const error = new Error('Account not found.');
    error.status = 404;
    throw error;
  }

  if (target.role === 'ADMIN') {
    const error = new Error(
      'Administrator accounts cannot be deleted through the account deletion workflow.'
    );
    error.status = 403;
    throw error;
  }

  let usersToDelete = [target];

  if (target.role === 'OWNER') {
    const ownedBeneficiaries = await User.find({
      role: 'BENEFICIARY',
      createdBy: target._id,
    });

    usersToDelete = [target, ...ownedBeneficiaries];
  }

  const userIds = uniqueIds(usersToDelete.map((user) => user._id));

  const beneficiaryIds = uniqueIds(
    usersToDelete
      .filter((user) => user.role === 'BENEFICIARY')
      .map((user) => user._id)
  );

  const emails = [
    ...new Set(
      usersToDelete
        .map((user) => user.email)
        .filter(Boolean)
        .map((email) => String(email).trim().toLowerCase())
    ),
  ];

  const phones = [
    ...new Set(
      usersToDelete
        .flatMap((user) => [user.phone, user.lawyerProfile?.phone])
        .filter(Boolean)
        .map((phone) => String(phone).trim())
    ),
  ];

  const ownedDocuments =
    target.role === 'OWNER'
      ? await Document.find({ ownerId: target._id })
      : [];

  const claimQuery =
    target.role === 'OWNER'
      ? {
          $or: [
            { ownerId: target._id },
            { beneficiaryId: { $in: beneficiaryIds } },
          ],
        }
      : target.role === 'BENEFICIARY'
        ? { beneficiaryId: target._id }
        : null;

  const claimsToDelete = claimQuery
    ? await LegacyClaim.find(claimQuery)
    : [];

  // Delete Cloudinary data before MongoDB metadata. Missing assets count as
  // successful cleanup so a partially completed deletion can be retried safely.
  await deleteIdentityFiles(usersToDelete);

  for (const document of ownedDocuments) {
    await deleteVaultDocumentFiles(document);
  }

  for (const claim of claimsToDelete) {
    await deleteLegacyClaimFiles(claim);
  }

  const session = await mongoose.startSession();

  try {
    await session.withTransaction(async () => {
      if (target.role === 'LAWYER') {
        await resetClaimsAssignedToDeletedLawyer(target._id, session);
      }

      if (claimsToDelete.length > 0) {
        await LegacyClaim.deleteMany(
          {
            _id: {
              $in: claimsToDelete.map((claim) => claim._id),
            },
          },
          { session }
        );
      }

      if (ownedDocuments.length > 0) {
        await Document.deleteMany(
          {
            _id: {
              $in: ownedDocuments.map((document) => document._id),
            },
          },
          { session }
        );
      }

      if (userIds.length > 0) {
        await Document.updateMany(
          {
            assignedBeneficiaries: { $in: userIds },
          },
          {
            $pull: {
              assignedBeneficiaries: { $in: userIds },
            },
          },
          { session }
        );
      }

      await BeneficiaryRelationship.deleteMany(
        {
          $or: [
            { ownerId: { $in: userIds } },
            { beneficiaryId: { $in: userIds } },
          ],
        },
        { session }
      );

      await Promise.all([
        ForgotPasswordOTP.deleteMany(
          { userId: { $in: userIds } },
          { session }
        ),
        PasswordChangeOTP.deleteMany(
          { userId: { $in: userIds } },
          { session }
        ),
        ProfileContactVerification.deleteMany(
          { userId: { $in: userIds } },
          { session }
        ),
        RegistrationEmailVerification.deleteMany(
          { email: { $in: emails } },
          { session }
        ),
        RegistrationPhoneVerification.deleteMany(
          { phone: { $in: phones } },
          { session }
        ),
        ContactMessage.deleteMany(
          { email: { $in: emails } },
          { session }
        ),
      ]);

      await User.updateMany(
        {
          'verification.reviewedBy': { $in: userIds },
        },
        {
          $set: {
            'verification.reviewedBy': null,
          },
        },
        { session }
      );

      await User.deleteMany(
        { _id: { $in: userIds } },
        { session }
      );
    });
  } finally {
    await session.endSession();
  }

  return {
    deletedUserIds: userIds,
    deletedUsers: usersToDelete.length,
    deletedDocuments: ownedDocuments.length,
    deletedClaims: claimsToDelete.length,
  };
}
