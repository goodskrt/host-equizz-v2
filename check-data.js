const mongoose = require('mongoose');
const { Question } = require('./models/Quiz');
const { AcademicYear, Class, Course } = require('./models/Academic');

async function checkData() {
  try {
    await mongoose.connect('mongodb://localhost:27017/equizz_db');

    const questionsCount = await Question.countDocuments();
    const yearsCount = await AcademicYear.countDocuments();
    const classesCount = await Class.countDocuments();
    const coursesCount = await Course.countDocuments();

    console.log('Questions:', questionsCount);
    console.log('Années académiques:', yearsCount);
    console.log('Classes:', classesCount);
    console.log('Cours:', coursesCount);

    if (questionsCount > 0) {
      const question = await Question.findOne().populate('academicYearId classId courseId');
      console.log('Sample question:', {
        text: question.text,
        academicYear: question.academicYearId ? question.academicYearId.label : 'NOT FOUND',
        class: question.classId ? question.classId.name : 'NOT FOUND',
        course: question.courseId ? question.courseId.name : 'NOT FOUND'
      });
    }

    await mongoose.disconnect();
  } catch (error) {
    console.error('Erreur:', error.message);
  }
}

checkData();