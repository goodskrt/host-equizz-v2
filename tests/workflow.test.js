const request = require('supertest');
const app = require('../server.js');
const dbHandler = require('./db-handler');
const User = require('../models/User'); // Pour créer l'admin manuellement
const bcrypt = require('bcryptjs');

beforeAll(async () => await dbHandler.connect());
afterAll(async () => await dbHandler.closeDatabase());

describe('Flux Complet : Admin & Étudiant', () => {

  let adminToken;
  let studentToken;
  let classId;
  let courseId;
  let quizId;
  let questionId;

  // 1. Setup : Créer un Admin et se connecter
  it('Préparation : Login Admin', async () => {
    await User.create({
      firstName: "Admin", lastName: "System", email: "admin@institutsaintjean.org", 
      password: "adminpass", role: "ADMIN"
    });

    const res = await request(app).post('/api/auth/login').send({
      identifier: "admin@institutsaintjean.org", password: "adminpass"
    });
    
    adminToken = res.body.token;
    expect(adminToken).toBeDefined();
  });

  // 2. Admin crée Année et Classe
  it('Admin : Création structure académique', async () => {
    // Créer année
    const yearRes = await request(app).post('/api/admin/years')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ label: "2025-2026", isCurrent: true });
    
    // Créer classe
    const classRes = await request(app).post('/api/admin/classes')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ code: "ING4", name: "Ingé 4", level: "ING4", field: "Informatique", academicYear: yearRes.body._id });
    
    classId = classRes.body._id;
    expect(classId).toBeDefined();
  });

  // 3. Inscription Étudiant dans cette classe
  it('Étudiant : Inscription', async () => {
    const res = await request(app).post('/api/auth/register').send({
      matricule: "EQUIZZ-001", firstName: "Student", lastName: "One",
      email: "student@institutsaintjean.org", password: "pass",
      classId: classId
    });
    studentToken = res.body.token;
    expect(studentToken).toBeDefined();
  });

  // 4. Admin crée Cours, Question et publie Quiz
  it('Admin : Création contenu pédagogique', async () => {
    // Cours
    const courseRes = await request(app).post('/api/admin/courses')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ code: "ISI4217", name: "Genie Log", classId: classId, semester: 1 });
    courseId = courseRes.body._id;

    // Question
    const qRes = await request(app).post('/api/quiz/question')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ courseId, text: "Question Test?", type: "OPEN" });
    questionId = qRes.body._id;

    // Publier Quiz
    const quizRes = await request(app).post('/api/quiz/publish')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: "Quiz Test", courseId, type: "MI_PARCOURS",
        deadline: new Date(), questionIds: [questionId]
      });
    quizId = quizRes.body._id;
    expect(quizRes.statusCode).toEqual(201);
  });

  // 5. Étudiant voit le quiz et répond
  it('Étudiant : Soumission Quiz', async () => {
    // Voir les quiz
    const listRes = await request(app).get('/api/student/quizzes')
      .set('Authorization', `Bearer ${studentToken}`);
    
    expect(listRes.body.length).toBe(1);
    expect(listRes.body[0]._id).toBe(quizId);

    // Répondre
    const submitRes = await request(app).post('/api/student/submit')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        quizId: quizId,
        answers: [{ questionId: questionId, value: "C'était un cours super excellent !" }]
      });
    
    expect(submitRes.statusCode).toEqual(201);
  });

  // 6. Admin vérifie les stats
  it('Admin : Vérification Stats', async () => {
    const statsRes = await request(app).get(`/api/stats/quiz/${quizId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    
    expect(statsRes.body.overview.totalSubmissions).toBe(1);
    // Comme la réponse était "excellent", le sentiment devrait être positif (>0)
    expect(statsRes.body.overview.avgSentiment).toBeGreaterThan(0);
  });

});