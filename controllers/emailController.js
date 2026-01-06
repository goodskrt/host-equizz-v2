const Email = require('../models/Email');
const User = require('../models/User');
const { Quiz } = require('../models/Quiz');
const { Course, Class } = require('../models/Academic');
const emailService = require('../services/emailService');
const mongoose = require('mongoose');

// @desc    Créer et envoyer un email manuel
// @route   POST /api/emails
exports.createEmail = async (req, res) => {
  try {
    const { subject, message, recipients, quizId, courseId, classId } = req.body;

    if (!subject || !message || !recipients || recipients.length === 0) {
      return res.status(400).json({ message: 'Sujet, message et destinataires requis' });
    }

    // Créer l'email en base
    const email = await Email.create({
      subject,
      message,
      recipients: recipients.map(r => ({
        email: r.email,
        name: r.name || '',
        status: 'PENDING'
      })),
      type: 'MANUAL',
      quizId: quizId || null,
      courseId: courseId || null,
      classId: classId || null,
      totalRecipients: recipients.length,
      createdBy: req.user._id,
      status: 'SENDING'
    });

    // Envoyer les emails
    try {
      const quiz = quizId ? await Quiz.findById(quizId).populate('courseId') : null;
      const course = courseId ? await Course.findById(courseId) : (quiz ? quiz.courseId : null);
      
      const results = await emailService.sendManualEmail(recipients, subject, message, quiz, course);
      
      // Mettre à jour les statuts
      const updatedRecipients = email.recipients.map((recipient, index) => {
        const error = results.errors.find(e => e.recipient === recipient.email);
        return {
          ...recipient.toObject(),
          status: error ? 'FAILED' : 'SENT',
          sentAt: error ? null : new Date(),
          error: error ? error.error : null
        };
      });

      await Email.findByIdAndUpdate(email._id, {
        recipients: updatedRecipients,
        successCount: results.success,
        failedCount: results.failed,
        status: results.failed === 0 ? 'SENT' : (results.success === 0 ? 'FAILED' : 'SENT'),
        sentAt: new Date()
      });

      res.status(201).json({
        email: await Email.findById(email._id),
        results: {
          success: results.success,
          failed: results.failed,
          errors: results.errors
        }
      });
    } catch (error) {
      await Email.findByIdAndUpdate(email._id, {
        status: 'FAILED',
        failedCount: recipients.length
      });
      throw error;
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Récupérer tous les emails
// @route   GET /api/emails
exports.getEmails = async (req, res) => {
  try {
    const { type, status, classId, quizId } = req.query;
    let filter = {};

    if (type) filter.type = type;
    if (status) filter.status = status;
    if (classId) filter.classId = classId;
    if (quizId) filter.quizId = quizId;

    const emails = await Email.find(filter)
      .populate('quizId', 'title')
      .populate('courseId', 'name')
      .populate('classId', 'code name')
      .populate('createdBy', 'firstName lastName')
      .sort({ createdAt: -1 });

    res.json(emails);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Récupérer un email spécifique
// @route   GET /api/emails/:id
exports.getEmail = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'ID d\'email invalide' });
    }

    const email = await Email.findById(req.params.id)
      .populate('quizId', 'title description')
      .populate('courseId', 'name')
      .populate('classId', 'code name')
      .populate('createdBy', 'firstName lastName');

    if (!email) {
      return res.status(404).json({ message: 'Email non trouvé' });
    }

    res.json(email);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Supprimer un email
// @route   DELETE /api/emails/:id
exports.deleteEmail = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'ID d\'email invalide' });
    }

    const email = await Email.findByIdAndDelete(req.params.id);
    if (!email) {
      return res.status(404).json({ message: 'Email non trouvé' });
    }

    res.json({ message: 'Email supprimé' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Envoyer un email à tous les étudiants d'une classe
// @route   POST /api/emails/send-to-class
exports.sendEmailToClass = async (req, res) => {
  try {
    const { classId, subject, message, quizId } = req.body;

    if (!classId || !subject || !message) {
      return res.status(400).json({ message: 'Classe, sujet et message requis' });
    }

    // Récupérer tous les étudiants de la classe
    const students = await User.find({ 
      classId: classId, 
      role: 'STUDENT' 
    }).select('email firstName lastName');

    if (students.length === 0) {
      return res.status(404).json({ message: 'Aucun étudiant trouvé dans cette classe' });
    }

    const recipients = students.map(student => ({
      email: student.email,
      name: `${student.firstName} ${student.lastName}`
    }));

    // Utiliser la méthode createEmail existante
    req.body.recipients = recipients;
    return exports.createEmail(req, res);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Obtenir les statistiques des emails
// @route   GET /api/emails/stats
exports.getEmailStats = async (req, res) => {
  try {
    const stats = await Email.aggregate([
      {
        $group: {
          _id: null,
          totalEmails: { $sum: 1 },
          totalRecipients: { $sum: '$totalRecipients' },
          totalSent: { $sum: '$successCount' },
          totalFailed: { $sum: '$failedCount' },
          quizEmails: {
            $sum: { $cond: [{ $eq: ['$type', 'QUIZ_PUBLICATION'] }, 1, 0] }
          },
          manualEmails: {
            $sum: { $cond: [{ $eq: ['$type', 'MANUAL'] }, 1, 0] }
          }
        }
      }
    ]);

    const recentEmails = await Email.find({})
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('quizId', 'title')
      .populate('classId', 'code');

    res.json({
      stats: stats[0] || {
        totalEmails: 0,
        totalRecipients: 0,
        totalSent: 0,
        totalFailed: 0,
        quizEmails: 0,
        manualEmails: 0
      },
      recentEmails
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Fonction pour envoyer automatiquement un email lors de la publication d'un quiz
// @route   Utilisée par le contrôleur de quiz
exports.sendQuizPublicationEmail = async (quizId, userId) => {
  try {
    const quiz = await Quiz.findById(quizId)
      .populate('courseId')
      .populate('classId');

    if (!quiz) {
      throw new Error('Quiz non trouvé');
    }

    // Récupérer tous les étudiants de la classe du quiz
    const students = await User.find({ 
      classId: quiz.classId._id, 
      role: 'STUDENT' 
    }).select('email firstName lastName');

    if (students.length === 0) {
      console.log('Aucun étudiant trouvé pour la classe du quiz');
      return { success: 0, failed: 0, errors: [] };
    }

    // Créer l'email en base
    const email = await Email.create({
      subject: `📝 Nouveau Quiz Disponible - ${quiz.title}`,
      message: `Un nouveau quiz "${quiz.title}" vient d'être publié pour votre classe.`,
      recipients: students.map(student => ({
        email: student.email,
        name: `${student.firstName} ${student.lastName}`,
        status: 'PENDING'
      })),
      type: 'QUIZ_PUBLICATION',
      quizId: quiz._id,
      courseId: quiz.courseId?._id,
      classId: quiz.classId._id,
      totalRecipients: students.length,
      createdBy: userId,
      status: 'SENDING'
    });

    // Envoyer les emails
    const results = await emailService.sendQuizNotification(students, quiz, quiz.courseId);
    
    // Mettre à jour les statuts
    const updatedRecipients = email.recipients.map((recipient, index) => {
      const error = results.errors.find(e => e.email === recipient.email);
      return {
        ...recipient.toObject(),
        status: error ? 'FAILED' : 'SENT',
        sentAt: error ? null : new Date(),
        error: error ? error.error : null
      };
    });

    await Email.findByIdAndUpdate(email._id, {
      recipients: updatedRecipients,
      successCount: results.success,
      failedCount: results.failed,
      status: results.failed === 0 ? 'SENT' : (results.success === 0 ? 'FAILED' : 'SENT'),
      sentAt: new Date()
    });

    console.log(`Email de publication de quiz envoyé: ${results.success} succès, ${results.failed} échecs`);
    return results;
  } catch (error) {
    console.error('Erreur lors de l\'envoi de l\'email de publication:', error);
    throw error;
  }
};

// @desc    Tester la connexion email
// @route   GET /api/emails/test-connection
exports.testEmailConnection = async (req, res) => {
  try {
    const isConnected = await emailService.testConnection();
    res.json({ 
      connected: isConnected,
      message: isConnected ? 'Connexion SMTP réussie' : 'Échec de la connexion SMTP'
    });
  } catch (error) {
    res.status(500).json({ 
      connected: false,
      message: 'Erreur lors du test de connexion',
      error: error.message 
    });
  }
};