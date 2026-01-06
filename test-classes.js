const mongoose = require('mongoose');
const { Class } = require('./models/Academic');

// Connexion à la base de données
mongoose.connect('mongodb://localhost:27017/equizz', {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(async () => {
  console.log('✅ Connecté à MongoDB');

  try {
    // Récupérer toutes les classes
    const classes = await Class.find({}).populate('academicYear').limit(10);
    console.log(`📦 ${classes.length} classes trouvées:`);

    classes.forEach((classe, index) => {
      console.log(`${index + 1}. ID: ${classe._id}`);
      console.log(`   Code: ${classe.code}`);
      console.log(`   Name: ${classe.name}`);
      console.log(`   Level: ${classe.level}`);
      console.log(`   Field: ${classe.field}`);
      console.log(`   AcademicYear: ${classe.academicYear ? classe.academicYear.label : 'N/A'}`);
      console.log('');
    });

    // Vérifier si l'ID problématique existe
    const testId = '6954062a6bc6d949463fde56';
    const testClass = await Class.findById(testId);
    console.log(`🔍 Test ID ${testId}: ${testClass ? 'EXISTE' : 'N\'EXISTE PAS'}`);

    if (testClass) {
      console.log('   Données:', {
        code: testClass.code,
        name: testClass.name,
        level: testClass.level,
        field: testClass.field
      });
    }

  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    mongoose.connection.close();
  }
}).catch(err => {
  console.error('❌ Erreur de connexion:', err);
});