const { Quiz } = require('../models/Quiz');
const { Submission, SubmissionLog } = require('../models/Submission');
const User = require('../models/User');

// Mock simple pour l'analyse de sentiment (à remplacer par API Google Cloud)
const analyzeSentimentMock = (text) => {
  const positives = ['bon', 'excellent', 'bien', 'super', 'intéressant'];
  const negatives = ['mauvais', 'nul', 'ennuyeux', 'rapide', 'incompréhensible'];
  let score = 0;
  
  const words = text.toLowerCase().split(' ');
  words.forEach(w => {
    if (positives.includes(w)) score += 0.5;
    if (negatives.includes(w)) score -= 0.5;
  });
  // Borner entre -1 et 1
  return Math.max(-1, Math.min(1, score));
};

// @desc    Récupérer les quiz disponibles pour ma classe
// @route   GET /api/student/quizzes
exports.getMyQuizzes = async (req, res) => {
  try {
    // 1. Trouver les cours de ma classe
    // Note: Dans une vraie implém, on ferait une jointure complexe, ici simplifié
    const user = await User.findById(req.user._id);
    
    // 2. Trouver les quiz publiés pour ces cours
    // On suppose qu'on filtre par courseId lié à la classId (simplification)
    // Dans la réalité: Find Courses where classId = user.classId -> Get IDs -> Find Quiz
    
    const quizzes = await Quiz.find({ status: 'PUBLISHED' })
      .populate({
         path: 'courseId',
         match: { classId: user.classId } // Filtre populate
      });

    // 3. Filtrer ceux déjà répondus
    const myLogs = await SubmissionLog.find({ studentId: req.user._id });
    const answeredQuizIds = myLogs.map(log => log.quizId.toString());

    const todoQuizzes = quizzes.filter(q => 
        q.courseId !== null && !answeredQuizIds.includes(q._id.toString())
    );

    res.json(todoQuizzes);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Soumettre un quiz
// @route   POST /api/student/submit
exports.submitQuiz = async (req, res) => {
  const { quizId, answers } = req.body;

  try {
    // 1. Vérifier doublon (Sécurité Backend)
    const existing = await SubmissionLog.findOne({ studentId: req.user._id, quizId });
    if (existing) {
      return res.status(400).json({ message: 'Quiz déjà soumis' });
    }

    // 2. Traitement IA sur les réponses ouvertes
    let totalSentiment = 0;
    let countOpen = 0;

    const processedAnswers = answers.map(ans => {
        // Ici on devrait vérifier le type de question via DB, 
        // on suppose pour l'exemple qu'on détecte si c'est du texte long
        if (typeof ans.value === 'string' && ans.value.length > 10) {
            const score = analyzeSentimentMock(ans.value);
            totalSentiment += score;
            countOpen++;
        }
        return ans;
    });

    const finalSentiment = countOpen > 0 ? (totalSentiment / countOpen) : 0;

    // 3. Sauvegarder la soumission ANONYME
    await Submission.create({
        quizId,
        answers: processedAnswers,
        sentimentAnalysis: { score: finalSentiment, magnitude: 1 }
    });

    // 4. Sauvegarder le LOG (Lien étudiant-quiz)
    await SubmissionLog.create({
        studentId: req.user._id,
        quizId
    });

    res.status(201).json({ message: 'Soumission réussie' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Mettre à jour sa classe (Passage en année supérieure)
// @route   PUT /api/student/update-class
exports.updateClass = async (req, res) => {
    const { newClassId } = req.body;
    const studentId = req.user._id;

    try {
        const student = await User.findById(studentId);
        
        // Validation basique (Vérifier que la classe existe, etc.)
        const newClass = await Class.findById(newClassId).populate('academicYear');
        if (!newClass) return res.status(404).json({ message: "Classe introuvable" });

        // Vérifier si c'est bien une année future ou courante (règle métier optionnelle)
        // Ici on fait simple : on archive l'ancienne classe
        
        if (student.classId) {
            // Ajouter l'ancienne classe à l'historique (si votre modèle User a un champ history)
            // Sinon, on remplace simplement.
            // Pour le projet ISI, garder une trace est mieux :
            // (Assurez-vous d'avoir ajouté le champ `history: []` dans le modèle User.js si ce n'est pas fait)
            /* 
               student.history.push({ 
                 classId: student.classId, 
                 date: new Date() 
               }); 
            */
        }

        student.classId = newClassId;
        await student.save();

        res.json({ 
            message: `Félicitations ! Vous êtes maintenant en ${newClass.code}`,
            user: {
                _id: student._id,
                firstName: student.firstName,
                classId: student.classId,
                role: student.role
            }
        });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Enregistrer le token FCM (Notification) depuis le mobile
// @route   POST /api/student/fcm-token
exports.updateFcmToken = async (req, res) => {
    try {
        await User.findByIdAndUpdate(req.user._id, { fcmToken: req.body.token });
        res.json({ message: "Token mis à jour" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// ========================================
// GESTION ADMINISTRATIVE DES ÉTUDIANTS
// ========================================

// @desc    Vérifier le mot de passe de gestion des étudiants
// @route   POST /api/admin/students/verify-password
exports.verifyStudentManagementPassword = async (req, res) => {
  try {
    const { password } = req.body;
    const correctPassword = process.env.STUDENT_MANAGEMENT_PASSWORD;
    
    if (!correctPassword) {
      return res.status(500).json({ message: 'Mot de passe de gestion non configuré' });
    }
    
    if (password === correctPassword) {
      res.json({ valid: true, message: 'Accès autorisé' });
    } else {
      res.status(401).json({ valid: false, message: 'Mot de passe incorrect' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Récupérer tous les étudiants
// @route   GET /api/admin/students
exports.getStudents = async (req, res) => {
  try {
    const { classId, search } = req.query;
    let filter = { role: 'STUDENT' };
    
    if (classId) {
      filter.classId = classId;
    }
    
    let query = User.find(filter).populate('classId').select('-password');
    
    if (search) {
      query = query.where({
        $or: [
          { firstName: { $regex: search, $options: 'i' } },
          { lastName: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
          { matricule: { $regex: search, $options: 'i' } }
        ]
      });
    }
    
    const students = await query.sort({ lastName: 1, firstName: 1 });
    res.json(students);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Récupérer un étudiant spécifique
// @route   GET /api/admin/students/:id
exports.getStudent = async (req, res) => {
  try {
    const student = await User.findById(req.params.id)
      .populate('classId')
      .select('-password');
    
    if (!student || student.role !== 'STUDENT') {
      return res.status(404).json({ message: 'Étudiant non trouvé' });
    }
    
    res.json(student);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Créer un nouvel étudiant
// @route   POST /api/admin/students
exports.createStudent = async (req, res) => {
  try {
    const { matricule, email, firstName, lastName, classId, password } = req.body;
    
    // Vérifier si l'email ou le matricule existe déjà
    const existingUser = await User.findOne({
      $or: [
        { email },
        { matricule: matricule || null }
      ]
    });
    
    if (existingUser) {
      return res.status(400).json({ 
        message: existingUser.email === email ? 'Email déjà utilisé' : 'Matricule déjà utilisé' 
      });
    }
    
    const student = await User.create({
      matricule,
      email,
      firstName,
      lastName,
      classId,
      password: password || 'password123', // Mot de passe par défaut
      role: 'STUDENT'
    });
    
    // Retourner l'étudiant sans le mot de passe
    const studentResponse = await User.findById(student._id)
      .populate('classId')
      .select('-password');
    
    res.status(201).json(studentResponse);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Mettre à jour un étudiant
// @route   PUT /api/admin/students/:id
exports.updateStudent = async (req, res) => {
  try {
    const { matricule, email, firstName, lastName, classId, password } = req.body;
    
    // Vérifier si l'étudiant existe
    const student = await User.findById(req.params.id);
    if (!student || student.role !== 'STUDENT') {
      return res.status(404).json({ message: 'Étudiant non trouvé' });
    }
    
    // Vérifier les doublons (sauf pour l'étudiant actuel)
    if (email || matricule) {
      const existingUser = await User.findOne({
        _id: { $ne: req.params.id },
        $or: [
          ...(email ? [{ email }] : []),
          ...(matricule ? [{ matricule }] : [])
        ]
      });
      
      if (existingUser) {
        return res.status(400).json({ 
          message: existingUser.email === email ? 'Email déjà utilisé' : 'Matricule déjà utilisé' 
        });
      }
    }
    
    // Préparer les données de mise à jour
    const updateData = {};
    if (matricule !== undefined) updateData.matricule = matricule;
    if (email) updateData.email = email;
    if (firstName) updateData.firstName = firstName;
    if (lastName) updateData.lastName = lastName;
    if (classId) updateData.classId = classId;
    if (password) updateData.password = password;
    
    const updatedStudent = await User.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).populate('classId').select('-password');
    
    res.json(updatedStudent);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Supprimer un étudiant
// @route   DELETE /api/admin/students/:id
exports.deleteStudent = async (req, res) => {
  try {
    const student = await User.findById(req.params.id);
    
    if (!student || student.role !== 'STUDENT') {
      return res.status(404).json({ message: 'Étudiant non trouvé' });
    }
    
    await User.findByIdAndDelete(req.params.id);
    res.json({ message: 'Étudiant supprimé avec succès' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Réinitialiser le mot de passe d'un étudiant
// @route   POST /api/admin/students/:id/reset-password
exports.resetStudentPassword = async (req, res) => {
  try {
    const { newPassword } = req.body;
    
    const student = await User.findById(req.params.id);
    if (!student || student.role !== 'STUDENT') {
      return res.status(404).json({ message: 'Étudiant non trouvé' });
    }
    
    student.password = newPassword || 'password123';
    await student.save();
    
    res.json({ message: 'Mot de passe réinitialisé avec succès' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Importer des étudiants en masse (CSV)
// @route   POST /api/admin/students/import
exports.importStudents = async (req, res) => {
  try {
    const { students } = req.body; // Array d'étudiants
    
    const results = {
      success: 0,
      errors: [],
      total: students.length
    };
    
    for (let i = 0; i < students.length; i++) {
      const studentData = students[i];
      
      try {
        // Vérifier les doublons
        const existing = await User.findOne({
          $or: [
            { email: studentData.email },
            { matricule: studentData.matricule }
          ]
        });
        
        if (existing) {
          results.errors.push({
            row: i + 1,
            message: `Email ou matricule déjà utilisé: ${studentData.email}`,
            data: studentData
          });
          continue;
        }
        
        await User.create({
          ...studentData,
          password: studentData.password || 'password123',
          role: 'STUDENT'
        });
        
        results.success++;
      } catch (error) {
        results.errors.push({
          row: i + 1,
          message: error.message,
          data: studentData
        });
      }
    }
    
    res.json(results);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};