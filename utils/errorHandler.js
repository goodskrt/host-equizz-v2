// Fonction utilitaire pour gérer les erreurs de manière uniforme
const handleError = (error, res, defaultMessage = 'Une erreur est survenue') => {
  console.error('Erreur:', error);

  // Erreurs de validation Mongoose
  if (error.name === 'ValidationError') {
    const messages = Object.values(error.errors).map(err => err.message);
    return res.status(400).json({
      message: 'Erreur de validation',
      errors: messages
    });
  }

  // Erreurs de duplication (index unique)
  if (error.code === 11000) {
    return res.status(400).json({
      message: 'Une ressource avec ces données existe déjà'
    });
  }

  // Erreurs de cast (ID invalide)
  if (error.name === 'CastError') {
    return res.status(400).json({
      message: 'ID fourni invalide'
    });
  }

  // Erreur par défaut
  res.status(500).json({ message: defaultMessage });
};

module.exports = handleError;