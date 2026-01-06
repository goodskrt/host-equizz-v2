const mongoose = require('mongoose');

// LE DOCUMENT ANONYME (Pour Stats & IA)
const SubmissionSchema = new mongoose.Schema({
  quizId: { type: mongoose.Schema.Types.ObjectId, ref: 'Quiz', required: true },
  answers: [{
    questionId: { type: mongoose.Schema.Types.ObjectId },
    value: String // Le texte de la réponse ou l'option choisie
  }],
  // Résultat de l'IA stocké ici
  sentimentAnalysis: {
    score: { type: Number, default: 0 }, // -1 (Négatif) à 1 (Positif)
    magnitude: { type: Number, default: 0 }
  }
}, { timestamps: true });

SubmissionSchema.set('toJSON', {
  transform: function(doc, ret) {
    ret.id = ret._id.toString();
    delete ret._id;
    return ret;
  }
});

SubmissionSchema.set('toObject', {
  transform: function(doc, ret) {
    ret.id = ret._id.toString();
    delete ret._id;
    return ret;
  }
});

// LE LOG DE TRAÇABILITÉ (Pour empêcher les doublons, sans lier aux réponses)
const SubmissionLogSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  quizId: { type: mongoose.Schema.Types.ObjectId, ref: 'Quiz' },
  submittedAt: { type: Date, default: Date.now }
});

SubmissionLogSchema.set('toJSON', {
  transform: function(doc, ret) {
    ret.id = ret._id.toString();
    delete ret._id;
    return ret;
  }
});

SubmissionLogSchema.set('toObject', {
  transform: function(doc, ret) {
    ret.id = ret._id.toString();
    delete ret._id;
    return ret;
  }
});

// Index unique composé pour empêcher un étudiant de répondre 2 fois au même quiz
SubmissionLogSchema.index({ studentId: 1, quizId: 1 }, { unique: true });

module.exports = {
  Submission: mongoose.model('Submission', SubmissionSchema),
  SubmissionLog: mongoose.model('SubmissionLog', SubmissionLogSchema)
};
