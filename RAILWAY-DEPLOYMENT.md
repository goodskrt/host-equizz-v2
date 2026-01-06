# EQuizz Backend v2 - Déploiement Railway

## Configuration pour Railway

Ce backend v2 est prêt pour le déploiement sur Railway avec les configurations suivantes :

### Fichiers de configuration

- `railway.json` : Configuration de build et déploiement Railway
- `nixpacks.toml` : Force Node.js 20 pour compatibilité
- `package.json` : Script "start" configuré pour `node server.js`
- Endpoint `/health` : Health check pour Railway

## Variables d'environnement COMPLÈTES pour Railway

Configurez TOUTES ces variables dans Railway Dashboard :

### 🔧 Configuration de base
```
NODE_ENV=production
PORT=5000
```

### 🤖 Services IA
```
IA_ENABLED=true
```

### 🗄️ Base de données MongoDB
```
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/database_name?retryWrites=true&w=majority
```

### 🔐 Authentification JWT
```
JWT_SECRET=your_super_secure_jwt_secret_key_here_minimum_32_characters
```

### 📧 Configuration SMTP (Email)
```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password_here
SMTP_FROM_NAME=EQuizz - Institut Saint Jean
SMTP_FROM_EMAIL=your_email@gmail.com
```

### 🔥 Firebase (Notifications Push)
```
FIREBASE_PROJECT_ID=your_firebase_project_id
FIREBASE_PRIVATE_KEY_ID=your_private_key_id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
```

### 👥 Gestion des étudiants
```
STUDENT_MANAGEMENT_PASSWORD=admin123
```

## Déploiement étape par étape

1. **Connecter le repo à Railway**
   - Allez sur railway.app
   - Créez un nouveau projet
   - Connectez le repo GitHub `goodskrt/host-equizz-v2`

2. **Configurer les variables d'environnement**
   - Dans Railway Dashboard → Variables
   - Ajoutez TOUTES les variables listées ci-dessus

3. **Déploiement automatique**
   - Railway détectera le `nixpacks.toml` (Node.js 20)
   - Railway utilisera le `railway.json` pour la configuration
   - Le build se lancera automatiquement
   - L'application sera accessible via l'URL fournie

## ✅ Fonctionnalités v2

- **Gestion des sessions** : Nettoyage automatique toutes les 24h
- **Système d'emails** : Envoi et réception d'emails
- **Notifications push** : Firebase intégré
- **Gestion avancée des utilisateurs** : Sessions multiples
- **API améliorée** : Endpoints optimisés

## Endpoints disponibles

- `GET /` : Status de l'API
- `GET /health` : Health check pour Railway
- `GET /api-docs` : Documentation Swagger
- Toutes les routes API sous `/api/*`

## Notes importantes de sécurité

⚠️ **IMPORTANT** : 
- Utilisez des mots de passe d'application Gmail (pas votre mot de passe principal)
- Générez un JWT_SECRET fort (minimum 32 caractères)
- Utilisez une base de données MongoDB Atlas en production
- Le nettoyage des sessions se fait automatiquement

## Test de déploiement

Une fois déployé, testez ces endpoints :
- `GET https://your-app.railway.app/health` → Doit retourner status OK
- `GET https://your-app.railway.app/api-docs` → Documentation Swagger