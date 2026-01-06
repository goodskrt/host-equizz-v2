const AnalyseSentiment = require('../models/AnalyseSentiment');
const { Submission } = require('../models/Submission');
const { Quiz, Question } = require('../models/Quiz');
const { Course } = require('../models/Academic');
const mongoose = require('mongoose');

// Mock simple pour l'analyse de sentiment (à remplacer par API Google Cloud)
const analyzeSentimentMock = (text) => {
  const positives = ['bon', 'excellent', 'bien', 'super', 'intéressant', 'utile', 'clair', 'facile'];
  const negatives = ['mauvais', 'nul', 'ennuyeux', 'rapide', 'incompréhensible', 'difficile', 'confus', 'mal'];
  let score = 0;

  const words = text.toLowerCase().split(' ');
  words.forEach(w => {
    if (positives.includes(w)) score += 0.5;
    if (negatives.includes(w)) score -= 0.5;
  });
  // Borner entre -1 et 1
  return Math.max(-1, Math.min(1, score));
};

// Fonction pour extraire des thèmes simples
const extractThemes = (responses) => {
  const themes = {};
  const themeKeywords = {
    'qualité': ['qualité', 'niveau', 'enseignement'],
    'difficulté': ['difficile', 'facile', 'complexe', 'simple'],
    'intérêt': ['intéressant', 'ennuyeux', 'passionnant'],
    'compréhension': ['comprendre', 'clair', 'confus', 'explication'],
    'rythme': ['rapide', 'lent', 'temps', 'vitesse']
  };

  responses.forEach(response => {
    const text = response.toLowerCase();
    Object.keys(themeKeywords).forEach(theme => {
      if (themeKeywords[theme].some(keyword => text.includes(keyword))) {
        if (!themes[theme]) {
          themes[theme] = { count: 0, responses: [], sentiment: 0 };
        }
        themes[theme].count++;
        themes[theme].responses.push(response);
        themes[theme].sentiment += analyzeSentimentMock(response);
      }
    });
  });

  return Object.keys(themes).map(theme => ({
    libelle: theme,
    frequence: themes[theme].count,
    sentiment: themes[theme].sentiment > 0 ? 'positif' : themes[theme].sentiment < 0 ? 'negatif' : 'neutre',
    motsAssocies: themeKeywords[theme]
  }));
};

// @desc    Récupérer toutes les analyses
// @route   GET /api/analyses-sentiments
exports.getAnalyses = async (req, res) => {
  try {
    const { coursId } = req.query;
    let filter = {};

    if (coursId) {
      // Trouver les questions du cours
      const questions = await Question.find({ courseId: coursId }).select('_id');
      const questionIds = questions.map(q => q._id);
      filter.questionId = { $in: questionIds };
    }

    const analyses = await AnalyseSentiment.find(filter)
      .populate({
        path: 'questionId',
        populate: {
          path: 'courseId',
          model: 'Course'
        }
      })
      .sort({ createdAt: -1 });

    // Transformer pour correspondre au frontend
    const transformedAnalyses = analyses.map(analyse => ({
      id: analyse.id,
      questionId: analyse.questionId._id.toString(),
      question: {
        id: analyse.questionId._id.toString(),
        texte: analyse.questionId.text,
        cours: analyse.questionId.courseId ? {
          libelle: analyse.questionId.courseId.name
        } : null
      },
      dateAnalyse: analyse.dateAnalyse,
      nombreReponses: analyse.nombreReponses,
      resultats: analyse.resultats,
      themes: analyse.themes,
      createdAt: analyse.createdAt
    }));

    res.json(transformedAnalyses);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Récupérer une analyse par ID
// @route   GET /api/analyses-sentiments/:id
exports.getAnalyse = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'ID d\'analyse invalide' });
    }

    const analyse = await AnalyseSentiment.findById(req.params.id)
      .populate({
        path: 'questionId',
        populate: {
          path: 'courseId',
          model: 'Course'
        }
      });

    if (!analyse) {
      return res.status(404).json({ message: 'Analyse non trouvée' });
    }

    // Transformer pour correspondre au frontend
    const transformedAnalyse = {
      id: analyse.id,
      questionId: analyse.questionId._id.toString(),
      question: {
        id: analyse.questionId._id.toString(),
        texte: analyse.questionId.text,
        cours: analyse.questionId.courseId ? {
          libelle: analyse.questionId.courseId.name
        } : null
      },
      dateAnalyse: analyse.dateAnalyse,
      nombreReponses: analyse.nombreReponses,
      resultats: analyse.resultats,
      themes: analyse.themes,
      createdAt: analyse.createdAt
    };

    res.json(transformedAnalyse);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Récupérer les quizzes publiés d'un cours
// @route   GET /api/analyses-sentiments/cours/:courseId/quizzes
exports.getQuizzesByCourse = async (req, res) => {
  try {
    console.log('getQuizzesByCourse appelé avec courseId:', req.params.courseId);
    const { courseId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(courseId)) {
      console.log('ID de cours invalide:', courseId);
      return res.status(400).json({ message: 'ID de cours invalide' });
    }

    console.log('Recherche des quizzes pour le cours:', courseId);
    const quizzes = await Quiz.find({ 
      courseId: courseId, 
      isPublished: true 
    })
    .populate('courseId')
    .sort({ createdAt: -1 });

    console.log('Quizzes trouvés:', quizzes.length);
    
    const result = quizzes.map(quiz => ({
      id: quiz.id,
      title: quiz.title,
      description: quiz.description,
      startDate: quiz.startDate,
      endDate: quiz.endDate,
      questionCount: quiz.questions ? quiz.questions.length : 0
    }));

    console.log('Résultat à retourner:', result);
    res.json(result);
  } catch (error) {
    console.error('Erreur dans getQuizzesByCourse:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Récupérer les questions d'un quiz avec le nombre de réponses
// @route   GET /api/analyses-sentiments/quiz/:quizId/questions
exports.getQuizQuestions = async (req, res) => {
  try {
    const { quizId } = req.params;
    console.log('getQuizQuestions appelé avec quizId:', quizId);

    if (!mongoose.Types.ObjectId.isValid(quizId)) {
      return res.status(400).json({ message: 'ID de quiz invalide' });
    }

    const quiz = await Quiz.findById(quizId);
    
    if (!quiz) {
      return res.status(404).json({ message: 'Quiz non trouvé' });
    }

    console.log('Quiz trouvé:', quiz.title);
    console.log('Questions dans le quiz:', quiz.questions.length);

    // Récupérer les soumissions pour ce quiz
    const submissions = await Submission.find({ quizId: quizId });
    console.log('Soumissions trouvées pour ce quiz:', submissions.length);

    // Debug: afficher quelques soumissions
    if (submissions.length > 0) {
      console.log('Première soumission:', JSON.stringify(submissions[0], null, 2));
    }
    
    // Traiter chaque question du quiz
    const questionsWithStats = await Promise.all(
      quiz.questions.map(async (quizQuestion) => {
        console.log('Traitement de la question:', quizQuestion.questionId, 'Type:', quizQuestion.qType);
        
        // Compter les réponses pour cette question
        let responseCount = 0;
        let openResponseCount = 0;
        
        submissions.forEach(sub => {
          const answer = sub.answers.find(a => a.questionId.toString() === quizQuestion.questionId.toString());
          if (answer && answer.value) {
            responseCount++;
            console.log('Réponse trouvée:', answer.value, 'Type:', typeof answer.value, 'Longueur:', answer.value.length);
            
            // Vérifier si c'est une réponse ouverte (texte significatif)
            if (typeof answer.value === 'string' && answer.value.trim().length > 3) {
              openResponseCount++;
            }
          }
        });

        console.log(`Question ${quizQuestion.questionId}: ${responseCount} réponses totales, ${openResponseCount} réponses ouvertes`);

        return {
          id: quizQuestion.questionId.toString(),
          text: quizQuestion.textSnapshot,
          type: quizQuestion.qType,
          responseCount: responseCount,
          openResponseCount: openResponseCount,
          isAnalyzable: quizQuestion.qType === 'OPEN' && openResponseCount > 0
        };
      })
    );

    console.log('Résultat final:', questionsWithStats);
    res.json(questionsWithStats);
  } catch (error) {
    console.error('Erreur dans getQuizQuestions:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Lancer une analyse pour une question d'un quiz spécifique
// @route   POST /api/analyses-sentiments/analyser
exports.lancerAnalyse = async (req, res) => {
  try {
    const { quizId, questionId } = req.body;

    if (!quizId || !questionId) {
      return res.status(400).json({ message: 'quizId et questionId requis' });
    }

    if (!mongoose.Types.ObjectId.isValid(quizId) || !mongoose.Types.ObjectId.isValid(questionId)) {
      return res.status(400).json({ message: 'IDs invalides' });
    }

    // Vérifier si le quiz existe
    const { Quiz } = require('../models/Quiz');
    const quiz = await Quiz.findById(quizId);
    if (!quiz) {
      return res.status(404).json({ message: 'Quiz non trouvé' });
    }

    // Vérifier si la question fait partie du quiz
    const quizQuestion = quiz.questions.find(q => q.questionId.toString() === questionId);
    if (!quizQuestion) {
      return res.status(400).json({ message: 'Question non trouvée dans ce quiz' });
    }

    // Vérifier si c'est une question ouverte
    if (quizQuestion.qType !== 'OPEN') {
      return res.status(400).json({ message: 'Seules les questions ouvertes peuvent être analysées' });
    }

    // Récupérer les soumissions pour ce quiz spécifique
    const submissions = await Submission.find({ quizId: quizId });

    if (submissions.length === 0) {
      return res.status(400).json({ message: 'Aucune soumission trouvée pour ce quiz' });
    }

    // Extraire les réponses texte pour cette question
    const responses = [];
    submissions.forEach(sub => {
      const answer = sub.answers.find(a => a.questionId.toString() === questionId);
      if (answer && answer.value && typeof answer.value === 'string' && answer.value.trim().length > 3) {
        responses.push(answer.value);
      }
    });

    if (responses.length === 0) {
      return res.status(400).json({ message: 'Aucune réponse texte valide trouvée pour cette question' });
    }

    // Analyser les sentiments
    const sentiments = responses.map(response => ({
      text: response,
      score: analyzeSentimentMock(response)
    }));

    // Calculer les statistiques
    const positif = sentiments.filter(s => s.score > 0.25);
    const negatif = sentiments.filter(s => s.score < -0.25);
    const neutre = sentiments.filter(s => s.score >= -0.25 && s.score <= 0.25);

    // Extraire des thèmes
    const themes = extractThemes(responses);

    // Créer l'analyse avec référence au quiz
    const analyse = await AnalyseSentiment.create({
      questionId,
      quizId, // Ajouter la référence au quiz
      nombreReponses: responses.length,
      resultats: {
        positif: {
          count: positif.length,
          pourcentage: Math.round((positif.length / responses.length) * 100),
          exemples: positif.slice(0, 3).map(s => s.text)
        },
        negatif: {
          count: negatif.length,
          pourcentage: Math.round((negatif.length / responses.length) * 100),
          exemples: negatif.slice(0, 3).map(s => s.text)
        },
        neutre: {
          count: neutre.length,
          pourcentage: Math.round((neutre.length / responses.length) * 100),
          exemples: neutre.slice(0, 3).map(s => s.text)
        }
      },
      themes
    });

    // Retourner l'analyse avec les données enrichies
    const transformedAnalyse = {
      id: analyse.id,
      quizId: quizId,
      questionId: questionId,
      quiz: {
        id: quiz.id,
        title: quiz.title
      },
      question: {
        id: questionId,
        texte: quizQuestion.textSnapshot,
        type: quizQuestion.qType
      },
      dateAnalyse: analyse.dateAnalyse,
      nombreReponses: analyse.nombreReponses,
      resultats: analyse.resultats,
      themes: analyse.themes,
      createdAt: analyse.createdAt
    };

    res.json({
      success: true,
      analyse: transformedAnalyse,
      message: 'Analyse terminée avec succès'
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Récupérer l'analyse pour une question spécifique
// @route   GET /api/analyses-sentiments/question/:questionId
exports.getAnalyseParQuestion = async (req, res) => {
  try {
    const { questionId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(questionId)) {
      return res.status(400).json({ message: 'ID de question invalide' });
    }

    const analyse = await AnalyseSentiment.findOne({ questionId: new mongoose.Types.ObjectId(questionId) })
      .populate({
        path: 'questionId',
        populate: {
          path: 'courseId',
          model: 'Course'
        }
      })
      .sort({ createdAt: -1 });

    if (!analyse) {
      return res.json(null);
    }

    // Transformer pour correspondre au frontend
    const transformedAnalyse = {
      id: analyse.id,
      questionId: analyse.questionId._id.toString(),
      question: {
        id: analyse.questionId._id.toString(),
        texte: analyse.questionId.text,
        cours: analyse.questionId.courseId ? {
          libelle: analyse.questionId.courseId.name
        } : null
      },
      dateAnalyse: analyse.dateAnalyse,
      nombreReponses: analyse.nombreReponses,
      resultats: analyse.resultats,
      themes: analyse.themes,
      createdAt: analyse.createdAt
    };

    res.json(transformedAnalyse);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Supprimer une analyse
// @route   DELETE /api/analyses-sentiments/:id
exports.deleteAnalyse = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'ID d\'analyse invalide' });
    }

    const analyse = await AnalyseSentiment.findByIdAndDelete(req.params.id);

    if (!analyse) {
      return res.status(404).json({ message: 'Analyse non trouvée' });
    }

    res.json({ message: 'Analyse supprimée' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};