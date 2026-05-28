const mongoose = require('mongoose');
require('dotenv').config();

(async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const User = require('./models/User');
    const result = await User.updateOne(
      { email: 'Admin@gmail.com' },
      { $set: { role: 'admin' } }
    );
    console.log('✓ Admin role assigned to Admin@gmail.com');
    console.log('Modified:', result.modifiedCount, 'document(s)');
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('✗ Error:', error.message);
    process.exit(1);
  }
})();
