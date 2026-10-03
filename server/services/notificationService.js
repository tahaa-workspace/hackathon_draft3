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
  let notification = null;

  try {
    notification = await Notification.create({
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
  } catch (error) {
    console.error('Persistent notification creation failed:', error.message);

    if (req) {
      await writeAudit(req, {
        action: 'NOTIFICATION_CREATE_FAILED',
        entityType: relatedEntityType || 'Notification',
        entityId: relatedEntityId || null,
        description:
          'A workflow event completed but its persistent notification could not be created.',
        metadata: {
          type,
          recipientId: String(recipientId),
          reason: error.message,
        },
        status: 'FAILED',
      });
    }
  }

  if (email && emailContent) {
    try {
      await sendTransactionalEmail({
        to: email,
        ...emailContent,
      });

      if (notification) {
        notification.emailSent = true;
        notification.emailSentAt = new Date();

        try {
          await notification.save();
        } catch (saveError) {
          console.error(
            'Notification email delivery metadata update failed:',
            saveError.message
          );
        }
      }

      if (req) {
        await writeAudit(req, {
          action: 'EMAIL_SENT',
          entityType: 'Notification',
          entityId: notification?._id || relatedEntityId || null,
          description: 'Transactional notification email sent.',
          metadata: {
            type,
            recipientId: String(recipientId),
            notificationPersisted: Boolean(notification),
          },
        });
      }
    } catch (error) {
      console.error('Notification email delivery failed:', error.message);

      if (req) {
        await writeAudit(req, {
          action: 'EMAIL_FAILED',
          entityType: 'Notification',
          entityId: notification?._id || relatedEntityId || null,
          description: 'Transactional notification email failed.',
          metadata: {
            type,
            recipientId: String(recipientId),
            reason: error.message,
            notificationPersisted: Boolean(notification),
          },
          status: 'FAILED',
        });
      }
    }
  }

  return notification;
}
