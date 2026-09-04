const API_BASE = '/api';

/*
 * Return the authentication header for protected API calls.
 *
 * sessionStorage is used instead of localStorage so that
 * the login does not survive after the browser/tab session ends.
 */
function authHeaders() {
  const token = sessionStorage.getItem('dl_token');

  return token
    ? { Authorization: `Bearer ${token}` }
    : {};
}


/*
 * Common API request helper.
 */
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

  /*
   * Do not manually set Content-Type for FormData.
   * The browser will automatically add the correct
   * multipart/form-data boundary.
   */
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

export async function registerUser({
  name,
  username,
  email,
  password,
  confirmPassword,
  aadhaar,
}) {
  const formData = new FormData();

  formData.append('name', name);
  formData.append('username', username);
  formData.append('email', email);
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

  if (yearsOfExperience !== '') {
    formData.append('yearsOfExperience', yearsOfExperience);
  }

  if (practiceAreas?.trim()) {
    formData.append('practiceAreas', practiceAreas.trim());
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


export async function changePassword({
  currentPassword,
  newPassword,
  confirmNewPassword,
}) {
  return request('/auth/change-password', {
    method: 'POST',
    body: {
      currentPassword,
      newPassword,
      confirmNewPassword,
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


export async function getAadhaarReviewUrl(id) {
  return request(
    `/admin/users/${id}/aadhaar`
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
}) {
  return request('/beneficiaries', {
    method: 'POST',
    body: {
      name,
      username,
      email,
      initialPassword,
    },
  });
}


export async function listBeneficiaries() {
  return request('/beneficiaries');
}


/* =========================================================
   SESSION MANAGEMENT
   ========================================================= */

/*
 * Save authentication only for the current browser session.
 *
 * IMPORTANT:
 * Previously this used localStorage. localStorage survives
 * browser restarts, which caused the previous Admin account
 * to automatically appear logged in when the app was reopened.
 */
export function persistSession(
  token,
  user
) {
  /*
   * Remove data created by the old version of the app.
   */
  localStorage.removeItem('dl_token');
  localStorage.removeItem('dl_user');

  /*
   * Save only for the current browser session.
   */
  sessionStorage.setItem(
    'dl_token',
    token
  );

  sessionStorage.setItem(
    'dl_user',
    JSON.stringify(user)
  );
}


/*
 * Logout completely.
 */
export function clearSession() {
  /*
   * Current session data.
   */
  sessionStorage.removeItem('dl_token');
  sessionStorage.removeItem('dl_user');

  /*
   * Also remove any old persistent data
   * left by earlier versions of the application.
   */
  localStorage.removeItem('dl_token');
  localStorage.removeItem('dl_user');
}


/*
 * Restore a login only if the current browser session
 * still has valid session data.
 */
export function loadStoredSession() {
  /*
   * Always remove the old persistent localStorage
   * login information.
   */
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
    /*
     * If stored user data is damaged,
     * clean everything instead of crashing.
     */
    clearSession();

    return null;
  }
}