# Variables d'environnement EXACTES pour Railway - Backend v2

## 🔧 Configuration de base
```
NODE_ENV=production
PORT=5000
```

## 🤖 Services IA
```
IA_ENABLED=true
```

## 🗄️ Base de données MongoDB
```
MONGO_URI=mongodb+srv://iulp562_db_user:Igreurbain562@cluster0.imuet5k.mongodb.net/?appName=Cluster0
```

## 🔐 Authentification JWT
```
JWT_SECRET=equizz_jwt_secret_key_2024_development
```

## 📧 Configuration SMTP (Email)
```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=iulp562@gmail.com
SMTP_PASS=tnlf dzxa rqvt tryx
SMTP_FROM_NAME=EQuizz - Institut Saint Jean
SMTP_FROM_EMAIL=iulp562@gmail.com
```

## 🔥 Firebase (Notifications Push)
```
FIREBASE_PROJECT_ID=equizz-5
FIREBASE_PRIVATE_KEY_ID=3d5feae26c6c9f75ce13f44015d2355d7aa16a51
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-fbsvc@equizz-5.iam.gserviceaccount.com
```

## 👥 Gestion des étudiants
```
STUDENT_MANAGEMENT_PASSWORD=admin123
```

## 🚀 Commandes de déploiement Railway

1. **Via Railway CLI:**
```bash
railway login
railway link
railway up
```

2. **Via GitHub Integration:**
- Connectez le repo sur railway.app
- Les variables seront configurées via l'interface web

## 🧪 Test après déploiement

Testez ces endpoints une fois déployé :
```bash
curl https://votre-app-v2.railway.app/health
curl https://votre-app-v2.railway.app/api-docs
```

## 🔄 Différences avec v1

- **IA_ENABLED** : Nouvelle variable pour les services IA
- **STUDENT_MANAGEMENT_PASSWORD** : Mot de passe pour la gestion des étudiants
- **Nettoyage automatique** : Sessions nettoyées toutes les 24h
- **Système d'emails** : Fonctionnalités email intégrées