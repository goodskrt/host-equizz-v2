const { Question } = require('../models/Quiz');
const { Course, Class, AcademicYear } = require('../models/Academic');
const validateObjectId = require('../utils/validateObjectId');
const handleError = require('../utils/errorHandler');
const mongoose = require('mongoose');

// @desc    Créer une question
// @route   POST /api/admin/questions
exports.createQuestion = async (req, res) => {
  try {
    const { coursId: courseId, academicYearId, classId, texte: text, type, options } = req.body;
    console.log('Creating question with data:', { courseId, academicYearId, classId, text, type, options });

    // Validation des champs requis
    if (!academicYearId || !classId) {
      return res.status(400).json({ message: 'Année académique et classe sont requises' });
    }

    // Vérifier que l'année académique existe
    const academicYear = await AcademicYear.findById(academicYearId);
    if (!academicYear) {
      console.log('Academic year not found for ID:', academicYearId);
      return res.status(404).json({ message: 'Année académique non trouvée' });
    }
    console.log('Found academic year:', academicYear.label);

    // Vérifier que la classe existe
    const classe = await Class.findById(classId);
    if (!classe) {
      console.log('Class not found for ID:', classId);
      return res.status(404).json({ message: 'Classe non trouvée' });
    }
    console.log('Found class:', classe.name);

    // Vérifier que le cours existe seulement si courseId est fourni
    if (courseId) {
      const course = await Course.findById(courseId);
      if (!course) {
        console.log('Course not found for ID:', courseId);
        return res.status(404).json({ message: 'Cours non trouvé' });
      }
      console.log('Found course:', course.name);
    }

    // Mapper les options si présentes
    const mappedOptions = options ? options.map(opt => ({
      text: opt.texte,
      order: opt.ordre
    })) : [];

    const question = await Question.create({
      courseId: courseId || null, // Permettre null si non fourni
      academicYearId,
      classId,
      text,
      type,
      options: mappedOptions
    });

    console.log('Question created successfully:', question._id);
    res.status(201).json(question);
  } catch (error) {
    console.error('Error creating question:', error);
    handleError(error, res, 'Erreur lors de la création de la question');
  }
};

// @desc    Récupérer toutes les questions avec filtres
// @route   GET /api/admin/questions
exports.getQuestions = async (req, res) => {
  try {
    const { coursId: courseId, academicYearId, classId, type, letter, all } = req.query;
    console.log('Getting questions with filters:', { courseId, academicYearId, classId, type, letter, all });

    let filter = {};

    // Filtres par année académique et classe
    if (academicYearId) {
      if (!mongoose.Types.ObjectId.isValid(academicYearId)) {
        return res.status(400).json({ message: 'ID d\'année académique invalide' });
      }
      filter.academicYearId = academicYearId;
    }

    if (classId) {
      if (!mongoose.Types.ObjectId.isValid(classId)) {
        return res.status(400).json({ message: 'ID de classe invalide' });
      }
      filter.classId = classId;
    }

    // Filtres existants
    if (courseId) {
      if (!mongoose.Types.ObjectId.isValid(courseId)) {
        return res.status(400).json({ message: 'ID de cours invalide' });
      }
      filter.courseId = courseId;
    }

    if (type) {
      filter.type = type;
    }

    if (all) {
      // Récupérer toutes les questions
    } else if (!courseId && !academicYearId && !classId) {
      // Par défaut, récupérer les questions sans cours assigné
      filter.courseId = null;
    }

    // Filtre de recherche par lettre (début du texte)
    if (letter) {
      filter.text = new RegExp('^' + letter, 'i');
    }

    const questions = await Question.find(filter)
      .populate('courseId')
      .populate('academicYearId')
      .populate('classId')
      .sort({ createdAt: -1 });

    console.log(`Found ${questions.length} questions with filter:`, filter);
    if (questions.length > 0) {
      console.log('First question academicYearId:', questions[0].academicYearId);
    }

    res.json(questions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Récupérer une question spécifique
// @route   GET /api/admin/questions/:id
exports.getQuestion = async (req, res) => {
  try {
    const { id } = req.params;

    // Validation de l'ID
    const validation = validateObjectId(id, 'question');
    if (!validation.isValid) {
      return res.status(400).json({ message: validation.error });
    }

    const question = await Question.findById(id)
      .populate('courseId')
      .populate('academicYearId')
      .populate('classId');

    if (!question) {
      return res.status(404).json({ message: 'Question non trouvée' });
    }

    res.json(question);
  } catch (error) {
    handleError(error, res, 'Erreur lors de la récupération de la question');
  }
};

// @desc    Mettre à jour une question
// @route   PUT /api/admin/questions/:id
exports.updateQuestion = async (req, res) => {
  try {
    const { id } = req.params;

    // Validation de l'ID
    const validation = validateObjectId(id, 'question');
    if (!validation.isValid) {
      return res.status(400).json({ message: validation.error });
    }

    const updateData = { ...req.body };
    if (updateData.texte) {
      updateData.text = updateData.texte;
      delete updateData.texte;
    }
    if (updateData.coursId) {
      updateData.courseId = updateData.coursId;
      delete updateData.coursId;
    }
    if (updateData.academicYearId) {
      // Validation
      if (!mongoose.Types.ObjectId.isValid(updateData.academicYearId)) {
        return res.status(400).json({ message: 'ID d\'année académique invalide' });
      }
    }
    if (updateData.classId) {
      // Validation
      if (!mongoose.Types.ObjectId.isValid(updateData.classId)) {
        return res.status(400).json({ message: 'ID de classe invalide' });
      }
    }
    if (updateData.options) {
      updateData.options = updateData.options.map(opt => ({
        text: opt.texte,
        order: opt.ordre
      }));
    }

    const question = await Question.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).populate('courseId').populate('academicYearId').populate('classId');

    if (!question) {
      return res.status(404).json({ message: 'Question non trouvée' });
    }

    res.json(question);
  } catch (error) {
    handleError(error, res, 'Erreur lors de la mise à jour de la question');
  }
};

// @desc    Supprimer une question
// @route   DELETE /api/admin/questions/:id
exports.deleteQuestion = async (req, res) => {
  try {
    const { id } = req.params;

    // Validation de l'ID
    const validation = validateObjectId(id, 'question');
    if (!validation.isValid) {
      return res.status(400).json({ message: validation.error });
    }

    const question = await Question.findByIdAndDelete(id);
    if (!question) {
      return res.status(404).json({ message: 'Question non trouvée' });
    }
    res.json({ message: 'Question supprimée' });
  } catch (error) {
    handleError(error, res, 'Erreur lors de la suppression de la question');
  }
};

// @desc    Importer des questions depuis Excel
// @route   POST /api/admin/questions/import
exports.importQuestions = async (req, res) => {
  try {
    // Cette méthode sera implémentée avec la logique d'import Excel
    // Pour l'instant, retourner une réponse temporaire
    res.status(501).json({ message: 'Import Excel pas encore implémenté' });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Prévisualisation de l'import
// @route   POST /api/admin/questions/import/preview
exports.previewImport = async (req, res) => {
  try {
    // Cette méthode sera implémentée avec la logique de prévisualisation
    res.status(501).json({ message: 'Prévisualisation d\'import pas encore implémentée' });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Vérifier s'il existe des questions ouvertes pour un cours et une année
// @route   GET /api/admin/questions/check-open
// @desc    Vérifier s'il existe des questions ouvertes pour un cours (optionnel)
// @route   GET /api/questions/check-ouverte
exports.checkOpenQuestions = async (req, res) => {
  try {
    const { coursId: courseId } = req.query;

    const filter = { type: 'OUVERTE' };
    if (courseId) {
      filter.courseId = courseId;
    }

    const openQuestion = await Question.findOne(filter);

    res.json({ exists: !!openQuestion });
  } catch (error) {
    handleError(error, res, 'Erreur lors de la vérification des questions ouvertes');
  }
};

// @desc    Récupérer les questions ouvertes pour un cours (optionnel)
// @route   GET /api/questions/ouvertes
exports.getOpenQuestions = async (req, res) => {
  try {
    const { coursId: courseId } = req.query;

    const filter = { type: 'OUVERTE' };
    if (courseId) {
      if (Array.isArray(courseId) || typeof courseId !== 'string') {
        return res.status(400).json({ message: 'coursId doit être une string' });
      }
      if (!mongoose.Types.ObjectId.isValid(courseId)) {
        return res.status(400).json({ message: 'ID de cours invalide' });
      }
      filter.courseId = new mongoose.Types.ObjectId(courseId);
    }

    const questions = await Question.find(filter)
      .populate('courseId');

    res.json(questions);
  } catch (error) {
    handleError(error, res, 'Erreur lors de la récupération des questions ouvertes');
  }
};