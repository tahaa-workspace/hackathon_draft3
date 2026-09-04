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

  return request('/legacy-claims', {
    method: 'POST',
    body: formData,
    isForm: true,
  });
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

export async function getClaimFileUrl(id, kind) {
  return request(`/legacy-claims/${id}/files/${kind}`);
}
