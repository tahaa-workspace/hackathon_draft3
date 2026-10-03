import nodemailer from 'nodemailer';

const host = process.env.MAIL_HOST || 'smtp.gmail.com';
const port = Number(process.env.MAIL_PORT || 465);
const secure =
  String(process.env.MAIL_SECURE ?? (port === 465))
    .toLowerCase() === 'true';

const user = process.env.MAIL_USER || process.env.EMAIL_USER;
const pass = process.env.MAIL_PASSWORD || process.env.EMAIL_APP_PASSWORD;

const transporter = nodemailer.createTransport({
  host,
  port,
  secure,
  auth: user && pass ? { user, pass } : undefined,
});

export function getMailFrom() {
  return process.env.MAIL_FROM || `NextGen Vault <${user || 'no-reply@nextgen-vault.local'}>`;
}

export async function verifyMailer() {
  if (!user || !pass) {
    throw new Error('SMTP credentials are not configured.');
  }
  return transporter.verify();
}

export default transporter;
