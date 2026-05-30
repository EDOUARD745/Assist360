# Déploiement Assist360 sur Coolify

Guide pas-à-pas pour déployer Assist360 (backend FastAPI + frontend Next.js) sur Coolify auto-hébergé.

## Prérequis

- Un VPS avec Coolify installé et fonctionnel
- Un nom de domaine pointant sur le VPS (avec wildcard ou deux sous-domaines)
- Une clé API Groq ([console.groq.com](https://console.groq.com), gratuit)
- Le repo Assist360 accessible (GitHub public ou GitHub App Coolify)

## Architecture cible

```
Internet
   |
   +-- assist360.tondomaine.fr      ->  Coolify  ->  conteneur frontend (Next.js, port 3000)
   |
   +-- api.assist360.tondomaine.fr  ->  Coolify  ->  conteneur backend  (FastAPI, port 8000)
```

Deux applications Coolify distinctes, chacune avec son propre domaine, son propre conteneur, ses propres logs. C'est l'option recommandée.

Alternative : déployer le tout via `docker-compose.yml` en une seule ressource Coolify ("Docker Compose"). Plus simple à provisionner mais moins flexible pour scaler indépendamment.

## Option 1 : déploiement par service (recommandé)

### A. Backend

1. **Coolify > Add Resource > Application > Public Repository** (ou Private si tu connectes GitHub App).
   - Repository : `https://github.com/EDOUARD745/Assist360`
   - Branch : `main`
   - **Base Directory** : `/backend`
   - **Build Pack** : `Dockerfile`

2. **Environment variables** (onglet Environment Variables) :

   | Clé | Valeur |
   |---|---|
   | `LLM_PROVIDER` | `groq` |
   | `GROQ_API_KEY` | `gsk_...` (ta clé) |
   | `GROQ_MODEL` | `llama-3.1-8b-instant` |
   | `GROQ_BASE_URL` | `https://api.groq.com/openai/v1` |
   | `PII_REDACT` | `true` |
   | `CORS_ORIGINS` | `https://assist360.tondomaine.fr` |

3. **Ports** : exposer `8000`. Coolify se charge du reverse proxy.

4. **Domain** : ajouter `api.assist360.tondomaine.fr` dans la section Domains. Coolify gère le certificat Let's Encrypt automatiquement.

5. **Healthcheck** : le Dockerfile expose `/health`. Dans Coolify, "Health Check Path" = `/health`, "Port" = `8000`.

6. **Persistent Storage** (optionnel) : si tu veux que les messages envoyés en démo survivent aux redéploiements, ajouter un volume monté sur `/app/data/tickets`. Sinon laisse vide, l'état repart à zéro à chaque rebuild (acceptable pour une démo publique).

7. **Deploy**. Le premier build prend 3-5 min (téléchargement du modèle d'embeddings ~220 Mo). Les builds suivants sont rapides grâce au cache des layers Docker.

### B. Frontend

1. **Coolify > Add Resource > Application** sur le même repo, autre app.
   - **Base Directory** : `/frontend`
   - **Build Pack** : `Dockerfile`

2. **Build variable** (à définir avant le build, car bakée dans le bundle) :

   | Clé | Valeur |
   |---|---|
   | `NEXT_PUBLIC_API_URL` | `https://api.assist360.tondomaine.fr` |

   Important : dans Coolify, cette variable doit être marquée comme **"Build variable"** ou ajoutée dans **"Build Arguments"** selon ta version. Si elle n'est passée qu'en runtime, le bundle JS pointera toujours sur localhost.

3. **Ports** : `3000`.

4. **Domain** : `assist360.tondomaine.fr`.

5. **Healthcheck** : path `/login`, port `3000`.

6. **Deploy**. Le build prend 1-2 min.

### C. Vérification

```bash
curl https://api.assist360.tondomaine.fr/health
# {"status":"ok"}

curl https://api.assist360.tondomaine.fr/tickets | head
# Liste JSON des 12 tickets de démo

# Ouvre https://assist360.tondomaine.fr dans un navigateur
# -> écran de login -> connecte avec n'importe quel mot de passe -> dashboard
```

## Option 2 : Docker Compose (tout-en-un)

1. **Coolify > Add Resource > Application > Public Repository**
   - **Build Pack** : `Docker Compose`
   - **Docker Compose Location** : `/docker-compose.yml`

2. Définir les variables d'env dans Coolify (elles sont injectées dans `${...}` du compose) :

   ```
   GROQ_API_KEY=gsk_...
   GROQ_MODEL=llama-3.1-8b-instant
   GROQ_BASE_URL=https://api.groq.com/openai/v1
   PII_REDACT=true
   CORS_ORIGINS=https://assist360.tondomaine.fr
   NEXT_PUBLIC_API_URL=https://api.assist360.tondomaine.fr
   ```

3. Mapper les domaines :
   - `assist360.tondomaine.fr` -> service `frontend` (port 3000)
   - `api.assist360.tondomaine.fr` -> service `backend` (port 8000)

   En Coolify, on configure ça dans l'onglet Configuration > Magic FQDNs.

4. Deploy.

## Test en local avant de pousser

```bash
# À la racine du repo
cp .env.example .env
# Éditer .env et coller GROQ_API_KEY

docker compose up --build

# Frontend : http://localhost:3000
# Backend  : http://localhost:8000/health
```

Premier build : ~5 min (modèle embeddings + node_modules). Suivants : 30 secondes.

## Mise à jour

Coolify auto-redeploye sur push si tu as activé le webhook GitHub. Sinon, "Redeploy" depuis l'UI Coolify pull la dernière version.

Pour forcer un rebuild propre (cache busted) : "Force rebuild" dans Coolify.

## Persistence des données (production)

Les fichiers JSON dans `backend/data/tickets/` (notamment `analyzed_tickets.json`) sont modifiés à l'exécution quand un conseiller envoie un message, ferme un ticket, ou simule une nouvelle demande. Si tu veux que cet état survive aux redéploiements :

1. Ajouter un volume persistant dans Coolify monté sur `/app/data/tickets`.
2. Au premier démarrage le volume est vide ; il faut copier les fichiers initiaux :
   ```bash
   # Depuis Coolify > Terminal du conteneur backend
   cp -n data/tickets/*.json data/tickets/ 2>/dev/null || true
   python preload.py        # régénère les analyses au cas où
   ```
3. Les démarrages suivants conservent l'état.

## Sécurité

- **Ne jamais commit `.env`** : il est gitignore par défaut.
- **Clé Groq exposée** : si une clé a fuité (logs, screenshots, etc.), aller sur [console.groq.com/keys](https://console.groq.com/keys) > Revoke, puis en créer une nouvelle.
- **PII redaction** : laisser `PII_REDACT=true` en prod. Les numéros de colis, emails, téléphones, montants et noms ne quittent jamais le conteneur sous forme identifiable.
- **CORS** : restreindre à ton domaine exact, ne pas mettre `*`.
- **TLS** : Coolify gère Let's Encrypt automatiquement, vérifie que le domaine est bien en HTTPS après déploiement.

## Coûts

| Composant | Coût |
|---|---|
| Coolify auto-hébergé | gratuit (ton VPS) |
| Groq (Llama 3.1 8B) | gratuit jusqu'à ~100k tokens/jour |
| Domaine | ~10€/an |
| VPS (2 CPU / 4 Go RAM suffisant) | ~5-15€/mois |

Au total : un déploiement de démo coûte le prix du VPS. Idéal pour un prototype hackathon mis en ligne pour démo publique.

## Dépannage

**Le frontend pointe sur localhost après build** : tu n'as pas passé `NEXT_PUBLIC_API_URL` comme **build variable**, juste comme runtime. Rebuild avec la variable correcte dans la section Build de Coolify.

**Erreur "Failed to fetch" sur le navigateur** : ton frontend appelle l'API mais le CORS du backend la rejette. Vérifier que `CORS_ORIGINS` côté backend contient exactement le domaine du frontend (avec `https://`, sans slash final).

**Le backend met 30s à démarrer** : c'est normal au premier démarrage : il charge le modèle d'embeddings (~220 Mo en mémoire). Le healthcheck Coolify est configuré avec `start_period=15s` pour tolérer ça.

**Rate limit Groq dépassé** : le free tier est ~100k tokens/jour par modèle. Soit attendre le reset H+24, soit basculer sur un autre modèle (changer `GROQ_MODEL` dans l'env, ex `llama-3.3-70b-versatile` qui a son propre quota).

**Tickets perdus à chaque deploy** : tu n'as pas ajouté de volume persistant. Voir section "Persistence" ci-dessus.

## Récapitulatif fichiers ajoutés pour Coolify

```
backend/Dockerfile           # Image Python + FastAPI + fastembed pré-téléchargé
backend/.dockerignore        # Exclut venv, __pycache__, etc.
frontend/Dockerfile          # Multi-stage Next.js standalone
frontend/.dockerignore       # Exclut node_modules, .next, etc.
frontend/next.config.ts      # `output: "standalone"` activé
docker-compose.yml           # Orchestration locale ou Coolify-compose
.env.example                 # Template des variables (racine)
DEPLOY.md                    # Ce guide
```
