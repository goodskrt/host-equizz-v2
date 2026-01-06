// utils/createDefaultAdmin.js
const User = require('../models/User');
const bcrypt = require('bcryptjs');

async function createDefaultAdmin() {
  const adminExists = await User.findOne({ role: 'ADMIN' });
  if (!adminExists) {
    const hashedPassword = await bcrypt.hash('admin123', 10); // mot de passe par défaut
    const admin = new User({
      firstName: 'Admin',
      lastName: 'System',
      email: 'admin@institutsaintjean.org',
      password: hashedPassword,
      role: 'ADMIN',
    });
    await admin.save();
  //   console.log('Admin par défaut créé : admin@institutsaintjean.org / admin123');
  // } else {
  //   console.log('Admin existant détecté, création non nécessaire.');
  }
}

module.exports = createDefaultAdmin;
