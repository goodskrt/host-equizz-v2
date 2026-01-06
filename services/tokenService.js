const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const Session = require('../models/Session');
const UAParser = require('ua-parser-js');

class TokenService {
  constructor() {
    this.accessTokenExpiry = '15m'; // Token d'accès court
    this.refreshTokenExpiry = '7d'; // Refresh token plus long
    this.maxSessionsPerUser = 5; // Limite de sessions simultanées
  }

  /**
   * Génère une paire de tokens (access + refresh)
   */
  async generateTokenPair(userId, deviceInfo = {}) {
    try {
      // Générer l'access token
      const accessToken = jwt.sign(
        { 
          id: userId,
          type: 'access',
          iat: Math.floor(Date.now() / 1000)
        },
        process.env.JWT_SECRET,
        { expiresIn: this.accessTokenExpiry }
      );

      // Générer le refresh token (plus sécurisé)
      const refreshToken = this.generateSecureToken();

      // Calculer la date d'expiration du refresh token
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // 7 jours

      // Nettoyer les anciennes sessions si nécessaire
      await this.cleanupUserSessions(userId);

      // Créer la session en base
      const session = new Session({
        userId,
        refreshToken,
        accessToken,
        deviceInfo: this.parseDeviceInfo(deviceInfo),
        expiresAt,
        lastActivity: new Date()
      });

      await session.save();

      return {
        accessToken,
        refreshToken,
        expiresIn: this.getExpirySeconds(this.accessTokenExpiry),
        sessionId: session._id
      };
    } catch (error) {
      console.error('Erreur génération tokens:', error);
      throw new Error('Impossible de générer les tokens');
    }
  }

  /**
   * Renouvelle l'access token avec le refresh token
   */
  async refreshAccessToken(refreshToken, deviceInfo = {}) {
    try {
      // Trouver la session active
      const session = await Session.findOne({
        refreshToken,
        isActive: true,
        expiresAt: { $gt: new Date() }
      }).populate('userId');

      if (!session) {
        throw new Error('Refresh token invalide ou expiré');
      }

      // Vérifier que l'utilisateur existe toujours
      if (!session.userId) {
        await session.revoke('system', 'User not found');
        throw new Error('Utilisateur introuvable');
      }

      // Générer un nouveau access token
      const newAccessToken = jwt.sign(
        { 
          id: session.userId._id,
          type: 'access',
          iat: Math.floor(Date.now() / 1000)
        },
        process.env.JWT_SECRET,
        { expiresIn: this.accessTokenExpiry }
      );

      // Mettre à jour la session
      session.accessToken = newAccessToken;
      session.lastActivity = new Date();
      
      // Mettre à jour les infos de device si fournies
      if (deviceInfo.userAgent || deviceInfo.ip) {
        session.deviceInfo = { ...session.deviceInfo, ...this.parseDeviceInfo(deviceInfo) };
      }

      await session.save();

      return {
        accessToken: newAccessToken,
        expiresIn: this.getExpirySeconds(this.accessTokenExpiry),
        sessionId: session._id
      };
    } catch (error) {
      console.error('Erreur renouvellement token:', error);
      throw error;
    }
  }

  /**
   * Vérifie et décode un access token
   */
  async verifyAccessToken(token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      if (decoded.type !== 'access') {
        throw new Error('Type de token invalide');
      }

      // Vérifier que la session existe et est active
      const session = await Session.findOne({
        accessToken: token,
        isActive: true,
        expiresAt: { $gt: new Date() }
      });

      if (!session) {
        throw new Error('Session invalide ou expirée');
      }

      // Mettre à jour l'activité
      await session.updateActivity();

      return {
        userId: decoded.id,
        sessionId: session._id,
        decoded
      };
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new Error('Token expiré');
      } else if (error.name === 'JsonWebTokenError') {
        throw new Error('Token invalide');
      }
      throw error;
    }
  }

  /**
   * Révoque une session spécifique
   */
  async revokeSession(sessionId, revokedBy = 'user', reason = 'Manual logout') {
    try {
      const session = await Session.findById(sessionId);
      if (session && session.isActive) {
        await session.revoke(revokedBy, reason);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Erreur révocation session:', error);
      return false;
    }
  }

  /**
   * Révoque toutes les sessions d'un utilisateur
   */
  async revokeAllUserSessions(userId, excludeSessionId = null, revokedBy = 'user', reason = 'Logout all devices') {
    try {
      const query = { 
        userId: userId,
        isActive: true 
      };

      if (excludeSessionId) {
        query._id = { $ne: excludeSessionId };
      }

      const result = await Session.updateMany(
        query,
        { 
          $set: { 
            isActive: false,
            revokedAt: new Date(),
            revokedBy: revokedBy,
            revokedReason: reason
          }
        }
      );

      return result.modifiedCount;
    } catch (error) {
      console.error('Erreur révocation sessions utilisateur:', error);
      return 0;
    }
  }

  /**
   * Obtient toutes les sessions actives d'un utilisateur
   */
  async getUserSessions(userId) {
    try {
      const sessions = await Session.find({
        userId: userId,
        isActive: true,
        expiresAt: { $gt: new Date() }
      }).sort({ lastActivity: -1 });

      return sessions.map(session => ({
        id: session._id,
        deviceInfo: session.deviceInfo,
        lastActivity: session.lastActivity,
        createdAt: session.createdAt,
        isCurrent: false // À déterminer par l'appelant
      }));
    } catch (error) {
      console.error('Erreur récupération sessions:', error);
      return [];
    }
  }

  /**
   * Nettoie les sessions inactives et limite le nombre de sessions par utilisateur
   */
  async cleanupUserSessions(userId) {
    try {
      // Nettoyer les sessions expirées
      await Session.updateMany(
        {
          userId: userId,
          $or: [
            { expiresAt: { $lt: new Date() } },
            { isActive: false }
          ]
        },
        {
          $set: {
            isActive: false,
            revokedAt: new Date(),
            revokedBy: 'system',
            revokedReason: 'Expired or inactive'
          }
        }
      );

      // Limiter le nombre de sessions actives
      const activeSessions = await Session.find({
        userId: userId,
        isActive: true,
        expiresAt: { $gt: new Date() }
      }).sort({ lastActivity: -1 });

      if (activeSessions.length >= this.maxSessionsPerUser) {
        // Révoquer les plus anciennes sessions
        const sessionsToRevoke = activeSessions.slice(this.maxSessionsPerUser - 1);
        
        for (const session of sessionsToRevoke) {
          await session.revoke('system', 'Session limit exceeded');
        }
      }
    } catch (error) {
      console.error('Erreur nettoyage sessions:', error);
    }
  }

  /**
   * Génère un token sécurisé
   */
  generateSecureToken() {
    return crypto.randomBytes(64).toString('hex');
  }

  /**
   * Parse les informations de device
   */
  parseDeviceInfo(deviceInfo) {
    const parsed = {
      ip: deviceInfo.ip || 'unknown',
      userAgent: deviceInfo.userAgent || 'unknown'
    };

    if (deviceInfo.userAgent) {
      const parser = new UAParser(deviceInfo.userAgent);
      const result = parser.getResult();

      parsed.browser = `${result.browser.name || 'Unknown'} ${result.browser.version || ''}`.trim();
      parsed.os = `${result.os.name || 'Unknown'} ${result.os.version || ''}`.trim();
      
      // Déterminer le type d'appareil
      if (result.device.type) {
        parsed.deviceType = result.device.type;
      } else if (parsed.userAgent.includes('Mobile')) {
        parsed.deviceType = 'mobile';
      } else if (parsed.userAgent.includes('Tablet')) {
        parsed.deviceType = 'tablet';
      } else {
        parsed.deviceType = 'desktop';
      }
    }

    return parsed;
  }

  /**
   * Convertit une durée JWT en secondes
   */
  getExpirySeconds(duration) {
    const units = {
      's': 1,
      'm': 60,
      'h': 3600,
      'd': 86400
    };

    const match = duration.match(/^(\d+)([smhd])$/);
    if (match) {
      return parseInt(match[1]) * units[match[2]];
    }
    return 900; // 15 minutes par défaut
  }

  /**
   * Tâche de nettoyage périodique
   */
  async performPeriodicCleanup() {
    try {
      console.log('🧹 Début du nettoyage périodique des sessions...');
      
      // Nettoyer les sessions inactives (plus de 30 jours)
      const inactiveResult = await Session.cleanupInactiveSessions();
      console.log(`📊 Sessions inactives nettoyées: ${inactiveResult.modifiedCount}`);

      // Supprimer définitivement les sessions révoquées anciennes (plus de 90 jours)
      const oldRevokedDate = new Date();
      oldRevokedDate.setDate(oldRevokedDate.getDate() - 90);
      
      const deleteResult = await Session.deleteMany({
        isActive: false,
        revokedAt: { $lt: oldRevokedDate }
      });
      console.log(`🗑️ Anciennes sessions supprimées: ${deleteResult.deletedCount}`);

      console.log('✅ Nettoyage périodique terminé');
    } catch (error) {
      console.error('❌ Erreur lors du nettoyage périodique:', error);
    }
  }
}

module.exports = new TokenService();