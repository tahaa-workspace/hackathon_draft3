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
  allocationId,
  identityProofType,
  deathCertificate,
  identityProof,
  supportingDocument,
  remarks,
}) {
  const formData = new FormData();
  formData.append('allocationId', allocationId);
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



export async function reviewClaimAsAdmin(id, action, remarks = '') {
  return request(`/legacy-claims/admin/${id}/review`, {
    method: 'PUT',
    body: { action, remarks },
  });
}

export async function getLawyersForSelection() {
  const data =
    await request(
      '/legacy-claims/lawyers'
    );

  return data.lawyers || [];
}


export async function selectClaimLawyer(
  claimId,
  lawyerId
) {
  return request(
    `/legacy-claims/${claimId}/select-lawyer`,
    {
      method: 'PUT',

      body: {
        lawyerId,
      },
    }
  );
}


export async function getLawyerAvailability() {
  return request(
    '/legacy-claims/lawyer/availability'
  );
}


export async function updateLawyerAvailability(
  isAvailable
) {
  return request(
    '/legacy-claims/lawyer/availability',
    {
      method: 'PUT',

      body: {
        isAvailable,
      },
    }
  );
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


/* =========================================================
   UNIFIED USER LEGACY ALLOCATIONS
   ========================================================= */



export async function openDocument(documentId) {
  return requestBlob('/documents/' + documentId + '/view');
}

export async function downloadDocument(documentId) {
  return requestBlob('/documents/' + documentId + '/download');
}

export async function deleteDocument(documentId) {
  return request('/documents/' + documentId, {
    method: 'DELETE',
  });
}

export async function getIncomingAllocations() {
  const data = await request('/legacy-allocations/incoming');
  return data.allocations || [];
}

export async function getOutgoingAllocations() {
  const data = await request('/legacy-allocations/outgoing');
  return data.allocations || [];
}

export async function searchAllocationUsers(query) {
  const data = await request(
    '/legacy-allocations/users/search?q=' + encodeURIComponent(query)
  );
  return data.users || [];
}

export async function createLegacyAllocation(payload) {
  return request('/legacy-allocations', {
    method: 'POST',
    body: payload,
  });
}

export async function revokeLegacyAllocation(id) {
  return request('/legacy-allocations/' + id, {
    method: 'DELETE',
  });
}

export async function getNotifications() {
  const data = await request('/notifications');
  return data.notifications || [];
}

export async function getUnreadNotificationCount() {
  return request('/notifications/unread-count');
}

export async function markNotificationRead(id) {
  return request('/notifications/' + id + '/read', {
    method: 'PATCH',
  });
}

export async function markAllNotificationsRead() {
  return request('/notifications/read-all', {
    method: 'PATCH',
  });
}

export async function getAdminAuditLogs(params = {}) {
  const query = new URLSearchParams(
    Object.entries(params).filter(([, value]) => value !== '' && value != null)
  );
  const data = await request(
    '/admin/audit-logs' + (query.toString() ? '?' + query.toString() : '')
  );
  return data.logs || [];
}


/* =========================================================
   DIRECT LIFETIME LEGAL CONSULTATION
   ========================================================= */

export async function getAvailableConsultationLawyers() {
  const data = await request('/legal-requests/lawyers');
  return data.lawyers || [];
}

export async function createLegalConsultation(payload) {
  return request('/legal-requests', {
    method: 'POST',
    body: payload,
  });
}

export async function getMyLegalConsultations() {
  const data = await request('/legal-requests/mine');
  return data.requests || [];
}

export async function getLawyerConsultations() {
  const data = await request('/legal-requests/lawyer');
  return data.requests || [];
}

export async function updateLawyerConsultation(id, payload) {
  return request('/legal-requests/lawyer/' + id, {
    method: 'PATCH',
    body: payload,
  });
}
