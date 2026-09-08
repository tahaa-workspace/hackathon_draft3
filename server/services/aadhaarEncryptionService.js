import crypto from "crypto";
import streamifier from "streamifier";
import cloudinary from "../config/cloudinary.js";

const ENCRYPTED_AADHAAR_FOLDER = "digital-legacy/encrypted-aadhaar/owners";
const AADHAAR_PLACEHOLDER_FOLDER = "digital-legacy/aadhaar";

function getEncryptionKey() {
  const configuredKey = process.env.DOCUMENT_ENCRYPTION_KEY;

  if (!configuredKey) {
    throw new Error("DOCUMENT_ENCRYPTION_KEY is not configured.");
  }

  const key = /^[0-9a-fA-F]{64}$/.test(configuredKey)
    ? Buffer.from(configuredKey, "hex")
    : Buffer.from(configuredKey, "base64");

  if (key.length !== 32) {
    throw new Error("DOCUMENT_ENCRYPTION_KEY must decode to exactly 32 bytes.");
  }

  return key;
}

export function encryptAadhaarBuffer(buffer) {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);

  const encrypted = Buffer.concat([
    cipher.update(buffer),
    cipher.final(),
  ]);

  const authTag = cipher.getAuthTag();

  return {
    encrypted,
    encryption: {
      algorithm: "aes-256-gcm",
      iv: iv.toString("base64"),
      authTag: authTag.toString("base64"),
      version: 1,
    },
  };
}

export function decryptAadhaarBuffer(encryptedBuffer, encryption) {
  if (!encryption?.iv || !encryption?.authTag) {
    throw new Error("Aadhaar encryption metadata is missing.");
  }

  const key = getEncryptionKey();
  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    key,
    Buffer.from(encryption.iv, "base64")
  );

  decipher.setAuthTag(Buffer.from(encryption.authTag, "base64"));

  return Buffer.concat([
    decipher.update(encryptedBuffer),
    decipher.final(),
  ]);
}

function buildAadhaarPlaceholderSvg() {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="900" height="600" viewBox="0 0 900 600">
      <rect width="900" height="600" fill="#f1f5f9"/>
      <rect x="245" y="95" width="410" height="410" rx="24" fill="#ffffff" stroke="#cbd5e1" stroke-width="6"/>
      <circle cx="450" cy="220" r="48" fill="#2563eb"/>
      <path d="M428 220 L444 236 L476 202" fill="none" stroke="#ffffff" stroke-width="11" stroke-linecap="round" stroke-linejoin="round"/>
      <rect x="315" y="300" width="270" height="22" rx="11" fill="#94a3b8"/>
      <rect x="345" y="350" width="210" height="18" rx="9" fill="#cbd5e1"/>
      <text x="450" y="430" text-anchor="middle" font-family="Arial, sans-serif" font-size="26" font-weight="700" fill="#1e293b">ENCRYPTED AADHAAR</text>
      <text x="450" y="465" text-anchor="middle" font-family="Arial, sans-serif" font-size="17" fill="#64748b">Original identity document is protected in the vault</text>
    </svg>
  `;

  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}

export function getAadhaarPlaceholderPublicId(encryptedPublicId) {
  if (!encryptedPublicId) return null;

  const filename = String(encryptedPublicId).split("/").pop() || "";
  const assetId = filename.replace(/\.vault$/, "");

  if (!assetId) return null;

  return `${AADHAAR_PLACEHOLDER_FOLDER}/aadhaar-${assetId}`;
}

async function uploadEncryptedAadhaarBlob(encryptedBuffer, assetId) {
  return new Promise((resolve, reject) => {
    const publicId = `${ENCRYPTED_AADHAAR_FOLDER}/${assetId}.vault`;

    const uploadStream = cloudinary.uploader.upload_stream(
      {
        public_id: publicId,
        resource_type: "raw",
        type: "authenticated",
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

    streamifier.createReadStream(encryptedBuffer).pipe(uploadStream);
  });
}

export async function uploadAadhaarPlaceholder(assetId) {
  return cloudinary.uploader.upload(buildAadhaarPlaceholderSvg(), {
    folder: AADHAAR_PLACEHOLDER_FOLDER,
    public_id: `aadhaar-${assetId}`,
    resource_type: "image",
    type: "upload",
    overwrite: false,
    use_filename: false,
    unique_filename: false,
  });
}

export async function uploadEncryptedAadhaar(encryptedBuffer) {
  const assetId = crypto.randomUUID();
  let encryptedUpload = null;

  try {
    encryptedUpload = await uploadEncryptedAadhaarBlob(
      encryptedBuffer,
      assetId
    );

    const placeholderUpload = await uploadAadhaarPlaceholder(assetId);

    return {
      ...encryptedUpload,
      placeholder_public_id: placeholderUpload.public_id,
    };
  } catch (error) {
    if (encryptedUpload?.public_id) {
      await cloudinary.uploader.destroy(encryptedUpload.public_id, {
        resource_type: "raw",
        type: "authenticated",
        invalidate: true,
      }).catch(() => {});
    }

    throw error;
  }
}

export async function deleteAadhaarPlaceholder(placeholderPublicId) {
  if (!placeholderPublicId) {
    return;
  }

  const result = await cloudinary.uploader.destroy(placeholderPublicId, {
    resource_type: "image",
    type: "upload",
    invalidate: true,
  });

  if (result.result !== "ok" && result.result !== "not found") {
    throw new Error("Aadhaar placeholder could not be deleted from Cloudinary.");
  }
}

export async function downloadEncryptedAadhaar(aadhaarDocument) {
  const signedUrl = cloudinary.url(aadhaarDocument.publicId, {
    resource_type: "raw",
    type: "authenticated",
    sign_url: true,
    secure: true,
  });

  const response = await fetch(signedUrl);

  if (!response.ok) {
    throw new Error(`Unable to download encrypted Aadhaar (${response.status}).`);
  }

  return Buffer.from(await response.arrayBuffer());
}

export async function deleteEncryptedAadhaar(aadhaarDocument) {
  if (!aadhaarDocument?.publicId) {
    return;
  }

  const result = await cloudinary.uploader.destroy(aadhaarDocument.publicId, {
    resource_type: "raw",
    type: "authenticated",
    invalidate: true,
  });

  if (result.result !== "ok" && result.result !== "not found") {
    throw new Error("Encrypted Aadhaar could not be deleted from Cloudinary.");
  }

  const placeholderPublicId = getAadhaarPlaceholderPublicId(
    aadhaarDocument.publicId
  );

  await deleteAadhaarPlaceholder(placeholderPublicId);
}
