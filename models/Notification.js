const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({
  titre: { type: String, required: true },
  message: { type: String, required: true },
  type: { type: String, enum: ['INFO', 'QUIZ', 'RAPPEL', 'URGENT'], required: true },
  destinataires: { type: String, enum: ['ALL', 'CLASSE', 'COURS'], required: true },
  classeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Class' },
  coursId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course' },
  estEnvoyee: { type: Boolean, default: false },
  dateEnvoi: { type: Date },
  nombreDestinataires: { type: Number, default: 0 }
}, { timestamps: true });

NotificationSchema.set('toJSON', {
  transform: function(doc, ret) {
    ret.id = ret._id.toString();
    delete ret._id;
    return ret;
  }
});

NotificationSchema.set('toObject', {
  transform: function(doc, ret) {
    ret.id = ret._id.toString();
    delete ret._id;
    return ret;
  }
});

module.exports = mongoose.model('Notification', NotificationSchema);