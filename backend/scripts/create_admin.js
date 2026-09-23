const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
require('dotenv').config();

const uri = process.env.MONGODB_URI || 'mongodb+srv://malikarbaz084_db_user:Arbaz%40010703@e-commercecluster0.alu2e4z.mongodb.net/?appName=E-commerceCluster0';

async function createAdmin() {
  await mongoose.connect(uri);
  const users = mongoose.connection.db.collection('users');
  const existing = await users.findOne({ email: 'admin@trendvolt.com' });
  const hash = await bcrypt.hash('AdminPass123!', 12);
  if (existing) {
    await users.updateOne({ email: 'admin@trendvolt.com' }, { $set: { password: hash, role: 'admin' } });
    console.log('Updated existing admin@trendvolt.com to role: admin');
  } else {
    await users.insertOne({
      name: 'TrendVolt Admin',
      email: 'admin@trendvolt.com',
      password: hash,
      role: 'admin',
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
