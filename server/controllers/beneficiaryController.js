import bcrypt from 'bcryptjs';
import streamifier from 'streamifier';

import User from '../models/User.js';
import transporter from '../config/mailer.js';
import cloudinary from '../config/cloudinary.js';

const SALT_ROUNDS = 12;
/*
=========================================================
UPLOAD BENEFICIARY AADHAAR
=========================================================
*/

function uploadBeneficiaryAadhaar(file) {
  return new Promise(
    (resolve, reject) => {

      const uploadStream =
        cloudinary.uploader.upload_stream(
          {
            folder:
              'digital-legacy/beneficiary-aadhaar',

            resource_type:
              'auto',

            type:
              'authenticated',

            use_filename:
              false,

            unique_filename:
              true,
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
        .createReadStream(
          file.buffer
        )
        .pipe(uploadStream);
    }
  );
}

async function sendBeneficiaryCredentialsEmail({
  recipientEmail,
  recipientName,
  username,
  initialPassword,
  ownerName,
}) {
  const appName = 'NextGen Vault';

  const loginUrl =
    process.env.FRONTEND_URL
      ? `${process.env.FRONTEND_URL}/login`
      : 'http://localhost:5173/login';

  await transporter.sendMail({
    from: {
      name: appName,
      address: process.env.EMAIL_USER,
    },

    to: recipientEmail,

    subject: `${appName} - Your Beneficiary Account Has Been Created`,

    text: `
Hello ${recipientName},

${ownerName || 'An owner'} has created a Beneficiary account for you on ${appName}.

Your login credentials are:

Username: ${username}
Temporary Password: ${initialPassword}

Login here:
${loginUrl}

For security, you will be required to change this temporary password when you log in for the first time.

Please do not share these credentials with anyone.

Regards,
${appName}
    `.trim(),

    html: `
      <div style="
        font-family: Arial, sans-serif;
        max-width: 620px;
        margin: 0 auto;
        background: #f8fafc;
        padding: 24px;
      ">
        <div style="
          background: #ffffff;
          border-radius: 14px;
          padding: 30px;
          border: 1px solid #e2e8f0;
        ">

          <h2 style="
            margin-top: 0;
            color: #0f172a;
          ">
            Welcome to ${appName}
          </h2>

          <p style="
            color: #475569;
            line-height: 1.6;
          ">
            Hello <strong>${recipientName}</strong>,
          </p>

          <p style="
            color: #475569;
            line-height: 1.6;
          ">
            <strong>${ownerName || 'An owner'}</strong>
            has created a Beneficiary account for you on
            ${appName}.
          </p>

          <p style="
            color: #475569;
            line-height: 1.6;
          ">
            Use the following temporary credentials to sign in:
          </p>

          <div style="
            background: #f1f5f9;
            border-radius: 10px;
            padding: 18px;
            margin: 20px 0;
          ">

            <p style="
              margin: 6px 0;
              color: #334155;
            ">
              <strong>Username:</strong>
              ${username}
            </p>

            <p style="
              margin: 6px 0;
              color: #334155;
            ">
              <strong>Temporary Password:</strong>
              ${initialPassword}
            </p>

          </div>

          <a
            href="${loginUrl}"
            style="
              display: inline-block;
              background: #2563eb;
              color: white;
              padding: 12px 20px;
              border-radius: 8px;
              text-decoration: none;
              font-weight: bold;
            "
          >
            Login to ${appName}
          </a>

          <p style="
            margin-top: 24px;
            color: #64748b;
            line-height: 1.6;
          ">
            For security, you will be required to change your
            temporary password when you sign in for the first time.
          </p>

          <p style="
            color: #64748b;
            line-height: 1.6;
          ">
            Please do not share these credentials with anyone.
          </p>

          <p style="
            margin-top: 28px;
            color: #475569;
          ">
            Regards,<br />
            <strong>${appName}</strong>
          </p>

        </div>
      </div>
    `,
  });
}

export async function createBeneficiary(
  req,
  res
) {

  let aadhaarUpload = null;

  try {

    const {
      name,
      username,
      email,
      initialPassword,
    } = req.body;

    /*
    =========================================
    VALIDATE TEXT FIELDS
    =========================================
    */

    if (
      !name ||
      !username ||
      !email ||
      !initialPassword
    ) {
      return res.status(400).json({
        message:
          'Name, username, email, and initial password are required.',
      });
    }

    /*
    =========================================
    BENEFICIARY AADHAAR REQUIRED
    =========================================
    */

    if (!req.file) {
      return res.status(400).json({
        message:
          'Beneficiary Aadhaar card image or PDF is required.',
      });
    }

    /*
    =========================================
    PASSWORD VALIDATION
    =========================================
    */

    if (
      initialPassword.length < 8
    ) {
      return res.status(400).json({
        message:
          'Initial password must be at least 8 characters long.',
      });
    }

    /*
    =========================================
    NORMALIZE LOGIN DETAILS
    =========================================
    */

    const normalizedEmail =
      String(email)
        .trim()
        .toLowerCase();

    const normalizedUsername =
      String(username)
        .trim()
        .toLowerCase();

    /*
    =========================================
    CHECK DUPLICATE ACCOUNT
    =========================================
    */

    const existing =
      await User.findOne({
        $or: [
          {
            username:
              normalizedUsername,
          },
          {
            email:
              normalizedEmail,
          },
        ],
      }).lean();

    if (existing) {
      return res.status(409).json({
        message:
          'A user with that username or email already exists.',
      });
    }

    /*
    =========================================
    GET OWNER
    =========================================
    */

    const owner =
      await User.findById(
        req.user.id
      ).select(
        'name username email role status'
      );

    if (
      !owner ||
      owner.role !== 'OWNER'
    ) {
      return res.status(403).json({
        message:
          'Only an Owner can create a Beneficiary.',
      });
    }

    /*
    =========================================
    UPLOAD BENEFICIARY AADHAAR
    =========================================
    */

    aadhaarUpload =
      await uploadBeneficiaryAadhaar(
        req.file
      );

    /*
    =========================================
    HASH TEMPORARY PASSWORD
    =========================================
    */

    const passwordHash =
      await bcrypt.hash(
        initialPassword,
        SALT_ROUNDS
      );

    /*
    =========================================
    CREATE BENEFICIARY
    =========================================
    */

    const beneficiary =
      await User.create({

        name:
          String(name).trim(),

        username:
          normalizedUsername,

        email:
          normalizedEmail,

        passwordHash,

        role:
          'BENEFICIARY',

        /*
        Beneficiary is still activated directly
        by the Owner.

        Aadhaar upload does NOT send this account
        through Admin approval unless you later
        decide to add that workflow.
        */

        status:
          'ACTIVE',

        createdBy:
          req.user.id,

        mustChangePassword:
          true,

        /*
        =========================================
        AADHAAR METADATA
        =========================================
        */

        aadhaarDocument: {

          publicId:
            aadhaarUpload.public_id,

          resourceType:
            aadhaarUpload.resource_type,

          originalName:
            req.file.originalname,

          mimeType:
            req.file.mimetype,

          fileSize:
            req.file.size,
        },
      });

    /*
    =========================================
    SEND BENEFICIARY CREDENTIALS EMAIL
    =========================================
    */

    try {

      await sendBeneficiaryCredentialsEmail({

        recipientEmail:
          beneficiary.email,

        recipientName:
          beneficiary.name,

        username:
          beneficiary.username,

        initialPassword,

        ownerName:
          owner.name ||
          owner.username ||
          'Your account owner',
      });

    } catch (mailError) {

      console.error(
        'Beneficiary credential email failed:',
        mailError
      );

      /*
      Beneficiary + Aadhaar already exist.

      Do NOT delete the account merely because
      email delivery failed.
      */

      return res.status(201).json({

        message:
          'Beneficiary created and Aadhaar stored securely, but the credential email could not be sent.',

        emailSent:
          false,

        beneficiary: {

          id:
            beneficiary._id.toString(),

          name:
            beneficiary.name,

          username:
            beneficiary.username,

          email:
            beneficiary.email,

          role:
            beneficiary.role,

          status:
            beneficiary.status,

          mustChangePassword:
            beneficiary.mustChangePassword,

          aadhaarAvailable:
            Boolean(
              beneficiary
                .aadhaarDocument
                ?.publicId
            ),

          createdBy:
            beneficiary.createdBy
              ? beneficiary.createdBy.toString()
              : null,

          createdAt:
            beneficiary.createdAt,
        },
      });
    }

    /*
    =========================================
    SUCCESS
    =========================================
    */

    return res.status(201).json({

      message:
        'Beneficiary created successfully. Aadhaar has been stored securely and login credentials were sent to their email address.',

      emailSent:
        true,

      beneficiary: {

        id:
          beneficiary._id.toString(),

        name:
          beneficiary.name,

        username:
          beneficiary.username,

        email:
          beneficiary.email,

        role:
          beneficiary.role,

        status:
          beneficiary.status,

        mustChangePassword:
          beneficiary.mustChangePassword,

        aadhaarAvailable:
          Boolean(
            beneficiary
              .aadhaarDocument
              ?.publicId
          ),

        createdBy:
          beneficiary.createdBy
            ? beneficiary.createdBy.toString()
            : null,

        createdAt:
          beneficiary.createdAt,
      },
    });

  } catch (error) {

    console.error(
      'Create beneficiary error:',
      error
    );

    /*
    =========================================
    CLEANUP CLOUDINARY
    =========================================

    If Aadhaar uploaded successfully but MongoDB
    beneficiary creation failed, remove the orphan
    Aadhaar document.
    */

    if (
      aadhaarUpload?.public_id
    ) {

      await cloudinary.uploader
        .destroy(
          aadhaarUpload.public_id,
          {
            resource_type:
              aadhaarUpload.resource_type ||
              'image',

            type:
              'authenticated',

            invalidate:
              true,
          }
        )
        .catch(
          (cleanupError) => {

            console.error(
              'Beneficiary Aadhaar cleanup failed:',
              cleanupError
            );

          }
        );
    }

    return res.status(500).json({
      message:
        'Failed to create beneficiary.',

      error:
        error.message,
    });
  }
}

export async function listBeneficiaries(req, res) {
  try {
    const beneficiaries =
      await User.find({
        role:
          'BENEFICIARY',

        createdBy:
          req.user.id,
      })

        .populate(
          'createdBy',
          'username name email'
        )

        .sort({
          createdAt: -1,
        })

        .select(
          '-passwordHash'
        );

    return res.status(200).json({
      count:
        beneficiaries.length,

      beneficiaries:
        beneficiaries.map(
          (u) => ({
            id:
              u._id.toString(),

            name:
              u.name,

            username:
              u.username,

            email:
              u.email,

            role:
              u.role,

            status:
              u.status,

            mustChangePassword:
              u.mustChangePassword,

            createdAt:
              u.createdAt,

            createdBy:
              u.createdBy
                ? u.createdBy._id.toString()
                : null,

            createdByUsername:
              u.createdBy
                ? u.createdBy.username
                : null,

            createdByName:
              u.createdBy
                ? u.createdBy.name
                : null,

            createdByEmail:
              u.createdBy
                ? u.createdBy.email
                : null,
          })
        ),
    });

  } catch (error) {
    console.error(
      'List beneficiaries error:',
      error
    );

    return res.status(500).json({
      message:
        'Failed to fetch beneficiaries.',
      error:
        error.message,
    });
  }
}