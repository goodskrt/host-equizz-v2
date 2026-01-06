const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
  matricule: { type: String, unique: true, sparse: true }, // Pour les étudiants
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  role: { type: String, enum: ['STUDENT', 'ADMIN'], default: 'STUDENT' },
  classId: { type: mongoose.Schema.Types.ObjectId, ref: 'Class' }, // Classe actuelle
  fcmTokens: [{ type: String }], // Pour les notifs push - tableau pour plusieurs appareils
}, { timestamps: true });

// Hash du mot de passe avant sauvegarde
UserSchema.pre('save', async function () {
  if (!this.isModified('password')) return;

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Méthode pour vérifier le mot de passe
UserSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

UserSchema.set('toJSON', {
  transform: function(doc, ret) {
    ret.id = ret._id.toString();
    delete ret._id;
    return ret;
  }
});

UserSchema.set('toObject', {
  transform: function(doc, ret) {
    ret.id = ret._id.toString();
    delete ret._id;
    return ret;
  }
});

module.exports = mongoose.model('User', UserSchema);
