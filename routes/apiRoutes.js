const express = require('express');
const router = express.Router();
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });

// Middlewares
const { protect, adminOnly, extractDeviceInfo } = require('../middleware/auth');

// Contrôleurs
const authController = require('../controllers/authController');
const quizController = require('../controllers/quizController');
const studentController = require('../controllers/studentController');
const importController = require('../controllers/importController');
const statsController = require('../controllers/statsController');
const academicController = require('../controllers/academicController');
const questionController = require('../controllers/questionController');
const emailController = require('../controllers/emailController');


/* =========================================
   AUTH
   ========================================= */
router.post('/auth/login', extractDeviceInfo, authController.login);
router.post('/auth/register', extractDeviceInfo, authController.register);
router.post('/auth/create-admin', extractDeviceInfo, authController.createAdmin);
router.post('/auth/refresh', extractDeviceInfo, authController.refreshToken);
router.post('/auth/logout', protect, authController.logout);
router.get('/auth/me', protect, authController.getMe);
router.get('/auth/sessions', protect, authController.getSessions);
router.delete('/auth/sessions/:sessionId', protect, authController.revokeSession);
router.post('/auth/register-fcm-token', protect, authController.registerFCMToken);
router.post('/auth/unregister-fcm-token', protect, authController.unregisterFCMToken);

/* =========================================
   ADMIN - ACADEMIC (Années, Classes, Cours)
   ========================================= */
router.post('/admin/years', protect, adminOnly, academicController.createYear);
router.get('/admin/years', protect, adminOnly, academicController.getYears);
router.get('/admin/years/:id', protect, adminOnly, academicController.getYear);
router.put('/admin/years/:id', protect, adminOnly, academicController.updateYear);
router.delete('/admin/years/:id', protect, adminOnly, academicController.deleteYear);


router.post('/admin/classes', protect, adminOnly, academicController.createClass);
router.get('/admin/classes/:id', protect, adminOnly, academicController.getClass);
router.get('/admin/classes/:yearId', protect, adminOnly, academicController.getClassesByYear);
router.get('/admin/classes', protect, adminOnly, academicController.getClasses);
router.put('/admin/classes/:id', protect, adminOnly, academicController.updateClass);
router.delete('/admin/classes/:id', protect, adminOnly, academicController.deleteClass);
router.post('/admin/classes/promote', protect, adminOnly, academicController.promoteClasses);

router.post('/admin/courses', protect, adminOnly, academicController.createCourse);
router.get('/admin/courses/:classId', protect, adminOnly, academicController.getCoursesByClass);
router.get('/admin/courses', protect, adminOnly, academicController.getCourses);
router.get('/admin/courses/:id', protect, adminOnly, academicController.getCourse);
router.put('/admin/courses/:id', protect, adminOnly, academicController.updateCourse);
router.delete('/admin/courses/:id', protect, adminOnly, academicController.deleteCourse);

/* =========================================
   QUIZZES
   ========================================= */
router.get('/quizzes', protect, adminOnly, quizController.getQuizzes);
router.get('/quizzes/:id', protect, adminOnly, quizController.getQuiz);
router.post('/quizzes', protect, adminOnly, quizController.createQuiz);
router.put('/quizzes/:id', protect, adminOnly, quizController.updateQuiz);
router.delete('/quizzes/:id', protect, adminOnly, quizController.deleteQuiz);
router.post('/quizzes/:id/publish', protect, adminOnly, quizController.publishQuiz);
router.post('/quizzes/:id/unpublish', protect, adminOnly, quizController.unpublishQuiz);

/* =========================================
   ADMIN - STATS & IA
   ========================================= */
router.get('/stats/globales', protect, adminOnly, statsController.getGlobalStats);
router.get('/stats/quiz/:quizId', protect, adminOnly, statsController.getQuizStats);
router.get('/stats/participation-evolution', protect, adminOnly, statsController.getParticipationEvolution);
router.get('/stats/types-repartition', protect, adminOnly, statsController.getTypesRepartition);

/* =========================================
   STUDENT - VIE ÉTUDIANTE
   ========================================= */
// Liste des quiz à faire
router.get('/student/quizzes', protect, studentController.getMyQuizzes);
// Soumettre réponses (sync offline supporté par la nature REST)
router.post('/student/submit', protect, studentController.submitQuiz);
// Mise à jour classe (Année N+1)
router.put('/student/update-class', protect, studentController.updateClass);
// Enregistrer token pour notif push
router.post('/student/fcm-token', protect, studentController.updateFcmToken);

/* =========================================
   ADMIN - GESTION DES ÉTUDIANTS
   ========================================= */
// Vérification du mot de passe de gestion
router.post('/admin/students/verify-password', protect, adminOnly, studentController.verifyStudentManagementPassword);
// CRUD des étudiants
router.get('/admin/students', protect, adminOnly, studentController.getStudents);
router.get('/admin/students/:id', protect, adminOnly, studentController.getStudent);
router.post('/admin/students', protect, adminOnly, studentController.createStudent);
router.put('/admin/students/:id', protect, adminOnly, studentController.updateStudent);
router.delete('/admin/students/:id', protect, adminOnly, studentController.deleteStudent);
// Fonctionnalités spéciales
router.post('/admin/students/:id/reset-password', protect, adminOnly, studentController.resetStudentPassword);
router.post('/admin/students/import', protect, adminOnly, studentController.importStudents);

/* =========================================
   ADMIN - QUESTIONS
   ========================================= */
router.post('/admin/questions', protect, adminOnly, questionController.createQuestion);
router.get('/questions', protect, adminOnly, questionController.getQuestions);
router.get('/questions/ouvertes', protect, adminOnly, questionController.getOpenQuestions);
router.get('/questions/check-ouverte', protect, adminOnly, questionController.checkOpenQuestions);
router.get('/questions/:id', protect, adminOnly, questionController.getQuestion);
router.put('/admin/questions/:id', protect, adminOnly, questionController.updateQuestion);
router.delete('/admin/questions/:id', protect, adminOnly, questionController.deleteQuestion);

/* =========================================
   EMAILS
   ========================================= */
router.post('/emails', protect, adminOnly, emailController.createEmail);
router.get('/emails', protect, adminOnly, emailController.getEmails);
router.get('/emails/stats', protect, adminOnly, emailController.getEmailStats);
router.get('/emails/test-connection', protect, adminOnly, emailController.testEmailConnection);
router.get('/emails/:id', protect, adminOnly, emailController.getEmail);
router.delete('/emails/:id', protect, adminOnly, emailController.deleteEmail);
router.post('/emails/send-to-class', protect, adminOnly, emailController.sendEmailToClass);

/* =========================================
   SEMESTRES
   ========================================= */
router.post('/semesters', protect, adminOnly, academicController.createSemester);
router.get('/semesters', protect, adminOnly, academicController.getSemesters);
router.get('/semesters/:id', protect, adminOnly, academicController.getSemester);
router.put('/semesters/:id', protect, adminOnly, academicController.updateSemester);
router.delete('/semesters/:id', protect, adminOnly, academicController.deleteSemester);

/* =========================================
   CLASSES (CRUD complet)
   ========================================= */
router.get('/classes', protect, adminOnly, academicController.getClasses);
router.get('/classes/:id', protect, adminOnly, academicController.getClass);
router.put('/classes/:id', protect, adminOnly, academicController.updateClass);
router.delete('/classes/:id', protect, adminOnly, academicController.deleteClass);
router.post('/classes/promote', protect, adminOnly, academicController.promoteClasses);

/* =========================================
   COURS (CRUD complet)
   ========================================= */
router.get('/courses', protect, adminOnly, academicController.getCourses);
router.get('/courses/:id', protect, adminOnly, academicController.getCourse);
router.put('/courses/:id', protect, adminOnly, academicController.updateCourse);
router.delete('/courses/:id', protect, adminOnly, academicController.deleteCourse);

/* =========================================
   TYPES D'ÉVALUATION
   ========================================= */
router.post('/evaluation-types', protect, adminOnly, academicController.createEvaluationType);
router.get('/evaluation-types', protect, adminOnly, academicController.getEvaluationTypes);
router.get('/evaluation-types/:id', protect, adminOnly, academicController.getEvaluationType);
router.put('/evaluation-types/:id', protect, adminOnly, academicController.updateEvaluationType);
router.delete('/evaluation-types/:id', protect, adminOnly, academicController.deleteEvaluationType);

/* =========================================
   STATISTIQUES DÉTAILLÉES
   ========================================= */
router.get('/stats/courses/:courseId', protect, adminOnly, statsController.getCourseStats);
router.get('/stats/classes/:classId', protect, adminOnly, statsController.getClassStats);
router.get('/stats/academic-years/:yearId', protect, adminOnly, statsController.getAcademicYearStats);
router.get('/stats/courses', protect, adminOnly, statsController.getCoursesStatsList);
router.get('/stats/export/:format', protect, adminOnly, statsController.exportStats);

/* =========================================
   ANALYSES SENTIMENTS IA
   ========================================= */
const analyseSentimentController = require('../controllers/analyseSentimentController');
router.get('/analyses-sentiments', protect, adminOnly, analyseSentimentController.getAnalyses);
router.get('/analyses-sentiments/:id', protect, adminOnly, analyseSentimentController.getAnalyse);
router.post('/analyses-sentiments/analyser', protect, adminOnly, analyseSentimentController.lancerAnalyse);
router.get('/analyses-sentiments/question/:questionId', protect, adminOnly, analyseSentimentController.getAnalyseParQuestion);
router.delete('/analyses-sentiments/:id', protect, adminOnly, analyseSentimentController.deleteAnalyse);

// Nouvelles routes pour le workflow amélioré
router.get('/analyses-sentiments/cours/:courseId/quizzes', protect, adminOnly, analyseSentimentController.getQuizzesByCourse);
router.get('/analyses-sentiments/quiz/:quizId/questions', protect, adminOnly, analyseSentimentController.getQuizQuestions);

module.exports = router;