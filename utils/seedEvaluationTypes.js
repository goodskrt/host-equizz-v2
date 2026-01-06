// utils/seedEvaluationTypes.js
const mongoose = require('mongoose');
const { EvaluationType } = require('../models/Academic');

async function seedEvaluationTypes() {
  try {
    // Vérifier si les types d'évaluation existent déjà
    const existingTypes = await EvaluationType.find();
    if (existingTypes.length > 0) {
      console.log('Types d\'évaluation déjà présents dans la base de données');
      return;
    }

    // Créer les types d'évaluation par défaut
    const evaluationTypes = [
      { label: 'mi-parcours', code: 'MI_PARCOURS' },
      { label: 'fin de semestre', code: 'FIN_SEMESTRE' }
    ];

    await EvaluationType.insertMany(evaluationTypes);
    console.log('Types d\'évaluation créés avec succès');
  } catch (error) {
    console.error('Erreur lors de la création des types d\'évaluation:', error.message);
  }
}

module.exports = seedEvaluationTypes;