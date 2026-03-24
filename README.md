# Spring Logger Manager

> A lightweight Angular web app to manage Spring Boot loggers in real time via Spring Actuator — no backend, no account, no dependency.

**Live app:** [athlaes.github.io/spring-logger-manager](https://athlaes.github.io/spring-logger-manager/)

---

## Features

- **Zero backend** — runs entirely in the browser, talks directly to your Spring Actuator endpoint.
- **Multi-mode authentication**
  - No authentication
  - Direct Bearer token
  - Basic (username / password)
  - OAuth2 Client Credentials (client secret or pre-encoded Basic token)
- **Logger list** — filterable, always shows `ROOT` first, color-coded configured vs. effective levels.
- **One-click level change** — `TRACE`, `DEBUG`, `INFO`, `WARN`, `ERROR`, `FATAL`, `OFF`, `INHERIT`.
- Deployable on GitHub Pages or any static host.

---

## Quick start

1. Open [athlaes.github.io/spring-logger-manager](https://athlaes.github.io/spring-logger-manager/) (or your self-hosted instance).
2. Enter your Spring Boot **base URL** (e.g. `http://localhost:8080`).
3. Enter the **Actuator path** (e.g. `/actuator` or `/management`).
4. Select your **authentication mode** and fill in any credentials.
5. Click **Se connecter et charger les loggers**.
6. Browse or filter the logger list, then click a level button to apply it immediately.

---

## CORS configuration on your Spring app

Because the app is a static frontend making direct API calls, your Spring Boot application **must** allow CORS requests from the origin where the app is hosted.

### Using the hosted GitHub Pages version

Add the following to your `application.yaml`:

```yaml
management:
  endpoints:
    web:
      base-path: /management      # adjust to your Actuator path
      exposure:
        include:
          - loggers
      cors:
        allowed-origins:
          - https://athlaes.github.io
        allowed-methods:
          - GET
          - POST
          - PUT
          - PATCH
        allowed-headers:
          - "*"
```

### Using a self-hosted instance

Replace `https://athlaes.github.io` with your own origin (e.g. `http://localhost:4200` for local dev, or your custom domain).

---

## Self-hosting

The app is a static Angular build — host it anywhere.

### Prerequisites

- Node.js ≥ 20
- npm ≥ 10

### Run locally

```bash
npm install
npm start
```

App available at `http://localhost:4200/`.

### Build for production

```bash
npm run build
```

Output is in `dist/spring-logger-manager/browser/`. Serve it with any static file server (nginx, Caddy, GitHub Pages, S3, …).

### Deploy to your own GitHub Pages

Fork this repository, then update the `base-href` in `package.json`:

```json
"build:pages": "ng build --configuration production --base-href /your-repo-name/"
```

The included GitHub Actions workflow (`.github/workflows/deploy-pages.yml`) will automatically build and publish to GitHub Pages on every push to `main`.

---

## Tech stack

| Layer | Technology |
|---|---|
| Framework | Angular 21 (standalone, signals, zoneless) |
| UI | Angular Material 21 |
| Auth | Manual HTTP headers (Basic, Bearer, OAuth2 ROPC) |
| Target API | Spring Boot Actuator `/loggers` endpoint |
| Hosting | GitHub Pages |

---

## License

[MIT](LICENSE)
