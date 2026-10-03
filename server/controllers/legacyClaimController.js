import crypto from 'crypto';
import cloudinary from '../config/cloudinary.js';
import streamifier from 'streamifier';

import LegacyClaim from '../models/LegacyClaim.js';
import User from '../models/User.js';
import Document from '../models/Document.js';
import LegacyAllocation from '../models/LegacyAllocation.js';
import { createNotification } from '../services/notificationService.js';
import { claimStageTemplate } from '../services/emailTemplates.js';
import { writeAudit } from '../services/auditService.js';

/*
|--------------------------------------------------------------------------
| ENCRYPTION KEY
|--------------------------------------------------------------------------
*/

function getEncryptionKey() {
  const configuredKey =
    process.env.DOCUMENT_ENCRYPTION_KEY;

  if (!configuredKey) {
    throw new Error(
      'DOCUMENT_ENCRYPTION_KEY is not configured.'
    );
  }

  const key =
    /^[0-9a-fA-F]{64}$/.test(configuredKey)
      ? Buffer.from(configuredKey, 'hex')
      : Buffer.from(configuredKey, 'base64');

  if (key.length !== 32) {
    throw new Error(
      'DOCUMENT_ENCRYPTION_KEY must decode to exactly 32 bytes.'
    );
  }

  return key;
}

/*
|--------------------------------------------------------------------------
| AES-256-GCM ENCRYPTION
|--------------------------------------------------------------------------
*/

function encryptBuffer(buffer) {
  const key = getEncryptionKey();

  const iv = crypto.randomBytes(12);

  const cipher = crypto.createCipheriv(
    'aes-256-gcm',
    key,
    iv
  );

  const encrypted = Buffer.concat([
    cipher.update(buffer),
    cipher.final(),
  ]);

  const authTag = cipher.getAuthTag();

  return {
    encrypted,
    iv: iv.toString('base64'),
    authTag: authTag.toString('base64'),
  };
}

/*
|--------------------------------------------------------------------------
| AES-256-GCM DECRYPTION
|--------------------------------------------------------------------------
*/

function decryptBuffer(
  encryptedBuffer,
  encryption
) {
  if (
    !encryption?.iv ||
    !encryption?.authTag
  ) {
    throw new Error(
      'Legacy Claim encryption metadata is missing.'
    );
  }

  const key = getEncryptionKey();

  const decipher =
    crypto.createDecipheriv(
      'aes-256-gcm',
      key,
      Buffer.from(
        encryption.iv,
        'base64'
      )
    );

  decipher.setAuthTag(
    Buffer.from(
      encryption.authTag,
      'base64'
    )
  );

  return Buffer.concat([
    decipher.update(encryptedBuffer),
    decipher.final(),
  ]);
}

/*
|--------------------------------------------------------------------------
| UPLOAD REAL ENCRYPTED .VAULT FILE
|--------------------------------------------------------------------------
*/

function uploadEncryptedClaimBlob(
  buffer,
  folder
) {
  return new Promise(
    (resolve, reject) => {
      const publicId =
        `${folder}/${crypto.randomUUID()}.vault`;

      const uploadStream =
        cloudinary.uploader.upload_stream(
          {
            public_id: publicId,

            resource_type: 'raw',

            type: 'authenticated',

            use_filename: false,

            unique_filename: false,
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
        .createReadStream(buffer)
        .pipe(uploadStream);
    }
  );
}

/*
|--------------------------------------------------------------------------
| DOWNLOAD REAL ENCRYPTED FILE
|--------------------------------------------------------------------------
*/

async function downloadEncryptedClaimBlob(
  file
) {
  const signedUrl =
    cloudinary.url(file.publicId, {
      resource_type: 'raw',
      type: 'authenticated',
      sign_url: true,
      secure: true,
    });

  const response =
    await fetch(signedUrl);

  if (!response.ok) {
    throw new Error(
      `Cloudinary encrypted file download failed (${response.status}).`
    );
  }

  return Buffer.from(
    await response.arrayBuffer()
  );
}

/*
|--------------------------------------------------------------------------
| PLACEHOLDER SVG
|--------------------------------------------------------------------------
*/

function buildLegacyClaimPlaceholderSvg(
  label = 'SECURE LEGACY CLAIM DOCUMENT'
) {
  const safeLabel =
    String(label)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

  const svg = `
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="900"
      height="600"
      viewBox="0 0 900 600"
    >

      <rect
        width="900"
        height="600"
        fill="#f1f5f9"
      />

      <rect
        x="250"
        y="105"
        width="400"
        height="390"
        rx="24"
        fill="#ffffff"
        stroke="#cbd5e1"
        stroke-width="6"
      />

      <path
        d="M555 105 L650 200 L555 200 Z"
        fill="#dbeafe"
      />

      <rect
        x="310"
        y="275"
        width="280"
        height="22"
        rx="11"
        fill="#94a3b8"
      />

      <rect
        x="310"
        y="325"
        width="220"
        height="18"
        rx="9"
        fill="#cbd5e1"
      />

      <rect
        x="310"
        y="365"
        width="250"
        height="18"
        rx="9"
        fill="#cbd5e1"
      />

      <circle
        cx="450"
        cy="225"
        r="42"
        fill="#2563eb"
      />

      <path
        d="M430 225 L444 239 L472 208"
        fill="none"
        stroke="#ffffff"
        stroke-width="10"
        stroke-linecap="round"
        stroke-linejoin="round"
      />

      <text
        x="450"
        y="445"
        text-anchor="middle"
        font-family="Arial, sans-serif"
        font-size="25"
        font-weight="700"
        fill="#1e293b"
      >
        ${safeLabel}
      </text>

      <text
        x="450"
        y="478"
        text-anchor="middle"
        font-family="Arial, sans-serif"
        font-size="18"
        fill="#64748b"
      >
        Original file is encrypted and protected
      </text>

    </svg>
  `;

  return (
    `data:image/svg+xml;base64,` +
    Buffer.from(svg).toString('base64')
  );
}

/*
|--------------------------------------------------------------------------
| UPLOAD PLACEHOLDER IMAGE
|--------------------------------------------------------------------------
*/

async function uploadLegacyClaimPlaceholder(
  folder,
  label
) {
  const placeholderId =
    `secure-placeholder-${crypto.randomUUID()}`;

  return cloudinary.uploader.upload(
    buildLegacyClaimPlaceholderSvg(label),
    {
      folder,

      public_id:
        placeholderId,

      resource_type:
        'image',

      type:
        'upload',

      overwrite:
        false,
    }
  );
}

/*
|--------------------------------------------------------------------------
| FILE METADATA
|--------------------------------------------------------------------------
*/

function fileMeta(
  file,
  uploaded,
  encryptionData,
  placeholderUpload
) {
  return {
    // Real encrypted .vault file
    publicId:
      uploaded.public_id,

    // Harmless SVG
    placeholderPublicId:
      placeholderUpload?.public_id ||
      null,

    resourceType:
      'raw',

    deliveryType:
      'authenticated',

    originalName:
      file.originalname,

    mimeType:
      file.mimetype,

    fileSize:
      file.size,

    encryptedSize:
      encryptionData.encrypted.length,

    encryption: {
      algorithm:
        'aes-256-gcm',

      iv:
        encryptionData.iv,

      authTag:
        encryptionData.authTag,

      version:
        1,
    },
  };
}

/*
|--------------------------------------------------------------------------
| SAFE FILE PAYLOAD
|--------------------------------------------------------------------------
*/

function publicFile(file) {
  if (!file?.publicId) {
    return null;
  }

  return {
    originalName:
      file.originalName,

    mimeType:
      file.mimeType,

    fileSize:
      file.fileSize,

    available:
      true,
  };
}

/*
|--------------------------------------------------------------------------
| USER PAYLOAD
|--------------------------------------------------------------------------
*/

function personPayload(user) {
  if (!user) {
    return null;
  }

  return {
    id:
      user._id?.toString?.() ||
      user.id,

    name:
      user.name,

    username:
      user.username,

    email:
      user.email,

    role:
      user.role,

    phone:
      user.lawyerProfile?.phone ||
      null,

    city:
      user.lawyerProfile?.city ||
      null,

    state:
      user.lawyerProfile?.state ||
      null,

    enrollmentNumber:
      user.lawyerProfile
        ?.enrollmentNumber ||
      null,

    stateBarCouncil:
      user.lawyerProfile
        ?.stateBarCouncil ||
      null,


      isAvailable:
  user.role === 'LAWYER'
    ? user.lawyerProfile?.isAvailable !== false
    : null,
  };
}

/*
|--------------------------------------------------------------------------
| CLAIM PAYLOAD
|--------------------------------------------------------------------------
*/

function claimPayload(claim) {
  const owner =
    claim.ownerId &&
    typeof claim.ownerId === 'object'
      ? claim.ownerId
      : null;

  const beneficiary =
    claim.beneficiaryId &&
    typeof claim.beneficiaryId ===
      'object'
      ? claim.beneficiaryId
      : null;

  const lawyer =
    claim.assignedLawyerId &&
    typeof claim.assignedLawyerId ===
      'object'
      ? claim.assignedLawyerId
      : null;

  return {
    id:
      claim._id.toString(),

    allocationId:
      claim.allocationId?._id?.toString?.() ||
      claim.allocationId?.toString?.() ||
      null,

    claimantId:
      claim.claimantId?._id?.toString?.() ||
      claim.claimantId?.toString?.() ||
      null,

    owner:
      personPayload(owner),

    ownerId:
      owner?._id?.toString() ||
      claim.ownerId?.toString(),

    beneficiary:
      personPayload(beneficiary),

    beneficiaryId:
      beneficiary?._id?.toString() ||
      claim.beneficiaryId?.toString(),

    assignedLawyer:
      personPayload(lawyer),

    assignedLawyerId:
      lawyer?._id?.toString() ||
      claim.assignedLawyerId
        ?.toString() ||
      null,

    identityProofType:
      claim.identityProofType,

    deathCertificate:
      publicFile(
        claim.deathCertificate
      ),

    identityProof:
      publicFile(
        claim.identityProof
      ),

    supportingDocument:
      publicFile(
        claim.supportingDocument
      ),

    beneficiaryRemarks:
      claim.beneficiaryRemarks,

    status:
      claim.status,

    adminReview:
      claim.adminReview,

    lawyerReview:
      claim.lawyerReview,

    releasedAt:
      claim.releasedAt,

    createdAt:
      claim.createdAt,

    updatedAt:
      claim.updatedAt,
  };
}

/*
|--------------------------------------------------------------------------
| POPULATE CLAIM
|--------------------------------------------------------------------------
*/

async function populatedClaim(query) {
  return query
    .populate(
      'allocationId',
      'assetId allocatedBy allocatedTo status releaseCondition releaseDate permissions'
    )
    .populate(
      'claimantId',
      'name username email role'
    )
    .populate(
      'ownerId',
      'name username email role'
    )

    .populate(
      'beneficiaryId',
      'name username email role createdBy'
    )

    .populate(
      'assignedLawyerId',
      'name username email role lawyerProfile'
    );
}

/*
|--------------------------------------------------------------------------
| ALLOCATED RECORD PAYLOAD
|--------------------------------------------------------------------------
*/

function assignedRecordPayload(doc) {
  return {
    id:
      doc._id.toString(),

    title:
      doc.title,

    recordType:
      doc.recordType ||
      'GENERAL',

    category:
      doc.category,

    originalName:
      doc.originalName,

    fileType:
      doc.fileType,

    fileSize:
      doc.fileSize,
  };
}

/*
|--------------------------------------------------------------------------
| ADD ASSIGNED VAULT RECORDS TO CLAIM
|--------------------------------------------------------------------------
*/

async function enrichClaimWithAssignedRecords(
  claim
) {
  const assignedDocuments =
    await Document.find({
      ownerId:
        claim.ownerId?._id ||
        claim.ownerId,

      assignedBeneficiaries:
        claim.beneficiaryId?._id ||
        claim.beneficiaryId,
    }).select(
      'title recordType category originalName fileType fileSize'
    );

  const assignedRecords =
    assignedDocuments.map(
      assignedRecordPayload
    );

  return {
    ...claimPayload(claim),

    assignedRecords,

    assignedDocuments:
      assignedRecords,

    recordSummary: {
      total:
        assignedRecords.length,

      assets:
        assignedRecords.filter(
          (record) =>
            record.recordType ===
            'ASSET'
        ).length,

      liabilities:
        assignedRecords.filter(
          (record) =>
            record.recordType ===
            'LIABILITY'
        ).length,

      general:
        assignedRecords.filter(
          (record) =>
            (record.recordType ||
              'GENERAL') ===
            'GENERAL'
        ).length,
    },
  };
}

/*
|--------------------------------------------------------------------------
| DELETE REAL ENCRYPTED UPLOAD
|--------------------------------------------------------------------------
*/

async function destroyUpload(uploaded) {
  if (!uploaded?.public_id) {
    return;
  }

  await cloudinary.uploader
    .destroy(
      uploaded.public_id,
      {
        resource_type:
          'raw',

        type:
          'authenticated',

        invalidate:
          true,
      }
    )
    .catch(() => {});
}


/*
|--------------------------------------------------------------------------
| DELETE STORED LEGACY CLAIM FILE
|--------------------------------------------------------------------------
*/

async function deleteStoredClaimFile(
  file
) {
  if (!file) {
    return;
  }

  /*
  |--------------------------------------------------------------------------
  | DELETE REAL ENCRYPTED FILE
  |--------------------------------------------------------------------------
  */

  if (file.publicId) {

    const result =
      await cloudinary.uploader.destroy(
        file.publicId,
        {
          resource_type:
            file.resourceType ||
            'raw',

          type:
            file.deliveryType ||
            'authenticated',

          invalidate:
            true,
        }
      );

    if (
      result.result !== 'ok' &&
      result.result !== 'not found'
    ) {
      throw new Error(
        `Failed to delete encrypted claim file: ${file.originalName || file.publicId}`
      );
    }
  }

  /*
  |--------------------------------------------------------------------------
  | DELETE PLACEHOLDER
  |--------------------------------------------------------------------------
  */

  if (file.placeholderPublicId) {

    const placeholderResult =
      await cloudinary.uploader.destroy(
        file.placeholderPublicId,
        {
          resource_type:
            'image',

          type:
            'upload',

          invalidate:
            true,
        }
      );

    if (
      placeholderResult.result !== 'ok' &&
      placeholderResult.result !==
        'not found'
    ) {
      throw new Error(
        `Failed to delete claim placeholder: ${file.placeholderPublicId}`
      );
    }
  }
}







/*
|--------------------------------------------------------------------------
| DELETE ALL CLAIMANT-UPLOADED CLAIM FILES
|--------------------------------------------------------------------------
*/

async function deleteAllClaimFiles(
  claim
) {
  const files = [];

  /*
  |--------------------------------------------------------------------------
  | MAIN LEGACY CLAIM DOCUMENTS
  |--------------------------------------------------------------------------
  */

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

  /*
  |--------------------------------------------------------------------------
  | ADDITIONAL DOCUMENTS SUBMITTED LATER
  |--------------------------------------------------------------------------
  */

  if (
    Array.isArray(
      claim.informationRequests
    )
  ) {

    for (
      const request
      of claim.informationRequests
    ) {

      if (
        Array.isArray(
          request.additionalDocuments
        )
      ) {

        files.push(
          ...request.additionalDocuments
        );
      }
    }
  }

  /*
  |--------------------------------------------------------------------------
  | DELETE FROM CLOUDINARY
  |--------------------------------------------------------------------------
  */

  for (const file of files) {
    await deleteStoredClaimFile(
      file
    );
  }
}
/*
|--------------------------------------------------------------------------
| DELETE PLACEHOLDER
|--------------------------------------------------------------------------
*/

async function destroyPlaceholder(
  uploaded
) {
  if (!uploaded?.public_id) {
    return;
  }

  await cloudinary.uploader
    .destroy(
      uploaded.public_id,
      {
        resource_type:
          'image',

        type:
          'upload',

        invalidate:
          true,
      }
    )
    .catch(() => {});
}

/*
|--------------------------------------------------------------------------
| CREATE LEGACY CLAIM
|--------------------------------------------------------------------------
*/

export async function createLegacyClaim(
  req,
  res
) {
  const allocationId = String(req.body?.allocationId || '').trim();

  if (!allocationId) {
    return res.status(400).json({
      message: 'Select a legacy allocation before submitting a claim.',
    });
  }

  const allocation = await LegacyAllocation.findOne({
    _id: allocationId,
    allocatedTo: req.user.id,
    status: { $in: ['ACTIVE', 'PENDING', 'RELEASED'] },
  })
    .populate('allocatedBy', 'name username email role status')
    .populate('assetId', 'title recordType ownerId');

  if (!allocation) {
    return res.status(404).json({
      message: 'Legacy allocation not found or you are not its recipient.',
    });
  }

  if (allocation.releaseCondition === 'DATE' &&
      allocation.releaseDate &&
      new Date(allocation.releaseDate) > new Date()) {
    return res.status(400).json({
      message: 'This allocation is not yet eligible for a legacy access claim.',
    });
  }

  const beneficiary = await User.findById(req.user.id)
    .select('role name username email');

  if (!beneficiary || beneficiary.role !== 'USER') {
    return res.status(403).json({
      message: 'Only a normal user can claim an incoming legacy allocation.',
    });
  }

  const owner = allocation.allocatedBy;

  if (!owner || owner.status !== 'ACTIVE') {
    return res.status(400).json({
      message: 'The allocating user account is unavailable.',
    });
  }

  const deathFile =
    req.files
      ?.deathCertificate?.[0];

  const identityFile =
    req.files
      ?.identityProof?.[0];

  const supportFile =
    req.files
      ?.supportingDocument?.[0];

  const {
    identityProofType,
    remarks = '',
  } = req.body;

  const allowedIdTypes = [
    'AADHAAR',
    'PASSPORT',
    'DRIVING_LICENCE',
    'VOTER_ID',
    'OTHER',
  ];

  if (
    !deathFile ||
    !identityFile ||
    !allowedIdTypes.includes(
      identityProofType
    )
  ) {
    return res
      .status(400)
      .json({
        message:
          'Death certificate, identity proof, and a valid identity proof type are required.',
      });
  }

  const existing =
    await LegacyClaim.findOne({
      allocationId: allocation._id,

      status: {
        $in: [
          'LEGACY_ACCESS_REQUESTED',
          'UNDER_ADMIN_REVIEW',
          'MORE_INFORMATION_REQUIRED',
          'UNDER_LAWYER_REVIEW',
          'APPROVED_INFORMATION_RELEASED',
          'ON_HOLD_DISPUTED',
        ],
      },
    }).lean();

  if (existing) {
    return res
      .status(409)
      .json({
        message:
          'A Legacy Access Claim already exists for this allocation.',
      });
  }

  const uploads = {};
  const placeholders = {};

  try {
    /*
    |--------------------------------------------------------------------------
    | ENCRYPT ORIGINAL FILES
    |--------------------------------------------------------------------------
    */

    const deathEncryption =
      encryptBuffer(
        deathFile.buffer
      );

    const identityEncryption =
      encryptBuffer(
        identityFile.buffer
      );

    const supportEncryption =
      supportFile
        ? encryptBuffer(
            supportFile.buffer
          )
        : null;

    /*
    |--------------------------------------------------------------------------
    | UPLOAD REAL ENCRYPTED FILES
    |--------------------------------------------------------------------------
    */

    uploads.death =
      await uploadEncryptedClaimBlob(
        deathEncryption.encrypted,

        'digital-legacy/legacy-claims/encrypted/death-certificates'
      );

    uploads.identity =
      await uploadEncryptedClaimBlob(
        identityEncryption.encrypted,

        'digital-legacy/legacy-claims/encrypted/identity-proofs'
      );

    if (
      supportFile &&
      supportEncryption
    ) {
      uploads.support =
        await uploadEncryptedClaimBlob(
          supportEncryption.encrypted,

          'digital-legacy/legacy-claims/encrypted/supporting-documents'
        );
    }

    /*
    |--------------------------------------------------------------------------
    | UPLOAD HARMLESS SVG PLACEHOLDERS
    |--------------------------------------------------------------------------
    */

    placeholders.death =
      await uploadLegacyClaimPlaceholder(
        'digital-legacy/legacy-claims/death-certificates',

        'SECURE DEATH CERTIFICATE'
      );

    placeholders.identity =
      await uploadLegacyClaimPlaceholder(
        'digital-legacy/legacy-claims/identity-proofs',

        'SECURE IDENTITY PROOF'
      );

    if (supportFile) {
      placeholders.support =
        await uploadLegacyClaimPlaceholder(
          'digital-legacy/legacy-claims/supporting-documents',

          'SECURE SUPPORTING DOCUMENT'
        );
    }

    /*
    |--------------------------------------------------------------------------
    | SAVE CLAIM IN MONGODB
    |--------------------------------------------------------------------------
    */

    const claim =
      await LegacyClaim.create({
        allocationId:
          allocation._id,

        claimantId:
          beneficiary._id,

        ownerId:
          owner._id,

        beneficiaryId:
          beneficiary._id,

        identityProofType,

        deathCertificate:
          fileMeta(
            deathFile,
            uploads.death,
            deathEncryption,
            placeholders.death
          ),

        identityProof:
          fileMeta(
            identityFile,
            uploads.identity,
            identityEncryption,
            placeholders.identity
          ),

        supportingDocument:
          supportFile &&
          supportEncryption
            ? fileMeta(
                supportFile,
                uploads.support,
                supportEncryption,
                placeholders.support
              )
            : null,

        beneficiaryRemarks:
          String(
            remarks
          ).trim(),

        status:
          'UNDER_ADMIN_REVIEW',
      });

    const appUrl =
      (process.env.APP_BASE_URL || process.env.FRONTEND_URL || 'http://localhost:5173')
        .replace(/\/$/, '') + '/legacy-access';

    await createNotification({
      req,
      recipientId: beneficiary._id,
      type: 'LEGACY_CLAIM',
      title: 'Legacy claim submitted',
      message:
        'Your legacy access claim has been submitted and is awaiting administrator verification.',
      relatedEntityType: 'LegacyClaim',
      relatedEntityId: claim._id,
      email: beneficiary.email,
      emailContent: claimStageTemplate({
        recipientName: beneficiary.name,
        subject: 'Legacy Claim Submitted – NextGen Vault',
        message:
          'Your legacy access claim has been submitted and is awaiting administrator verification.',
        appUrl,
      }),
    });

    const admins = await User.find({
      role: 'ADMIN',
      status: 'ACTIVE',
    }).select('name email');

    await Promise.all(
      admins.map((admin) =>
        createNotification({
          req,
          recipientId: admin._id,
          type: 'ADMIN_REVIEW',
          title: 'Legacy claim awaiting review',
          message:
            beneficiary.name + ' submitted a claim for "' +
            (allocation.assetId?.title || 'a legacy asset') + '".',
          relatedEntityType: 'LegacyClaim',
          relatedEntityId: claim._id,
          email: admin.email,
          emailContent: claimStageTemplate({
            recipientName: admin.name,
            subject: 'Legacy Claim Awaiting Admin Review – NextGen Vault',
            message:
              beneficiary.name + ' submitted a legacy claim that requires administrator review.',
            appUrl:
              (process.env.APP_BASE_URL || process.env.FRONTEND_URL || 'http://localhost:5173')
                .replace(/\/$/, '') + '/admin/legacy-claims',
          }),
        })
      )
    );

    await writeAudit(req, {
      action: 'LEGACY_CLAIM_SUBMITTED',
      entityType: 'LegacyClaim',
      entityId: claim._id,
      description: 'Legacy access claim submitted for administrator review.',
      metadata: {
        allocationId: allocation._id.toString(),
        assetId: allocation.assetId?._id?.toString?.() || allocation.assetId?.toString?.(),
      },
    });

    const populated =
      await populatedClaim(
        LegacyClaim.findById(
          claim._id
        )
      );

    return res
      .status(201)
      .json({
        message:
          'Legacy Access Claim submitted securely for administrator review.',

        claim:
          await enrichClaimWithAssignedRecords(
            populated
          ),
      });
  } catch (error) {
    /*
    |--------------------------------------------------------------------------
    | CLEAN REAL ENCRYPTED FILES
    |--------------------------------------------------------------------------
    */

    await Promise.all(
      Object.values(
        uploads
      ).map(
        destroyUpload
      )
    );

    /*
    |--------------------------------------------------------------------------
    | CLEAN PLACEHOLDERS
    |--------------------------------------------------------------------------
    */

    await Promise.all(
      Object.values(
        placeholders
      ).map(
        destroyPlaceholder
      )
    );

    console.error(
      'Legacy claim creation error:',
      error
    );

    return res
      .status(500)
      .json({
        message:
          'Failed to submit Legacy Access Claim.',

        error:
          error.message,
      });
  }
}

/*
|--------------------------------------------------------------------------
| CLAIMANT CLAIM LIST
|--------------------------------------------------------------------------
*/

export async function listMyLegacyClaims(
  req,
  res
) {
  const claims =
    await populatedClaim(
      LegacyClaim.find({
        beneficiaryId:
          req.user.id,
      }).sort({
        createdAt: -1,
      })
    );

  return res
    .status(200)
    .json({
      claims:
        claims.map(
          claimPayload
        ),
    });
}

/*
|--------------------------------------------------------------------------
| ADMIN CLAIM LIST
|--------------------------------------------------------------------------
*/

export async function listAdminLegacyClaims(
  req,
  res
) {
  const claims =
    await populatedClaim(
      LegacyClaim.find({})
        .sort({
          createdAt: -1,
        })
    );

  const enriched =
    await Promise.all(
      claims.map(
        enrichClaimWithAssignedRecords
      )
    );

  return res
    .status(200)
    .json({
      claims:
        enriched,
    });
}

/*
|--------------------------------------------------------------------------
| APPROVED LAWYERS
|--------------------------------------------------------------------------
*/

export async function listApprovedLawyers(
  req,
  res
) {
  try {
    const lawyers =
      await User.find({
        role: 'LAWYER',
        status: 'ACTIVE',
      })
        .sort({
          'lawyerProfile.isAvailable': -1,
          name: 1,
        })
        .select(
          'name username email role lawyerProfile'
        );

    return res
      .status(200)
      .json({
        lawyers:
          lawyers.map(
            personPayload
          ),
      });

  } catch (error) {
    console.error(
      'List Lawyers error:',
      error
    );

    return res
      .status(500)
      .json({
        message:
          'Unable to load Lawyers.',
      });
  }
}

/*
|--------------------------------------------------------------------------
| ADMIN REVIEW
|--------------------------------------------------------------------------
*/

export async function adminReviewClaim(
  req,
  res
) {
  try {
    const { id } = req.params;
    const { action, remarks = '' } = req.body || {};

    const claim = await LegacyClaim.findById(id);

    if (!claim) {
      return res.status(404).json({
        message: 'Legacy Access Claim not found.',
      });
    }

    if (claim.status !== 'UNDER_ADMIN_REVIEW') {
      return res.status(400).json({
        message: `Claim cannot be reviewed from status ${claim.status}.`,
      });
    }

    const claimant = await User.findById(claim.claimantId || claim.beneficiaryId)
      .select('name email role status');

    const allocation = claim.allocationId
      ? await LegacyAllocation.findOne({
          _id: claim.allocationId,
          allocatedBy: claim.ownerId,
          allocatedTo: claim.claimantId || claim.beneficiaryId,
          status: { $ne: 'REVOKED' },
        })
          .populate('assetId', 'title')
          .lean()
      : null;

    if (!claimant || claimant.role !== 'USER' || !allocation) {
      return res.status(400).json({
        message:
          'Claim relationship validation failed. The allocation or claimant is no longer valid.',
      });
    }

    if (action === 'REQUEST_CORRECTION') {
      claim.status = 'MORE_INFORMATION_REQUIRED';
      claim.adminReview = {
        reviewedBy: req.user.id,
        reviewedAt: new Date(),
        remarks: String(remarks).trim(),
      };
      await claim.save();

      await writeAudit(req, {
        action: 'ADMIN_REVIEW_REQUESTED_MORE_INFORMATION',
        entityType: 'LegacyClaim',
        entityId: claim._id,
        description: 'Administrator requested more information for a legacy claim.',
      });

      const populated = await populatedClaim(LegacyClaim.findById(claim._id));
      return res.status(200).json({
        message: 'Additional verification information requested.',
        claim: await enrichClaimWithAssignedRecords(populated),
      });
    }

    if (action !== 'FORWARD') {
      return res.status(400).json({
        message:
          'Invalid admin review action. Use FORWARD, REQUEST_CORRECTION, or the dedicated reject endpoint.',
      });
    }

    if (!claim.deathCertificate?.publicId || !claim.identityProof?.publicId) {
      return res.status(400).json({
        message:
          'Platform checks failed: death certificate and identity proof are required.',
      });
    }

    const lawyer = await User.findOne({
      role: 'LAWYER',
      status: 'ACTIVE',
      'lawyerProfile.isAvailable': { $ne: false },
    })
      .sort({ updatedAt: 1, createdAt: 1 })
      .select('name email');

    claim.adminReview = {
      reviewedBy: req.user.id,
      reviewedAt: new Date(),
      remarks: String(remarks).trim(),
    };

    if (lawyer) {
      claim.assignedLawyerId = lawyer._id;
      claim.status = 'UNDER_LAWYER_REVIEW';
    } else {
      claim.status = 'LEGACY_ACCESS_REQUESTED';
    }

    await claim.save();

    const appBase =
      (process.env.APP_BASE_URL || process.env.FRONTEND_URL || 'http://localhost:5173')
        .replace(/\/$/, '');

    const claimantMessage = lawyer
      ? 'Your legacy access claim has passed administrator verification and is now awaiting lawyer review.'
      : 'Your legacy access claim has passed administrator verification and is awaiting lawyer assignment.';

    await createNotification({
      req,
      recipientId: claimant._id,
      type: 'ADMIN_REVIEW',
      title: 'Administrator verification completed',
      message: claimantMessage,
      relatedEntityType: 'LegacyClaim',
      relatedEntityId: claim._id,
      email: claimant.email,
      emailContent: claimStageTemplate({
        recipientName: claimant.name,
        subject: 'Legacy Claim Passed Admin Review – NextGen Vault',
        message: claimantMessage,
        appUrl: appBase + '/legacy-access',
      }),
    });

    if (lawyer) {
      await createNotification({
        req,
        recipientId: lawyer._id,
        type: 'LAWYER_REVIEW',
        title: 'Legacy claim assigned for review',
        message:
          'A legacy claim for "' +
          (allocation.assetId?.title || 'a protected legacy asset') +
          '" has been assigned to you for legal review.',
        relatedEntityType: 'LegacyClaim',
        relatedEntityId: claim._id,
        email: lawyer.email,
        emailContent: claimStageTemplate({
          recipientName: lawyer.name,
          subject: 'Legacy Claim Assigned for Lawyer Review – NextGen Vault',
          message:
            'A legacy access claim has passed administrator verification and has been assigned to you for legal review.',
          appUrl: appBase + '/lawyer',
        }),
      });
    }

    await writeAudit(req, {
      action: 'ADMIN_LEGACY_CLAIM_APPROVED',
      entityType: 'LegacyClaim',
      entityId: claim._id,
      description: lawyer
        ? 'Administrator approved claim and assigned an available lawyer.'
        : 'Administrator approved claim; no available lawyer was found.',
      metadata: {
        allocationId: String(claim.allocationId),
        lawyerId: lawyer?._id?.toString() || null,
      },
    });

    const populated = await populatedClaim(LegacyClaim.findById(claim._id));

    return res.status(200).json({
      message: lawyer
        ? 'Legacy Claim approved by Admin and assigned for Lawyer review.'
        : 'Legacy Claim approved by Admin. No Lawyer is currently available.',
      claim: await enrichClaimWithAssignedRecords(populated),
    });
  } catch (error) {
    console.error('Admin legacy claim review error:', error);
    return res.status(500).json({
      message: 'Unable to complete administrator review.',
    });
  }
}

/*
|--------------------------------------------------------------------------
| ASSIGN LAWYER
|--------------------------------------------------------------------------
*/

export async function selectClaimLawyer(
  req,
  res
) {
  try {
    const {
      lawyerId,
    } = req.body || {};

    if (!lawyerId) {
      return res
        .status(400)
        .json({
          message:
            'Please select a Lawyer.',
        });
    }

    const claim =
      await LegacyClaim.findOne({
        _id: req.params.id,

        beneficiaryId:
          req.user.id,
      });

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
    | ADMIN MUST FIRST APPROVE THE CLAIM
    |--------------------------------------------------------------------------
    */

    if (
      claim.status !==
      'LEGACY_ACCESS_REQUESTED'
    ) {
      return res
        .status(400)
        .json({
          message:
            'A Lawyer can be selected only after Admin approval.',
        });
    }

    /*
    |--------------------------------------------------------------------------
    | PREVENT REASSIGNMENT
    |--------------------------------------------------------------------------
    */

    if (
      claim.assignedLawyerId
    ) {
      return res
        .status(409)
        .json({
          message:
            'A Lawyer has already been selected for this Legacy Claim.',
        });
    }

    /*
    |--------------------------------------------------------------------------
    | FIND ACTIVE LAWYER
    |--------------------------------------------------------------------------
    */

    const lawyer =
      await User.findOne({
        _id:
          lawyerId,

        role:
          'LAWYER',

        status:
          'ACTIVE',
      });

    if (!lawyer) {
      return res
        .status(400)
        .json({
          message:
            'The selected Lawyer could not be found.',
        });
    }

    /*
    |--------------------------------------------------------------------------
    | LAWYER MUST BE AVAILABLE
    |--------------------------------------------------------------------------
    */

    if (
      lawyer.lawyerProfile
        ?.isAvailable === false
    ) {
      return res
        .status(409)
        .json({
          message:
            'This Lawyer is currently unavailable. Please select another available Lawyer.',
        });
    }

    /*
    |--------------------------------------------------------------------------
    | ASSIGN LAWYER
    |--------------------------------------------------------------------------
    */

    claim.assignedLawyerId =
      lawyer._id;

    claim.status =
      'UNDER_LAWYER_REVIEW';

    await claim.save();

    const claimant =
      await User.findById(req.user.id)
        .select('name email');

    const appBase =
      (process.env.APP_BASE_URL || process.env.FRONTEND_URL || 'http://localhost:5173')
        .replace(/\/$/, '');

    await createNotification({
      req,
      recipientId: lawyer._id,
      type: 'LAWYER_REVIEW',
      title: 'Legacy claim assigned for review',
      message:
        'A legacy access claim has been assigned to you for legal review.',
      relatedEntityType: 'LegacyClaim',
      relatedEntityId: claim._id,
      email: lawyer.email,
      emailContent: claimStageTemplate({
        recipientName: lawyer.name,
        subject: 'Legacy Claim Assigned for Lawyer Review – NextGen Vault',
        message:
          'A legacy access claim has been assigned to you for legal review.',
        appUrl: appBase + '/lawyer',
      }),
    });

    if (claimant) {
      await createNotification({
        req,
        recipientId: claimant._id,
        type: 'LAWYER_REVIEW',
        title: 'Lawyer review started',
        message:
          'Your legacy access claim is now under lawyer review.',
        relatedEntityType: 'LegacyClaim',
        relatedEntityId: claim._id,
        email: claimant.email,
        emailContent: claimStageTemplate({
          recipientName: claimant.name,
          subject: 'Legacy Claim Under Lawyer Review – NextGen Vault',
          message:
            'Your legacy access claim is now under lawyer review.',
          appUrl: appBase + '/legacy-access',
        }),
      });
    }

    await writeAudit(req, {
      action: 'LAWYER_ASSIGNED_TO_LEGACY_CLAIM',
      entityType: 'LegacyClaim',
      entityId: claim._id,
      description: 'Claimant selected an available lawyer for a legacy claim.',
      metadata: {
        lawyerId: lawyer._id.toString(),
      },
    });

    const populated =
      await populatedClaim(
        LegacyClaim.findById(
          claim._id
        )
      );

    return res
      .status(200)
      .json({
        message:
          `${lawyer.name} has been selected. Your Legacy Claim is now under Lawyer review.`,

        claim:
          await enrichClaimWithAssignedRecords(
            populated
          ),
      });

  } catch (error) {
    console.error(
      'Select Legacy Claim Lawyer error:',
      error
    );

    return res
      .status(500)
      .json({
        message:
          'Unable to select Lawyer.',
      });
  }
}

/*
|--------------------------------------------------------------------------
| LAWYER CLAIM LIST
|--------------------------------------------------------------------------
*/

export async function listLawyerClaims(
  req,
  res
) {
  const claims =
    await populatedClaim(
      LegacyClaim.find({
        assignedLawyerId:
          req.user.id,
      }).sort({
        updatedAt: -1,
      })
    );

  const enriched =
    await Promise.all(
      claims.map(
        enrichClaimWithAssignedRecords
      )
    );

  return res
    .status(200)
    .json({
      claims:
        enriched,
    });
}

/*
|--------------------------------------------------------------------------
| LAWYER REVIEW
|--------------------------------------------------------------------------
*/

export async function lawyerReviewClaim(
  req,
  res
) {
  try {
    const { action, remarks = '' } = req.body || {};

    const claim = await LegacyClaim.findOne({
      _id: req.params.id,
      assignedLawyerId: req.user.id,
    });

    if (!claim) {
      return res.status(404).json({
        message: 'Assigned Legacy Access Claim not found.',
      });
    }

    if (!['UNDER_LAWYER_REVIEW', 'MORE_INFORMATION_REQUIRED'].includes(claim.status)) {
      return res.status(400).json({
        message: `Claim cannot be reviewed from status ${claim.status}.`,
      });
    }

    const claimant = await User.findById(claim.claimantId || claim.beneficiaryId)
      .select('name email');

    if (!claimant) {
      return res.status(404).json({
        message: 'Claimant account could not be found.',
      });
    }

    const appUrl =
      (process.env.APP_BASE_URL || process.env.FRONTEND_URL || 'http://localhost:5173')
        .replace(/\/$/, '') + '/legacy-access';

    if (action === 'REQUEST_MORE_INFORMATION') {
      claim.status = 'MORE_INFORMATION_REQUIRED';
      claim.lawyerReview = {
        reviewedBy: req.user.id,
        reviewedAt: new Date(),
        remarks: String(remarks).trim(),
        action,
      };
      await claim.save();

      await createNotification({
        req,
        recipientId: claimant._id,
        type: 'LAWYER_REVIEW',
        title: 'Additional information requested',
        message:
          'The assigned lawyer requested additional information for your legacy access claim.',
        relatedEntityType: 'LegacyClaim',
        relatedEntityId: claim._id,
        email: claimant.email,
        emailContent: claimStageTemplate({
          recipientName: claimant.name,
          subject: 'More Information Required – NextGen Vault',
          message:
            'The assigned lawyer requested additional information for your legacy access claim.',
          appUrl,
        }),
      });

      await writeAudit(req, {
        action: 'LAWYER_REQUESTED_MORE_INFORMATION',
        entityType: 'LegacyClaim',
        entityId: claim._id,
        description: 'Assigned lawyer requested additional claim information.',
      });
    } else if (action === 'APPROVE') {
      const allocation = await LegacyAllocation.findOne({
        _id: claim.allocationId,
        allocatedTo: claimant._id,
        status: { $ne: 'REVOKED' },
      });

      if (!allocation) {
        return res.status(400).json({
          message: 'The linked legacy allocation is no longer valid.',
        });
      }

      claim.status = 'APPROVED_INFORMATION_RELEASED';
      claim.releasedAt = new Date();
      claim.lawyerReview = {
        reviewedBy: req.user.id,
        reviewedAt: new Date(),
        remarks: String(remarks).trim(),
        action,
      };

      allocation.status = 'RELEASED';

      await Promise.all([
        claim.save(),
        allocation.save(),
      ]);

      await createNotification({
        req,
        recipientId: claimant._id,
        type: 'LEGACY_UNLOCKED',
        title: 'Legacy access approved',
        message:
          'Your legacy access claim has been approved. The protected document is now available in Legacy Access.',
        relatedEntityType: 'LegacyClaim',
        relatedEntityId: claim._id,
        email: claimant.email,
        emailContent: claimStageTemplate({
          recipientName: claimant.name,
          subject: 'Your Legacy Access Has Been Approved – NextGen Vault',
          message:
            'Your legacy access claim has been approved. The protected document is now available in Legacy Access.',
          appUrl,
        }),
      });

      await writeAudit(req, {
        action: 'LEGACY_ASSET_UNLOCKED',
        entityType: 'LegacyClaim',
        entityId: claim._id,
        description: 'Lawyer approved claim and the linked legacy allocation was unlocked.',
        metadata: {
          allocationId: allocation._id.toString(),
          claimantId: claimant._id.toString(),
        },
      });
    } else {
      return res.status(400).json({
        message:
          'Invalid Lawyer review action. Use APPROVE, REQUEST_MORE_INFORMATION, or the dedicated reject endpoint.',
      });
    }

    const populated = await populatedClaim(LegacyClaim.findById(claim._id));

    return res.status(200).json({
      message:
        action === 'APPROVE'
          ? 'Legacy access approved and document unlocked.'
          : 'Lawyer review updated.',
      claim: await enrichClaimWithAssignedRecords(populated),
    });
  } catch (error) {
    console.error('Lawyer legacy claim review error:', error);
    return res.status(500).json({
      message: 'Unable to complete Lawyer review.',
    });
  }
}

/*
|--------------------------------------------------------------------------
| SECURE CLAIM FILE VIEWING
|--------------------------------------------------------------------------
|
| Admin, Beneficiary or assigned Lawyer requests the file.
|
| Cloudinary stores only ciphertext.
|
| Backend:
|   1. verifies authorization
|   2. downloads .vault file
|   3. decrypts it
|   4. streams original PDF/image
|
|--------------------------------------------------------------------------
*/

export async function getClaimFileUrl(
  req,
  res
) {
  try {
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

    const isBeneficiary =
      req.user.role ===
        'USER' &&
      claim.beneficiaryId
        .toString() ===
        req.user.id;

    const isAdmin =
      req.user.role ===
      'ADMIN';

    const isAssignedLawyer =
      req.user.role ===
        'LAWYER' &&
      claim.assignedLawyerId
        ?.toString() ===
        req.user.id;

    if (
      !isBeneficiary &&
      !isAdmin &&
      !isAssignedLawyer
    ) {
      return res
        .status(403)
        .json({
          message:
            'You are not authorized to view this claim document.',
        });
    }

    const fileMap = {
      'death-certificate':
        claim.deathCertificate,

      'identity-proof':
        claim.identityProof,

      'supporting-document':
        claim.supportingDocument,
    };

    const file =
      fileMap[
        req.params.kind
      ];

    if (!file?.publicId) {
      return res
        .status(404)
        .json({
          message:
            'Claim document not found.',
        });
    }

    if (
      file.resourceType !==
        'raw' ||
      file.deliveryType !==
        'authenticated' ||
      file.encryption
        ?.algorithm !==
        'aes-256-gcm' ||
      !file.encryption?.iv ||
      !file.encryption?.authTag
    ) {
      return res
        .status(409)
        .json({
          message:
            'This Legacy Claim document was uploaded before secure encryption was enabled.',
        });
    }

    /*
    |--------------------------------------------------------------------------
    | DOWNLOAD CIPHERTEXT
    |--------------------------------------------------------------------------
    */

    const encryptedBlob =
      await downloadEncryptedClaimBlob(
        file
      );

    /*
    |--------------------------------------------------------------------------
    | DECRYPT
    |--------------------------------------------------------------------------
    */

    const originalFile =
      decryptBuffer(
        encryptedBlob,
        file.encryption
      );

    /*
    |--------------------------------------------------------------------------
    | SEND ORIGINAL DOCUMENT
    |--------------------------------------------------------------------------
    */

    res.setHeader(
      'Content-Type',
      file.mimeType ||
        'application/octet-stream'
    );

    res.setHeader(
      'Content-Length',
      originalFile.length
    );

    res.setHeader(
      'Content-Disposition',
      `inline; filename*=UTF-8''${encodeURIComponent(
        file.originalName
      )}`
    );

    res.setHeader(
      'Cache-Control',
      'private, no-store, max-age=0'
    );

    res.setHeader(
      'Pragma',
      'no-cache'
    );

    res.setHeader(
      'X-Content-Type-Options',
      'nosniff'
    );

    return res
      .status(200)
      .send(originalFile);
  } catch (error) {
    console.error(
      'Legacy Claim document access error:',
      error
    );

    return res
      .status(500)
      .json({
        message:
          'Failed to access Legacy Claim document.',

        error:
          error.message,
      });
  }
}


export async function getLawyerAvailability(
  req,
  res
) {
  try {
    const lawyer =
      await User.findOne({
        _id:
          req.user.id,

        role:
          'LAWYER',

        status:
          'ACTIVE',
      }).select(
        'lawyerProfile.isAvailable'
      );

    if (!lawyer) {
      return res
        .status(404)
        .json({
          message:
            'Lawyer account not found.',
        });
    }

    return res
      .status(200)
      .json({
        isAvailable:
          lawyer.lawyerProfile
            ?.isAvailable !== false,
      });

  } catch (error) {
    console.error(
      'Get Lawyer availability error:',
      error
    );

    return res
      .status(500)
      .json({
        message:
          'Unable to load availability.',
      });
  }
}


export async function updateLawyerAvailability(
  req,
  res
) {
  try {
    const {
      isAvailable,
    } = req.body || {};

    if (
      typeof isAvailable !==
      'boolean'
    ) {
      return res
        .status(400)
        .json({
          message:
            'isAvailable must be true or false.',
        });
    }

    const lawyer =
      await User.findOneAndUpdate(
        {
          _id:
            req.user.id,

          role:
            'LAWYER',

          status:
            'ACTIVE',
        },

        {
          $set: {
            'lawyerProfile.isAvailable':
              isAvailable,
          },
        },

        {
          new: true,
        }
      ).select(
        'lawyerProfile.isAvailable'
      );

    if (!lawyer) {
      return res
        .status(404)
        .json({
          message:
            'Active Lawyer account not found.',
        });
    }

    return res
      .status(200)
      .json({
        message:
          isAvailable
            ? 'You are now available for new Legacy Claims.'
            : 'You are now unavailable for new Legacy Claims.',

        isAvailable:
          lawyer.lawyerProfile
            ?.isAvailable !== false,
      });

  } catch (error) {
    console.error(
      'Update Lawyer availability error:',
      error
    );

    return res
      .status(500)
      .json({
        message:
          'Unable to update availability.',
      });
  }
}