const request = require('supertest');
const app = require('../server.js'); // Import de l'app
const dbHandler = require('./db-handler');

// Configuration Avant/Après
beforeAll(async () => await dbHandler.connect());
afterEach(async () => await dbHandler.clearDatabase());
afterAll(async () => await dbHandler.closeDatabase());

describe('Authentification (Auth)', () => {

  it('devrait inscrire un étudiant avec un email institutionnel valide', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        matricule: "ISJ-TEST-001",
        firstName: "Jean",
        lastName: "Test",
        email: "jean.test@institutsaintjean.org", // Valide
        password: "password123"
      });

    expect(res.statusCode).toEqual(201);
    expect(res.body).toHaveProperty('token');
    expect(res.body).toHaveProperty('_id');
  });

  it('devrait refuser une inscription avec un email personnel (gmail)', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        matricule: "ISJ-TEST-002",
        firstName: "Jean",
        lastName: "Fail",
        email: "jean.fail@gmail.com", // Invalide
        password: "password123"
      });

    expect(res.statusCode).toEqual(400); // Bad Request
    expect(res.body.message).toContain('Email institutionnel requis');
  });

  it('devrait connecter un utilisateur existant', async () => {
    // 1. Créer l'user
    await request(app).post('/api/auth/register').send({
      matricule: "ISJ-LOGIN",
      firstName: "Login",
      lastName: "User",
      email: "login@institutsaintjean.org",
      password: "mypassword"
    });

    // 2. Tenter de se connecter
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        identifier: "login@institutsaintjean.org",
        password: "mypassword"
      });

    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('token');
  });
});