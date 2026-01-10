const mongoose = require('mongoose');
const Listing = require('../models/listing');
const User = require('../models/user');

// Usage:
// node scripts/fix_orphans.js             -> report orphaned listings
// node scripts/fix_orphans.js --assign <USER_ID>  -> assign USER_ID to all orphaned listings
// node scripts/fix_orphans.js --delete    -> delete all orphaned listings

const argv = process.argv.slice(2);
const assignIndex = argv.indexOf('--assign');
const deleteFlag = argv.includes('--delete');

const MONGO_URL = process.env.MONGO_URL || process.env.MONGODB_URI || 'mongodb://localhost:27017/airbnb';

async function main() {
  try {
    await mongoose.connect(MONGO_URL, { useNewUrlParser: true, useUnifiedTopology: true });
    console.log('Connected to MongoDB:', MONGO_URL);

    // Find listings where owner is missing or null
    const orphans = await Listing.find({ $or: [{ owner: { $exists: false } }, { owner: null }] });

    if (!orphans || orphans.length === 0) {
      console.log('No orphaned listings found.');
      return process.exit(0);
    }

    console.log(`Found ${orphans.length} orphaned listing(s):`);
    orphans.forEach(l => console.log(`- ${l._id} | ${l.title || '(no title)'} | ${l.location || '(no location)'}`));

    if (assignIndex !== -1 && argv[assignIndex + 1]) {
      const userId = argv[assignIndex + 1];
      // Verify user exists
      const user = await User.findById(userId);
      if (!user) {
        console.error(`User with id ${userId} not found. Aborting assignment.`);
        return process.exit(1);
      }

      const res = await Listing.updateMany(
        { $or: [{ owner: { $exists: false } }, { owner: null }] },
        { $set: { owner: userId } }
      );

      console.log(`Assigned owner ${userId} to ${res.modifiedCount || res.nModified || 0} listing(s).`);
      return process.exit(0);
    }

    if (deleteFlag) {
      const res = await Listing.deleteMany({ $or: [{ owner: { $exists: false } }, { owner: null }] });
      console.log(`Deleted ${res.deletedCount || res.n || 0} orphaned listing(s).`);
      return process.exit(0);
    }

    console.log('\nNo action taken. To assign a user: `--assign <USER_ID>`. To delete: `--delete`.');
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  } finally {
    try { await mongoose.connection.close(); } catch (e) {}
  }
}

main();
