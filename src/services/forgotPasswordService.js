const API_BASE = '/api';

async function publicRequest(path, body) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const error = new Error(data.message || `Request failed (${res.status})`);
    error.status = res.status;
    error.payload = data;
    throw error;
  }

  return data;
}

export function requestForgotPasswordOTP(email) {
  return publicRequest('/auth/forgot-password/request-otp', { email });
}

export function verifyForgotPasswordOTP(email, otp) {
  return publicRequest('/auth/forgot-password/verify-otp', { email, otp });
}

export function resetForgottenPassword({
  email,
  resetToken,
  newPassword,
  confirmNewPassword,
}) {
  return publicRequest('/auth/forgot-password/reset', {
    email,
    resetToken,
    newPassword,
    confirmNewPassword,
  });
}
