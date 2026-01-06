const mongoose = require('mongoose');
const { Class, AcademicYear } = require('./models/Academic');

// Connexion à MongoDB
async function connectDB() {
  try {
    await mongoose.connect('mongodb://localhost:27017/equizz_db');
    console.log('✅ Connecté à MongoDB');
  } catch (error) {
    console.error('❌ Erreur de connexion:', error);
    process.exit(1);
  }
}

// Vérifier les classes avec academicYear invalide
async function checkInvalidAcademicYears() {
  console.log('\n🔍 Vérification des classes avec academicYear invalide...');

  const classes = await Class.find().populate('academicYear');
  const invalidClasses = [];

  for (const classe of classes) {
    if (!classe.academicYear) {
      invalidClasses.push({
        id: classe._id,
        code: classe.code,
        name: classe.name,
        academicYear: classe.academicYear
      });
    }
  }

  if (invalidClasses.length > 0) {
    console.log(`❌ ${invalidClasses.length} classes avec academicYear invalide:`);
    invalidClasses.forEach(cl => console.log(`  - ID: ${cl.id}, Code: ${cl.code}, Name: ${cl.name}`));
  } else {
    console.log('✅ Toutes les classes ont un academicYear valide');
  }

  return invalidClasses;
}

// Vérifier si tous les academicYears référencés existent
async function checkOrphanedClasses() {
  console.log('\n🔍 Vérification des références academicYear...');

  const classes = await Class.find();
  const academicYearIds = [...new Set(classes.map(c => c.academicYear?.toString()).filter(id => id))];
  const existingYears = await AcademicYear.find({ _id: { $in: academicYearIds } });
  const existingYearIds = new Set(existingYears.map(y => y._id.toString()));

  const orphanedClasses = classes.filter(classe =>
    classe.academicYear && !existingYearIds.has(classe.academicYear.toString())
  );

  if (orphanedClasses.length > 0) {
    console.log(`❌ ${orphanedClasses.length} classes avec référence academicYear inexistante:`);
    orphanedClasses.forEach(cl => console.log(`  - ID: ${cl._id}, Code: ${cl.code}, academicYear: ${cl.academicYear}`));
  } else {
    console.log('✅ Toutes les références academicYear sont valides');
  }

  return orphanedClasses;
}

// Lister toutes les classes
async function listAllClasses() {
  console.log('\n📋 Liste de toutes les classes:');
  const classes = await Class.find().populate('academicYear').sort({ code: 1 });

  classes.forEach((cl, index) => {
    console.log(`${index + 1}. ID: ${cl._id}, Code: ${cl.code}, Name: ${cl.name}, Year: ${cl.academicYear?.label || 'N/A'}`);
  });

  return classes;
}

// Fonction principale
async function main() {
  await connectDB();

  await listAllClasses();
  await checkInvalidAcademicYears();
  await checkOrphanedClasses();

  console.log('\n🎯 Diagnostic terminé');
  process.exit(0);
}

main().catch(console.error);