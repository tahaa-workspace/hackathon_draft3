const TWILIO_VERIFY_BASE = 'https://verify.twilio.com/v2/Services';

function getTwilioConfig() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const verifyServiceSid = process.env.TWILIO_VERIFY_SERVICE_SID;

  if (!accountSid || !authToken || !verifyServiceSid) {
    throw new Error(
      'SMS verification is not configured. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_VERIFY_SERVICE_SID.'
    );
  }

  return { accountSid, authToken, verifyServiceSid };
}

function basicAuth(accountSid, authToken) {
  return `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`;
}

async function twilioRequest(path, body) {
  const { accountSid, authToken, verifyServiceSid } = getTwilioConfig();
  const response = await fetch(
    `${TWILIO_VERIFY_BASE}/${encodeURIComponent(verifyServiceSid)}/${path}`,
    {
      method: 'POST',
      headers: {
        Authorization: basicAuth(accountSid, authToken),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams(body),
    }
  );

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(data.message || 'SMS verification provider request failed.');
    error.status = response.status;
    error.code = data.code;
    throw error;
  }

  return data;
}

export async function sendRegistrationOTP(phone) {
  return twilioRequest('Verifications', {
    To: phone,
    Channel: 'sms',
  });
}

export async function verifyRegistrationOTP(phone, code) {
  const result = await twilioRequest('VerificationCheck', {
    To: phone,
    Code: code,
  });

  return result.status === 'approved';
}
