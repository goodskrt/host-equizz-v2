const mongoose = require('mongoose');
const createDefaultAdmin = require('../utils/createDefaultAdmin');
const seedEvaluationTypes = require('../utils/seedEvaluationTypes');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`MongoDB Connecté: ${conn.connection.host}`);
    await createDefaultAdmin();
    await seedEvaluationTypes();
  } catch (error) {
    console.error(`Erreur: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
