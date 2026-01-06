# Comparaison Backend v1 vs v2

## 📊 Résumé des différences

| Fonctionnalité | Backend v1 | Backend v2 |
|---|---|---|
| **Repo GitHub** | `goodskrt/host-equizz` | `goodskrt/host-equizz-v2` |
| **Gestion des sessions** | Basique | Avancée avec nettoyage auto |
| **Système d'emails** | ❌ | ✅ Complet |
| **Services IA** | ❌ | ✅ Activable |
| **Gestion étudiants** | Basique | Avec mot de passe admin |
| **Notifications push** | Firebase basique | Firebase optimisé |
| **Nettoyage automatique** | ❌ | ✅ Toutes les 24h |

## 🆕 Nouvelles variables d'environnement v2

```env
IA_ENABLED=true
STUDENT_MANAGEMENT_PASSWORD=admin123
```

## 🔧 Nouvelles fonctionnalités v2

### 1. Système d'emails complet
- Modèle `Email.js`
- Controller `emailController.js`
- Service `emailService.js`
- Endpoints pour envoi/réception d'emails

### 2. Gestion avancée des sessions
- Modèle `Session.js`
- Service `tokenService.js`
- Nettoyage automatique toutes les 24h
- Gestion des sessions multiples par utilisateur

### 3. Services IA
- Variable `IA_ENABLED` pour activer/désactiver
- Controller `analyseSentimentController.js`
- Modèle `AnalyseSentiment.js`

### 4. Sécurité renforcée
- Mot de passe admin pour gestion étudiants
- Validation améliorée des tokens
- Middleware d'authentification optimisé

## 🚀 Déploiement

Les deux versions sont prêtes pour Railway avec :
- Node.js 20 (nixpacks.toml)
- Health check endpoint
- Variables d'environnement configurées
- Build optimisé

## 📝 Recommandations

- **Utiliser v2** pour les nouveaux projets
- **v1** reste stable pour les déploiements existants
- Migration possible de v1 vers v2 avec mise à jour des variables d'environnement