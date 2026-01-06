require('dotenv').config();
const mongoose = require('mongoose');
const { Quiz } = require('../models/Quiz');
const { Submission } = require('../models/Submission');

async function debugQuizResponses() {
  try {
    // Connexion à la base de données
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connecté à MongoDB');

    // 1. Lister tous les quizzes
    console.log('\n📋 QUIZZES DISPONIBLES:');
    const quizzes = await Quiz.find({}).select('_id title isPublished questions');
    quizzes.forEach(quiz => {
      console.log(`- ${quiz.title} (${quiz._id}) - Publié: ${quiz.isPublished} - Questions: ${quiz.questions.length}`);
    });

    if (quizzes.length === 0) {
      console.log('❌ Aucun quiz trouvé');
      return;
    }

    // 2. Chercher le quiz qui a des soumissions
    let targetQuiz = null;
    for (const quiz of quizzes) {
      const submissionCount = await Submission.countDocuments({ quizId: quiz._id });
      if (submissionCount > 0) {
        targetQuiz = quiz;
        break;
      }
    }

    if (!targetQuiz) {
      console.log('❌ Aucun quiz avec des soumissions trouvé');
      return;
    }

    console.log(`\n🔍 ANALYSE DU QUIZ AVEC SOUMISSIONS: ${targetQuiz.title} (${targetQuiz._id})`);
    
    // 3. Afficher les questions du quiz
    console.log('\n📝 QUESTIONS DU QUIZ:');
    targetQuiz.questions.forEach((q, index) => {
      console.log(`${index + 1}. ID: ${q.questionId}`);
      console.log(`   Type: ${q.qType}`);
      console.log(`   Texte: ${q.textSnapshot}`);
      console.log('');
    });

    // 4. Chercher les soumissions pour ce quiz
    console.log('\n💾 SOUMISSIONS POUR CE QUIZ:');
    const submissions = await Submission.find({ quizId: targetQuiz._id });
    console.log(`Nombre de soumissions: ${submissions.length}`);

    if (submissions.length === 0) {
      console.log('❌ Aucune soumission trouvée pour ce quiz');
      
      // Chercher toutes les soumissions
      console.log('\n🔍 TOUTES LES SOUMISSIONS:');
      const allSubmissions = await Submission.find({});
      console.log(`Total soumissions dans la base: ${allSubmissions.length}`);
      
      if (allSubmissions.length > 0) {
        console.log('Première soumission:');
        console.log(JSON.stringify(allSubmissions[0], null, 2));
      }
      return;
    }

    // 5. Analyser les réponses
    submissions.forEach((sub, index) => {
      console.log(`\nSoumission ${index + 1}:`);
      console.log(`- Quiz ID: ${sub.quizId}`);
      console.log(`- Nombre de réponses: ${sub.answers.length}`);
      
      sub.answers.forEach((answer, ansIndex) => {
        console.log(`  Réponse ${ansIndex + 1}:`);
        console.log(`    Question ID: ${answer.questionId}`);
        console.log(`    Valeur: "${answer.value}"`);
        console.log(`    Type: ${typeof answer.value}`);
        console.log(`    Longueur: ${answer.value ? answer.value.length : 0}`);
      });
    });

    // 6. Vérifier la correspondance entre questions et réponses
    console.log('\n🔗 CORRESPONDANCE QUESTIONS-RÉPONSES:');
    targetQuiz.questions.forEach(quizQuestion => {
      let totalResponses = 0;
      let openResponses = 0;
      
      submissions.forEach(sub => {
        const answer = sub.answers.find(a => a.questionId.toString() === quizQuestion.questionId.toString());
        if (answer && answer.value) {
          totalResponses++;
          if (typeof answer.value === 'string' && answer.value.trim().length > 3) {
            openResponses++;
          }
        }
      });
      
      console.log(`Question ${quizQuestion.questionId} (${quizQuestion.qType}):`);
      console.log(`  - ${totalResponses} réponses totales`);
      console.log(`  - ${openResponses} réponses ouvertes`);
      console.log(`  - Analysable: ${quizQuestion.qType === 'OPEN' && openResponses > 0}`);
    });

  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Déconnecté de MongoDB');
  }
}

debugQuizResponses();