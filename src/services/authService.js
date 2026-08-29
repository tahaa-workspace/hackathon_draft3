const API_BASE = '/api';

function authHeaders() {
  const token = localStorage.getItem('dl_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request(path, { method = 'GET', body, isForm = false } = {}) {
  const headers = {
    ...authHeaders(),
  };

  if (!isForm) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? (isForm ? body : JSON.stringify(body)) : undefined,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = data.message || `Request failed (${res.status})`;
    const error = new Error(message);
    error.status = res.status;
    error.payload = data;
    throw error;
  }
  return data;
}

export async function registerUser({ name, username, email, password, confirmPassword, aadhaar }) {
  const formData = new FormData();
  formData.append('name', name);
  formData.append('username', username);
  formData.append('email', email);
  formData.append('password', password);
  formData.append('confirmPassword', confirmPassword);
  formData.append('aadhaar', aadhaar);

  return request('/auth/register', {
    method: 'POST',
    body: formData,
    isForm: true,
  });
}

export async function loginUser({ identifier, password }) {
  return request('/auth/login', {
    method: 'POST',
    body: { identifier, password },
  });
}

export async function changePassword({ currentPassword, newPassword, confirmNewPassword }) {
  return request('/auth/change-password', {
    method: 'POST',
    body: { currentPassword, newPassword, confirmNewPassword },
  });
}

export async function getPendingRegistrations() {
  return request('/admin/registrations');
}

export async function getAadhaarReviewUrl(id) {
  return request(`/admin/users/${id}/aadhaar`);
}

export async function approveUser(id) {
  return request(`/admin/users/${id}/approve`, { method: 'PUT' });
}

export async function rejectUser(id, reason = '') {
  return request(`/admin/users/${id}/reject`, {
    method: 'PUT',
    body: { reason },
  });
}

export async function createBeneficiary({ name, username, email, initialPassword }) {
  return request('/beneficiaries', {
    method: 'POST',
    body: { name, username, email, initialPassword },
  });
}

export async function listBeneficiaries() {
  return request('/beneficiaries');
}

export function persistSession(token, user) {
  localStorage.setItem('dl_token', token);
  localStorage.setItem('dl_user', JSON.stringify(user));
}

export function clearSession() {
  localStorage.removeItem('dl_token');
  localStorage.removeItem('dl_user');
}

export function loadStoredSession() {
  const token = localStorage.getItem('dl_token');
  const userJson = localStorage.getItem('dl_user');
  if (!token || !userJson) return null;
  try {
    return { token, user: JSON.parse(userJson) };
  } catch {
    return null;
  }
}
