const { Submission, SubmissionLog } = require('../models/Submission');
const { Quiz, Question } = require('../models/Quiz');
const User = require('../models/User');
const { Course, Class, AcademicYear } = require('../models/Academic');
const mongoose = require('mongoose');

// @desc    Stats globales pour le dashboard (Admin)
// @route   GET /api/stats/globales
exports.getGlobalStats = async (req, res) => {
  try {
    // Compter le nombre total de quizzes publiés
    const totalQuizzes = await Quiz.countDocuments({ isPublished: true });

    // Compter le nombre total de questions
    const totalQuestions = await Question.countDocuments();

    // Compter le nombre total de soumissions (réponses)
    const totalReponses = await Submission.countDocuments();

    // Calculer le taux de participation
    // Nombre d'étudiants ayant répondu au moins une fois / nombre total d'étudiants * 100
    const totalStudents = await User.countDocuments({ role: 'STUDENT' });
    const activeStudents = await SubmissionLog.distinct('studentId').then(ids => ids.length);
    const tauxParticipation = totalStudents > 0 ? Math.round((activeStudents / totalStudents) * 100) : 0;

    res.json({
      totalQuizzes,
      totalQuestions,
      totalReponses,
      tauxParticipation
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Stats globales pour un Quiz (Admin)
// @route   GET /api/stats/quiz/:quizId
exports.getQuizStats = async (req, res) => {
  const { quizId } = req.params;

  try {
    const stats = await Submission.aggregate([
      { $match: { quizId: new mongoose.Types.ObjectId(quizId) } },

      // Groupe 1: Stats globales du quiz
      {
        $group: {
          _id: "$quizId",
          totalSubmissions: { $sum: 1 },
          avgSentiment: { $avg: "$sentimentAnalysis.score" } // Moyenne sentiment global
        }
      }
    ]);

    // Récupérer le détail des réponses pour les graphes
    // Note: C'est une requête lourde, à optimiser en prod
    const submissions = await Submission.find({ quizId }).select('answers sentimentAnalysis');

    // Calculer la répartition des sentiments (Positif/Neutre/Négatif)
    let sentimentDistribution = { positive: 0, neutral: 0, negative: 0 };

    submissions.forEach(sub => {
        const score = sub.sentimentAnalysis.score;
        if (score > 0.25) sentimentDistribution.positive++;
        else if (score < -0.25) sentimentDistribution.negative++;
        else sentimentDistribution.neutral++;
    });

    res.json({
      overview: stats[0] || { totalSubmissions: 0, avgSentiment: 0 },
      sentimentDistribution
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Statistiques par cours
// @route   GET /api/stats/courses/:courseId
exports.getCourseStats = async (req, res) => {
  try {
    const { courseId } = req.params;

    // Récupérer le cours
    const course = await Course.findById(courseId).populate('classId');
    if (!course) {
      return res.status(404).json({ message: 'Cours non trouvé' });
    }

    // Initialiser les statistiques usuelles à zéro
    let nombreQuizzes = 0;
    let nombreReponses = 0;
    let tauxParticipation = 0;

    // Compter les quizzes pour ce cours
    const quizzes = await Quiz.find({ courseId });
    nombreQuizzes = quizzes.length;
    const quizIds = quizzes.map(q => q._id);

    // Compter les réponses
    nombreReponses = await Submission.countDocuments({ quizId: { $in: quizIds } });

    // Calculer le taux de participation
    const classStudents = await User.countDocuments({ classId: course.classId, role: 'STUDENT' });
    const activeStudents = await SubmissionLog.distinct('studentId', { quizId: { $in: quizIds } });
    tauxParticipation = classStudents > 0 ? Math.round((activeStudents.length / classStudents) * 100) : 0;

    // Répartition des réponses par question
    const repartitionReponses = [];

    // Variables pour la satisfaction
    let satisfactionQuestionFound = false;
    let gradeQuestionFound = false;
    let satisfactionData = { satisfait: 0, neutre: 0, insatisfait: 0 };
    let totalGrades = 0;
    let gradeCount = 0;

    for (const quiz of quizzes) {
      // Pour chaque quiz, récupérer les questions et les réponses
      const submissions = await Submission.find({ quizId: quiz._id }).select('answers');

      // Créer une map des questions du quiz
      const questionMap = new Map();
      quiz.questions.forEach(q => {
        questionMap.set(q.questionId.toString(), {
          text: q.textSnapshot,
          type: q.qType,
          options: q.optionsSnapshot || []
        });
      });

      // Traiter chaque question
      for (const [questionId, questionData] of questionMap) {
        const questionText = questionData.text.toLowerCase().trim();

        // Vérifier si c'est la question de satisfaction
        if (questionText.includes('êtes-vous satisfait') && questionText.includes('cours')) {
          satisfactionQuestionFound = true;
          // Compter les réponses pour cette question
          const answerCounts = new Map();

          submissions.forEach(sub => {
            const answer = sub.answers.find(a => a.questionId.toString() === questionId);
            if (answer && answer.value) {
              const count = answerCounts.get(answer.value) || 0;
              answerCounts.set(answer.value, count + 1);
            }
          });

          // Mapper les réponses aux catégories de satisfaction
          answerCounts.forEach((count, answer) => {
            const answerLower = answer.toLowerCase();
            if (answerLower.includes('oui') || answerLower.includes('satisfait') || answerLower.includes('très satisfait') || answerLower.includes('tout à fait')) {
              satisfactionData.satisfait += count;
            } else if (answerLower.includes('neutre') || answerLower.includes('moyen') || answerLower.includes('ni oui ni non')) {
              satisfactionData.neutre += count;
            } else if (answerLower.includes('non') || answerLower.includes('insatisfait') || answerLower.includes('pas satisfait') || answerLower.includes('pas du tout')) {
              satisfactionData.insatisfait += count;
            }
          });
        }

        // Vérifier si c'est la question de note
        if ((questionText.includes('note') || questionText.includes('évaluation')) && questionText.includes('cours')) {
          gradeQuestionFound = true;
          // Calculer la moyenne des notes
          submissions.forEach(sub => {
            const answer = sub.answers.find(a => a.questionId.toString() === questionId);
            if (answer && answer.value) {
              // Convertir la réponse string en number
              let gradeStr = answer.value.toLowerCase().replace(',', '.');
              // Essayer de parser différents formats
              let grade = null;
              if (gradeStr.includes('/')) {
                const parts = gradeStr.split('/');
                grade = parseFloat(parts[0]);
              } else {
                grade = parseFloat(gradeStr);
              }
              if (!isNaN(grade) && grade >= 0 && grade <= 20) { // Supposer une échelle de 0-20
                totalGrades += grade;
                gradeCount++;
              }
            }
          });
        }

        // Calculer la répartition pour toutes les questions
        const answerCounts = new Map();
        let totalAnswersForQuestion = 0;

        submissions.forEach(sub => {
          const answer = sub.answers.find(a => a.questionId.toString() === questionId);
          if (answer && answer.value) {
            const count = answerCounts.get(answer.value) || 0;
            answerCounts.set(answer.value, count + 1);
            totalAnswersForQuestion++;
          }
        });

        if (totalAnswersForQuestion > 0) {
          const options = [];
          answerCounts.forEach((count, answer) => {
            options.push({
              libelle: answer,
              count: count,
              pourcentage: Math.round((count / totalAnswersForQuestion) * 100)
            });
          });

          repartitionReponses.push({
            questionId: questionId,
            questionTexte: questionData.text,
            type: questionData.type,
            options: options
          });
        }
      }
    }

    // Calculer la moyenne de satisfaction
    let moyenneSatisfaction = null;
    if (gradeQuestionFound && gradeCount > 0) {
      moyenneSatisfaction = Math.round((totalGrades / gradeCount) * 10) / 10; // Arrondi à 1 décimale
    }

    // Préparer les données de satisfaction pour le graphique
    let satisfactionChartData = null;
    if (satisfactionQuestionFound) {
      const totalSatisfactionResponses = satisfactionData.satisfait + satisfactionData.neutre + satisfactionData.insatisfait;
      if (totalSatisfactionResponses > 0) {
        satisfactionChartData = {
          satisfait: {
            count: satisfactionData.satisfait,
            percentage: Math.round((satisfactionData.satisfait / totalSatisfactionResponses) * 100)
          },
          neutre: {
            count: satisfactionData.neutre,
            percentage: Math.round((satisfactionData.neutre / totalSatisfactionResponses) * 100)
          },
          insatisfait: {
            count: satisfactionData.insatisfait,
            percentage: Math.round((satisfactionData.insatisfait / totalSatisfactionResponses) * 100)
          }
        };
      }
    }

    res.json({
      coursId: courseId,
      coursLibelle: course.name,
      enseignant: course.teacher,
      nombreQuizzes,
      nombreReponses,
      tauxParticipation,
      moyenneSatisfaction,
      satisfactionChartData,
      satisfactionQuestionFound,
      gradeQuestionFound,
      repartitionReponses
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Statistiques par classe
// @route   GET /api/stats/classes/:classId
exports.getClassStats = async (req, res) => {
  try {
    const { classId } = req.params;

    // Récupérer la classe
    const classe = await Class.findById(classId).populate('academicYear');
    if (!classe) {
      return res.status(404).json({ message: 'Classe non trouvée' });
    }

    // Compter les étudiants
    const totalStudents = await User.countDocuments({ classId, role: 'STUDENT' });

    // Compter les cours de cette classe
    const courses = await Course.find({ classId });
    const courseIds = courses.map(c => c._id);

    // Compter les quizzes
    const quizzes = await Quiz.find({ courseId: { $in: courseIds } });
    const quizIds = quizzes.map(q => q._id);

    // Compter les réponses
    const totalResponses = await Submission.countDocuments({ quizId: { $in: quizIds } });

    // Calculer le taux de participation
    const activeStudents = await SubmissionLog.distinct('studentId', { quizId: { $in: quizIds } });
    const tauxParticipation = totalStudents > 0 ? Math.round((activeStudents.length / totalStudents) * 100) : 0;

    res.json({
      classId,
      className: classe.name,
      academicYear: classe.academicYear?.label,
      totalStudents,
      totalCourses: courses.length,
      totalQuizzes: quizzes.length,
      totalResponses,
      tauxParticipation
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Statistiques par année académique
// @route   GET /api/stats/academic-years/:yearId
exports.getAcademicYearStats = async (req, res) => {
  try {
    const { yearId } = req.params;

    // Récupérer l'année
    const year = await AcademicYear.findById(yearId);
    if (!year) {
      return res.status(404).json({ message: 'Année académique non trouvée' });
    }

    // Récupérer les classes de cette année
    const classes = await Class.find({ academicYear: yearId });
    const classIds = classes.map(c => c._id);

    // Compter les étudiants
    const totalStudents = await User.countDocuments({ classId: { $in: classIds }, role: 'STUDENT' });

    // Compter les cours
    const courses = await Course.find({ classId: { $in: classIds } });
    const courseIds = courses.map(c => c._id);

    // Compter les quizzes
    const quizzes = await Quiz.find({ courseId: { $in: courseIds } });
    const quizIds = quizzes.map(q => q._id);

    // Compter les réponses
    const totalResponses = await Submission.countDocuments({ quizId: { $in: quizIds } });

    // Calculer le taux de participation
    const activeStudents = await SubmissionLog.distinct('studentId', { quizId: { $in: quizIds } });
    const tauxParticipation = totalStudents > 0 ? Math.round((activeStudents.length / totalStudents) * 100) : 0;

    res.json({
      yearId,
      yearLabel: year.label,
      totalClasses: classes.length,
      totalStudents,
      totalCourses: courses.length,
      totalQuizzes: quizzes.length,
      totalResponses,
      tauxParticipation
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Liste des statistiques par cours
// @route   GET /api/stats/courses
exports.getCoursesStatsList = async (req, res) => {
  try {
    const { academicYearId, classId } = req.query;

    let courseFilter = {};
    if (academicYearId) {
      const classes = await Class.find({ academicYear: academicYearId });
      courseFilter.classId = { $in: classes.map(c => c._id) };
    }
    if (classId) {
      courseFilter.classId = classId;
    }

    const courses = await Course.find(courseFilter).populate('classId');
    const coursesStats = [];

    for (const course of courses) {
      // Compter les quizzes pour ce cours
      const quizzes = await Quiz.find({ courseId: course._id });
      const quizIds = quizzes.map(q => q._id);

      // Compter les réponses
      const totalResponses = await Submission.countDocuments({ quizId: { $in: quizIds } });

      // Calculer le taux de participation
      const classStudents = await User.countDocuments({ classId: course.classId, role: 'STUDENT' });
      const activeStudents = await SubmissionLog.distinct('studentId', { quizId: { $in: quizIds } });
      const tauxParticipation = classStudents > 0 ? Math.round((activeStudents.length / classStudents) * 100) : 0;

      coursesStats.push({
        courseId: course._id,
        courseName: course.name,
        teacher: course.teacher,
        className: course.classId?.name,
        totalQuizzes: quizzes.length,
        totalResponses,
        tauxParticipation
      });
    }

    res.json(coursesStats);

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Répartition des types d'évaluation
// @route   GET /api/stats/types-repartition
exports.getTypesRepartition = async (req, res) => {
  try {
    const { academicYearId, classId, courseId } = req.query;
    
    let matchConditions = {};
    if (academicYearId) matchConditions.academicYearId = new mongoose.Types.ObjectId(academicYearId);
    if (classId) matchConditions.classId = new mongoose.Types.ObjectId(classId);
    if (courseId) matchConditions.courseId = new mongoose.Types.ObjectId(courseId);

    const repartition = await Quiz.aggregate([
      { $match: matchConditions },
      {
        $lookup: {
          from: 'evaluationtypes',
          localField: 'evaluationTypeId',
          foreignField: '_id',
          as: 'evaluationType'
        }
      },
      { $unwind: '$evaluationType' },
      {
        $group: {
          _id: '$evaluationType.label',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);

    res.json(repartition.map(item => ({
      type: item._id,
      count: item.count
    })));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Évolution des participations (6 derniers mois)
// @route   GET /api/stats/participation-evolution
exports.getParticipationEvolution = async (req, res) => {
  try {
    const currentDate = new Date();
    const evolution = [];

    // Pour chaque mois des 6 derniers mois
    for (let i = 5; i >= 0; i--) {
      const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
      const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() - i + 1, 0, 23, 59, 59);

      // Compter les soumissions dans ce mois
      const count = await Submission.countDocuments({
        createdAt: { $gte: startOfMonth, $lte: endOfMonth }
      });

      evolution.push({
        month: startOfMonth.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' }),
        participations: count
      });
    }

    res.json(evolution);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Exporter les statistiques
// @route   GET /api/stats/export/:format
exports.exportStats = async (req, res) => {
  try {
    const { format } = req.params;
    const { academicYearId, classId, courseId } = req.query;

    // Logique d'export à implémenter selon le format (PDF, Excel, etc.)
    // Pour l'instant, retourner les données JSON

    let stats = {};

    // Si academicYearId est "global", on veut les stats globales
    if (academicYearId === 'global') {
      // Stats globales
      const totalQuizzes = await Quiz.countDocuments({ isPublished: true });
      const totalQuestions = await Question.countDocuments();
      const totalResponses = await Submission.countDocuments();
      const totalStudents = await User.countDocuments({ role: 'STUDENT' });
      const activeStudents = await SubmissionLog.distinct('studentId');
      const tauxParticipation = totalStudents > 0 ? Math.round((activeStudents.length / totalStudents) * 100) : 0;

      stats = {
        totalQuizzes,
        totalQuestions,
        totalResponses,
        tauxParticipation
      };
    } else if (courseId) {
      // Récupérer les stats du cours
      const course = await Course.findById(courseId).populate('classId');
      if (course) {
        const quizzes = await Quiz.find({ courseId });
        const quizIds = quizzes.map(q => q._id);
        const totalResponses = await Submission.countDocuments({ quizId: { $in: quizIds } });
        const classStudents = await User.countDocuments({ classId: course.classId, role: 'STUDENT' });
        const activeStudents = await SubmissionLog.distinct('studentId', { quizId: { $in: quizIds } });
        const tauxParticipation = classStudents > 0 ? Math.round((activeStudents.length / classStudents) * 100) : 0;

        stats = {
          courseId,
          courseName: course.name,
          teacher: course.teacher,
          totalQuizzes: quizzes.length,
          totalResponses,
          tauxParticipation
        };
      }
    } else if (classId) {
      // Récupérer les stats de la classe
      const classe = await Class.findById(classId).populate('academicYear');
      if (classe) {
        const totalStudents = await User.countDocuments({ classId, role: 'STUDENT' });
        const courses = await Course.find({ classId });
        const courseIds = courses.map(c => c._id);
        const quizzes = await Quiz.find({ courseId: { $in: courseIds } });
        const quizIds = quizzes.map(q => q._id);
        const totalResponses = await Submission.countDocuments({ quizId: { $in: quizIds } });
        const activeStudents = await SubmissionLog.distinct('studentId', { quizId: { $in: quizIds } });
        const tauxParticipation = totalStudents > 0 ? Math.round((activeStudents.length / totalStudents) * 100) : 0;

        stats = {
          classId,
          className: classe.name,
          academicYear: classe.academicYear?.label,
          totalStudents,
          totalCourses: courses.length,
          totalQuizzes: quizzes.length,
          totalResponses,
          tauxParticipation
        };
      }
    } else if (academicYearId) {
      // Récupérer les stats de l'année
      const year = await AcademicYear.findById(academicYearId);
      if (year) {
        const classes = await Class.find({ academicYear: academicYearId });
        const classIds = classes.map(c => c._id);
        const totalStudents = await User.countDocuments({ classId: { $in: classIds }, role: 'STUDENT' });
        const courses = await Course.find({ classId: { $in: classIds } });
        const courseIds = courses.map(c => c._id);
        const quizzes = await Quiz.find({ courseId: { $in: courseIds } });
        const quizIds = quizzes.map(q => q._id);
        const totalResponses = await Submission.countDocuments({ quizId: { $in: quizIds } });
        const activeStudents = await SubmissionLog.distinct('studentId', { quizId: { $in: quizIds } });
        const tauxParticipation = totalStudents > 0 ? Math.round((activeStudents.length / totalStudents) * 100) : 0;

        stats = {
          yearId: academicYearId,
          yearLabel: year.label,
          totalClasses: classes.length,
          totalStudents,
          totalCourses: courses.length,
          totalQuizzes: quizzes.length,
          totalResponses,
          tauxParticipation
        };
      }
    } else {
      // Stats globales (fallback)
      const totalQuizzes = await Quiz.countDocuments({ isPublished: true });
      const totalQuestions = await Question.countDocuments();
      const totalResponses = await Submission.countDocuments();
      const totalStudents = await User.countDocuments({ role: 'STUDENT' });
      const activeStudents = await SubmissionLog.distinct('studentId');
      const tauxParticipation = totalStudents > 0 ? Math.round((activeStudents.length / totalStudents) * 100) : 0;

      stats = {
        totalQuizzes,
        totalQuestions,
        totalResponses,
        tauxParticipation
      };
    }

    // Retourner les données au format demandé
    if (format === 'excel' || format === 'pdf') {
      // Pour l'instant, retourner du JSON avec les headers appropriés
      // TODO: Implémenter la génération réelle de fichiers Excel/PDF
      const fileName = `statistiques-${new Date().toISOString().split('T')[0]}.${format === 'excel' ? 'xlsx' : 'pdf'}`;
      
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      res.json(stats);
    } else {
      // Format JSON par défaut
      res.json(stats);
    }

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
