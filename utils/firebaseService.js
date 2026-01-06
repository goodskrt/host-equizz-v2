const admin = require('firebase-admin');

// Vérification pour éviter de crasher si le fichier n'est pas encore là
let isInitialized = false;

// ✅ En test, on mock directement
if (process.env.NODE_ENV === 'test') {
  exports.sendPushNotification = async () => {
    // silence en test
  };
} else {
    try {
        // Placez votre fichier json téléchargé depuis Firebase dans le dossier config
        const serviceAccount = require('../config/serviceAccountKey.json');
        
        admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
        });
        isInitialized = true;
        console.log("Firebase Admin Initialisé");
    } catch (error) {
        console.warn("ATTENTION: Firebase non configuré. Les notifications seront simulées (logs).");
    }

    exports.sendPushNotification = async (tokens, title, body, data = {}) => {
        if (!isInitialized || !tokens || tokens.length === 0) {
            console.log(`[MOCK PUSH] Vers ${tokens?.length} appareils : ${title} - ${body}`);
            return;
        }

        const message = {
            notification: { title, body },
            data: data, // ex: { quizId: "123" } pour ouvrir l'app au bon endroit
            tokens: tokens
        };

        try {
            const response = await admin.messaging().sendMulticast(message);
            console.log(`Notifications envoyées: ${response.successCount} succès, ${response.failureCount} échecs.`);
        } catch (error) {
            console.error('Erreur envoi notification:', error);
        }
    };
}
