const Notification = require('../models/Notification');
const User = require('../models/User');
const { sendPushNotification } = require('../utils/firebaseService');

// @desc    Créer une notification
// @route   POST /api/admin/notifications
exports.createNotification = async (req, res) => {
  try {
    const { titre, message, type, destinataires, classeId, coursId } = req.body;

    const notification = await Notification.create({
      titre,
      message,
      type,
      destinataires,
      classeId,
      coursId
    });

    res.status(201).json(notification);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Récupérer toutes les notifications
// @route   GET /api/admin/notifications
exports.getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find()
      .populate('classeId')
      .populate('coursId')
      .sort({ createdAt: -1 });

    res.json(notifications);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Récupérer une notification spécifique
// @route   GET /api/admin/notifications/:id
exports.getNotification = async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id)
      .populate('classeId')
      .populate('coursId');

    if (!notification) {
      return res.status(404).json({ message: 'Notification non trouvée' });
    }

    res.json(notification);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Mettre à jour une notification
// @route   PUT /api/admin/notifications/:id
exports.updateNotification = async (req, res) => {
  try {
    const notification = await Notification.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('classeId').populate('coursId');

    if (!notification) {
      return res.status(404).json({ message: 'Notification non trouvée' });
    }

    res.json(notification);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Supprimer une notification
// @route   DELETE /api/admin/notifications/:id
exports.deleteNotification = async (req, res) => {
  try {
    const notification = await Notification.findByIdAndDelete(req.params.id);
    if (!notification) {
      return res.status(404).json({ message: 'Notification non trouvée' });
    }
    res.json({ message: 'Notification supprimée' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Envoyer une notification
// @route   POST /api/admin/notifications/:id/send
exports.sendNotification = async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);
    if (!notification) {
      return res.status(404).json({ message: 'Notification non trouvée' });
    }

    if (notification.estEnvoyee) {
      return res.status(400).json({ message: 'Notification déjà envoyée' });
    }

    // Déterminer les destinataires
    let recipients = [];
    if (notification.destinataires === 'ALL') {
      recipients = await User.find({ role: 'STUDENT' });
    } else if (notification.destinataires === 'CLASSE' && notification.classeId) {
      recipients = await User.find({ classId: notification.classeId, role: 'STUDENT' });
    } else if (notification.destinataires === 'COURS' && notification.coursId) {
      // Trouver les étudiants inscrits à ce cours (via submissions ou autre logique)
      // Pour simplifier, on peut envoyer à tous pour l'instant
      recipients = await User.find({ role: 'STUDENT' });
    }

    // Envoyer les notifications push via Firebase
    let sentCount = 0;
    const tokens = recipients
      .filter(recipient => recipient.fcmTokens && recipient.fcmTokens.length > 0)
      .flatMap(recipient => recipient.fcmTokens);

    if (tokens.length > 0) {
      try {
        await sendPushNotification(
          tokens,
          notification.titre,
          notification.message,
          {
            type: notification.type,
            notificationId: notification._id.toString(),
            destinataires: notification.destinataires
          }
        );
        sentCount = tokens.length;
        console.log(`${sentCount} notifications push envoyées`);
      } catch (error) {
        console.error('Erreur envoi notifications push:', error);
        sentCount = 0;
      }
    } else {
      console.log('Aucun token FCM trouvé pour les destinataires');
    }

    // Marquer comme envoyée
    notification.estEnvoyee = true;
    notification.dateEnvoi = new Date();
    notification.nombreDestinataires = sentCount;
    await notification.save();

    res.json({
      message: `Notification envoyée à ${sentCount} destinataires`,
      notification
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Récupérer les statistiques des notifications
// @route   GET /api/admin/notifications/stats
exports.getNotificationStats = async (req, res) => {
  try {
    const total = await Notification.countDocuments();
    const envoyees = await Notification.countDocuments({ estEnvoyee: true });
    const enAttente = total - envoyees;

    const parType = await Notification.aggregate([
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 }
        }
      }
    ]);

    res.json({
      total,
      envoyees,
      enAttente,
      parType: parType.map(item => ({ type: item._id, count: item.count }))
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};