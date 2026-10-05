import Notification from '../models/Notification.js';
import { sendTransactionalEmail } from './mailService.js';
import { writeAudit } from './auditService.js';

export async function createNotification({
  req = null,
  recipientId,
  type,
  title,
  message,
  relatedEntityType = null,
  relatedEntityId = null,
  email = null,
  emailContent = null,
}) {
  const notification = await Notification.create({
    recipientId,
    type,
    title,
    message,
    relatedEntityType,
    relatedEntityId,
  });

  if (req) {
    await writeAudit(req, {
      action: 'NOTIFICATION_CREATED',
      entityType: 'Notification',
      entityId: notification._id,
      description: 'Persistent in-app notification created.',
      metadata: {
        type,
        recipientId: String(recipientId),
        relatedEntityType,
        relatedEntityId: relatedEntityId ? String(relatedEntityId) : null,
      },
    });
  }

  if (email && emailContent) {
    try {
      await sendTransactionalEmail({
        to: email,
        ...emailContent,
      });

      notification.emailSent = true;
      notification.emailSentAt = new Date();
      await notification.save();

      if (req) {
        await writeAudit(req, {
          action: 'EMAIL_SENT',
          entityType: 'Notification',
          entityId: notification._id,
          description: 'Transactional notification email sent.',
          metadata: { type, recipientId: String(recipientId) },
        });
      }
    } catch (error) {
      console.error('Notification email delivery failed:', error.message);

      if (req) {
        await writeAudit(req, {
          action: 'EMAIL_FAILED',
          entityType: 'Notification',
          entityId: notification._id,
          description: 'Transactional notification email failed.',
          metadata: {
            type,
            recipientId: String(recipientId),
            reason: error.message,
          },
          status: 'FAILED',
        });
      }
    }
  }

  return notification;
}
