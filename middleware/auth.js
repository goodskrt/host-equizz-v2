const jwt = require('jsonwebtoken');
const User = require('../models/User');
const tokenService = require('../services/tokenService');

const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer ')
  ) {
    try {
      token = req.headers.authorization.split(' ')[1];
      
      // Utiliser le service de tokens amélioré
      const tokenData = await tokenService.verifyAccessToken(token);
      
      // Récupérer l'utilisateur
      const user = await User.findById(tokenData.userId).select('-password');
      
      if (!user) {
        return res.status(401).json({ 
          message: 'Utilisateur introuvable',
          code: 'USER_NOT_FOUND'
        });
      }

      // Ajouter les informations à la requête
      req.user = user;
      req.sessionId = tokenData.sessionId;
      req.tokenData = tokenData;

      return next();
    } catch (error) {
      console.error('Erreur authentification:', error.message);
      
      // Gestion des différents types d'erreurs
      if (error.message === 'Token expiré') {
        return res.status(401).json({ 
          message: 'Token expiré',
          code: 'TOKEN_EXPIRED',
          requiresRefresh: true
        });
      } else if (error.message === 'Session invalide ou expirée') {
        return res.status(401).json({ 
          message: 'Session invalide',
          code: 'SESSION_INVALID',
          requiresLogin: true
        });
      } else {
        return res.status(401).json({ 
          message: 'Token invalide',
          code: 'TOKEN_INVALID',
          requiresLogin: true
        });
      }
    }
  }

  return res.status(401).json({ 
    message: 'Non autorisé, pas de token',
    code: 'NO_TOKEN',
    requiresLogin: true
  });
};

const adminOnly = (req, res, next) => {
  if (req.user && req.user.role === 'ADMIN') {
    return next();
  }
  return res.status(403).json({ 
    message: 'Accès réservé aux administrateurs',
    code: 'ADMIN_REQUIRED'
  });
};

// Middleware pour extraire les informations de device
const extractDeviceInfo = (req, res, next) => {
  req.deviceInfo = {
    userAgent: req.get('User-Agent') || 'unknown',
    ip: req.ip || req.connection.remoteAddress || 'unknown'
  };
  next();
};

module.exports = { protect, adminOnly, extractDeviceInfo };
