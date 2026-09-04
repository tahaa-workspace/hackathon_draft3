import cloudinary from '../config/cloudinary.js';
import streamifier from 'streamifier';
import LegacyClaim from '../models/LegacyClaim.js';
import User from '../models/User.js';
import Document from '../models/Document.js';

function uploadAuthenticated(file, folder) {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: 'auto',
        type: 'authenticated',
        use_filename: false,
        unique_filename: true,
      },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );
    streamifier.createReadStream(file.buffer).pipe(uploadStream);
  });
}

function fileMeta(file, uploaded) {
  return {
    publicId: uploaded.public_id,
    resourceType: uploaded.resource_type,
    originalName: file.originalname,
    mimeType: file.mimetype,
    fileSize: file.size,
  };
}

function publicFile(file) {
  if (!file?.publicId) return null;
  return {
    originalName: file.originalName,
    mimeType: file.mimeType,
    fileSize: file.fileSize,
    available: true,
  };
}

function personPayload(user) {
  if (!user) return null;
  return {
    id: user._id?.toString?.() || user.id,
    name: user.name,
    username: user.username,
    email: user.email,
    role: user.role,
    phone: user.lawyerProfile?.phone || null,
    city: user.lawyerProfile?.city || null,
    state: user.lawyerProfile?.state || null,
    enrollmentNumber: user.lawyerProfile?.enrollmentNumber || null,
    stateBarCouncil: user.lawyerProfile?.stateBarCouncil || null,
  };
}

function claimPayload(claim) {
  const owner = claim.ownerId && typeof claim.ownerId === 'object' ? claim.ownerId : null;
  const beneficiary = claim.beneficiaryId && typeof claim.beneficiaryId === 'object' ? claim.beneficiaryId : null;
  const lawyer = claim.assignedLawyerId && typeof claim.assignedLawyerId === 'object' ? claim.assignedLawyerId : null;

  return {
    id: claim._id.toString(),
    owner: personPayload(owner),
    ownerId: owner?._id?.toString() || claim.ownerId?.toString(),
    beneficiary: personPayload(beneficiary),
    beneficiaryId: beneficiary?._id?.toString() || claim.beneficiaryId?.toString(),
    assignedLawyer: personPayload(lawyer),
    assignedLawyerId: lawyer?._id?.toString() || claim.assignedLawyerId?.toString() || null,
    identityProofType: claim.identityProofType,
    deathCertificate: publicFile(claim.deathCertificate),
    identityProof: publicFile(claim.identityProof),
    supportingDocument: publicFile(claim.supportingDocument),
    beneficiaryRemarks: claim.beneficiaryRemarks,
    status: claim.status,
    adminReview: claim.adminReview,
    lawyerReview: claim.lawyerReview,
    releasedAt: claim.releasedAt,
    createdAt: claim.createdAt,
    updatedAt: claim.updatedAt,
  };
}

async function populatedClaim(query) {
  return query
    .populate('ownerId', 'name username email role')
    .populate('beneficiaryId', 'name username email role createdBy')
    .populate('assignedLawyerId', 'name username email role lawyerProfile');
}

async function destroyUpload(uploaded) {
  if (!uploaded?.public_id) return;
  await cloudinary.uploader.destroy(uploaded.public_id, {
    resource_type: uploaded.resource_type || 'image',
    type: 'authenticated',
    invalidate: true,
  }).catch(() => {});
}

export async function createLegacyClaim(req, res) {
  const beneficiary = await User.findById(req.user.id).select('role createdBy name username email');
  if (!beneficiary || beneficiary.role !== 'BENEFICIARY' || !beneficiary.createdBy) {
    return res.status(400).json({ message: 'This beneficiary account is not linked to an owner.' });
  }

  const owner = await User.findById(beneficiary.createdBy).select('name username email role status');
  if (!owner || owner.role !== 'OWNER') {
    return res.status(400).json({ message: 'Linked owner account could not be found.' });
  }

  const deathFile = req.files?.deathCertificate?.[0];
  const identityFile = req.files?.identityProof?.[0];
  const supportFile = req.files?.supportingDocument?.[0];
  const { identityProofType, remarks = '' } = req.body;

  const allowedIdTypes = ['AADHAAR', 'PASSPORT', 'DRIVING_LICENCE', 'VOTER_ID', 'OTHER'];
  if (!deathFile || !identityFile || !allowedIdTypes.includes(identityProofType)) {
    return res.status(400).json({
      message: 'Death certificate, identity proof, and a valid identity proof type are required.',
    });
  }

  const assignedCount = await Document.countDocuments({
    ownerId: owner._id,
    assignedBeneficiaries: beneficiary._id,
  });
  if (assignedCount === 0) {
    return res.status(400).json({
      message: 'No Owner-assigned documents exist for this beneficiary, so a Legacy Access Claim cannot be created yet.',
    });
  }

  const existing = await LegacyClaim.findOne({
    ownerId: owner._id,
    beneficiaryId: beneficiary._id,
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
    return res.status(409).json({
      message: 'A Legacy Access Claim already exists for this Owner-Beneficiary relationship.',
    });
  }

  const uploads = {};
  try {
    uploads.death = await uploadAuthenticated(deathFile, 'digital-legacy/legacy-claims/death-certificates');
    uploads.identity = await uploadAuthenticated(identityFile, 'digital-legacy/legacy-claims/identity-proofs');
    if (supportFile) {
      uploads.support = await uploadAuthenticated(supportFile, 'digital-legacy/legacy-claims/supporting-documents');
    }

    const claim = await LegacyClaim.create({
      ownerId: owner._id,
      beneficiaryId: beneficiary._id,
      identityProofType,
      deathCertificate: fileMeta(deathFile, uploads.death),
      identityProof: fileMeta(identityFile, uploads.identity),
      supportingDocument: supportFile ? fileMeta(supportFile, uploads.support) : null,
      beneficiaryRemarks: String(remarks).trim(),
      status: 'UNDER_ADMIN_REVIEW',
    });

    const populated = await populatedClaim(LegacyClaim.findById(claim._id));
    return res.status(201).json({
      message: 'Legacy Access Claim submitted for administrator review.',
      claim: claimPayload(populated),
    });
  } catch (error) {
    await Promise.all(Object.values(uploads).map(destroyUpload));
    console.error('Legacy claim creation error:', error);
    return res.status(500).json({ message: 'Failed to submit Legacy Access Claim.' });
  }
}

export async function listMyLegacyClaims(req, res) {
  const claims = await populatedClaim(
    LegacyClaim.find({ beneficiaryId: req.user.id }).sort({ createdAt: -1 })
  );
  return res.status(200).json({ claims: claims.map(claimPayload) });
}

export async function listAdminLegacyClaims(req, res) {
  const claims = await populatedClaim(LegacyClaim.find({}).sort({ createdAt: -1 }));
  return res.status(200).json({ claims: claims.map(claimPayload) });
}

export async function listApprovedLawyers(req, res) {
  const lawyers = await User.find({ role: 'LAWYER', status: 'ACTIVE' })
    .sort({ name: 1 })
    .select('name username email role lawyerProfile');
  return res.status(200).json({ lawyers: lawyers.map(personPayload) });
}

export async function adminReviewClaim(req, res) {
  const { id } = req.params;
  const { action, remarks = '' } = req.body || {};
  const claim = await LegacyClaim.findById(id);
  if (!claim) return res.status(404).json({ message: 'Legacy Access Claim not found.' });

  if (!['UNDER_ADMIN_REVIEW', 'LEGACY_ACCESS_REQUESTED'].includes(claim.status)) {
    return res.status(400).json({ message: `Claim cannot be reviewed from status ${claim.status}.` });
  }

  const beneficiary = await User.findById(claim.beneficiaryId).select('role createdBy');
  const assignedCount = await Document.countDocuments({
    ownerId: claim.ownerId,
    assignedBeneficiaries: claim.beneficiaryId,
  });
  const validLink = beneficiary?.role === 'BENEFICIARY' && beneficiary.createdBy?.toString() === claim.ownerId.toString();

  if (action === 'FORWARD') {
    if (!validLink || assignedCount === 0 || !claim.deathCertificate?.publicId || !claim.identityProof?.publicId) {
      return res.status(400).json({
        message: 'Platform checks failed: verify Owner-Beneficiary link, assigned documents, death certificate, and identity proof.',
      });
    }
    claim.status = 'LEGACY_ACCESS_REQUESTED';
  } else if (action === 'REQUEST_CORRECTION') {
    claim.status = 'MORE_INFORMATION_REQUIRED';
  } else if (action === 'REJECT') {
    claim.status = 'REJECTED_PLATFORM_CLAIM';
  } else if (action === 'HOLD') {
    claim.status = 'ON_HOLD_DISPUTED';
  } else {
    return res.status(400).json({ message: 'Invalid admin review action.' });
  }

  claim.adminReview = {
    reviewedBy: req.user.id,
    reviewedAt: new Date(),
    remarks: String(remarks).trim(),
  };
  await claim.save();

  const populated = await populatedClaim(LegacyClaim.findById(claim._id));
  return res.status(200).json({ message: 'Admin review updated.', claim: claimPayload(populated) });
}

export async function assignClaimLawyer(req, res) {
  const { lawyerId } = req.body || {};
  const claim = await LegacyClaim.findById(req.params.id);
  if (!claim) return res.status(404).json({ message: 'Legacy Access Claim not found.' });
  if (claim.status !== 'LEGACY_ACCESS_REQUESTED') {
    return res.status(400).json({ message: 'Admin must complete platform checks before assigning a Lawyer.' });
  }

  const lawyer = await User.findOne({ _id: lawyerId, role: 'LAWYER', status: 'ACTIVE' });
  if (!lawyer) return res.status(400).json({ message: 'Select an approved active Lawyer.' });

  claim.assignedLawyerId = lawyer._id;
  claim.status = 'UNDER_LAWYER_REVIEW';
  await claim.save();

  const populated = await populatedClaim(LegacyClaim.findById(claim._id));
  return res.status(200).json({ message: 'Claim assigned to Lawyer.', claim: claimPayload(populated) });
}

export async function listLawyerClaims(req, res) {
  const claims = await populatedClaim(
    LegacyClaim.find({ assignedLawyerId: req.user.id }).sort({ updatedAt: -1 })
  );

  const enriched = await Promise.all(
    claims.map(async (claim) => {
      const assignedDocuments = await Document.find({
        ownerId: claim.ownerId?._id || claim.ownerId,
        assignedBeneficiaries: claim.beneficiaryId?._id || claim.beneficiaryId,
      }).select('title category originalName fileType fileSize');

      return {
        ...claimPayload(claim),
        assignedDocuments: assignedDocuments.map((doc) => ({
          id: doc._id.toString(),
          title: doc.title,
          category: doc.category,
          originalName: doc.originalName,
          fileType: doc.fileType,
          fileSize: doc.fileSize,
        })),
      };
    })
  );

  return res.status(200).json({ claims: enriched });
}

export async function lawyerReviewClaim(req, res) {
  const { action, remarks = '' } = req.body || {};
  const claim = await LegacyClaim.findOne({ _id: req.params.id, assignedLawyerId: req.user.id });
  if (!claim) return res.status(404).json({ message: 'Assigned Legacy Access Claim not found.' });

  if (!['UNDER_LAWYER_REVIEW', 'MORE_INFORMATION_REQUIRED'].includes(claim.status)) {
    return res.status(400).json({ message: `Claim cannot be reviewed from status ${claim.status}.` });
  }

  if (action === 'REQUEST_MORE_INFORMATION') {
    claim.status = 'MORE_INFORMATION_REQUIRED';
  } else if (action === 'APPROVE') {
    claim.status = 'APPROVED_INFORMATION_RELEASED';
    claim.releasedAt = new Date();
  } else if (action === 'HOLD') {
    claim.status = 'ON_HOLD_DISPUTED';
  } else {
    return res.status(400).json({ message: 'Invalid Lawyer review action.' });
  }

  claim.lawyerReview = {
    reviewedBy: req.user.id,
    reviewedAt: new Date(),
    remarks: String(remarks).trim(),
    action,
  };
  await claim.save();

  const populated = await populatedClaim(LegacyClaim.findById(claim._id));
  return res.status(200).json({ message: 'Lawyer review updated.', claim: claimPayload(populated) });
}

export async function getClaimFileUrl(req, res) {
  const claim = await LegacyClaim.findById(req.params.id);
  if (!claim) return res.status(404).json({ message: 'Legacy Access Claim not found.' });

  const isBeneficiary = req.user.role === 'BENEFICIARY' && claim.beneficiaryId.toString() === req.user.id;
  const isAdmin = req.user.role === 'ADMIN';
  const isAssignedLawyer = req.user.role === 'LAWYER' && claim.assignedLawyerId?.toString() === req.user.id;
  if (!isBeneficiary && !isAdmin && !isAssignedLawyer) {
    return res.status(403).json({ message: 'You are not authorized to view this claim document.' });
  }

  const fileMap = {
    'death-certificate': claim.deathCertificate,
    'identity-proof': claim.identityProof,
    'supporting-document': claim.supportingDocument,
  };
  const file = fileMap[req.params.kind];
  if (!file?.publicId) return res.status(404).json({ message: 'Claim document not found.' });

  const expiresAt = Math.floor(Date.now() / 1000) + 5 * 60;
  const url = cloudinary.url(file.publicId, {
    resource_type: file.resourceType || 'image',
    type: 'authenticated',
    sign_url: true,
    secure: true,
    expires_at: expiresAt,
  });

  return res.status(200).json({
    url,
    expiresAt,
    document: publicFile(file),
  });
}
