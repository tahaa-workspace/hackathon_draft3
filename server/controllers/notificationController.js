import Notification from '../models/Notification.js';
import { writeAudit } from '../services/auditService.js';

function payload(item) {
  return {
    id: item._id.toString(),
    type: item.type,
    title: item.title,
    message: item.message,
    relatedEntityType: item.relatedEntityType,
    relatedEntityId: item.relatedEntityId?.toString?.() || item.relatedEntityId || null,
    isRead: item.isRead,
    emailSent: item.emailSent,
    createdAt: item.createdAt,
  };
}

export async function listNotifications(req, res) {
  const notifications = await Notification.find({ recipientId: req.user.id })
    .sort({ createdAt: -1 })
    .limit(100);
  return res.status(200).json({ notifications: notifications.map(payload) });
}

export async function unreadNotificationCount(req, res) {
  const count = await Notification.countDocuments({
    recipientId: req.user.id,
    isRead: false,
  });
  return res.status(200).json({ count });
}

export async function markNotificationRead(req, res) {
  const notification = await Notification.findOneAndUpdate(
    { _id: req.params.id, recipientId: req.user.id },
    { $set: { isRead: true } },
    { new: true }
  );

  if (!notification) {
    return res.status(404).json({ message: 'Notification not found.' });
  }

  await writeAudit(req, {
    action: 'NOTIFICATION_READ',
    entityType: 'Notification',
    entityId: notification._id,
  });

  return res.status(200).json({ notification: payload(notification) });
}

export async function markAllNotificationsRead(req, res) {
  const result = await Notification.updateMany(
    { recipientId: req.user.id, isRead: false },
    { $set: { isRead: true } }
  );
  return res.status(200).json({ updated: result.modifiedCount });
}
