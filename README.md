# Dashboard Konecta-Amplifon

Dashboard de suivi des performances pour les agents Konecta/Amplifon, avec tracking des RDV CRM et Digital, mode Grand Écran et gestion des ressources.

## Fonctionnalités

- Authentification avec système de rôles (Admin/Agent)
- Suivi en temps réel des RDV pris par chaque agent
- Gestion des objectifs par type d'agent (HOT, PROSPECT, DIGI)
- Écran de supervision (Grand Écran) pour affichage collectif
- Demandes d'aide pour les agents
- Gestion des ressources (scripts, conseils, objections, images)
- Communication en temps réel via WebSocket

## Optimisation des ressources serveur

Pour optimiser l'application et réduire la consommation de ressources :

1. **Mode de stockage de session** : Le fichier `server/index.ts` est configuré pour utiliser `memorystore` pour les sessions. Pour une utilisation en production, il est recommandé de passer à `connect-pg-simple` avec PostgreSQL (code commenté disponible dans le fichier).

2. **Polling WebSocket** : Dans `client/src/lib/websocket.ts`, le polling des messages peut être ajusté pour réduire la fréquence des mises à jour :
   ```typescript
   // Augmenter l'intervalle de 30s à 60s ou plus
   const AUTH_CHECK_INTERVAL = 60 * 1000; // 60 secondes
   ```

3. **Logs** : Réduire la verbosité des logs en production en ajustant le middleware dans `server/index.ts`.

4. **Mise en cache** : Les requêtes TanStack Query dans les composants React ont des délais de mise en cache qui peuvent être augmentés.

## Déploiement sur serveur personnel ou OVH

### Prérequis

- Node.js 18+ et NPM installés
- PostgreSQL ou accès à une base de données PostgreSQL
- Serveur avec accès SSH

### Installation

1. **Clonez le dépôt**
   ```bash
   git clone <url-du-depot>
   cd konecta-amplifon-dashboard
   ```

2. **Installez les dépendances**
   ```bash
   npm install
   ```

3. **Configuration de la base de données**

   - Créez une base de données PostgreSQL
   - Copiez le fichier `.env.example` en `.env` et configurez les variables de base de données :
   ```
   DATABASE_URL=postgresql://utilisateur:mot_de_passe@hote:port/nom_db
   SESSION_SECRET=votre_cle_secrete_pour_sessions
   ```

4. **Configuration initiale de la base de données**
   ```bash
   npm run db:push
   ```

5. **Build de l'application**
   ```bash
   npm run build
   ```

### Déploiement sur un serveur OVH

#### Option 1 : Hébergement mutualisé

1. **Exportez les fichiers**
   - Construisez l'application avec `npm run build`
   - Uploadez le dossier `dist` vers votre serveur via FTP

2. **Configuration PHP (pour OVH mutualisé)**
   Créez un fichier `.htaccess` à la racine :
   ```
   RewriteEngine On
   RewriteRule ^$ /index.html [L]
   RewriteCond %{REQUEST_FILENAME} !-f
   RewriteCond %{REQUEST_FILENAME} !-d
   RewriteRule ^(.*)$ /index.html [L]
   ```

3. **Configurer Node.js sur OVH**
   - Activez Node.js depuis votre espace client OVH
   - Configurez le point d'entrée vers `server/index.js`

#### Option 2 : VPS OVH ou autre serveur dédié

1. **Installation de PM2**
   ```bash
   npm install -g pm2
   ```

2. **Configuration de PM2** 
   Créez un fichier `ecosystem.config.js` :
   ```javascript
   module.exports = {
     apps: [
       {
         name: "konecta-dashboard",
         script: "server/index.js",
         env: {
           NODE_ENV: "production",
           PORT: 5000
         },
         instances: 1,
         exec_mode: "fork",
         max_memory_restart: "300M"
       }
     ]
   };
   ```

3. **Démarrage de l'application avec PM2**
   ```bash
   pm2 start ecosystem.config.js
   pm2 save
   pm2 startup
   ```

4. **Configuration Nginx** 
   Installez Nginx et créez une configuration de proxy :
   ```nginx
   server {
     listen 80;
     server_name votre-domaine.com;

     location / {
       proxy_pass http://localhost:5000;
       proxy_http_version 1.1;
       proxy_set_header Upgrade $http_upgrade;
       proxy_set_header Connection 'upgrade';
       proxy_set_header Host $host;
       proxy_cache_bypass $http_upgrade;
     }
   }
   ```

5. **Activation HTTPS**
   ```bash
   sudo apt install certbot python3-certbot-nginx
   sudo certbot --nginx -d votre-domaine.com
   ```

### Maintenance et mises à jour

1. **Mises à jour du code**
   ```bash
   git pull
   npm install
   npm run build
   pm2 restart konecta-dashboard
   ```

2. **Sauvegarde de la base de données**
   ```bash
   pg_dump -U username -h hostname dbname > backup_$(date +"%Y%m%d").sql
   ```

## Variables d'environnement

Créez un fichier `.env` à la racine du projet avec ces variables :

```env
# Base de données
DATABASE_URL=postgresql://username:password@localhost:5432/konecta_db

# Sécurité
SESSION_SECRET=votre_cle_secrete_tres_longue_et_complexe

# Serveur
PORT=5000
NODE_ENV=production
```

## Optimisations supplémentaires

- **Compression** : Ajoutez `compression` middleware pour réduire la taille des réponses
- **Rate Limiting** : Ajoutez `express-rate-limit` pour limiter les requêtes excessives
- **Cache** : Utilisez Redis pour un cache plus performant des sessions

Pour toute question, contactez l'équipe de développement.