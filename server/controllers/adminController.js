import cloudinary from '../config/cloudinary.js';
import User from '../models/User.js';
import { sendTransactionalEmail } from '../services/mailService.js';
import { claimStageTemplate } from '../services/emailTemplates.js';
import { writeAudit } from '../services/auditService.js';

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

    user.status =
      status;

    await user.save();

    const appUrl =
      (process.env.APP_BASE_URL || process.env.FRONTEND_URL || 'http://localhost:5173')
        .replace(/\/$/, '') + '/login';

    try {
      await sendTransactionalEmail({
        to: user.email,
        ...claimStageTemplate({
          recipientName: user.name || user.username,
          subject: 'Your NextGen Vault Account Has Been Approved',
          message:
            user.role === 'LAWYER'
              ? 'Your lawyer account has been approved and is now active.'
              : 'Your account has been approved. You can sign in after your email address is verified.',
          appUrl,
        }),
      });
    } catch (mailError) {
      console.error('Account approval email failed:', mailError.message);
    }

    await writeAudit(req, {
      action: 'ACCOUNT_APPROVED',
      entityType: 'User',
      entityId: user._id,
      description: 'Administrator approved a pending account.',
      metadata: { role: user.role },
    });

    return res
      .status(200)
      .json({
        message:
          status === 'ACTIVE'
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