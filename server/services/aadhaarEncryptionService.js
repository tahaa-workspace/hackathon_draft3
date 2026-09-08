import crypto from "crypto";
import streamifier from "streamifier";
import cloudinary from "../config/cloudinary.js";


/*
|--------------------------------------------------------------------------
| GET AES-256 KEY
|--------------------------------------------------------------------------
*/

function getEncryptionKey() {
  const configuredKey =
    process.env.DOCUMENT_ENCRYPTION_KEY;

  if (!configuredKey) {
    throw new Error(
      "DOCUMENT_ENCRYPTION_KEY is not configured."
    );
  }

  const key =
    /^[0-9a-fA-F]{64}$/.test(
      configuredKey
    )
      ? Buffer.from(
          configuredKey,
          "hex"
        )
      : Buffer.from(
          configuredKey,
          "base64"
        );

  if (key.length !== 32) {
    throw new Error(
      "DOCUMENT_ENCRYPTION_KEY must decode to exactly 32 bytes."
    );
  }

  return key;
}


/*
|--------------------------------------------------------------------------
| ENCRYPT BUFFER
|--------------------------------------------------------------------------
*/

export function encryptAadhaarBuffer(
  buffer
) {
  const key =
    getEncryptionKey();

  const iv =
    crypto.randomBytes(12);

  const cipher =
    crypto.createCipheriv(
      "aes-256-gcm",
      key,
      iv
    );

  const encrypted =
    Buffer.concat([
      cipher.update(
        buffer
      ),

      cipher.final(),
    ]);

  const authTag =
    cipher.getAuthTag();

  return {
    encrypted,

    encryption: {
      algorithm:
        "aes-256-gcm",

      iv:
        iv.toString(
          "base64"
        ),

      authTag:
        authTag.toString(
          "base64"
        ),

      version: 1,
    },
  };
}


/*
|--------------------------------------------------------------------------
| DECRYPT BUFFER
|--------------------------------------------------------------------------
*/

export function decryptAadhaarBuffer(
  encryptedBuffer,
  encryption
) {
  if (
    !encryption?.iv ||
    !encryption?.authTag
  ) {
    throw new Error(
      "Aadhaar encryption metadata is missing."
    );
  }

  const key =
    getEncryptionKey();

  const decipher =
    crypto.createDecipheriv(
      "aes-256-gcm",
      key,
      Buffer.from(
        encryption.iv,
        "base64"
      )
    );

  decipher.setAuthTag(
    Buffer.from(
      encryption.authTag,
      "base64"
    )
  );

  return Buffer.concat([
    decipher.update(
      encryptedBuffer
    ),

    decipher.final(),
  ]);
}


/*
|--------------------------------------------------------------------------
| UPLOAD ENCRYPTED AADHAAR
|--------------------------------------------------------------------------
*/

export async function uploadEncryptedAadhaar(
  encryptedBuffer,
  folder
) {
  return new Promise(
    (
      resolve,
      reject
    ) => {

      const publicId =
        `${folder}/${crypto.randomUUID()}.vault`;

      const uploadStream =
        cloudinary.uploader
          .upload_stream(
            {
              public_id:
                publicId,

              resource_type:
                "raw",

              type:
                "authenticated",

              use_filename:
                false,

              unique_filename:
                false,
            },

            (
              error,
              result
            ) => {

              if (error) {
                reject(
                  error
                );
              } else {
                resolve(
                  result
                );
              }
            }
          );

      streamifier
        .createReadStream(
          encryptedBuffer
        )
        .pipe(
          uploadStream
        );
    }
  );
}


/*
|--------------------------------------------------------------------------
| DOWNLOAD ENCRYPTED AADHAAR
|--------------------------------------------------------------------------
*/

export async function downloadEncryptedAadhaar(
  aadhaarDocument
) {
  const signedUrl =
    cloudinary.url(
      aadhaarDocument.publicId,
      {
        resource_type:
          "raw",

        type:
          "authenticated",

        sign_url:
          true,

        secure:
          true,
      }
    );

  const response =
    await fetch(
      signedUrl
    );

  if (!response.ok) {
    throw new Error(
      `Unable to download encrypted Aadhaar (${response.status}).`
    );
  }

  return Buffer.from(
    await response.arrayBuffer()
  );
}


/*
|--------------------------------------------------------------------------
| DELETE ENCRYPTED AADHAAR
|--------------------------------------------------------------------------
*/

export async function deleteEncryptedAadhaar(
  aadhaarDocument
) {
  if (
    !aadhaarDocument
      ?.publicId
  ) {
    return;
  }

  const result =
    await cloudinary
      .uploader
      .destroy(
        aadhaarDocument
          .publicId,

        {
          resource_type:
            "raw",

          type:
            "authenticated",

          invalidate:
            true,
        }
      );

  if (
    result.result !==
      "ok" &&
    result.result !==
      "not found"
  ) {
    throw new Error(
      "Encrypted Aadhaar could not be deleted from Cloudinary."
    );
  }
}