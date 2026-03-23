# Spring Logger Manager

Frontend Angular Material pour piloter les loggers d'une application Spring Boot exposant Actuator.

## Fonctionnalites

- Saisie de l'URL de l'application Spring et du chemin Actuator, par exemple `/actuator` ou `/management`.
- Authentification multi-mode:
  - bearer direct,
  - basic user/password,
  - bearer via client credentials,
  - bearer via basic token client.
- Chargement de la liste des loggers avec affichage des niveaux configures et effectifs.
- Changement de niveau en un clic.
- Theme Angular Material inspire de Spring avec dominante verte.
- Deploiement GitHub Pages via GitHub Actions.

## Demarrage local

```bash
npm install
npm start
```

L'application est ensuite disponible sur `http://localhost:4200/`.

## Scripts utiles

```bash
npm run build
npm run test -- --run
npm run build:pages
```

`build:pages` genere un build pret pour GitHub Pages avec un `base-href` adapte au depot `spring-logger-manager`.

## Utilisation

1. Saisir l'URL de base de l'application Spring.
2. Saisir le chemin Actuator expose.
3. Choisir le mode d'authentification approprie.
4. Cliquer sur **Se connecter et charger les loggers**.
5. Filtrer la liste si besoin puis cliquer sur un niveau pour mettre a jour un logger.

## Deploiement GitHub Pages

Le workflow `.github/workflows/deploy-pages.yml`:

- installe les dependances,
- lance les tests,
- build l'application,
- publie le contenu de `dist/spring-logger-manager/browser` sur GitHub Pages.

## Point d'attention CORS

Comme l'application est deployee en frontend statique sur GitHub Pages, l'API Spring cible doit autoriser
les requetes CORS depuis le domaine GitHub Pages utilise pour l'hebergement.
