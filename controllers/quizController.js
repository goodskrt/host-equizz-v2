const { sendPushNotification } = require('../utils/firebaseService');
const User = require('../models/User');
const { Quiz, Question } = require('../models/Quiz');
const { Submission, SubmissionLog } = require('../models/Submission');
const { Class, Course, AcademicYear, Semester } = require('../models/Academic');
const validateObjectId = require('../utils/validateObjectId');
const handleError = require('../utils/errorHandler');

// @desc    Créer une question manuelle
// @route   POST /api/quiz/question
exports.createQuestion = async (req, res) => {
  try {
    const question = await Question.create(req.body);
    res.status(201).json(question);
  } catch (error) {
    handleError(error, res, 'Erreur lors de la création de la question');
  }
};

// @desc    Récupérer tous les quizzes avec filtres
// @route   GET /api/quizzes
exports.getQuizzes = async (req, res) => {
  try {
    const { courseId, classId, semesterId, academicYearId, isPublished, status } = req.query;
    let filter = {};

    if (courseId) filter.courseId = courseId;
    if (classId) filter.classId = classId;
    if (semesterId) filter.semesterId = semesterId;
    if (academicYearId) filter.academicYearId = academicYearId;
    if (isPublished !== undefined) filter.isPublished = isPublished === 'true';
    if (status) filter.status = status;

    const quizzes = await Quiz.find(filter)
      .populate('courseId')
      .populate('semesterId')
      .populate('academicYearId')
      .populate('classId')
      .sort({ createdAt: -1 });

    // Calculer le nombre de réponses pour chaque quiz
    const quizzesWithStats = await Promise.all(
      quizzes.map(async (quiz) => {
        const responseCount = await SubmissionLog.countDocuments({ quizId: quiz._id });
        const quizObj = quiz.toObject();
        quizObj.responseCount = responseCount;
        quizObj.questionCount = quiz.questions ? quiz.questions.length : 0;
        return quizObj;
      })
    );

    res.json(quizzesWithStats);
  } catch (error) {
    handleError(error, res, 'Erreur lors de la récupération des quizzes');
  }
};

// @desc    Récupérer un quiz spécifique
// @route   GET /api/quizzes/:id
exports.getQuiz = async (req, res) => {
  try {
    const { id } = req.params;

    // Validation de l'ID
    const validation = validateObjectId(id, 'quiz');
    if (!validation.isValid) {
      return res.status(400).json({ message: validation.error });
    }

    const quiz = await Quiz.findById(id)
      .populate('courseId')
      .populate('semesterId')
      .populate('academicYearId')
      .populate('classId');

    if (!quiz) {
      return res.status(404).json({ message: 'Quiz non trouvé' });
    }

    // Calculer le nombre de réponses
    const responseCount = await SubmissionLog.countDocuments({ quizId: quiz._id });
    const quizObj = quiz.toObject();
    quizObj.responseCount = responseCount;
    quizObj.questionCount = quiz.questions ? quiz.questions.length : 0;

    res.json(quizObj);
  } catch (error) {
    handleError(error, res, 'Erreur lors de la récupération du quiz');
  }
};

// @desc    Créer un quiz
// @route   POST /api/quizzes
exports.createQuiz = async (req, res) => {
  try {
    const { questions, ...quizData } = req.body;
    
    // Validation des dates
    if (quizData.startDate && quizData.endDate) {
      const startDate = new Date(quizData.startDate);
      const endDate = new Date(quizData.endDate);
      if (startDate >= endDate) {
        return res.status(400).json({ message: 'La date de début doit être antérieure à la date de fin' });
      }
    }
    
    // Si des questions sont fournies, récupérer leurs détails pour créer des snapshots
    let questionsPayload = [];
    if (questions && questions.length > 0) {
      const questionIds = questions.map(q => q.questionId || q);
      const questionsDb = await Question.find({ '_id': { $in: questionIds } });
      
      questionsPayload = questionsDb.map(q => ({
        questionId: q._id,
        textSnapshot: q.text,
        qType: q.type,
        optionsSnapshot: q.options ? q.options.map(opt => opt.text) : []
      }));
    }
    
    const quiz = await Quiz.create({
      ...quizData,
      questions: questionsPayload,
      questionCount: questionsPayload.length
    });
    
    res.status(201).json(quiz);
  } catch (error) {
    handleError(error, res, 'Erreur lors de la création du quiz');
  }
};

// @desc    Mettre à jour un quiz
// @route   PUT /api/quizzes/:id
exports.updateQuiz = async (req, res) => {
  try {
    const { id } = req.params;

    // Validation de l'ID
    const validation = validateObjectId(id, 'quiz');
    if (!validation.isValid) {
      return res.status(400).json({ message: validation.error });
    }

    const { questions, ...updateData } = req.body;
    
    // Validation des dates
    if (updateData.startDate && updateData.endDate) {
      const startDate = new Date(updateData.startDate);
      const endDate = new Date(updateData.endDate);
      if (startDate >= endDate) {
        return res.status(400).json({ message: 'La date de début doit être antérieure à la date de fin' });
      }
    }
    
    // Si des questions sont fournies, récupérer leurs détails pour créer des snapshots
    if (questions && questions.length > 0) {
      const questionIds = questions.map(q => q.questionId || q);
      const questionsDb = await Question.find({ '_id': { $in: questionIds } });
      
      updateData.questions = questionsDb.map(q => ({
        questionId: q._id,
        textSnapshot: q.text,
        qType: q.type,
        optionsSnapshot: q.options ? q.options.map(opt => opt.text) : []
      }));
      updateData.questionCount = questionsDb.length;
    }
    
    const quiz = await Quiz.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).populate('courseId').populate('semesterId').populate('academicYearId').populate('classId');

    if (!quiz) {
      return res.status(404).json({ message: 'Quiz non trouvé' });
    }

    res.json(quiz);
  } catch (error) {
    handleError(error, res, 'Erreur lors de la mise à jour du quiz');
  }
};

// @desc    Supprimer un quiz
// @route   DELETE /api/quizzes/:id
exports.deleteQuiz = async (req, res) => {
  try {
    const { id } = req.params;

    // Validation de l'ID
    const validation = validateObjectId(id, 'quiz');
    if (!validation.isValid) {
      return res.status(400).json({ message: validation.error });
    }

    const quiz = await Quiz.findByIdAndDelete(id);
    if (!quiz) {
      return res.status(404).json({ message: 'Quiz non trouvé' });
    }
    res.json({ message: 'Quiz supprimé' });
  } catch (error) {
    handleError(error, res, 'Erreur lors de la suppression du quiz');
  }
};

// @desc    Publier un quiz
// @route   POST /api/quizzes/:id/publish
exports.publishQuiz = async (req, res) => {
  try {
    const { id } = req.params;

    // Validation de l'ID
    const validation = validateObjectId(id, 'quiz');
    if (!validation.isValid) {
      return res.status(400).json({ message: validation.error });
    }

    const quiz = await Quiz.findById(id);
    if (!quiz) {
      return res.status(404).json({ message: 'Quiz non trouvé' });
    }

    quiz.status = 'PUBLISHED';
    quiz.isPublished = true; // Maintenir la compatibilité
    await quiz.save();

    // Envoyer automatiquement un email aux étudiants de la classe
    try {
      const emailController = require('./emailController');
      await emailController.sendQuizPublicationEmail(quiz._id, req.user._id);
      console.log('Email de publication envoyé automatiquement');
    } catch (emailError) {
      console.error('Erreur lors de l\'envoi de l\'email de publication:', emailError);
      // Ne pas faire échouer la publication si l'email échoue
    }

    res.json(quiz);
  } catch (error) {
    handleError(error, res, 'Erreur lors de la publication du quiz');
  }
};

// @desc    Dépublier un quiz
// @route   POST /api/quizzes/:id/unpublish
exports.unpublishQuiz = async (req, res) => {
  try {
    const { id } = req.params;

    // Validation de l'ID
    const validation = validateObjectId(id, 'quiz');
    if (!validation.isValid) {
      return res.status(400).json({ message: validation.error });
    }

    const quiz = await Quiz.findById(id);
    if (!quiz) {
      return res.status(404).json({ message: 'Quiz non trouvé' });
    }

    quiz.status = 'DRAFT';
    quiz.isPublished = false; // Maintenir la compatibilité
    await quiz.save();

    res.json(quiz);
  } catch (error) {
    handleError(error, res, 'Erreur lors de la dépublication du quiz');
  }
};
