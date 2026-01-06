/**
 * Script de migration pour corriger le format des options dans les quiz
 * 
 * Problème: Les optionsSnapshot sont stockées comme des objets {text, order}
 * mais l'app mobile s'attend à un tableau de strings
 * 
 * Solution: Convertir les objets en strings (extraire le champ 'text')
 */

const mongoose = require('mongoose');
const { Quiz } = require('../models/Quiz');

// Configuration de la base de données
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/equizz');
    console.log(`✅ MongoDB connecté: ${conn.connection.host}`);
  } catch (error) {
    console.error('❌ Erreur de connexion MongoDB:', error);
    process.exit(1);
  }
};

const fixQuizOptionsFormat = async () => {
  try {
    console.log('🔄 Début de la migration des options de quiz...');
    
    // Trouver tous les quiz avec des questions
    const quizzes = await Quiz.find({ 'questions.0': { $exists: true } });
    console.log(`📊 ${quizzes.length} quiz trouvés avec des questions`);
    
    let updatedCount = 0;
    
    for (const quiz of quizzes) {
      let hasChanges = false;
      
      // Parcourir chaque question du quiz
      for (const question of quiz.questions) {
        if (question.optionsSnapshot && Array.isArray(question.optionsSnapshot)) {
          // Vérifier si les options sont des objets (ancien format)
          const firstOption = question.optionsSnapshot[0];
          if (firstOption && typeof firstOption === 'object' && firstOption.text) {
            console.log(`🔧 Correction des options pour la question: ${question.textSnapshot?.substring(0, 50)}...`);
            
            // Convertir les objets en strings
            question.optionsSnapshot = question.optionsSnapshot.map(opt => 
              typeof opt === 'object' && opt.text ? opt.text : opt
            );
            hasChanges = true;
          }
        }
      }
      
      // Sauvegarder si des changements ont été effectués
      if (hasChanges) {
        await quiz.save();
        updatedCount++;
        console.log(`✅ Quiz mis à jour: ${quiz.title}`);
      }
    }
    
    console.log(`🎉 Migration terminée! ${updatedCount} quiz mis à jour sur ${quizzes.length}`);
    
  } catch (error) {
    console.error('❌ Erreur lors de la migration:', error);
    throw error;
  }
};

const main = async () => {
  try {
    await connectDB();
    await fixQuizOptionsFormat();
    console.log('✅ Migration terminée avec succès');
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur lors de la migration:', error);
    process.exit(1);
  }
};

// Exécuter le script si appelé directement
if (require.main === module) {
  main();
}

module.exports = { fixQuizOptionsFormat };