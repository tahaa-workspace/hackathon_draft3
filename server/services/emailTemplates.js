function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function brandedLayout({ title, intro, body, actionUrl, actionLabel }) {
  const safeTitle = escapeHtml(title);
  const safeIntro = escapeHtml(intro);
  const safeBody = body || '';
  const button = actionUrl
    ? '<p style="margin:24px 0"><a href="' + escapeHtml(actionUrl) + '" style="display:inline-block;padding:12px 18px;border-radius:10px;background:#4f46e5;color:#fff;text-decoration:none;font-weight:700">' + escapeHtml(actionLabel || 'Open NextGen Vault') + '</a></p>'
    : '';

  return `
    <div style="font-family:Arial,sans-serif;background:#f8fafc;padding:32px">
      <div style="max-width:620px;margin:auto;background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:28px">
        <h2 style="margin:0;color:#0f172a">NextGen Vault</h2>
        <h3 style="margin:18px 0 8px;color:#1e293b">${safeTitle}</h3>
        <p style="color:#475569;line-height:1.6">${safeIntro}</p>
        <div style="color:#475569;line-height:1.7">${safeBody}</div>
        ${button}
        <p style="margin-top:28px;color:#94a3b8;font-size:12px">Do not forward sensitive emails or verification codes. Sign in to NextGen Vault to access protected information.</p>
      </div>
    </div>
  `;
}

export function registrationVerificationLinkTemplate({ name = 'there', verificationUrl }) {
  return {
    subject: 'Verify Your Email – NextGen Vault',
    text: `Hello ${name},

Verify your NextGen Vault email address using this link:
${verificationUrl}

This link expires in 30 minutes and can be used only once.

Regards,
NextGen Vault`,
    html: brandedLayout({
      title: 'Verify your email',
      intro: `Hello ${name}, verify your email address to complete your NextGen Vault account verification.`,
      body: '<p>This verification link expires in <strong>30 minutes</strong> and can be used only once.</p>',
      actionUrl: verificationUrl,
      actionLabel: 'Verify Email',
    }),
  };
}

export function registrationOtpTemplate({ name = 'there', otp }) {
  return {
    subject: 'Verify Your Email – NextGen Vault',
    text: `Hello ${name},

Your NextGen Vault verification code is ${otp}.

This code expires in 5 minutes.

Regards,
NextGen Vault`,
    html: brandedLayout({
      title: 'Verify your email',
      intro: `Hello ${name}, use the verification code below to continue your registration.`,
      body: '<div style="margin:22px 0;padding:18px;border-radius:12px;background:#f1f5f9;text-align:center;font-size:30px;letter-spacing:8px;font-weight:700;color:#0f172a">' + escapeHtml(otp) + '</div><p>This code expires in <strong>5 minutes</strong>.</p>',
    }),
  };
}

export function securityOtpTemplate({
  recipientName = 'there',
  purpose = 'account verification',
  otp,
}) {
  const purposeTitle =
    String(purpose || 'account verification')
      .replace(/\b\w/g, (letter) => letter.toUpperCase());

  return {
    subject: purposeTitle + ' – NextGen Vault',
    text: `Hello ${recipientName},

Your NextGen Vault ${purpose} code is ${otp}.

This code expires in 5 minutes.

If you did not request this action, ignore this email.

Regards,
NextGen Vault`,
    html: brandedLayout({
      title: purposeTitle,
      intro: `Hello ${recipientName}, use the code below to continue ${purpose}.`,
      body:
        '<div style="margin:22px 0;padding:18px;border-radius:12px;background:#f1f5f9;text-align:center;font-size:30px;letter-spacing:8px;font-weight:700;color:#0f172a">' +
        escapeHtml(otp) +
        '</div><p>This code expires in <strong>5 minutes</strong>.</p>',
    }),
  };
}

export function legacyAllocationTemplate({ recipientName, allocatorName, assetName, allocationDate, status, appUrl }) {
  return {
    subject: 'You’ve Been Assigned a New Legacy Document – NextGen Vault',
    text: `Hello ${recipientName},

You have been assigned a new legacy document on NextGen Vault.

Document: ${assetName}
Assigned by: ${allocatorName}
Allocation date: ${allocationDate}
Status: ${status}

Please sign in to NextGen Vault and open Legacy Access to review the allocation and begin the claim process when eligible.

Regards,
NextGen Vault`,
    html: brandedLayout({
      title: 'New legacy document allocation',
      intro: `Hello ${recipientName}, a new legacy document has been allocated to your account.`,
      body: '<p><strong>Document:</strong> ' + escapeHtml(assetName) + '</p><p><strong>Assigned by:</strong> ' + escapeHtml(allocatorName) + '</p><p><strong>Allocation date:</strong> ' + escapeHtml(allocationDate) + '</p><p><strong>Status:</strong> ' + escapeHtml(status) + '</p>',
      actionUrl: appUrl,
      actionLabel: 'Open Legacy Access',
    }),
  };
}

export function claimStageTemplate({ recipientName, subject, message, appUrl }) {
  return {
    subject,
    text: `Hello ${recipientName},

${message}

Sign in to NextGen Vault to view the current claim status.

Regards,
NextGen Vault`,
    html: brandedLayout({
      title: subject.replace(' – NextGen Vault', ''),
      intro: `Hello ${recipientName},`,
      body: '<p>' + escapeHtml(message) + '</p>',
      actionUrl: appUrl,
      actionLabel: 'View Legacy Access',
    }),
  };
}

export function legalRequestTemplate({ recipientName, requesterName, subject, appUrl }) {
  return {
    subject: 'New Legal Consultation Request – NextGen Vault',
    text: `Hello ${recipientName},

${requesterName} has submitted a legal consultation request.

Subject: ${subject}

Sign in to NextGen Vault to review the request.

Regards,
NextGen Vault`,
    html: brandedLayout({
      title: 'New legal consultation request',
      intro: `Hello ${recipientName}, ${requesterName} has submitted a consultation request.`,
      body: '<p><strong>Subject:</strong> ' + escapeHtml(subject) + '</p>',
      actionUrl: appUrl,
      actionLabel: 'Open Consultations',
    }),
  };
}
