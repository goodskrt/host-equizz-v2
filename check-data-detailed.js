const mongoose = require('mongoose');
const { Question } = require('./models/Quiz');
const { AcademicYear, Class, Course } = require('./models/Academic');

async function checkData() {
  try {
    await mongoose.connect('mongodb://localhost:27017/equizz_db');

    console.log('=== ENTITÉS EXISTANTES ===');

    const years = await AcademicYear.find({});
    console.log('Années académiques:');
    years.forEach(y => console.log(`  ${y._id} - ${y.label}`));

    const classes = await Class.find({});
    console.log('Classes:');
    classes.forEach(c => console.log(`  ${c._id} - ${c.name}`));

    const courses = await Course.find({});
    console.log('Cours:');
    courses.forEach(c => console.log(`  ${c._id} - ${c.name}`));

    console.log('\n=== QUESTIONS ===');
    const questions = await Question.find({}).populate('academicYearId classId courseId');
    questions.forEach(q => {
      console.log(`Question: ${q._id}`);
      console.log(`  Texte: ${q.text}`);
      console.log(`  Type: ${q.type}`);
      console.log(`  Année: ${q.academicYearId ? q.academicYearId.label : 'NOT FOUND'}`);
      console.log(`  Classe: ${q.classId ? q.classId.name : 'NOT FOUND'}`);
      console.log(`  Cours: ${q.courseId ? q.courseId.name : 'NOT FOUND'}`);
      console.log(`  courseId raw: ${q.courseId}`);
      console.log('');
    });

    await mongoose.disconnect();
  } catch (error) {
    console.error('Erreur:', error.message);
  }
}

checkData();