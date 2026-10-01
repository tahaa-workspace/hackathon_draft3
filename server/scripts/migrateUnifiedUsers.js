import 'dotenv/config';
import mongoose from 'mongoose';
import connectDB from '../config/db.js';
import User from '../models/User.js';
import Document from '../models/Document.js';
import LegacyAllocation from '../models/LegacyAllocation.js';

async function migrate() {
  await connectDB(process.env.MONGO_URI);

  const legacyUsers = await User.find({
    role: { $in: ['OWNER', 'BENEFICIARY'] },
  }).select('_id role');

  if (legacyUsers.length > 0) {
    await User.collection.updateMany(
      { role: { $in: ['OWNER', 'BENEFICIARY'] } },
      { $set: { role: 'USER' } }
    );
  }

  const documents = await Document.find({
    assignedBeneficiaries: { $exists: true, $ne: [] },
  }).select('_id ownerId assignedBeneficiaries');

  let createdAllocations = 0;

  for (const document of documents) {
    for (const recipientId of document.assignedBeneficiaries || []) {
      const exists = await LegacyAllocation.exists({
        assetId: document._id,
        allocatedTo: recipientId,
        status: { $ne: 'REVOKED' },
      });

      if (!exists) {
        await LegacyAllocation.create({
          assetId: document._id,
          allocatedBy: document.ownerId,
          allocatedTo: recipientId,
          permissions: { view: true, download: false },
          releaseCondition: 'LEGACY_CLAIM',
          status: 'ACTIVE',
        });
        createdAllocations += 1;
      }
    }
  }

  console.log('Unified user migration complete.');
  console.log('Converted user roles:', legacyUsers.length);
  console.log('Created legacy allocations:', createdAllocations);

  await mongoose.disconnect();
}

migrate().catch(async (error) => {
  console.error('Unified user migration failed:', error);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
