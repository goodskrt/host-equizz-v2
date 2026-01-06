const mongoose = require('mongoose');

const EmailSchema = new mongoose.Schema({
  subject: { type: String, required: true },
  message: { type: String, required: true },
  recipients: [{
    email: { type: String, required: true },
    name: { type: String },
    status: { 
      type: String, 
      enum: ['PENDING', 'SENT', 'FAILED'], 
      default: 'PENDING' 
    },
    sentAt: { type: Date },
    error: { type: String }
  }],
  
  // Type d'email
  type: { 
    type: String, 
    enum: ['QUIZ_PUBLICATION', 'MANUAL'], 
    required: true 
  },
  
  // Références optionnelles
  quizId: { type: mongoose.Schema.Types.ObjectId, ref: 'Quiz' },
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course' },
  classId: { type: mongoose.Schema.Types.ObjectId, ref: 'Class' },
  
  // Statistiques
  totalRecipients: { type: Number, default: 0 },
  successCount: { type: Number, default: 0 },
  failedCount: { type: Number, default: 0 },
  
  // Métadonnées
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  sentAt: { type: Date },
  status: { 
    type: String, 
    enum: ['DRAFT', 'SENDING', 'SENT', 'FAILED'], 
    default: 'DRAFT' 
  }
}, { timestamps: true });

// Transform pour mapper _id vers id
EmailSchema.set('toJSON', {
  transform: function(doc, ret) {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

EmailSchema.set('toObject', {
  transform: function(doc, ret) {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

// Index pour les performances
EmailSchema.index({ type: 1, createdAt: -1 });
EmailSchema.index({ quizId: 1 });
EmailSchema.index({ classId: 1 });
EmailSchema.index({ status: 1 });

module.exports = mongoose.model('Email', EmailSchema);