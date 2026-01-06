const mongoose = require('mongoose');

const QuestionSchema = new mongoose.Schema({
  text: { type: String, required: true },
  type: { type: String, enum: ['MCQ', 'OPEN', 'CLOSED'], required: true }, // QCM, Ouverte, Fermée (Oui/Non)
  options: [{
    text: { type: String, required: true },
    order: { type: Number, required: true }
  }], // Pour QCM
  correctAnswer: { type: String }, // Optionnel (pour l'auto-correction future)
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course' },
  academicYearId: { type: mongoose.Schema.Types.ObjectId, ref: 'AcademicYear', required: true },
  classId: { type: mongoose.Schema.Types.ObjectId, ref: 'Class', required: true },
  order: { type: Number, default: 0 }
}, { timestamps: true });

// Transform pour mapper _id vers id
QuestionSchema.set('toJSON', {
  transform: function(doc, ret) {
    ret.id = ret._id.toString();
    delete ret._id;
    return ret;
  }
});

QuestionSchema.set('toObject', {
  transform: function(doc, ret) {
    ret.id = ret._id.toString();
    delete ret._id;
    return ret;
  }
});

const QuizSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course' },
  academicYearId: { type: mongoose.Schema.Types.ObjectId, ref: 'AcademicYear', required: true },
  classId: { type: mongoose.Schema.Types.ObjectId, ref: 'Class', required: true },
  semesterId: { type: mongoose.Schema.Types.ObjectId, ref: 'Semester' },
  type: { type: String, enum: ['MI_PARCOURS', 'FINAL'], required: true }, // ✅ String au lieu d'ObjectId
  status: { type: String, enum: ['DRAFT', 'PUBLISHED', 'ARCHIVED'], default: 'DRAFT' },
  questions: [{
    questionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Question' },
    textSnapshot: String, // Copie pour intégrité historique
    qType: String,
    optionsSnapshot: [String] // Tableau de strings pour compatibilité mobile
  }],
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  deadline: { type: Date }, // Alias pour endDate pour compatibilité
  
  // Champs de compatibilité avec l'ancien schéma backend2
  isPublished: { type: Boolean, default: false },
  questionCount: { type: Number, default: 0 },
  responseCount: { type: Number, default: 0 }
}, { timestamps: true });

// Transform pour mapper _id vers id
QuizSchema.set('toJSON', {
  transform: function(doc, ret) {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

QuizSchema.set('toObject', {
  transform: function(doc, ret) {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

module.exports = {
  Question: mongoose.model('Question', QuestionSchema),
  Quiz: mongoose.model('Quiz', QuizSchema)
};
