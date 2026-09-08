const API_BASE = '/api';

function authHeaders() {
  const token = sessionStorage.getItem('dl_token');

  return token
    ? { Authorization: `Bearer ${token}` }
    : {};
}

async function request(
  path,
  {
    method = 'GET',
    body,
    isForm = false,
  } = {}
) {
  const headers = {
    ...authHeaders(),
  };

  if (!isForm) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body
      ? isForm
        ? body
        : JSON.stringify(body)
      : undefined,
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const message =
      data.message ||
      `Request failed (${res.status})`;

    const error = new Error(message);

    error.status = res.status;
    error.payload = data;

    throw error;
  }

  return data;
}


/* =========================================================
   AUTHENTICATION
   ========================================================= */

export async function sendRegistrationOTP(phone) {
  return request('/auth/registration/send-otp', {
    method: 'POST',
    body: { phone },
  });
}

export async function verifyRegistrationOTP(phone, otp) {
  return request('/auth/registration/verify-otp', {
    method: 'POST',
    body: { phone, otp },
  });
}

export async function sendRegistrationEmailOTP(email) {
  return request('/auth/registration/email/send-otp', {
    method: 'POST',
    body: { email },
  });
}

export async function verifyRegistrationEmailOTP(email, otp) {
  return request('/auth/registration/email/verify-otp', {
    method: 'POST',
    body: { email, otp },
  });
}

export async function registerUser({
  name,
  username,
  email,
  emailVerificationToken,
  phone,
  phoneVerificationToken,
  password,
  confirmPassword,
  aadhaar,
}) {
  const formData = new FormData();

  formData.append('name', name);
  formData.append('username', username);
  formData.append('email', email);
  formData.append('emailVerificationToken', emailVerificationToken);
  formData.append('phone', phone);
  formData.append('phoneVerificationToken', phoneVerificationToken);
  formData.append('password', password);
  formData.append(
    'confirmPassword',
    confirmPassword
  );

  formData.append('aadhaar', aadhaar);

  return request('/auth/register', {
    method: 'POST',
    body: formData,
    isForm: true,
  });
}

export async function registerLawyer({
  name,
  username,
  email,
  password,
  confirmPassword,
  phone,
  city,
  state,
  enrollmentNumber,
  stateBarCouncil,
  yearsOfExperience,
  practiceAreas,
  credential,
}) {
  const formData = new FormData();

  formData.append('name', name);
  formData.append('username', username);
  formData.append('email', email);
  formData.append('password', password);
  formData.append('confirmPassword', confirmPassword);
  formData.append('phone', phone);
  formData.append('city', city);
  formData.append('state', state);
  formData.append('enrollmentNumber', enrollmentNumber);
  formData.append('stateBarCouncil', stateBarCouncil);

  if (yearsOfExperience !== '' && yearsOfExperience != null) {
    formData.append('yearsOfExperience', yearsOfExperience);
  }

  if (practiceAreas) {
    formData.append('practiceAreas', practiceAreas);
  }

  formData.append('credential', credential);

  return request('/auth/register-lawyer', {
    method: 'POST',
    body: formData,
    isForm: true,
  });
}


export async function loginUser({
  identifier,
  password,
}) {
  return request('/auth/login', {
    method: 'POST',
    body: {
      identifier,
      password,
    },
  });
}


/* =========================================================
   ADMIN
   ========================================================= */

export async function getPendingRegistrations() {
  const data = await request('/admin/registrations');
  return data.registrations || [];
}

export async function getAllUsers() {
  const data = await request('/admin/users');
  return data.users || [];
}

export async function updateUserStatus(id, status) {
  return request(
    `/admin/users/${id}/status`,
    {
      method: 'PUT',
      body: { status },
    }
  );
}

export async function getAadhaarReviewFile(
  userId
) {
  const token =
    sessionStorage.getItem(
      'dl_token'
    );

  const response =
    await fetch(
      `/api/admin/users/${userId}/aadhaar`,
      {
        headers: {
          Authorization:
            `Bearer ${token}`,
        },
      }
    );


  if (!response.ok) {

    const data =
      await response
        .json()
        .catch(
          () => ({})
        );

    throw new Error(
      data.message ||
      'Unable to open Aadhaar document.'
    );
  }


  return response.blob();
}

export async function getLawyerCredentialReviewUrl(id) {
  return request(
    `/admin/users/${id}/lawyer-credential`
  );
}

export async function approveUser(id) {
  return request(
    `/admin/users/${id}/approve`,
    {
      method: 'PUT',
    }
  );
}

export async function rejectUser(
  id,
  reason = ''
) {
  return request(
    `/admin/users/${id}/reject`,
    {
      method: 'PUT',
      body: {
        reason,
      },
    }
  );
}


/* =========================================================
   BENEFICIARY
   ========================================================= */

export async function createBeneficiary({
  name,
  username,
  email,
  initialPassword,
  aadhaar,
}) {
  const formData = new FormData();

  formData.append('name', name);
  formData.append('username', username);
  formData.append('email', email);
  formData.append('initialPassword', initialPassword);
  formData.append('aadhaar', aadhaar);

  return request(
    '/beneficiaries',
    {
      method: 'POST',
      body: formData,
      isForm: true,
    }
  );
}

export async function listBeneficiaries() {
  return request('/beneficiaries');
}


/* =========================================================
   SESSION MANAGEMENT
   ========================================================= */

export function persistSession(
  token,
  user
) {
  localStorage.removeItem('dl_token');
  localStorage.removeItem('dl_user');

  sessionStorage.setItem(
    'dl_token',
    token
  );

  sessionStorage.setItem(
    'dl_user',
    JSON.stringify(user)
  );
}

export function clearSession() {
  sessionStorage.removeItem('dl_token');
  sessionStorage.removeItem('dl_user');
  localStorage.removeItem('dl_token');
  localStorage.removeItem('dl_user');
}

export function loadStoredSession() {
  localStorage.removeItem('dl_token');
  localStorage.removeItem('dl_user');

  const token =
    sessionStorage.getItem('dl_token');

  const userJson =
    sessionStorage.getItem('dl_user');

  if (!token || !userJson) {
    return null;
  }

  try {
    const user = JSON.parse(userJson);

    return {
      token,
      user,
    };
  } catch {
    clearSession();
    return null;
  }
}


/* =========================================================
   PASSWORD CHANGE
   ========================================================= */

export async function requestPasswordChangeOTP() {
    return request(
        "/auth/change-password/request-otp",
        {
            method: "POST",
        }
    );
}

export async function verifyPasswordChangeOTP(
    otp
) {
    return request(
        "/auth/change-password/verify-otp",
        {
            method: "POST",

            body: {
                otp,
            },
        }
    );
}

export async function completePasswordChange({
    currentPassword,
    newPassword,
    confirmNewPassword,
}) {
    return request(
        "/auth/change-password/complete",
        {
            method: "POST",

            body: {
                currentPassword,
                newPassword,
                confirmNewPassword,
            },
        }
    );
}
