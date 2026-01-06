const mongoose = require('mongoose');

const SessionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  refreshToken: {
    type: String,
    required: true,
    unique: true
  },
  accessToken: {
    type: String,
    required: true
  },
  deviceInfo: {
    userAgent: String,
    ip: String,
    deviceType: String, // 'desktop', 'mobile', 'tablet'
    browser: String,
    os: String
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastActivity: {
    type: Date,
    default: Date.now
  },
  expiresAt: {
    type: Date,
    required: true
  },
  revokedAt: {
    type: Date
  },
  revokedBy: {
    type: String, // 'user', 'admin', 'system', 'security'
  },
  revokedReason: {
    type: String
  }
}, { 
  timestamps: true,
  // Suppression automatique des sessions expirées
  expireAfterSeconds: 0,
  expireAt: 'expiresAt'
});

// Index pour optimiser les requêtes
SessionSchema.index({ userId: 1, isActive: 1 });
SessionSchema.index({ refreshToken: 1 });
SessionSchema.index({ expiresAt: 1 });
SessionSchema.index({ lastActivity: 1 });

// Méthode pour révoquer une session
SessionSchema.methods.revoke = function(revokedBy = 'user', reason = 'Manual logout') {
  this.isActive = false;
  this.revokedAt = new Date();
  this.revokedBy = revokedBy;
  this.revokedReason = reason;
  return this.save();
};

// Méthode pour mettre à jour l'activité
SessionSchema.methods.updateActivity = function() {
  this.lastActivity = new Date();
  return this.save();
};

// Méthode statique pour nettoyer les sessions inactives
SessionSchema.statics.cleanupInactiveSessions = async function(inactivityThreshold = 30 * 24 * 60 * 60 * 1000) { // 30 jours
  const cutoffDate = new Date(Date.now() - inactivityThreshold);
  
  const result = await this.updateMany(
    { 
      lastActivity: { $lt: cutoffDate },
      isActive: true 
    },
    { 
      $set: { 
        isActive: false,
        revokedAt: new Date(),
        revokedBy: 'system',
        revokedReason: 'Inactivity timeout'
      }
    }
  );
  
  return result;
};

// Méthode statique pour révoquer toutes les sessions d'un utilisateur
SessionSchema.statics.revokeAllUserSessions = async function(userId, revokedBy = 'user', reason = 'Logout all devices') {
  const result = await this.updateMany(
    { 
      userId: userId,
      isActive: true 
    },
    { 
      $set: { 
        isActive: false,
        revokedAt: new Date(),
        revokedBy: revokedBy,
        revokedReason: reason
      }
    }
  );
  
  return result;
};

module.exports = mongoose.model('Session', SessionSchema);