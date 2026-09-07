import ContactMessage from '../models/ContactMessage.js';
import transporter from '../config/mailer.js';

const CATEGORY_LABELS = {
  GENERAL: 'General Enquiry',
  ACCOUNT_SUPPORT: 'Account Support',
  BENEFICIARY_SUPPORT: 'Beneficiary Support',
  LEGACY_CLAIM_SUPPORT: 'Legacy Claim Support',
  LEGAL_ADVISOR: 'Legal Advisor Enquiry',
  TECHNICAL: 'Technical Issue',
};

function clean(value) {
  return String(value || '').trim();
}

function validEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export async function submitContactMessage(req, res) {
  try {
    const name = clean(req.body?.name);
    const email = clean(req.body?.email).toLowerCase();
    const category = clean(req.body?.category).toUpperCase();
    const subject = clean(req.body?.subject);
    const message = clean(req.body?.message);

    if (!name || !email || !category || !subject || !message) {
      return res.status(400).json({ message: 'Please complete all required contact fields.' });
    }

    if (name.length > 100) {
      return res.status(400).json({ message: 'Name must be 100 characters or fewer.' });
    }

    if (!validEmail(email) || email.length > 160) {
      return res.status(400).json({ message: 'Enter a valid email address.' });
    }

    if (!Object.hasOwn(CATEGORY_LABELS, category)) {
      return res.status(400).json({ message: 'Select a valid enquiry category.' });
    }

    if (subject.length < 3 || subject.length > 180) {
      return res.status(400).json({ message: 'Subject must be between 3 and 180 characters.' });
    }

    if (message.length < 10 || message.length > 3000) {
      return res.status(400).json({ message: 'Message must be between 10 and 3000 characters.' });
    }

    const contact = await ContactMessage.create({
      name,
      email,
      category,
      subject,
      message,
    });

    const receiver = process.env.CONTACT_RECEIVER_EMAIL || process.env.EMAIL_USER;
    let notificationSent = false;

    if (receiver && process.env.EMAIL_USER && process.env.EMAIL_APP_PASSWORD) {
      try {
        await transporter.sendMail({
          from: `"NextGen Vault Contact" <${process.env.EMAIL_USER}>`,
          to: receiver,
          replyTo: email,
          subject: `[NextGen Vault] ${CATEGORY_LABELS[category]} - ${subject}`,
          text: [
            'New NextGen Vault contact enquiry',
            '',
            `Reference: ${contact._id}`,
            `Name: ${name}`,
            `Email: ${email}`,
            `Category: ${CATEGORY_LABELS[category]}`,
            `Subject: ${subject}`,
            '',
            'Message:',
            message,
          ].join('\n'),
        });
        notificationSent = true;
      } catch (mailError) {
        console.error('Contact notification email failed:', mailError.message);
      }
    }

    return res.status(201).json({
      message: 'Your message has been received. Our team will review it shortly.',
      referenceId: contact._id.toString(),
      notificationSent,
    });
  } catch (error) {
    console.error('Submit contact message error:', error);
    return res.status(500).json({
      message: 'Unable to submit your message right now. Please try again.',
    });
  }
}
