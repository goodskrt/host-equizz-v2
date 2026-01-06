const mongoose = require('mongoose');

const AnalyseSentimentSchema = new mongoose.Schema({
  questionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Question', required: true },
  quizId: { type: mongoose.Schema.Types.ObjectId, ref: 'Quiz', required: false }, // Nouvelle référence au quiz
  dateAnalyse: { type: Date, default: Date.now },
  nombreReponses: { type: Number, required: true },
  resultats: {
    positif: {
      count: { type: Number, default: 0 },
      pourcentage: { type: Number, default: 0 },
      exemples: [{ type: String }]
    },
    negatif: {
      count: { type: Number, default: 0 },
      pourcentage: { type: Number, default: 0 },
      exemples: [{ type: String }]
    },
    neutre: {
      count: { type: Number, default: 0 },
      pourcentage: { type: Number, default: 0 },
      exemples: [{ type: String }]
    }
  },
  themes: [{
    libelle: { type: String, required: true },
    frequence: { type: Number, default: 0 },
    sentiment: { type: String, enum: ['positif', 'negatif', 'neutre'], required: true },
    motsAssocies: [{ type: String }]
  }]
}, { timestamps: true });

AnalyseSentimentSchema.set('toJSON', {
  transform: function(doc, ret) {
    ret.id = ret._id.toString();
    delete ret._id;
    return ret;
  }
});

AnalyseSentimentSchema.set('toObject', {
  transform: function(doc, ret) {
    ret.id = ret._id.toString();
    delete ret._id;
    return ret;
  }
});

module.exports = mongoose.model('AnalyseSentiment', AnalyseSentimentSchema);