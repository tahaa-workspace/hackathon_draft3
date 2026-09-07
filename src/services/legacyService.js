const API_BASE = '/api';

function authHeaders() {
  const token = sessionStorage.getItem('dl_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request(path, { method = 'GET', body, isForm = false } = {}) {
  const headers = { ...authHeaders() };
  if (!isForm) headers['Content-Type'] = 'application/json';

  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? (isForm ? body : JSON.stringify(body)) : undefined,
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.message || `Request failed (${response.status})`);
    error.status = response.status;
    error.payload = data;
    throw error;
  }
  return data;
}

async function requestBlob(path) {
  const response = await fetch(`${API_BASE}${path}`, {
    method: 'GET',
    headers: { ...authHeaders() },
  });
  if (!response.ok) {
    let data = {};
    try { data = await response.json(); } catch {}
    const error = new Error(data.message || `Request failed (${response.status})`);
    error.status = response.status;
    error.payload = data;
    throw error;
  }
  return response.blob();
}

export async function submitLegacyClaim({
  identityProofType,
  deathCertificate,
  identityProof,
  supportingDocument,
  remarks,
}) {
  const formData = new FormData();
  formData.append('identityProofType', identityProofType);
  formData.append('deathCertificate', deathCertificate);
  formData.append('identityProof', identityProof);
  if (supportingDocument) formData.append('supportingDocument', supportingDocument);
  if (remarks) formData.append('remarks', remarks);
  return request('/legacy-claims', { method: 'POST', body: formData, isForm: true });
}

export async function getMyLegacyClaims() {
  const data = await request('/legacy-claims/mine');
  return data.claims || [];
}

export async function getAdminLegacyClaims() {
  const data = await request('/legacy-claims/admin');
  return data.claims || [];
}

export async function getApprovedLawyers() {
  const data = await request('/legacy-claims/admin/lawyers');
  return data.lawyers || [];
}

export async function reviewClaimAsAdmin(id, action, remarks = '') {
  return request(`/legacy-claims/admin/${id}/review`, {
    method: 'PUT',
    body: { action, remarks },
  });
}

export async function assignClaimToLawyer(id, lawyerId) {
  return request(`/legacy-claims/admin/${id}/assign-lawyer`, {
    method: 'PUT',
    body: { lawyerId },
  });
}

export async function getLawyerClaims() {
  const data = await request('/legacy-claims/lawyer');
  return data.claims || [];
}

export async function reviewClaimAsLawyer(id, action, remarks = '') {
  return request(`/legacy-claims/lawyer/${id}/review`, {
    method: 'PUT',
    body: { action, remarks },
  });
}

export async function getClaimInformationRequests(id) {
  const data = await request(`/legacy-claims/${id}/information-requests`);
  return data.informationRequests || [];
}

export async function requestClaimInformation(id, message) {
  return request(`/legacy-claims/${id}/request-more-information`, {
    method: 'PUT',
    body: { message },
  });
}

export async function rejectClaim(id, remarks) {
  return request(`/legacy-claims/${id}/reject`, {
    method: 'PUT',
    body: { remarks },
  });
}

export async function submitAdditionalClaimInformation(id, { files, responseMessage = '' }) {
  const formData = new FormData();
  (files || []).forEach((file) => formData.append('additionalDocuments', file));
  if (responseMessage) formData.append('responseMessage', responseMessage);
  return request(`/legacy-claims/${id}/additional-information`, {
    method: 'POST',
    body: formData,
    isForm: true,
  });
}

export async function getClaimFileUrl(id, kind) {
  return requestBlob(`/legacy-claims/${id}/files/${kind}`);
}

export async function getAdditionalClaimFile(id, requestId, fileIndex) {
  return requestBlob(`/legacy-claims/${id}/additional-files/${requestId}/${fileIndex}`);
}
