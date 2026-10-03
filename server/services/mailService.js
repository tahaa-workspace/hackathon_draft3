import transporter, { getMailFrom } from '../config/mailer.js';

export async function sendTransactionalEmail({ to, subject, text, html, replyTo }) {
  if (!to) {
    throw new Error('Email recipient is required.');
  }

  const info = await transporter.sendMail({
    from: getMailFrom(),
    to,
    subject,
    text,
    html,
    ...(replyTo ? { replyTo } : {}),
  });

  return info;
}
