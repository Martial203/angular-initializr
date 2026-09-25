# `csp` — Content Security Policy et headers de sécurité

Prépare le déploiement de l'application derrière nginx (dans Docker) avec une CSP stricte et les headers de sécurité recommandés, et sépare `index.html` entre dev et prod.

```bash
ng generate my-initializr-schematics:csp
```

## Options

| Option | Type | Défaut | Description |
|---|---|---|---|
| `allowedOrigins` | `string` | `""` | Domaines externes que l'application peut contacter (API, CDN, services tiers), séparés par des espaces. Ils sont ajoutés à `connect-src`. |
| `hardwareFeatures` | `string[]` | `[]` | Fonctionnalités matérielles autorisées (`camera`, `microphone`, `payment`, `usb`). Toutes les autres sont bloquées. |

## Fichiers générés / modifiés

| Fichier | Contenu |
|---|---|
| `security-headers.conf` | Headers de sécurité nginx (voir ci-dessous) |
| `nginx.conf` | Serveur nginx non-root sur le port **8080**, fallback SPA, gzip, cache long sur les assets, pas de cache sur `index.html` |
| `Dockerfile` | Build multi-étapes : `node:22-alpine` pour le build, puis `nginx-unprivileged` pour servir `dist/<projet>/browser` |
| `src/index.prod.html` | Copie de `index.html` **sans** balise CSP (en prod, la CSP vient des headers HTTP) |
| `src/index.html` | Reçoit une balise `<meta http-equiv="Content-Security-Policy">` pour que la CSP s'applique aussi en dev |
| `angular.json` | La configuration `production` utilise `src/index.prod.html` |

⚠️ `security-headers.conf`, `nginx.conf` et `Dockerfile` sont **écrasés** s'ils existent déjà. Relancer le schematic régénère la CSP à partir des nouvelles réponses.

## Politique appliquée

```
default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline';
img-src 'self' data:; font-src 'self'; frame-src 'self'; frame-ancestors 'none';
object-src 'none'; connect-src 'self' <allowedOrigins>; base-uri 'self';
form-action 'self'; media-src 'none'; manifest-src 'self'; worker-src 'self';
upgrade-insecure-requests;
```

Headers ajoutés en plus de la CSP :

- `X-Frame-Options: DENY` et `frame-ancestors 'none'` (anti-clickjacking)
- `X-Content-Type-Options: nosniff`
- `X-XSS-Protection: 0` (désactivé au profit de la CSP)
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Strict-Transport-Security: max-age=31536000; includeSubDomains` (sans `preload`, à activer consciemment)
- `Permissions-Policy` construit à partir de `hardwareFeatures`
- `Cross-Origin-Opener-Policy` et `Cross-Origin-Resource-Policy: same-origin`

## Bon à savoir

- **Tout ce qui n'est pas autorisé est bloqué.** Polices Google, CDN, analytics, iframes externes, API sur un autre domaine : chaque origine doit être ajoutée explicitement. Pour une API, c'est `allowedOrigins` ; pour le reste, il faut adapter `security-headers.conf`.
- Avec [`e2e-encryption`](../e2e-encryption/README.md), ajoutez le domaine de l'endpoint de handshake à `allowedOrigins` s'il est différent de celui du front.
- `style-src 'unsafe-inline'` est conservé car Angular injecte des styles inline.
- En dev, la CSP est en `<meta>` : la directive `frame-ancestors` y est ignorée par les navigateurs (limitation de la spec), sans conséquence puisque ce fichier ne sert pas en prod.
- Le `Dockerfile` lance `npm run build`. Si vous utilisez [`obfuscator`](../obfuscator/README.md), remplacez-le par `npm run build:prod` pour que l'image contienne le bundle obfusqué.
- Dans un workspace avec plusieurs projets, `angular.json` n'est pas modifié et le chemin du `Dockerfile` utilise un joker (`dist/*/browser`).

## Lancer l'image

```bash
docker build -t mon-app .
```

```bash
docker run -p 8080:8080 mon-app
```
