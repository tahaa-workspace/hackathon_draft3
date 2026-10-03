const SIGNATURES = {
  'application/pdf': (buffer) =>
    buffer.length >= 5 &&
    buffer.subarray(0, 5).toString('ascii') === '%PDF-',

  'image/jpeg': (buffer) =>
    buffer.length >= 3 &&
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff,

  'image/png': (buffer) =>
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a,
};

const EXTENSIONS = {
  'application/pdf': ['.pdf'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
};

function extensionOf(name = '') {
  const match = String(name).toLowerCase().match(/\.[a-z0-9]+$/);
  return match?.[0] || '';
}

export function validateUploadedFile(file) {
  if (!file) {
    return {
      valid: false,
      message: 'Please select a file.',
    };
  }

  if (!file.buffer || !Buffer.isBuffer(file.buffer) || file.buffer.length === 0) {
    return {
      valid: false,
      message: 'Empty files cannot be uploaded.',
    };
  }

  const originalName = String(file.originalname || '').trim();

  if (
    !originalName ||
    originalName.includes('\0') ||
    originalName.includes('/') ||
    originalName.includes('\\')
  ) {
    return {
      valid: false,
      message: 'The uploaded filename is invalid.',
    };
  }

  const allowedExtensions = EXTENSIONS[file.mimetype];
  const signatureCheck = SIGNATURES[file.mimetype];

  if (!allowedExtensions || !signatureCheck) {
    return {
      valid: false,
      message: 'Only PDF, JPG, JPEG and PNG files are supported.',
    };
  }

  const extension = extensionOf(originalName);

  if (!allowedExtensions.includes(extension)) {
    return {
      valid: false,
      message: 'The file extension does not match the uploaded MIME type.',
    };
  }

  if (!signatureCheck(file.buffer)) {
    return {
      valid: false,
      message:
        'The uploaded file content does not match its declared file type.',
    };
  }

  return {
    valid: true,
    extension,
  };
}
