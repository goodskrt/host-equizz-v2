const mongoose = require('mongoose');

/**
 * Valide qu'un ID est un ObjectId MongoDB valide et non undefined
 * @param {string} id - L'ID à valider
 * @param {string} resourceName - Le nom de la ressource pour le message d'erreur
 * @returns {Object} - { isValid: boolean, error: string|null }
 */
const validateObjectId = (id, resourceName = 'ressource') => {
  if (!id || id === 'undefined' || id === 'null') {
    return {
      isValid: false,
      error: `ID de ${resourceName} requis`
    };
  }

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return {
      isValid: false,
      error: `ID de ${resourceName} invalide`
    };
  }

  return { isValid: true, error: null };
};

module.exports = validateObjectId;