import cloudinary from '../config/cloudinary.js';
import User from '../models/User.js';
import Document from '../models/Document.js';
import LegacyAllocation from '../models/LegacyAllocation.js';
import { sendTransactionalEmail } from '../services/mailService.js';
import { claimStageTemplate } from '../services/emailTemplates.js';
import { writeAudit } from '../services/auditService.js';
import { createNotification } from '../services/notificationService.js';

import {
  decryptAadhaarBuffer,
  downloadEncryptedAadhaar,
} from '../services/aadhaarEncryptionService.js';


function documentSummary(document) {
  return document?.publicId
    ? {
        originalName: document.originalName,
        mimeType: document.mimeType,
        fileSize: document.fileSize,
        available: true,
      }
    : {
        available: false,
      };
}


function registrationPayload(user) {
  return {
    id: user._id.toString(),
    name: user.name,
    username: user.username,
    email: user.email,
    role: user.role,
    status: user.status,
    createdAt: user.createdAt,

    aadhaarDocument:
      documentSummary(
        user.aadhaarDocument
      ),

    lawyerProfile:
      user.role === 'LAWYER'
        ? {
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
              user.lawyerProfile?.enrollmentNumber ||
              null,

            stateBarCouncil:
              user.lawyerProfile?.stateBarCouncil ||
              null,

            yearsOfExperience:
              user.lawyerProfile?.yearsOfExperience ??
              null,

            practiceAreas:
              user.lawyerProfile?.practiceAreas ||
              [],

            credentialDocument:
              documentSummary(
                user.lawyerProfile?.credentialDocument
              ),
          }
        : null,
  };
}


function accountPayload(user) {
  return {
    id: user._id.toString(),
    name: user.name,
    username: user.username,
    email: user.email,
    role: user.role,
    status: user.status,
    mustChangePassword: user.mustChangePassword,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    lawyerProfile:
      user.role === 'LAWYER'
        ? {
            phone: user.lawyerProfile?.phone || null,
            city: user.lawyerProfile?.city || null,
            state: user.lawyerProfile?.state || null,
            enrollmentNumber: user.lawyerProfile?.enrollmentNumber || null,
            stateBarCouncil: user.lawyerProfile?.stateBarCouncil || null,
          }
        : null,
  };
}


/*
|--------------------------------------------------------------------------
| LIST PENDING REGISTRATIONS
|--------------------------------------------------------------------------
*/

export async function listPendingRegistrations(
  req,
  res
) {
  try {
    const pending =
      await User.find({
        status: 'PENDING',
        role: {
          $in: [
            'USER',
            'LAWYER',
          ],
        },
      })
        .sort({
          createdAt: 1,
        })
        .select(
          '-passwordHash'
        );

    return res
      .status(200)
      .json({
        count:
          pending.length,

        summary: {
          users:
            pending.filter(
              (user) =>
                user.role ===
                'USER'
            ).length,

          lawyers:
            pending.filter(
              (user) =>
                user.role ===
                'LAWYER'
            ).length,
        },

        registrations:
          pending.map(
            registrationPayload
          ),
      });

  } catch (error) {
    console.error(
      'List pending registrations error:',
      error
    );

    return res
      .status(500)
      .json({
        message:
          'Unable to fetch pending registrations.',
      });
  }
}


/*
|--------------------------------------------------------------------------
| LIST USERS
|--------------------------------------------------------------------------
*/

export async function listUsers(
  req,
  res
) {
  try {
    const users = await User.find({
      role: { $in: ['USER', 'LAWYER'] },
    })
      .sort({ createdAt: -1 })
      .select('-passwordHash');

    const accounts = users.map(accountPayload);

    return res.status(200).json({
      count: accounts.length,
      summary: {
        users: accounts.filter((user) => user.role === 'USER').length,
        lawyers: accounts.filter((user) => user.role === 'LAWYER').length,
        active: accounts.filter((user) => user.status === 'ACTIVE').length,
        suspended: accounts.filter((user) => user.status === 'SUSPENDED').length,
        pending: accounts.filter((user) => user.status === 'PENDING').length,
        rejected: accounts.filter((user) => user.status === 'REJECTED').length,
      },
      users: accounts,
    });
  } catch (error) {
    console.error('Admin list users error:', error);
    return res.status(500).json({
      message: 'Failed to load platform users.',
    });
  }
}


/*
|--------------------------------------------------------------------------
| UPDATE USER STATUS
|--------------------------------------------------------------------------
*/

export async function updateUserStatus(
  req,
  res
) {
  try {
    const { id } =
      req.params;

    const { status } =
      req.body || {};

    if (
      ![
        'ACTIVE',
        'SUSPENDED',
      ].includes(
        status
      )
    ) {
      return res
        .status(400)
        .json({
          message:
            'Status must be ACTIVE or SUSPENDED.',
        });
    }

    const user =
      await User.findById(
        id
      ).select(
        '-passwordHash'
      );

    if (!user) {
      return res
        .status(404)
        .json({
          message:
            'User not found.',
        });
    }

    if (
      ![
        'USER',
        'LAWYER',
      ].includes(
        user.role
      )
    ) {
      return res
        .status(403)
        .json({
          message:
            'Administrator accounts cannot be managed from the account directory.',
        });
    }

    if (
      [
        'PENDING',
        'REJECTED',
      ].includes(
        user.status
      )
    ) {
      return res
        .status(400)
        .json({
          message:
            'Pending and rejected registrations must be handled through the approval workflow.',
        });
    }

    if (
      status === 'ACTIVE' &&
      user.role === 'USER' &&
      !user.emailVerified
    ) {
      return res
        .status(409)
        .json({
          message:
            'This user must verify their email address before the account can be activated.',
        });
    }

    if (
      user.status === status
    ) {
      return res
        .status(200)
        .json({
          message:
            status === 'ACTIVE'
              ? 'Account is already active.'
              : 'Account is already suspended.',

          user:
            accountPayload(
              user
            ),
        });
    }

    user.status =
      status;

    await user.save();

    const isActive =
      status === 'ACTIVE';

    const message =
      isActive
        ? 'Your NextGen Vault account is active again. You may sign in normally.'
        : 'Your NextGen Vault account has been suspended. Contact an administrator if you believe this is an error.';

    await createNotification({
      req,
      recipientId: user._id,
      type: 'SECURITY',
      title:
        isActive
          ? 'Account activated'
          : 'Account suspended',
      message,
      relatedEntityType: 'User',
      relatedEntityId: user._id,
      email: user.email,
      emailContent: claimStageTemplate({
        recipientName:
          user.name ||
          user.username,
        subject:
          isActive
            ? 'Account Activated – NextGen Vault'
            : 'Account Suspended – NextGen Vault',
        message,
        appUrl:
          (process.env.APP_BASE_URL || process.env.FRONTEND_URL || 'http://localhost:5173')
            .replace(/\/$/, '') + '/login',
      }),
    });

    await writeAudit(req, {
      action:
        isActive
          ? 'ACCOUNT_ACTIVATED'
          : 'ACCOUNT_SUSPENDED',
      entityType: 'User',
      entityId: user._id,
      description:
        isActive
          ? 'Administrator activated an account.'
          : 'Administrator suspended an account.',
      metadata: {
        role:
          user.role,
      },
    });

    return res
      .status(200)
      .json({
        message:
          isActive
            ? 'Account activated successfully.'
            : 'Account suspended successfully.',

        user:
          accountPayload(
            user
          ),
      });

  } catch (error) {
    console.error(
      'Update user status error:',
      error
    );

    return res
      .status(500)
      .json({
        message:
          'Unable to update user status.',
      });
  }
}


/*
|--------------------------------------------------------------------------
| VIEW OWNER AADHAAR
|--------------------------------------------------------------------------
|
| This does NOT send the .vault file to the Admin.
|
| Backend:
| 1. downloads encrypted .vault internally
| 2. decrypts it in RAM
| 3. sends original JPG / PNG / PDF
|
|--------------------------------------------------------------------------
*/

export async function getAadhaarReviewUrl(
  req,
  res
) {
  try {
    const { id } =
      req.params;

    const user =
      await User.findById(
        id
      ).select(
        'role status aadhaarDocument'
      );

    if (
      !user ||
      user.role !==
        'USER'
    ) {
      return res
        .status(404)
        .json({
          message:
            'User registration not found.',
        });
    }

    const aadhaar =
      user.aadhaarDocument;

    if (
      !aadhaar?.publicId
    ) {
      return res
        .status(404)
        .json({
          message:
            'No Aadhaar document is attached to this registration.',
        });
    }

    if (
      aadhaar.resourceType !==
        'raw'
    ) {
      return res
        .status(500)
        .json({
          message:
            'Aadhaar is not stored as an encrypted raw vault file.',
        });
    }

    if (
      aadhaar.deliveryType !==
        'authenticated'
    ) {
      return res
        .status(500)
        .json({
          message:
            'Aadhaar secure delivery metadata is invalid.',
        });
    }

    if (
      aadhaar.encryption?.algorithm !==
        'aes-256-gcm' ||
      !aadhaar.encryption?.iv ||
      !aadhaar.encryption?.authTag
    ) {
      return res
        .status(500)
        .json({
          message:
            'Aadhaar encryption metadata is missing or invalid.',
        });
    }

    /*
    =========================================
    DOWNLOAD ENCRYPTED .VAULT INTERNALLY
    =========================================
    */

    const encryptedBuffer =
      await downloadEncryptedAadhaar(
        aadhaar
      );

    if (
      !encryptedBuffer ||
      encryptedBuffer.length ===
        0
    ) {
      throw new Error(
        'Encrypted Aadhaar file is empty.'
      );
    }

    /*
    =========================================
    DECRYPT IN SERVER MEMORY
    =========================================
    */

    const decryptedBuffer =
      decryptAadhaarBuffer(
        encryptedBuffer,
        aadhaar.encryption
      );

    if (
      !decryptedBuffer ||
      decryptedBuffer.length ===
        0
    ) {
      throw new Error(
        'Aadhaar decryption produced an empty file.'
      );
    }

    /*
    =========================================
    SEND ORIGINAL MIME TYPE
    =========================================
    */

    const mimeType =
      aadhaar.mimeType ||
      'application/octet-stream';

    const originalName =
      aadhaar.originalName ||
      (
        mimeType ===
        'application/pdf'
          ? 'aadhaar.pdf'
          : 'aadhaar'
      );

    res.setHeader(
      'Content-Type',
      mimeType
    );

    /*
    inline = browser should display it
    instead of downloading the vault.
    */

    res.setHeader(
      'Content-Disposition',
      `inline; filename="${encodeURIComponent(
        originalName
      )}"`
    );

    res.setHeader(
      'Content-Length',
      decryptedBuffer.length
    );

    res.setHeader(
      'Cache-Control',
      'no-store, no-cache, must-revalidate, private'
    );

    res.setHeader(
      'Pragma',
      'no-cache'
    );

    res.setHeader(
      'Expires',
      '0'
    );

    res.setHeader(
      'X-Content-Type-Options',
      'nosniff'
    );

    return res.send(
      decryptedBuffer
    );

  } catch (error) {
    console.error(
      'Admin Aadhaar review error:',
      error
    );

    return res
      .status(500)
      .json({
        message:
          'Unable to decrypt and display the Aadhaar document.',

        error:
          error.message,
      });
  }
}


/*
|--------------------------------------------------------------------------
| VIEW LAWYER CREDENTIAL
|--------------------------------------------------------------------------
*/

export async function getLawyerCredentialReviewUrl(
  req,
  res
) {
  try {
    const { id } =
      req.params;

    const user =
      await User.findById(
        id
      ).select(
        'role status lawyerProfile'
      );

    if (
      !user ||
      user.role !==
        'LAWYER'
    ) {
      return res
        .status(404)
        .json({
          message:
            'Lawyer registration not found.',
        });
    }

    const credential =
      user.lawyerProfile
        ?.credentialDocument;

    if (
      !credential?.publicId
    ) {
      return res
        .status(404)
        .json({
          message:
            'No professional credential is attached to this registration.',
        });
    }

    const expiresAt =
      Math.floor(
        Date.now() /
        1000
      ) +
      5 * 60;

    const url =
      cloudinary.url(
        credential.publicId,
        {
          resource_type:
            credential.resourceType ||
            'image',

          type:
            'authenticated',

          sign_url:
            true,

          secure:
            true,

          expires_at:
            expiresAt,
        }
      );

    return res
      .status(200)
      .json({
        url,

        expiresAt,

        document: {
          originalName:
            credential.originalName,

          mimeType:
            credential.mimeType,

          fileSize:
            credential.fileSize,
        },
      });

  } catch (error) {
    console.error(
      'Lawyer credential review error:',
      error
    );

    return res
      .status(500)
      .json({
        message:
          'Unable to open lawyer professional credential.',
      });
  }
}


/*
|--------------------------------------------------------------------------
| APPROVE USER
|--------------------------------------------------------------------------
*/

export async function approveUser(
  req,
  res
) {
  try {
    const { id } =
      req.params;

    const user =
      await User.findById(
        id
      ).select(
        '-passwordHash'
      );

    if (!user) {
      return res
        .status(404)
        .json({
          message:
            'User not found.',
        });
    }

    if (
      user.status !==
      'PENDING'
    ) {
      return res
        .status(400)
        .json({
          message:
            `User is not pending (current status: ${user.status}).`,
        });
    }

    if (
      user.role ===
        'USER' &&
      !user.aadhaarDocument
        ?.publicId
    ) {
      return res
        .status(400)
        .json({
          message:
            'User registration is missing its Aadhaar verification document.',
        });
    }

    if (
      user.role ===
        'LAWYER' &&
      !user.lawyerProfile
        ?.credentialDocument
        ?.publicId
    ) {
      return res
        .status(400)
        .json({
          message:
            'Lawyer registration is missing its professional credential document.',
        });
    }

    if (
      ![
        'USER',
        'LAWYER',
      ].includes(
        user.role
      )
    ) {
      return res
        .status(400)
        .json({
          message:
            'This account does not use the registration approval workflow.',
        });
    }

    if (
      user.role === 'USER' &&
      !user.emailVerified
    ) {
      return res
        .status(409)
        .json({
          message:
            'The user must verify their registered email address before administrator approval.',
        });
    }

    user.status =
      'ACTIVE';

    user.verification = {
      reviewedBy:
        req.user.id,

      reviewedAt:
        new Date(),

      rejectionReason:
        null,
    };

    await user.save();

    const approvalMessage =
      user.role === 'LAWYER'
        ? 'Your lawyer registration has been approved. Your professional account is now active.'
        : 'Your NextGen Vault registration has been approved. You may now sign in.';

    await createNotification({
      req,
      recipientId: user._id,
      type: 'SECURITY',
      title:
        user.role === 'LAWYER'
          ? 'Lawyer account approved'
          : 'Account approved',
      message: approvalMessage,
      relatedEntityType: 'User',
      relatedEntityId: user._id,
      email: user.email,
      emailContent: claimStageTemplate({
        recipientName: user.name || user.username,
        subject:
          user.role === 'LAWYER'
            ? 'Lawyer Account Approved – NextGen Vault'
            : 'Your NextGen Vault Account Has Been Approved',
        message: approvalMessage,
        appUrl:
          (process.env.APP_BASE_URL || process.env.FRONTEND_URL || 'http://localhost:5173')
            .replace(/\/$/, '') + '/login',
      }),
    });

    await writeAudit(req, {
      action: 'ACCOUNT_REGISTRATION_APPROVED',
      entityType: 'User',
      entityId: user._id,
      description:
        user.role === 'LAWYER'
          ? 'Administrator approved a lawyer registration.'
          : 'Administrator approved a user registration.',
      metadata: {
        role: user.role,
      },
    });

    return res
      .status(200)
      .json({
        message:
          user.role ===
          'LAWYER'
            ? 'Lawyer approved. The professional account is now active.'
            : 'User approved. They may now log in.',

        user:
          registrationPayload(
            user
          ),
      });

  } catch (error) {
    console.error(
      'Approve user error:',
      error
    );

    return res
      .status(500)
      .json({
        message:
          'Unable to approve user.',
      });
  }
}


/*
|--------------------------------------------------------------------------
| REJECT USER
|--------------------------------------------------------------------------
*/

export async function rejectUser(
  req,
  res
) {
  try {
    const { id } =
      req.params;

    const reason =
      typeof req.body?.reason ===
      'string'
        ? req.body.reason.trim()
        : '';

    const user =
      await User.findById(
        id
      );

    if (!user) {
      return res
        .status(404)
        .json({
          message:
            'User not found.',
        });
    }

    if (
      user.status !==
      'PENDING'
    ) {
      return res
        .status(400)
        .json({
          message:
            `User is not pending (current status: ${user.status}).`,
        });
    }

    if (
      ![
        'USER',
        'LAWYER',
      ].includes(
        user.role
      )
    ) {
      return res
        .status(400)
        .json({
          message:
            'This account does not use the registration approval workflow.',
        });
    }

    const roleLabel =
      user.role ===
      'LAWYER'
        ? 'Lawyer'
        : 'User';

    const verificationDocument =
      user.role ===
      'LAWYER'
        ? user.lawyerProfile
            ?.credentialDocument
        : user.aadhaarDocument;

    const publicId =
      verificationDocument
        ?.publicId;

    const resourceType =
      verificationDocument
        ?.resourceType ||
      (
        user.role ===
        'USER'
          ? 'raw'
          : 'image'
      );

    const deliveryType =
      verificationDocument
        ?.deliveryType ||
      'authenticated';

    /*
    =========================================
    DELETE VERIFICATION FILE FROM CLOUDINARY
    =========================================
    */

    if (publicId) {
      try {
        const deletionResult =
          await cloudinary.uploader.destroy(
            publicId,
            {
              resource_type:
                resourceType,

              type:
                deliveryType,

              invalidate:
                true,
            }
          );

        if (
          deletionResult.result !==
            'ok' &&
          deletionResult.result !==
            'not found'
        ) {
          console.error(
            'Unexpected Cloudinary deletion result:',
            {
              userId:
                user._id.toString(),

              publicId,

              resourceType,

              deliveryType,

              result:
                deletionResult.result,
            }
          );

          return res
            .status(502)
            .json({
              message:
                'Unable to remove the verification document from cloud storage. Registration was not rejected.',
            });
        }

      } catch (error) {
        console.error(
          'Cloudinary verification document deletion failed:',
          {
            userId:
              user._id.toString(),

            publicId,

            resourceType,

            deliveryType,

            error:
              error.message,
          }
        );

        return res
          .status(502)
          .json({
            message:
              'Unable to remove the verification document from cloud storage. Registration was not rejected. Please try again.',
          });
      }
    }

    try {
      await sendTransactionalEmail({
        to: user.email,
        ...claimStageTemplate({
          recipientName: user.name || user.username,
          subject: 'NextGen Vault Registration Review',
          message:
            'Your registration was not approved.' +
            (reason ? ' Reason: ' + reason : ''),
          appUrl:
            (process.env.APP_BASE_URL || process.env.FRONTEND_URL || 'http://localhost:5173')
              .replace(/\/$/, '') + '/register',
        }),
      });
    } catch (mailError) {
      console.error('Registration rejection email failed:', mailError.message);
    }

    await writeAudit(req, {
      action: 'ACCOUNT_REGISTRATION_REJECTED',
      entityType: 'User',
      entityId: user._id,
      description: 'Administrator rejected a pending registration.',
      metadata: {
        role: user.role,
        reason: reason || null,
      },
    });

    /*
    =========================================
    DELETE PENDING REGISTRATION FROM MONGODB
    =========================================
    */

    await User.deleteOne({
      _id:
        user._id,
    });

    return res
      .status(200)
      .json({
        message:
          `${roleLabel} registration rejected. The verification document and pending registration were deleted. The username and email can now be used for a new registration.`,

        rejected:
          true,

        reason:
          reason || null,

        releasedCredentials: {
          username:
            user.username,

          email:
            user.email,
        },
      });

  } catch (error) {
    console.error(
      'Reject user error:',
      error
    );

    return res
      .status(500)
      .json({
        message:
          'Unable to reject registration.',
      });
  }
}

export async function listAdminDocuments(req, res) {
  try {
    const { verificationStatus, ownerId, q, page = '1', limit = '50' } = req.query;
    const filter = {};
    if (verificationStatus) filter.verificationStatus = verificationStatus;
    if (ownerId) filter.ownerId = ownerId;
    if (q) {
      const escaped = String(q).replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
      filter.$or = [
        { title: new RegExp(escaped, 'i') },
        { originalName: new RegExp(escaped, 'i') },
      ];
    }

    const safePage = Math.max(1, Number(page) || 1);
    const safeLimit = Math.min(100, Math.max(1, Number(limit) || 50));
    const skip = (safePage - 1) * safeLimit;

    const [documents, total] = await Promise.all([
      Document.find(filter)
        .populate('ownerId', 'name username email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(safeLimit)
        .lean(),
      Document.countDocuments(filter),
    ]);

    return res.status(200).json({
      page: safePage,
      limit: safeLimit,
      total,
      documents: documents.map((document) => ({
        id: document._id.toString(),
        owner: document.ownerId ? {
          id: document.ownerId._id.toString(),
          name: document.ownerId.name,
          username: document.ownerId.username,
          email: document.ownerId.email,
        } : null,
        title: document.title,
        category: document.category,
        recordType: document.recordType,
        originalName: document.originalName,
        fileType: document.fileType,
        fileSize: document.fileSize,
        sha256: document.sha256 || null,
        verificationStatus: document.verificationStatus || 'PENDING',
        verificationRemarks: document.verificationRemarks || '',
        createdAt: document.createdAt,
      })),
    });
  } catch (error) {
    console.error('Admin list documents error:', error);
    return res.status(500).json({ message: 'Unable to load document records.' });
  }
}

export async function reviewDocumentVerification(req, res) {
  try {
    const status = String(req.body?.status || '').toUpperCase();
    const remarks = String(req.body?.remarks || '').trim();
    if (!['VERIFIED', 'FLAGGED', 'FAILED', 'PENDING'].includes(status)) {
      return res.status(400).json({ message: 'Invalid document verification status.' });
    }

    const document = await Document.findById(req.params.id);
    if (!document) return res.status(404).json({ message: 'Document not found.' });

    document.verificationStatus = status;
    document.verificationRemarks = remarks;
    document.verificationReviewedBy = req.user.id;
    document.verificationReviewedAt = new Date();
    await document.save();

    const owner =
      await User.findById(
        document.ownerId
      ).select(
        'name email'
      );

    if (owner) {
      const statusMessage =
        'The technical verification status for "' +
        document.title +
        '" is now ' +
        status +
        '. This technical status does not establish legal authenticity.';

      await createNotification({
        req,
        recipientId: owner._id,
        type: 'DOCUMENT_VERIFICATION',
        title: 'Document verification updated',
        message: statusMessage,
        relatedEntityType: 'Document',
        relatedEntityId: document._id,
        email: owner.email,
        emailContent: claimStageTemplate({
          recipientName: owner.name || 'there',
          subject: 'Document Verification Updated – NextGen Vault',
          message: statusMessage,
          appUrl:
            (process.env.APP_BASE_URL || process.env.FRONTEND_URL || 'http://localhost:5173')
              .replace(/\/$/, '') + '/user',
        }),
      });
    }

    await writeAudit(req, {
      action: 'DOCUMENT_VERIFICATION_REVIEWED',
      entityType: 'Document',
      entityId: document._id,
      description: 'Administrator updated the technical document verification status.',
      metadata: {
        status,
        remarks,
        sha256: document.sha256 || null,
        authenticityDisclaimer: 'This is a technical review status and is not proof of legal authenticity.',
      },
    });

    return res.status(200).json({
      message: 'Document technical verification status updated. This status does not establish legal authenticity.',
      document: {
        id: document._id.toString(),
        verificationStatus: document.verificationStatus,
        verificationRemarks: document.verificationRemarks,
      },
    });
  } catch (error) {
    console.error('Document verification review error:', error);
    return res.status(500).json({ message: 'Unable to update document verification status.' });
  }
}

export async function listAdminLegacyAllocations(req, res) {
  try {
    const { status, allocatedBy, allocatedTo, page = '1', limit = '50' } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (allocatedBy) filter.allocatedBy = allocatedBy;
    if (allocatedTo) filter.allocatedTo = allocatedTo;

    const safePage = Math.max(1, Number(page) || 1);
    const safeLimit = Math.min(100, Math.max(1, Number(limit) || 50));
    const skip = (safePage - 1) * safeLimit;

    const [allocations, total] = await Promise.all([
      LegacyAllocation.find(filter)
        .populate('assetId', 'title category recordType verificationStatus')
        .populate('allocatedBy', 'name username email')
        .populate('allocatedTo', 'name username email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(safeLimit)
        .lean(),
      LegacyAllocation.countDocuments(filter),
    ]);

    return res.status(200).json({
      page: safePage,
      limit: safeLimit,
      total,
      allocations: allocations.map((allocation) => ({
        id: allocation._id.toString(),
        asset: allocation.assetId,
        allocatedBy: allocation.allocatedBy,
        allocatedTo: allocation.allocatedTo,
        permissions: allocation.permissions,
        status: allocation.status,
        releaseCondition: allocation.releaseCondition,
        releaseDate: allocation.releaseDate,
        createdAt: allocation.createdAt,
        updatedAt: allocation.updatedAt,
      })),
    });
  } catch (error) {
    console.error('Admin list legacy allocations error:', error);
    return res.status(500).json({ message: 'Unable to load legacy allocations.' });
  }
}
