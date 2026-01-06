const mongoose = require('mongoose');
const { AcademicYear, Semester, Class, Course, EvaluationType } = require('../models/Academic');
const handleError = require('../utils/errorHandler');
const validateObjectId = require('../utils/validateObjectId');

// --- ANNÉES ACADÉMIQUES ---

// @desc    Créer une année académique
// @route   POST /api/admin/years
exports.createYear = async (req, res) => {
  try {
    const { label, startDate, endDate, isCurrent } = req.body;
    
    // Si celle-ci est courante, désactiver les autres
    if (isCurrent) {
      await AcademicYear.updateMany({}, { isCurrent: false });
    }

    const year = await AcademicYear.create({ label, startDate, endDate, isCurrent });
    res.status(201).json(year);
  } catch (error) {
    handleError(error, res, 'Erreur lors de la création de l\'année académique');
  }
};

// @desc    Récupérer une année spécifique
// @route   GET /api/admin/years/:id
exports.getYear = async (req, res) => {
  try {
    // Validation de l'ID
    const validation = validateObjectId(req.params.id, 'academic year');
    if (!validation.isValid) {
      return res.status(400).json({ message: validation.error });
    }

    const year = await AcademicYear.findById(req.params.id);
    if (!year) {
      return res.status(404).json({ message: 'Année académique non trouvée' });
    }
    res.json(year);
  } catch (error) {
    handleError(error, res, 'Erreur lors de la récupération de l\'année académique');
  }
};

// @desc    Mettre à jour une année académique
// @route   PUT /api/admin/years/:id
exports.updateYear = async (req, res) => {
  try {
    // Validation de l'ID
    const validation = validateObjectId(req.params.id, 'academic year');
    if (!validation.isValid) {
      return res.status(400).json({ message: validation.error });
    }

    const { label, startDate, endDate, isCurrent } = req.body;
    
    // Si celle-ci devient courante, désactiver les autres
    if (isCurrent) {
      await AcademicYear.updateMany({ _id: { $ne: req.params.id } }, { isCurrent: false });
    }

    const year = await AcademicYear.findByIdAndUpdate(
      req.params.id,
      { label, startDate, endDate, isCurrent },
      { new: true, runValidators: true }
    );

    if (!year) {
      return res.status(404).json({ message: 'Année académique non trouvée' });
    }

    res.json(year);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Supprimer une année académique
// @route   DELETE /api/admin/years/:id
exports.deleteYear = async (req, res) => {
  try {
    // Validation de l'ID
    const validation = validateObjectId(req.params.id, 'academic year');
    if (!validation.isValid) {
      return res.status(400).json({ message: validation.error });
    }

    const year = await AcademicYear.findByIdAndDelete(req.params.id);
    if (!year) {
      return res.status(404).json({ message: 'Année académique non trouvée' });
    }
    res.json({ message: 'Année académique supprimée' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Lister les années
// @route   GET /api/admin/years
exports.getYears = async (req, res) => {
  const years = await AcademicYear.find().sort({ startDate: -1 });
  res.json(years);
};

// --- CLASSES ---

// @desc    Créer une classe
// @route   POST /api/admin/classes
exports.createClass = async (req, res) => {
  try {
    // Validation des données requises
    const { code, name, level, field, academicYear } = req.body;
    if (!code || !name || !level || !field || !academicYear) {
      return res.status(400).json({ 
        message: 'Tous les champs requis doivent être fournis',
        received: { code, name, level, field, academicYear }
      });
    }
    
    // Vérifier que academicYear est un ObjectId valide
    if (!mongoose.Types.ObjectId.isValid(academicYear)) {
      return res.status(400).json({ message: 'ID d\'année académique invalide' });
    }
    
    // Vérifier que l'année académique existe
    const yearExists = await AcademicYear.findById(academicYear);
    if (!yearExists) {
      return res.status(400).json({ message: 'Année académique non trouvée' });
    }
    
    const newClass = await Class.create(req.body); 
    res.status(201).json(newClass);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Obtenir les classes d'une année spécifique
// @route   GET /api/admin/classes/:yearId
exports.getClassesByYear = async (req, res) => {
  try {
    const classes = await Class.find({ academicYear: req.params.yearId }).populate({
      path: 'academicYear',
      options: { strictPopulate: false }
    });
    res.json(classes);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// --- COURS (UE) ---

// @desc    Créer un cours (UE)
// @route   POST /api/admin/courses
exports.createCourse = async (req, res) => {
  try {
    const course = await Course.create(req.body);
    res.status(201).json(course);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Lister les cours d'une classe
// @route   GET /api/admin/courses/:classId
exports.getCoursesByClass = async (req, res) => {
  try {
    const courses = await Course.find({ classId: req.params.classId });
    res.json(courses);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// --- SEMESTRES ---

// @desc    Créer un semestre
// @route   POST /api/admin/semesters
exports.createSemester = async (req, res) => {
  try {
    const { number, label, academicYear, startDate, endDate } = req.body;
    const semester = await Semester.create({ number, label, academicYear, startDate, endDate });
    res.status(201).json(semester);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Récupérer tous les semestres
// @route   GET /api/admin/semesters
exports.getSemesters = async (req, res) => {
  try {
    const { academicYearId } = req.query;
    const filter = academicYearId ? { academicYear: academicYearId } : {};
    const semesters = await Semester.find(filter).populate({
      path: 'academicYear',
      options: { strictPopulate: false }
    }).sort({ number: 1 });
    res.json(semesters);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Récupérer un semestre spécifique
// @route   GET /api/admin/semesters/:id
exports.getSemester = async (req, res) => {
  try {
    // Validation de l'ID
    const validation = validateObjectId(req.params.id, 'semester');
    if (!validation.isValid) {
      return res.status(400).json({ message: validation.error });
    }

    const semester = await Semester.findById(req.params.id).populate({
      path: 'academicYear',
      options: { strictPopulate: false }
    }).catch(async (populateError) => {
      // Si le populate échoue, récupérer le semestre sans populate
      return await Semester.findById(req.params.id);
    });
    if (!semester) {
      return res.status(404).json({ message: 'Semestre non trouvé' });
    }
    res.json(semester);
  } catch (error) {
    handleError(error, res, 'Erreur lors de la récupération du semestre');
  }
};

// @desc    Mettre à jour un semestre
// @route   PUT /api/admin/semesters/:id
exports.updateSemester = async (req, res) => {
  try {
    // Validation de l'ID
    const validation = validateObjectId(req.params.id, 'semester');
    if (!validation.isValid) {
      return res.status(400).json({ message: validation.error });
    }

    const semester = await Semester.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate({
      path: 'academicYear',
      options: { strictPopulate: false }
    }).catch(async (populateError) => {
      // Si le populate échoue, récupérer le semestre sans populate
      return await Semester.findById(req.params.id);
    });

    if (!semester) {
      return res.status(404).json({ message: 'Semestre non trouvé' });
    }

    res.json(semester);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Supprimer un semestre
// @route   DELETE /api/admin/semesters/:id
exports.deleteSemester = async (req, res) => {
  try {
    // Validation de l'ID
    const validation = validateObjectId(req.params.id, 'semester');
    if (!validation.isValid) {
      return res.status(400).json({ message: validation.error });
    }

    const semester = await Semester.findByIdAndDelete(req.params.id);
    if (!semester) {
      return res.status(404).json({ message: 'Semestre non trouvé' });
    }
    res.json({ message: 'Semestre supprimé' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// --- CLASSES (Méthodes CRUD complètes) ---

// @desc    Récupérer toutes les classes
// @route   GET /api/admin/classes
exports.getClasses = async (req, res) => {
  try {
    const { academicYearId } = req.query;
    const filter = academicYearId ? { academicYear: academicYearId } : {};
    const classes = await Class.find(filter).populate({
      path: 'academicYear',
      options: { strictPopulate: false }
    }).sort({ code: 1 });
    
    // Marquer les classes invalides au lieu de les filtrer
    const classesWithStatus = classes.map(classe => {
      const isValid = classe.code && classe.name && classe.level && classe.field && classe.academicYear;
      return {
        ...classe.toObject(),
        _isValid: isValid
      };
    });
    
    res.json(classesWithStatus);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Récupérer une classe spécifique
// @route   GET /api/admin/classes/:id
exports.getClass = async (req, res) => {
  try {
    // Validation de l'ID
    const validation = validateObjectId(req.params.id, 'class');
    if (!validation.isValid) {
      return res.status(400).json({ message: validation.error });
    }

    const classe = await Class.findById(req.params.id).populate({
      path: 'academicYear',
      model: 'AcademicYear',
      options: { strictPopulate: false } // Ne pas échouer si la référence est cassée
    }).catch(async (populateError) => {
      // Si le populate échoue, récupérer la classe sans populate
      return await Class.findById(req.params.id);
    });
    
    if (!classe) {
      return res.status(404).json({ message: 'Classe non trouvée' });
    }
    
    // Vérifier si la classe a des données valides
    // On valide sur les champs de la classe elle-même, pas sur les références populated
    const isValid = classe.code && classe.name && classe.level && classe.field && classe.academicYear;
    
    // Retourner la classe avec son statut de validation
    const classeObject = classe.toObject();
    const response = {
      ...classeObject,
      id: classe.id, // L'ID est déjà transformé par le schéma
      _isValid: isValid
    };
    
    res.json(response);
  } catch (error) {
    handleError(error, res, 'Erreur lors de la récupération de la classe');
  }
};

// @desc    Mettre à jour une classe
// @route   PUT /api/admin/classes/:id
exports.updateClass = async (req, res) => {
  try {
    // Validation de l'ID
    const validation = validateObjectId(req.params.id, 'class');
    if (!validation.isValid) {
      return res.status(400).json({ message: validation.error });
    }

    const classe = await Class.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate({
      path: 'academicYear',
      options: { strictPopulate: false }
    });

    if (!classe) {
      return res.status(404).json({ message: 'Classe non trouvée' });
    }

    res.json(classe);
  } catch (error) {
    handleError(error, res, 'Erreur lors de la mise à jour de la classe');
  }
};

// @desc    Supprimer une classe
// @route   DELETE /api/admin/classes/:id
exports.deleteClass = async (req, res) => {
  try {
    // Validation de l'ID
    const validation = validateObjectId(req.params.id, 'class');
    if (!validation.isValid) {
      return res.status(400).json({ message: validation.error });
    }

    const classe = await Class.findByIdAndDelete(req.params.id);
    if (!classe) {
      return res.status(404).json({ message: 'Classe non trouvée' });
    }
    res.json({ message: 'Classe supprimée' });
  } catch (error) {
    handleError(error, res, 'Erreur lors de la suppression de la classe');
  }
};

// @desc    Promouvoir les classes vers l'année suivante
// @route   POST /api/admin/classes/promote
exports.promoteClasses = async (req, res) => {
  try {
    const { sourceYearId, targetYearId } = req.body;

    // Récupérer les classes de l'année source
    const sourceClasses = await Class.find({ academicYear: sourceYearId });

    // Créer les nouvelles classes pour l'année cible
    const promotedClasses = [];
    for (const sourceClass of sourceClasses) {
      const newClass = await Class.create({
        code: `${sourceClass.code}-PROMOTED`, // Temporaire, à ajuster selon la logique métier
        name: sourceClass.name,
        level: sourceClass.level,
        field: sourceClass.field,
        academicYear: targetYearId,
        capacity: sourceClass.capacity
      });
      promotedClasses.push(newClass);
    }

    res.status(201).json({
      message: `${promotedClasses.length} classes promues`,
      classes: promotedClasses
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// --- COURS (Méthodes CRUD complètes) ---

// @desc    Récupérer tous les cours
// @route   GET /api/admin/courses
exports.getCourses = async (req, res) => {
  try {
    const { classId, semesterId, academicYearId } = req.query;
    let filter = {};

    if (classId) filter.classId = classId;
    if (semesterId) filter.semesterId = semesterId;
    if (academicYearId) {
      // Trouver les classes de cette année pour filtrer les cours
      const classes = await Class.find({ academicYear: academicYearId });
      const classIds = classes.map(c => c._id);
      filter.classId = { $in: classIds };
    }

    const courses = await Course.find(filter)
      .populate({
        path: 'classId',
        options: { strictPopulate: false }
      })
      .populate({
        path: 'semesterId',
        options: { strictPopulate: false }
      })
      .sort({ code: 1 });
    res.json(courses);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Récupérer un cours spécifique
// @route   GET /api/admin/courses/:id
exports.getCourse = async (req, res) => {
  try {
    // Validation de l'ID
    const validation = validateObjectId(req.params.id, 'course');
    if (!validation.isValid) {
      return res.status(400).json({ message: validation.error });
    }

    const course = await Course.findById(req.params.id)
      .populate({
        path: 'classId',
        options: { strictPopulate: false }
      })
      .populate({
        path: 'semesterId',
        options: { strictPopulate: false }
      })
      .catch(async (populateError) => {
        // Si le populate échoue, récupérer le cours sans populate
        return await Course.findById(req.params.id);
      });
    
    if (!course) {
      return res.status(404).json({ message: 'Cours non trouvé' });
    }
    
    res.json(course);
  } catch (error) {
    handleError(error, res, 'Erreur lors de la récupération du cours');
  }
};

// @desc    Mettre à jour un cours
// @route   PUT /api/admin/courses/:id
exports.updateCourse = async (req, res) => {
  try {
    // Validation de l'ID
    const validation = validateObjectId(req.params.id, 'course');
    if (!validation.isValid) {
      return res.status(400).json({ message: validation.error });
    }

    const course = await Course.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate({
      path: 'classId',
      options: { strictPopulate: false }
    }).populate({
      path: 'semesterId',
      options: { strictPopulate: false }
    }).catch(async (populateError) => {
      // Si le populate échoue, récupérer le cours sans populate
      return await Course.findById(req.params.id);
    });

    if (!course) {
      return res.status(404).json({ message: 'Cours non trouvé' });
    }

    res.json(course);
  } catch (error) {
    handleError(error, res, 'Erreur lors de la mise à jour du cours');
  }
};

// @desc    Supprimer un cours
// @route   DELETE /api/admin/courses/:id
exports.deleteCourse = async (req, res) => {
  try {
    // Validation de l'ID
    const validation = validateObjectId(req.params.id, 'course');
    if (!validation.isValid) {
      return res.status(400).json({ message: validation.error });
    }

    const course = await Course.findByIdAndDelete(req.params.id);
    if (!course) {
      return res.status(404).json({ message: 'Cours non trouvé' });
    }
    res.json({ message: 'Cours supprimé' });
  } catch (error) {
    handleError(error, res, 'Erreur lors de la suppression du cours');
  }
};

// --- TYPES D'ÉVALUATION ---

// @desc    Créer un type d'évaluation
// @route   POST /api/admin/evaluation-types
exports.createEvaluationType = async (req, res) => {
  try {
    const { label, code } = req.body;
    const evaluationType = await EvaluationType.create({ label, code });
    res.status(201).json(evaluationType);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Récupérer tous les types d'évaluation
// @route   GET /api/admin/evaluation-types
exports.getEvaluationTypes = async (req, res) => {
  try {
    const evaluationTypes = await EvaluationType.find().sort({ label: 1 });
    res.json(evaluationTypes);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Récupérer un type d'évaluation spécifique
// @route   GET /api/admin/evaluation-types/:id
exports.getEvaluationType = async (req, res) => {
  try {
    const evaluationType = await EvaluationType.findById(req.params.id);
    if (!evaluationType) {
      return res.status(404).json({ message: 'Type d\'évaluation non trouvé' });
    }
    res.json(evaluationType);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Mettre à jour un type d'évaluation
// @route   PUT /api/admin/evaluation-types/:id
exports.updateEvaluationType = async (req, res) => {
  try {
    const evaluationType = await EvaluationType.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!evaluationType) {
      return res.status(404).json({ message: 'Type d\'évaluation non trouvé' });
    }

    res.json(evaluationType);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Supprimer un type d'évaluation
// @route   DELETE /api/admin/evaluation-types/:id
exports.deleteEvaluationType = async (req, res) => {
  try {
    const evaluationType = await EvaluationType.findByIdAndDelete(req.params.id);
    if (!evaluationType) {
      return res.status(404).json({ message: 'Type d\'évaluation non trouvé' });
    }
    res.json({ message: 'Type d\'évaluation supprimé' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
