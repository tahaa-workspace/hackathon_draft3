import crypto from 'crypto';
import streamifier from 'streamifier';
import cloudinary from '../config/cloudinary.js';
import LegacyClaim from '../models/LegacyClaim.js';

function getEncryptionKey() {
  const configuredKey = process.env.DOCUMENT_ENCRYPTION_KEY;
  if (!configuredKey) throw new Error('DOCUMENT_ENCRYPTION_KEY is not configured.');

  const key = /^[0-9a-fA-F]{64}$/.test(configuredKey)
    ? Buffer.from(configuredKey, 'hex')
    : Buffer.from(configuredKey, 'base64');

  if (key.length !== 32) {
    throw new Error('DOCUMENT_ENCRYPTION_KEY must decode to exactly 32 bytes.');
  }
  return key;
}

function encryptBuffer(buffer) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', getEncryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(buffer), cipher.final()]);
  return {
    encrypted,
    iv: iv.toString('base64'),
    authTag: cipher.getAuthTag().toString('base64'),
  };
}

function decryptBuffer(buffer, encryption) {
  if (!encryption?.iv || !encryption?.authTag) {
    throw new Error('Additional evidence encryption metadata is missing.');
  }
  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    getEncryptionKey(),
    Buffer.from(encryption.iv, 'base64')
  );
  decipher.setAuthTag(Buffer.from(encryption.authTag, 'base64'));
  return Buffer.concat([decipher.update(buffer), decipher.final()]);
}

function uploadEncrypted(buffer, folder) {
  return new Promise((resolve, reject) => {
    const publicId = `${folder}/${crypto.randomUUID()}.vault`;
    const stream = cloudinary.uploader.upload_stream(
      {
        public_id: publicId,
        resource_type: 'raw',
        type: 'authenticated',
        use_filename: false,
        unique_filename: false,
      },
      (error, result) => (error ? reject(error) : resolve(result))
    );
    streamifier.createReadStream(buffer).pipe(stream);
  });
}

async function downloadEncrypted(file) {
  const signedUrl = cloudinary.url(file.publicId, {
    resource_type: 'raw',
    type: 'authenticated',
    sign_url: true,
    secure: true,
  });
  const response = await fetch(signedUrl);
  if (!response.ok) {
    throw new Error(`Cloudinary encrypted file download failed (${response.status}).`);
  }
  return Buffer.from(await response.arrayBuffer());
}

async function destroyEncrypted(publicId) {
  if (!publicId) return;
  await cloudinary.uploader.destroy(publicId, {
    resource_type: 'raw',
    type: 'authenticated',
    invalidate: true,
  }).catch(() => {});
}

function fileMetadata(file, uploaded, encryptedData) {
  return {
    publicId: uploaded.public_id,
    placeholderPublicId: null,
    resourceType: 'raw',
    deliveryType: 'authenticated',
    originalName: file.originalname,
    mimeType: file.mimetype,
    fileSize: file.size,
    encryptedSize: encryptedData.encrypted.length,
    encryption: {
      algorithm: 'aes-256-gcm',
      iv: encryptedData.iv,
      authTag: encryptedData.authTag,
      version: 1,
    },
  };
}

function safeFile(file, index) {
  if (!file?.publicId) return null;
  return {
    index,
    originalName: file.originalName,
    mimeType: file.mimeType,
    fileSize: file.fileSize,
    available: true,
  };
}

function requestPayload(item) {
  return {
    id: item._id.toString(),
    requestedByRole: item.requestedByRole,
    message: item.message,
    status: item.status,
    requestedAt: item.requestedAt,
    responseMessage: item.responseMessage,
    respondedAt: item.respondedAt,
    additionalDocuments: (item.additionalDocuments || [])
      .map((file, index) => safeFile(file, index))
      .filter(Boolean),
  };
}

function isOwnerOfClaim(claim, userId) {
  return claim.beneficiaryId?.toString() === userId;
}

function isAssignedLawyer(claim, userId) {
  return claim.assignedLawyerId?.toString() === userId;
}

function canReadClaim(claim, user) {
  if (user.role === 'ADMIN') return true;
  if (user.role === 'BENEFICIARY') return isOwnerOfClaim(claim, user.id);
  if (user.role === 'LAWYER') return isAssignedLawyer(claim, user.id);
  return false;
}

export async function getClaimInformationRequests(req, res) {
  try {
    const claim = await LegacyClaim.findById(req.params.id).select(
      'beneficiaryId assignedLawyerId informationRequests'
    );
    if (!claim) return res.status(404).json({ message: 'Legacy Access Claim not found.' });
    if (!canReadClaim(claim, req.user)) {
      return res.status(403).json({ message: 'You are not allowed to view this claim history.' });
    }

    return res.json({
      informationRequests: (claim.informationRequests || []).map(requestPayload),
    });
  } catch (error) {
    console.error('Get information request history error:', error);
    return res.status(500).json({ message: 'Unable to load additional information history.' });
  }
}

export async function requestMoreInformation(req, res) {
  try {
    const message = String(req.body?.message || '').trim();
    if (!message) {
      return res.status(400).json({ message: 'Please specify what additional information or document is required.' });
    }

    const claim = await LegacyClaim.findById(req.params.id);
    if (!claim) return res.status(404).json({ message: 'Legacy Access Claim not found.' });

    const existingPending = (claim.informationRequests || []).some((item) => item.status === 'PENDING');
    if (existingPending || claim.status === 'MORE_INFORMATION_REQUIRED') {
      return res.status(409).json({ message: 'The Beneficiary already has a pending information request for this claim.' });
    }

    let returnStatus;
    if (req.user.role === 'ADMIN') {
      if (claim.status !== 'UNDER_ADMIN_REVIEW') {
        return res.status(400).json({ message: 'Admin can request more information only while the claim is under Admin review.' });
      }
      returnStatus = 'UNDER_ADMIN_REVIEW';
      claim.adminReview.reviewedBy = req.user.id;
      claim.adminReview.reviewedAt = new Date();
      claim.adminReview.remarks = message;
    } else if (req.user.role === 'LAWYER') {
      if (!isAssignedLawyer(claim, req.user.id)) {
        return res.status(403).json({ message: 'This claim is not assigned to you.' });
      }
      if (claim.status !== 'UNDER_LAWYER_REVIEW') {
        return res.status(400).json({ message: 'Lawyer can request more information only while the claim is under Lawyer review.' });
      }
      returnStatus = 'UNDER_LAWYER_REVIEW';
      claim.lawyerReview.reviewedBy = req.user.id;
      claim.lawyerReview.reviewedAt = new Date();
      claim.lawyerReview.remarks = message;
      claim.lawyerReview.action = 'REQUEST_MORE_INFORMATION';
    } else {
      return res.status(403).json({ message: 'Only Admin or the assigned Lawyer can request additional information.' });
    }

    claim.informationRequests.push({
      requestedByRole: req.user.role,
      requestedBy: req.user.id,
      message,
      returnStatus,
      status: 'PENDING',
      requestedAt: new Date(),
    });
    claim.status = 'MORE_INFORMATION_REQUIRED';
    await claim.save();

    const latest = claim.informationRequests[claim.informationRequests.length - 1];
    return res.json({
      message: 'Additional information requested from the Beneficiary.',
      status: claim.status,
      informationRequest: requestPayload(latest),
    });
  } catch (error) {
    console.error('Request more information error:', error);
    return res.status(500).json({ message: 'Unable to request additional information.' });
  }
}

export async function submitAdditionalInformation(req, res) {
  const uploadedIds = [];
  try {
    const claim = await LegacyClaim.findById(req.params.id);
    if (!claim) return res.status(404).json({ message: 'Legacy Access Claim not found.' });
    if (!isOwnerOfClaim(claim, req.user.id)) {
      return res.status(403).json({ message: 'You can submit evidence only for your own Legacy Access Claim.' });
    }
    if (claim.status !== 'MORE_INFORMATION_REQUIRED') {
      return res.status(400).json({ message: 'This claim is not currently waiting for additional information.' });
    }

    const pendingRequest = [...(claim.informationRequests || [])]
      .reverse()
      .find((item) => item.status === 'PENDING');
    if (!pendingRequest) {
      return res.status(400).json({ message: 'No pending information request was found.' });
    }

    const files = Array.isArray(req.files) ? req.files : [];
    if (files.length === 0) {
      return res.status(400).json({ message: 'Upload at least one requested supporting document.' });
    }

    const storedFiles = [];
    for (const file of files) {
      const encryptedData = encryptBuffer(file.buffer);
      const uploaded = await uploadEncrypted(
        encryptedData.encrypted,
        `legacy-claims/${claim._id}/additional-evidence/${pendingRequest._id}`
      );
      uploadedIds.push(uploaded.public_id);
      storedFiles.push(fileMetadata(file, uploaded, encryptedData));
    }

    pendingRequest.additionalDocuments = storedFiles;
    pendingRequest.responseMessage = String(req.body?.responseMessage || '').trim();
    pendingRequest.respondedAt = new Date();
    pendingRequest.status = 'SUBMITTED';
    claim.status = pendingRequest.returnStatus;
    await claim.save();

    return res.json({
      message: `Additional evidence submitted. The claim has returned to ${pendingRequest.requestedByRole === 'ADMIN' ? 'Admin' : 'Lawyer'} review.`,
      status: claim.status,
      informationRequest: requestPayload(pendingRequest),
    });
  } catch (error) {
    await Promise.all(uploadedIds.map(destroyEncrypted));
    console.error('Submit additional information error:', error);
    return res.status(500).json({ message: 'Unable to submit additional evidence.' });
  }
}

async function deleteClaimStoredFile(file) {
  if (!file) return;

  // Delete encrypted original
  if (file.publicId) {
    const result =
      await cloudinary.uploader.destroy(
        file.publicId,
        {
          resource_type:
            file.resourceType || 'raw',

          type:
            file.deliveryType ||
            'authenticated',

          invalidate: true,
        }
      );

    console.log(
      'Encrypted file delete:',
      file.publicId,
      result
    );
  }

  // Delete placeholder image
  if (file.placeholderPublicId) {
    const placeholderResult =
      await cloudinary.uploader.destroy(
        file.placeholderPublicId,
        {
          resource_type: 'image',
          type: 'upload',
          invalidate: true,
        }
      );

    console.log(
      'Placeholder delete:',
      file.placeholderPublicId,
      placeholderResult
    );
  }
}

async function deleteAllLegacyClaimFiles(
  claim
) {
  const files = [];

  if (claim.deathCertificate) {
    files.push(
      claim.deathCertificate
    );
  }

  if (claim.identityProof) {
    files.push(
      claim.identityProof
    );
  }

  if (claim.supportingDocument) {
    files.push(
      claim.supportingDocument
    );
  }

  for (
    const informationRequest
    of claim.informationRequests || []
  ) {
    for (
      const additionalFile
      of informationRequest.additionalDocuments ||
      []
    ) {
      files.push(
        additionalFile
      );
    }
  }

  for (const file of files) {
    await deleteClaimStoredFile(
      file
    );
  }
}

export async function rejectLegacyClaim(
  req,
  res
) {
  try {
    const remarks =
      String(
        req.body?.remarks || ''
      ).trim();

    if (!remarks) {
      return res
        .status(400)
        .json({
          message:
            'A rejection reason is required.',
        });
    }

    const claim =
      await LegacyClaim.findById(
        req.params.id
      );

    if (!claim) {
      return res
        .status(404)
        .json({
          message:
            'Legacy Access Claim not found.',
        });
    }

    /*
    |--------------------------------------------------------------------------
    | CHECK WHO IS REJECTING
    |--------------------------------------------------------------------------
    */

    if (
      req.user.role === 'ADMIN'
    ) {
      if (
        claim.status !==
        'UNDER_ADMIN_REVIEW'
      ) {
        return res
          .status(400)
          .json({
            message:
              'Admin can reject only while the claim is under Admin review.',
          });
      }

    } else if (
      req.user.role === 'LAWYER'
    ) {
      if (
        !isAssignedLawyer(
          claim,
          req.user.id
        )
      ) {
        return res
          .status(403)
          .json({
            message:
              'This claim is not assigned to you.',
          });
      }

      if (
        claim.status !==
        'UNDER_LAWYER_REVIEW'
      ) {
        return res
          .status(400)
          .json({
            message:
              'Lawyer can reject only while the claim is under Lawyer review.',
          });
      }

    } else {
      return res
        .status(403)
        .json({
          message:
            'Only Admin or the assigned Lawyer can reject a claim.',
        });
    }

    /*
    |--------------------------------------------------------------------------
    | DELETE CLOUDINARY FILES
    |--------------------------------------------------------------------------
    */

    try {
      await deleteAllLegacyClaimFiles(
        claim
      );
    } catch (deleteError) {
      console.error(
        'Legacy Claim Cloudinary deletion failed:',
        deleteError
      );

      return res
        .status(500)
        .json({
          message:
            'Claim rejection stopped because uploaded documents could not be deleted from Cloudinary.',

          error:
            deleteError.message,
        });
    }

    /*
    |--------------------------------------------------------------------------
    | DELETE CLAIM METADATA FROM MONGODB
    |--------------------------------------------------------------------------
    */

    const claimId =
      claim._id.toString();

    await LegacyClaim.deleteOne({
      _id: claim._id,
    });

    /*
    |--------------------------------------------------------------------------
    | SUCCESS
    |--------------------------------------------------------------------------
    */

    return res
      .status(200)
      .json({
        message:
          'Legacy Access Claim rejected. All beneficiary-uploaded documents and claim metadata were permanently deleted.',

        deleted: true,

        claimId,
      });

  } catch (error) {
    console.error(
      'Reject legacy claim error:',
      error
    );

    return res
      .status(500)
      .json({
        message:
          'Unable to reject this Legacy Access Claim.',

        error:
          error.message,
      });
  }
}

export async function getAdditionalEvidenceFile(req, res) {
  try {
    const claim = await LegacyClaim.findById(req.params.id).select(
      'beneficiaryId assignedLawyerId informationRequests'
    );
    if (!claim) return res.status(404).json({ message: 'Legacy Access Claim not found.' });
    if (!canReadClaim(claim, req.user)) {
      return res.status(403).json({ message: 'You are not allowed to access this evidence.' });
    }

    const infoRequest = claim.informationRequests.id(req.params.requestId);
    if (!infoRequest) return res.status(404).json({ message: 'Information request not found.' });

    const index = Number(req.params.fileIndex);
    if (!Number.isInteger(index) || index < 0 || index >= infoRequest.additionalDocuments.length) {
      return res.status(404).json({ message: 'Additional evidence file not found.' });
    }

    const file = infoRequest.additionalDocuments[index];
    const encrypted = await downloadEncrypted(file);
    const decrypted = decryptBuffer(encrypted, file.encryption);
    res.setHeader('Content-Type', file.mimeType || 'application/octet-stream');
    res.setHeader('Content-Disposition', `inline; filename="${String(file.originalName || 'evidence').replace(/"/g, '')}"`);
    res.setHeader('Cache-Control', 'private, no-store');
    return res.send(decrypted);
  } catch (error) {
    console.error('Open additional evidence error:', error);
    return res.status(500).json({ message: 'Unable to open additional evidence.' });
  }
}
