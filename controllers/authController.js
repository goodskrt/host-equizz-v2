const User = require('../models/User');
const Session = require('../models/Session');
const tokenService = require('../services/tokenService');
const handleError = require('../utils/errorHandler');

// @desc    Login user
// @route   POST /api/auth/login
exports.login = async (req, res) => {
  try {
    const { identifier, password, rememberMe = false } = req.body;
    
    // Chercher par email OU matricule
    const user = await User.findOne({ 
      $or: [{ email: identifier }, { matricule: identifier }] 
    });

    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ 
        message: 'Identifiants invalides',
        code: 'INVALID_CREDENTIALS'
      });
    }

    // Générer les tokens avec les informations de device
    const tokens = await tokenService.generateTokenPair(user._id, req.deviceInfo);

    // Réponse avec informations utilisateur et tokens
    res.json({
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        classId: user.classId
      },
      ...tokens,
      message: 'Connexion réussie'
    });
  } catch (error) {
    handleError(error, res, 'Erreur lors de la connexion');
  }
};

// @desc    Refresh access token
// @route   POST /api/auth/refresh
exports.refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ 
        message: 'Refresh token requis',
        code: 'REFRESH_TOKEN_REQUIRED'
      });
    }

    // Renouveler le token
    const tokens = await tokenService.refreshAccessToken(refreshToken, req.deviceInfo);

    res.json({
      ...tokens,
      message: 'Token renouvelé avec succès'
    });
  } catch (error) {
    console.error('Erreur refresh token:', error);
    res.status(401).json({ 
      message: error.message || 'Refresh token invalide',
      code: 'REFRESH_TOKEN_INVALID',
      requiresLogin: true
    });
  }
};

// @desc    Logout user
// @route   POST /api/auth/logout
exports.logout = async (req, res) => {
  try {
    const { logoutAll = false } = req.body;
    
    if (logoutAll) {
      // Déconnecter de tous les appareils
      const revokedCount = await tokenService.revokeAllUserSessions(req.user._id);
      res.json({ 
        message: `Déconnexion réussie de ${revokedCount} appareil(s)`,
        revokedSessions: revokedCount
      });
    } else {
      // Déconnecter seulement cette session
      const revoked = await tokenService.revokeSession(req.sessionId);
      res.json({ 
        message: revoked ? 'Déconnexion réussie' : 'Session déjà inactive'
      });
    }
  } catch (error) {
    handleError(error, res, 'Erreur lors de la déconnexion');
  }
};

// @desc    Get user sessions
// @route   GET /api/auth/sessions
exports.getSessions = async (req, res) => {
  try {
    const sessions = await tokenService.getUserSessions(req.user._id);
    
    // Marquer la session actuelle
    const currentSessionId = req.sessionId.toString();
    const sessionsWithCurrent = sessions.map(session => ({
      ...session,
      isCurrent: session.id.toString() === currentSessionId
    }));

    res.json({
      sessions: sessionsWithCurrent,
      total: sessions.length
    });
  } catch (error) {
    handleError(error, res, 'Erreur lors de la récupération des sessions');
  }
};

// @desc    Revoke specific session
// @route   DELETE /api/auth/sessions/:sessionId
exports.revokeSession = async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    // Vérifier que la session appartient à l'utilisateur
    const session = await Session.findOne({
      _id: sessionId,
      userId: req.user._id,
      isActive: true
    });

    if (!session) {
      return res.status(404).json({ 
        message: 'Session non trouvée',
        code: 'SESSION_NOT_FOUND'
      });
    }

    const revoked = await tokenService.revokeSession(sessionId, 'user', 'Manual revocation');
    
    res.json({ 
      message: revoked ? 'Session révoquée avec succès' : 'Erreur lors de la révocation'
    });
  } catch (error) {
    handleError(error, res, 'Erreur lors de la révocation de la session');
  }
};

// @desc    Get current user info
// @route   GET /api/auth/me
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select('-password')
      .populate('classId');

    res.json({
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        matricule: user.matricule,
        role: user.role,
        classId: user.classId,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      },
      sessionInfo: {
        sessionId: req.sessionId,
        lastActivity: new Date()
      }
    });
  } catch (error) {
    handleError(error, res, 'Erreur lors de la récupération du profil');
  }
};

// @desc    Register Student
// @route   POST /api/auth/register
exports.register = async (req, res) => {
  try {
    const { matricule, email, password, firstName, lastName, classId } = req.body;

    // Validation email institutionnel (Règle métier)
    if (!email.endsWith('@institutsaintjean.org')) {
      return res.status(400).json({ 
        message: 'Email institutionnel requis',
        code: 'INVALID_EMAIL_DOMAIN'
      });
    }

    const userExists = await User.findOne({ 
      $or: [{ email }, { matricule }] 
    });
    
    if (userExists) {
      return res.status(400).json({ 
        message: userExists.email === email ? 'Cet email existe déjà' : 'Ce matricule existe déjà',
        code: 'USER_EXISTS'
      });
    }

    const user = await User.create({
      matricule, email, password, firstName, lastName, classId, role: 'STUDENT'
    });

    // Générer les tokens
    const tokens = await tokenService.generateTokenPair(user._id, req.deviceInfo);

    res.status(201).json({
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        classId: user.classId
      },
      ...tokens,
      message: 'Inscription réussie'
    });
  } catch (error) {
    handleError(error, res, 'Erreur lors de l\'inscription');
  }
};

// @desc    Create Admin User
// @route   POST /api/auth/create-admin
exports.createAdmin = async (req, res) => {
  try {
    const { email, password, firstName, lastName } = req.body;

    // Validation email institutionnel (Règle métier)
    if (!email.endsWith('@institutsaintjean.org')) {
      return res.status(400).json({ 
        message: 'Email institutionnel requis',
        code: 'INVALID_EMAIL_DOMAIN'
      });
    }

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ 
        message: 'Cet utilisateur existe déjà',
        code: 'USER_EXISTS'
      });
    }

    const user = await User.create({
      email, password, firstName, lastName, role: 'ADMIN'
    });

    // Générer les tokens
    const tokens = await tokenService.generateTokenPair(user._id, req.deviceInfo);

    res.status(201).json({
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role
      },
      ...tokens,
      message: 'Administrateur créé avec succès'
    });
  } catch (error) {
    handleError(error, res, 'Erreur lors de la création de l\'administrateur');
  }
};

// @desc    Register FCM Token
// @route   POST /api/auth/register-fcm-token
exports.registerFCMToken = async (req, res) => {
  try {
    const { fcmToken } = req.body;
    const userId = req.user._id;

    if (!fcmToken) {
      return res.status(400).json({ 
        message: 'Token FCM requis',
        code: 'FCM_TOKEN_REQUIRED'
      });
    }

    // Ajouter le token FCM à l'utilisateur s'il n'est pas déjà présent
    const user = await User.findById(userId);
    if (!user.fcmTokens.includes(fcmToken)) {
      user.fcmTokens.push(fcmToken);
      await user.save();
    }

    res.json({ message: 'Token FCM enregistré avec succès' });
  } catch (error) {
    handleError(error, res, 'Erreur lors de l\'enregistrement du token FCM');
  }
};

// @desc    Unregister FCM Token
// @route   POST /api/auth/unregister-fcm-token
exports.unregisterFCMToken = async (req, res) => {
  try {
    const { fcmToken } = req.body;
    const userId = req.user._id;

    if (!fcmToken) {
      return res.status(400).json({ 
        message: 'Token FCM requis',
        code: 'FCM_TOKEN_REQUIRED'
      });
    }

    // Retirer le token FCM de l'utilisateur
    const user = await User.findById(userId);
    user.fcmTokens = user.fcmTokens.filter(token => token !== fcmToken);
    await user.save();

    res.json({ message: 'Token FCM supprimé avec succès' });
  } catch (error) {
    handleError(error, res, 'Erreur lors de la suppression du token FCM');
  }
};
