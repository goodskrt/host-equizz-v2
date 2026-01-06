
# 🎓 EQuizz - Backend API

> **Plateforme d'Évaluation des Enseignements pour l'Institut Saint Jean**  
> *Projet de Synthèse ISI 2025-2026 - Groupe 6*

[![Node.js](https://img.shields.io/badge/Node.js-v18-green.svg)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-v4-blue.svg)](https://expressjs.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose-forestgreen.svg)](https://www.mongodb.com/)
[![License](https://img.shields.io/badge/License-ISC-yellow.svg)](LICENSE)

Ce dépôt contient le code source du **Backend (API REST)** de la plateforme EQuizz. Cette solution permet aux étudiants d'évaluer leurs enseignements de manière **anonyme**, **sécurisée** et **intuitive**, tout en fournissant aux administrateurs des outils d'analyse puissants (statistiques graphiques, analyse de sentiments par IA).

---

## 🚀 Fonctionnalités Clés

### 🔒 Sécurité & Authentification
*   **JWT & Bcrypt :** Authentification sécurisée par token.
*   **Contrôle d'accès (RBAC) :** Distinction stricte entre rôles `ADMIN` et `STUDENT`.
*   **Validation Institutionnelle :** Restriction des inscriptions aux emails `@institutsaintjean.org`.

### 🏫 Gestion Académique
*   Gestion des Années Académiques, Classes (Niveaux) et Cours (UE).
*   **Cycle de vie Étudiant :** Gestion du passage en année supérieure (Mise à jour de classe N+1).

### 📝 Gestion des Quiz
*   **Banque de Questions :** Création manuelle ou **Import massif via Excel** (.xlsx).
*   **Types de Questions :** QCM, Ouvertes, Fermées (Oui/Non).
*   **Publication :** Envoi automatique de **Notifications Push** (Firebase) aux étudiants concernés.

### 📱 Support Mobile "Offline-First"
*   Architecture conçue pour la synchronisation.
*   L'API accepte les soumissions différées pour les étudiants sans connexion internet stable.

### 📊 Analyse & IA
*   **Anonymat Garanti :** Séparation stricte entre l'identité de l'étudiant et ses réponses.
*   **Analyse de Sentiments :** Traitement automatique des réponses textuelles pour détecter la tonalité (Positif/Négatif/Neutre).
*   **Agrégation :** Calcul de statistiques détaillées par Quiz.

---

## 🛠️ Stack Technique

*   **Runtime :** Node.js
*   **Framework :** Express.js
*   **Base de Données :** MongoDB (avec Mongoose ORM)
*   **Documentation :** Swagger (OpenAPI 3.0)
*   **Tests :** Jest & Supertest (Tests d'intégration)
*   **Outils :** Multer (Uploads), XLSX (Excel Parsing), Firebase Admin (Notifications).

---

## ⚙️ Pré-requis

Avant de commencer, assurez-vous d'avoir installé :
*   [Node.js](https://nodejs.org/) (v16 ou supérieur)
*   [MongoDB](https://www.mongodb.com/try/download/community) (Local ou Atlas)

---

## 📦 Installation

1.  **Cloner le dépôt :**
    ```bash
    git clone https://gitlab.com/Mr.Moyo/equizz-group5isi.git
    cd equizz-group5isi/Back-end
    ```

2.  **Installer les dépendances :**
    ```bash
    npm install
    ```

3.  **Configurer l'environnement :**
    Créez un fichier `.env` à la racine et configurez les variables suivantes :

    ```env
    NODE_ENV=development
    PORT=5000
    
    # Base de données
    MONGO_URI=mongodb://localhost:27017/equizz_db
    
    # Sécurité
    JWT_SECRET=votre_secret_tres_long_et_complexe_2026
    
    # Services Tiers
    IA_ENABLED=true
    # Pour Firebase (si activé)
    # GOOGLE_APPLICATION_CREDENTIALS=./config/serviceAccountKey.json
    ```

---

## ▶️ Démarrage

### Mode Développement (avec redémarrage auto)
```bash
npm run dev
```
Le serveur démarrera sur `http://localhost:5000`.

### Mode Production
```bash
npm start
```

---

## 📚 Documentation API (Swagger)

Une documentation complète et interactive est disponible une fois le serveur lancé.
Elle permet de tester les endpoints directement depuis le navigateur.

👉 **Accès :** [http://localhost:5000/api-docs](http://localhost:5000/api-docs)

---

## 🧪 Tests

Le projet inclut une suite de tests d'intégration utilisant **Jest** et une base de données en mémoire (**MongoDB Memory Server**) pour ne pas affecter vos données réelles.

Pour lancer les tests :
```bash
npm test
```

*Résultat attendu :*
```text
PASS  tests/auth.test.js
PASS  tests/workflow.test.js
```

---

## 📂 Structure du Projet

```text
Back-end/
├── config/             # Connexion DB
├── controllers/        # Logique métier (Quiz, Auth, Stats...)
├── middleware/         # Vérification JWT, Rôles, Upload
├── models/             # Schémas Mongoose (Données)
├── routes/             # Définition des endpoints API
├── tests/              # Tests d'intégration
├── uploads/            # Stockage temporaire (Excel)
├── utils/              # Fonctions (IA Mock, Firebase)
├── server.js           # Point d'entrée
├── swagger.yaml        # Définition API
└── package.json
```

---

## 👥 Auteurs (Groupe 6)

Projet réalisé dans le cadre du cursus Ingénieur (ING 4 ISI) à l'Institut Saint Jean.

*   **KUATE MOYO STEAPHEN DENIS**
*   **IGRE URBAIN LEPONTIF**
*   **MOUAFO BASILE JUNIOR**
*   **LOWE ENZO RYAN**

---

*© 2025-2026 Institut Saint Jean. Tous droits réservés.*