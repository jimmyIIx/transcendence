# 🚀 QUICK START - Docker Transcendence

## Prérequis

✅ **Installez ces outils** (si pas fait) :

1. [Docker Desktop](https://www.docker.com/products/docker-desktop) - Inclut Docker + Docker Compose
2. Git (pour cloner le projet)

Vérifier l'installation :

```bash
docker --version
docker-compose --version
```

---

## UNE COMMANDE POUR TOUT

```bash
cd c:\Users\arthu\OneDrive\Bureau\transcendence
docker-compose up --build
```

**Attendre 2-3 minutes** le temps que les images se buildent.

Puis ouvrir :

- **Frontend** : http://localhost:4200
- **Backend** : http://localhost:8080

---

## Commandes Essentielles

### ✅ Démarrer

```bash
# Build et démarrer (PREMIÈRE FOIS)
docker-compose up --build

# Redémarrer normalement (APRÈS LA PREMIÈRE FOIS)
docker-compose up
```

### ⏹️ Arrêter

```bash
# Arrêter gracefully (Ctrl+C dans le terminal)
# OU en autre terminal:
docker-compose down
```

### 🔍 Logs

```bash
# Tous les logs
docker-compose logs -f

# Backend seulement
docker-compose logs -f backend

# Frontend seulement
docker-compose logs -f frontend
```

### 🧹 Nettoyer complètement

```bash
# ATTENTION: Supprime la BD!
docker-compose down -v
```

---

## ✅ Vérifier que tout fonctionne

1. **Frontend charge ?**
   - Ouvrir http://localhost:4200
   - Devrait voir la page d'accueil

2. **Backend répond ?**

   ```bash
   curl http://localhost:8080/auth/login
   ```

3. **BD connectée ?**
   ```bash
   docker-compose exec db psql -U transcendence_user -d transcendence -c "SELECT 1;"
   ```

---

## 🔧 Configuration

### Variables d'environnement

Fichier : `.env` (à la racine du projet)

```bash
# Si n'existe pas, créer depuis l'exemple
cp .env.example .env
```

Éditer `.env` pour vos configurations (JWT_SECRET, mots de passe BD, etc.)

---

## 🐛 Si ça ne marche pas

### Erreur "docker: command not found"

→ Docker n'est pas installé. [Télécharger Docker Desktop](https://www.docker.com/products/docker-desktop)

### Erreur "Port 4200 already in use"

```bash
# Option 1: Tuer le processus sur le port
lsof -i :4200
kill -9 <PID>

# Option 2: Utiliser un autre port
# Éditer docker-compose.yml:
# ports: ["8000:4200"]
```

### Le frontend affiche une page blanche

```bash
# Vérifier les logs
docker-compose logs frontend

# Rebuild depuis zéro
docker-compose down -v
docker-compose up --build
```

### Le backend plante

```bash
# Voir pourquoi
docker-compose logs backend

# Redémarrer
docker-compose restart backend
```

---

## 📁 Fichiers créés

```
✅ docker-compose.yml       ← Configuration services
✅ transcendence/Dockerfile ← Image backend
✅ 42bets-frontend/Dockerfile ← Image frontend
✅ 42bets-frontend/nginx.conf ← Config nginx
✅ .env.example             ← Variables d'env
✅ DOCKER_GUIDE.md          ← Guide complet
```

---

## 📞 Support

Pour plus d'infos :

- Lire [DOCKER_GUIDE.md](DOCKER_GUIDE.md) - Guide complet
- Vérifier que les Dockerfiles existent
- Vérifier que docker-compose.yml existe

---

**TL;DR:**

```bash
docker-compose up --build
# Attendre 2-3 min
# Ouvrir http://localhost:4200
```
