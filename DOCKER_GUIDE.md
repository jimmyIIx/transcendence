# 🐳 Docker - Déploiement Transcendence

## Quick Start (UNE COMMANDE)

```bash
# À la racine du projet (parent de transcendence/ et 42bets-frontend/)
docker-compose up --build
```

Puis ouvrir :

- **Frontend** : http://localhost:4200
- **Backend** : http://localhost:8080
- **Database** : postgresql://localhost:5432

---

## 📋 Architecture Docker

```
┌─────────────────────────────────────────┐
│   Docker Compose Network                │
│  (transcendence-network)                │
│                                         │
│  ┌──────────────┐  ┌──────────────┐   │
│  │  Frontend    │  │   Backend    │   │
│  │  (nginx)     │  │ (Spring Boot)│   │
│  │  :4200       │  │   :8080      │   │
│  └──────┬───────┘  └──────┬───────┘   │
│         │                 │           │
│         └────────┬────────┘           │
│                  │                    │
│         ┌────────▼────────┐           │
│         │   Database      │           │
│         │ (PostgreSQL)    │           │
│         │    :5432        │           │
│         └─────────────────┘           │
└─────────────────────────────────────────┘
```

---

## 🚀 Commandes Principales

### Démarrer les services

```bash
# Build et démarrer (première fois)
docker-compose up --build

# Démarrer seulement (après la première fois)
docker-compose up

# Démarrer en arrière-plan
docker-compose up -d
```

### Arrêter les services

```bash
# Arrêter tous les services
docker-compose down

# Arrêter et supprimer les volumes (BD incluse!)
docker-compose down -v
```

### Logs et débogage

```bash
# Voir tous les logs
docker-compose logs -f

# Voir les logs d'un service spécifique
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f db

# Accéder à un conteneur
docker-compose exec backend bash
docker-compose exec frontend sh
docker-compose exec db psql -U transcendence_user -d transcendence
```

### Reconstruire une image

```bash
# Rebuild le backend
docker-compose build backend

# Rebuild le frontend
docker-compose build frontend

# Rebuild tout
docker-compose build --no-cache
```

---

## 🔧 Configuration

### Variables d'environnement

Créer un fichier `.env` à la racine :

```bash
cp .env.example .env
```

Éditer `.env` pour vos configurations (JWT_SECRET, DB passwords, etc.)

**IMPORTANT POUR PRODUCTION** : Changer les valeurs dans `.env` avant le déploiement!

---

## 🧪 Tests et Vérification

### 1. Frontend accessible ?

```bash
curl http://localhost:4200
```

### 2. Backend accessible ?

```bash
curl http://localhost:8080/auth/login
```

### 3. Database connectée ?

```bash
docker-compose exec db psql -U transcendence_user -d transcendence -c "SELECT version();"
```

### 4. Login fonctionne ?

```bash
curl -X POST http://localhost:8080/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"testpass"}'
```

---

## 📦 Structure des fichiers

```
transcendence/
├── docker-compose.yml          ← Configuration des services
├── .env.example                ← Variables d'environnement (copier en .env)
├── .dockerignore               ← Fichiers à ignorer
│
├── transcendence/              ← Backend Spring Boot
│   ├── Dockerfile              ← Image backend
│   ├── pom.xml
│   ├── src/
│   └── target/
│
└── 42bets-frontend/            ← Frontend Angular
    ├── Dockerfile              ← Image frontend
    ├── nginx.conf              ← Configuration nginx
    ├── package.json
    └── dist/
```

---

## 🔐 Sécurité

### En développement (UNSAFE)

- JWT_SECRET : courte (à remplacer!)
- CORS : openssl http://localhost:4200
- Logs : verbose (DEBUG)
- Credentials : autorisés

### En production (À FAIRE)

- [ ] Générer un JWT_SECRET très long (32+ caractères aléatoires)
- [ ] Changer CORS_ALLOWED_ORIGINS vers votre domaine
- [ ] Mettre HTTPS://
- [ ] Mettre NODE_ENV=production
- [ ] Désactiver les logs DEBUG
- [ ] Utiliser PostgreSQL externe (pas local)
- [ ] Ajouter des backups BD
- [ ] Configurer SSL/TLS

```bash
# Générer une clé secrète sécurisée
openssl rand -base64 32
```

---

## 🐛 Dépannage

### Erreur : "Port 4200 already in use"

```bash
# Port occupé, tuer le processus
lsof -i :4200
kill -9 <PID>

# Ou utiliser un autre port dans docker-compose.yml
ports:
  - "8000:4200"  # Puis accéder via http://localhost:8000
```

### Erreur : "Cannot connect to database"

```bash
# Attendre que la DB soit prête (~10 secondes)
docker-compose logs db

# Ou redémarrer DB
docker-compose restart db
```

### Erreur : "JWT_SECRET not set"

```bash
# Vérifier le fichier .env existe
ls -la .env

# Sinon le créer :
cp .env.example .env
```

### Frontend montrant une page blanche

```bash
# Vérifier les logs
docker-compose logs frontend

# Reconstruire depuis zéro
docker-compose down -v
docker-compose up --build
```

### Backend retourne 500

```bash
# Vérifier l'application startup
docker-compose logs backend

# Accéder à la console du backend
docker-compose exec backend bash
```

---

## 📊 Vérifier la santé des services

```bash
# Tous les services
docker-compose ps

# Résultat attendu:
# NAME                  STATUS
# transcendence-frontend  Up (healthy)
# transcendence-backend   Up (healthy)
# transcendence-db        Up (healthy)
```

---

## 🧹 Nettoyer tout

```bash
# Arrêter et supprimer tout (conteneurs + images + volumes!)
docker-compose down -v --remove-orphans --rmi all

# Puis redémarrer proprement
docker-compose up --build
```

---

## 📝 Notes

- Les volumes Docker persistent les données même après `docker-compose down`
- Pour réinitialiser la BD : `docker-compose down -v`
- Les logs sont automatiquement routés sur stdout (visibles avec `docker-compose logs`)
- Health checks assurent que les services sont prêts avant de continuer
- CORS est configuré pour localhost:4200 (à modifier pour production)

---

## ✅ Checklist Avant Défense

- [ ] `docker-compose up --build` sans erreur
- [ ] Frontend charge sur http://localhost:4200
- [ ] Backend répond sur http://localhost:8080
- [ ] Login/Register fonctionne
- [ ] Database a des données persistantes
- [ ] Pas d'erreur dans les logs (docker-compose logs)
- [ ] Chrome DevTools console : aucune erreur
- [ ] `docker-compose down` fonctionne proprement
- [ ] `docker-compose up` redémarre sans rebuild
- [ ] JWT_SECRET configuré de manière sécurisée

---

## 🚨 Production Checklist

**AVANT DE DÉPLOYER EN PRODUCTION** :

- [ ] Changer JWT_SECRET en une clé très longue (`openssl rand -base64 32`)
- [ ] Mettre HTTPS partout (nginx SSL, backend HTTPS)
- [ ] Configurer CORS pour votre domaine (pas localhost!)
- [ ] Utiliser une BD PostGreSQL externe/gérée
- [ ] Configurer des backups automatiques
- [ ] Ajouter un reverse proxy (nginx externe)
- [ ] Configurer les logs centralisés (Datadog, ELK)
- [ ] Tester en charge (plusieurs utilisateurs)
- [ ] Configurer les alertes de monitoring
