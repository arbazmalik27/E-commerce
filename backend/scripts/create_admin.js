const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error('Error: MONGODB_URI environment variable is required.');
  process.exit(1);
}

async function createAdmin() {
  await mongoose.connect(uri);
  const users = mongoose.connection.db.collection('users');
  const existing = await users.findOne({ email: 'admin@trendvolt.com' });
  const hash = await bcrypt.hash('AdminPass123!', 12);
  if (existing) {
    await users.updateOne({ email: 'admin@trendvolt.com' }, { $set: { password: hash, role: 'admin', isActive: true } });
    console.log('Updated existing admin@trendvolt.com to role: admin with isActive: true');
  } else {
    await users.insertOne({
      name: 'TrendVolt Admin',
      email: 'admin@trendvolt.com',
      password: hash,
      role: 'admin',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    console.log('Created admin@trendvolt.com with role: admin');
  }
  process.exit(0);
}

createAdmin().catch(e => {
  console.error(e);
  process.exit(1);
});
