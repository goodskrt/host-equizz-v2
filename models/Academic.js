const mongoose = require('mongoose');

const AcademicYearSchema = new mongoose.Schema({
  label: { type: String, required: true }, // ex: "2025-2026"
  startDate: { type: Date }, // Date de début
  endDate: { type: Date }, // Date de fin
  isCurrent: { type: Boolean, default: false }
}, { timestamps: true });

AcademicYearSchema.set('toJSON', {
  transform: function(doc, ret) {
    ret.id = ret._id.toString();
    delete ret._id;
    return ret;
  }
});

AcademicYearSchema.set('toObject', {
  transform: function(doc, ret) {
    ret.id = ret._id.toString();
    delete ret._id;
    return ret;
  }
});

const SemesterSchema = new mongoose.Schema({
  number: { type: Number, required: true, enum: [1, 2] }, // 1 ou 2
  label: { type: String, required: true }, // ex: "Semestre 1"
  academicYear: { type: mongoose.Schema.Types.ObjectId, ref: 'AcademicYear', required: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true }
}, { timestamps: true });

SemesterSchema.set('toJSON', {
  transform: function(doc, ret) {
    ret.id = ret._id.toString();
    delete ret._id;
    return ret;
  }
});

SemesterSchema.set('toObject', {
  transform: function(doc, ret) {
    ret.id = ret._id.toString();
    delete ret._id;
    return ret;
  }
});

const ClassSchema = new mongoose.Schema({
  code: { type: String, required: true }, // ex: "ING4-ISI"
  name: { type: String, required: true },
  level: { type: String, required: true }, // ex: "ING4", "L3"
  field: { type: String, required: true }, // ex: "Informatique"
  academicYear: { type: mongoose.Schema.Types.ObjectId, ref: 'AcademicYear', required: true },
  capacity: { type: Number, default: 0 } // Effectif
}, { timestamps: true });

ClassSchema.set('toJSON', {
  transform: function(doc, ret) {
    ret.id = ret._id.toString();
    delete ret._id;
    return ret;
  }
});

ClassSchema.set('toObject', {
  transform: function(doc, ret) {
    ret.id = ret._id.toString();
    delete ret._id;
    return ret;
  }
});

const CourseSchema = new mongoose.Schema({
  code: { type: String, required: true }, // ex: "ISI4217"
  name: { type: String, required: true },
  credits: { type: Number, required: true },
  teacher: { type: String, required: true }, // Enseignant
  classId: { type: mongoose.Schema.Types.ObjectId, ref: 'Class', required: true },
  semesterId: { type: mongoose.Schema.Types.ObjectId, ref: 'Semester', required: true }
}, { timestamps: true });

CourseSchema.set('toJSON', {
  transform: function(doc, ret) {
    ret.id = ret._id.toString();
    delete ret._id;
    return ret;
  }
});

CourseSchema.set('toObject', {
  transform: function(doc, ret) {
    ret.id = ret._id.toString();
    delete ret._id;
    return ret;
  }
});

const EvaluationTypeSchema = new mongoose.Schema({
  label: { type: String, required: true }, // ex: "Mi-parcours"
  code: { type: String, required: true, unique: true } // ex: "MI_PARCOURS"
}, { timestamps: true });

EvaluationTypeSchema.set('toJSON', {
  transform: function(doc, ret) {
    ret.id = ret._id.toString();
    delete ret._id;
    return ret;
  }
});

EvaluationTypeSchema.set('toObject', {
  transform: function(doc, ret) {
    ret.id = ret._id.toString();
    delete ret._id;
    return ret;
  }
});

module.exports = {
  AcademicYear: mongoose.model('AcademicYear', AcademicYearSchema),
  Semester: mongoose.model('Semester', SemesterSchema),
  Class: mongoose.model('Class', ClassSchema),
  Course: mongoose.model('Course', CourseSchema),
  EvaluationType: mongoose.model('EvaluationType', EvaluationTypeSchema)
};
