import LegalRequest, { LEGAL_REQUEST_STATUSES } from '../models/LegalRequest.js';
import User from '../models/User.js';
import { createNotification } from '../services/notificationService.js';
import { legalRequestTemplate, claimStageTemplate } from '../services/emailTemplates.js';
import { writeAudit } from '../services/auditService.js';

function payload(item) {
  return {
    id: item._id.toString(),
    requester: item.requesterId && typeof item.requesterId === 'object'
      ? {
          id: item.requesterId._id.toString(),
          name: item.requesterId.name,
          username: item.requesterId.username,
          email: item.requesterId.email,
        }
      : item.requesterId,
    lawyer: item.lawyerId && typeof item.lawyerId === 'object'
      ? {
          id: item.lawyerId._id.toString(),
          name: item.lawyerId.name,
          username: item.lawyerId.username,
          email: item.lawyerId.email,
        }
      : item.lawyerId,
    requestType: item.requestType,
    subject: item.subject,
    description: item.description,
    status: item.status,
    lawyerRemarks: item.lawyerRemarks,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

function populate(query) {
  return query
    .populate('requesterId', 'name username email')
    .populate('lawyerId', 'name username email lawyerProfile');
}

export async function listAvailableLawyers(req, res) {
  const lawyers = await User.find({
    role: 'LAWYER',
    status: 'ACTIVE',
    'lawyerProfile.isAvailable': { $ne: false },
  })
    .select('name username email lawyerProfile.city lawyerProfile.state lawyerProfile.practiceAreas')
    .sort({ name: 1 })
    .lean();

  return res.status(200).json({
    lawyers: lawyers.map((lawyer) => ({
      id: lawyer._id.toString(),
      name: lawyer.name,
      username: lawyer.username,
      city: lawyer.lawyerProfile?.city || null,
      state: lawyer.lawyerProfile?.state || null,
      practiceAreas: lawyer.lawyerProfile?.practiceAreas || [],
    })),
  });
}

export async function createLegalRequest(req, res) {
  const { lawyerId, subject, description } = req.body;

  if (!lawyerId || !String(subject || '').trim() || !String(description || '').trim()) {
    return res.status(400).json({
      message: 'lawyerId, subject, and description are required.',
    });
  }

  const [lawyer, requester] = await Promise.all([
    User.findOne({
      _id: lawyerId,
      role: 'LAWYER',
      status: 'ACTIVE',
    }).select('name username email'),
    User.findById(req.user.id).select('name username email'),
  ]);

  if (!lawyer) {
    return res.status(404).json({ message: 'Selected lawyer is not available.' });
  }

  if (!requester) {
    return res.status(404).json({ message: 'Requester account not found.' });
  }

  const request = await LegalRequest.create({
    requesterId: requester._id,
    lawyerId: lawyer._id,
    subject: String(subject).trim(),
    description: String(description).trim(),
    status: 'PENDING',
  });

  const appUrl =
    (process.env.APP_BASE_URL || process.env.FRONTEND_URL || 'http://localhost:5173')
      .replace(/\/$/, '') + '/lawyer/consultations';

  await createNotification({
    req,
    recipientId: lawyer._id,
    type: 'LEGAL_REQUEST',
    title: 'New Legal Consultation Request',
    message: requester.name + ' requested a lifetime legal consultation: "' + request.subject + '".',
    relatedEntityType: 'LegalRequest',
    relatedEntityId: request._id,
    email: lawyer.email,
    emailContent: legalRequestTemplate({
      recipientName: lawyer.name,
      requesterName: requester.name,
      subject: request.subject,
      appUrl,
    }),
  });

  await writeAudit(req, {
    action: 'LEGAL_REQUEST_CREATED',
    entityType: 'LegalRequest',
    entityId: request._id,
    description: 'Direct lifetime legal consultation requested.',
    metadata: { lawyerId: lawyer._id.toString() },
  });

  const populated = await populate(LegalRequest.findById(request._id));
  return res.status(201).json({
    message: 'Legal consultation request submitted.',
    request: payload(populated),
  });
}

export async function listMyLegalRequests(req, res) {
  const requests = await populate(
    LegalRequest.find({ requesterId: req.user.id }).sort({ createdAt: -1 })
  );
  return res.status(200).json({ requests: requests.map(payload) });
}

export async function listAdminLegalRequests(req, res) {
  const {
    status,
    lawyerId,
    requesterId,
    page = '1',
    limit = '50',
  } = req.query;

  const filter = {};

  if (status) filter.status = status;
  if (lawyerId) filter.lawyerId = lawyerId;
  if (requesterId) filter.requesterId = requesterId;

  const safePage =
    Math.max(
      1,
      Number(page) || 1
    );

  const safeLimit =
    Math.min(
      100,
      Math.max(
        1,
        Number(limit) || 50
      )
    );

  const skip =
    (safePage - 1) *
    safeLimit;

  const [requests, total] =
    await Promise.all([
      populate(
        LegalRequest.find(filter)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(safeLimit)
      ),
      LegalRequest.countDocuments(filter),
    ]);

  return res.status(200).json({
    page:
      safePage,
    limit:
      safeLimit,
    total,
    requests:
      requests.map(payload),
  });
}

export async function listLawyerLegalRequests(req, res) {
  const requests = await populate(
    LegalRequest.find({ lawyerId: req.user.id }).sort({ createdAt: -1 })
  );
  return res.status(200).json({ requests: requests.map(payload) });
}

export async function updateLawyerLegalRequest(req, res) {
  const { status, lawyerRemarks = '' } = req.body;

  if (!LEGAL_REQUEST_STATUSES.includes(status)) {
    return res.status(400).json({ message: 'Invalid legal request status.' });
  }

  const allowedTransitions = {
    PENDING: ['ACCEPTED', 'REJECTED', 'CANCELLED'],
    ASSIGNED: ['ACCEPTED', 'REJECTED', 'CANCELLED'],
    ACCEPTED: ['IN_PROGRESS', 'REJECTED', 'CANCELLED'],
    IN_PROGRESS: ['COMPLETED', 'REJECTED', 'CANCELLED'],
    COMPLETED: [],
    REJECTED: [],
    CANCELLED: [],
  };

  const request = await LegalRequest.findOne({
    _id: req.params.id,
    lawyerId: req.user.id,
  });

  if (!request) {
    return res.status(404).json({ message: 'Legal request not found.' });
  }

  if (!allowedTransitions[request.status]?.includes(status)) {
    return res.status(400).json({
      message:
        'Legal request cannot move from ' + request.status + ' to ' + status + '.',
    });
  }

  request.status = status;
  request.lawyerRemarks = String(lawyerRemarks || '').trim();
  await request.save();

  const requester = await User.findById(request.requesterId).select('name email');

  if (requester) {
    const appUrl =
      (process.env.APP_BASE_URL || process.env.FRONTEND_URL || 'http://localhost:5173')
        .replace(/\/$/, '') + '/legal-assistance';

    const statusMessage =
      'Your legal consultation request is now ' +
      status.replaceAll('_', ' ').toLowerCase() + '.';

    await createNotification({
      req,
      recipientId: requester._id,
      type: 'LEGAL_REQUEST',
      title: 'Legal Consultation Updated',
      message: statusMessage,
      relatedEntityType: 'LegalRequest',
      relatedEntityId: request._id,
      email: requester.email,
      emailContent: claimStageTemplate({
        recipientName: requester.name,
        subject: 'Legal Consultation Updated – NextGen Vault',
        message: statusMessage,
        appUrl,
      }),
    });
  }

  await writeAudit(req, {
    action: 'LEGAL_REQUEST_UPDATED',
    entityType: 'LegalRequest',
    entityId: request._id,
    description: 'Lawyer updated a direct consultation request.',
    metadata: { status },
  });

  const populated = await populate(LegalRequest.findById(request._id));
  return res.status(200).json({
    message: 'Legal request updated.',
    request: payload(populated),
  });
}
