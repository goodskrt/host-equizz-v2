const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const helmet = require('helmet');
const connectDB = require('./config/db');
const apiRoutes = require('./routes/apiRoutes');
const tokenService = require('./services/tokenService');

// --- SWAGGER ---
const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');
const path = require('path');

dotenv.config();

// 🔴 IMPORTANT : on ne connecte PAS la DB en test
if (process.env.NODE_ENV !== 'test') {
  connectDB();
  // Créer l'admin par défaut
  const createDefaultAdmin = require('./utils/createDefaultAdmin');
  createDefaultAdmin().catch(console.error);
}

const app = express();

app.use(helmet());
app.use(cors({
  origin: ['http://localhost:4200', 'http://localhost:4201', 'http://localhost:3000', 'http://localhost:8080'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin', 'X-Requested-With']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Swagger
try {
  const swaggerDocument = YAML.load(path.join(__dirname, 'swagger.yaml'));
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
  console.log('Documentation Swagger chargée sur /api-docs');
} catch (err) {
  console.error('Erreur chargement Swagger:', err.message);
}

app.use('/api', apiRoutes);

app.get('/', (req, res) => {
  res.send('API EQuizz v1.0 running...');
});

// Health check endpoint for Railway
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    service: 'EQuizz Backend API v2'
  });
});

// Middleware d'erreurs
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Erreur serveur interne');
});

const PORT = process.env.PORT || 5000;

// Ne lancer le serveur que hors tests
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Serveur démarré sur le port ${PORT}`);
    
    // Démarrer le nettoyage périodique des sessions (toutes les 24h)
    if (process.env.NODE_ENV !== 'test') {
      setInterval(() => {
        tokenService.performPeriodicCleanup();
      }, 24 * 60 * 60 * 1000); // 24 heures
      
      console.log('🧹 Nettoyage périodique des sessions activé (24h)');
    }
  });
}

module.exports = app;
