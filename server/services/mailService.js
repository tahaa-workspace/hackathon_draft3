import transporter, { getMailFrom } from '../config/mailer.js';

export async function sendTransactionalEmail({ to, subject, text, html }) {
  if (!to) {
    throw new Error('Email recipient is required.');
  }

  const info = await transporter.sendMail({
    from: getMailFrom(),
    to,
    subject,
    text,
    html,
  });

  return info;
}
