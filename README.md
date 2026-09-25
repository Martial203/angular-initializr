# my-initializr-schematics

Collection de schematics Angular pour démarrer un projet avec une configuration **sécurisée et outillée** dès le premier jour : i18n, chiffrement des échanges, CSP, obfuscation, lint et contrôles au commit.

## Installation

```bash
ng add my-initializr-schematics
```

`ng add` affiche la liste des configurations disponibles. Cochez celles que vous voulez : les schematics correspondants s'exécutent ensuite et posent leurs propres questions. Voir [ng-add](src/ng-add/README.md).

Chaque schematic peut aussi être lancé seul :

```bash
ng generate my-initializr-schematics:<nom>
```

## Schematics disponibles

| Schematic | Rôle |
|---|---|
| [`translation`](src/translation/README.md) | i18n avec Transloco et `@martiald/translator` |
| [`e2e-encryption`](src/e2e-encryption/README.md) | Chiffrement de bout en bout des requêtes HTTP avec `@martiald/e2e-encryption` (**nécessite un backend compatible**) |
| [`csp`](src/csp/README.md) | CSP stricte, headers de sécurité nginx, `Dockerfile`, `index.html` dev/prod |
| [`obfuscator`](src/obfuscator/README.md) | Obfuscation du bundle de production |
| [`lint-rules`](src/lint-rules/README.md) | ESLint strict, Prettier, lint-staged au commit |
| [`secret-scan`](src/secret-scan/README.md) | Détection de secrets au commit avec gitleaks (installe Husky) |
| [`dependency-scan`](src/dependency-scan/README.md) | Audit des dépendances de production au commit |

## Prérequis

- Un projet Angular **standalone** (avec `src/app/app.config.ts`), ce qui est le cas par défaut depuis Angular 17.
- Un dépôt Git, pour les hooks de commit.
- [gitleaks](https://github.com/gitleaks/gitleaks#installing) sur chaque poste, si vous utilisez `secret-scan`.
- Un backend qui implémente le protocole de `@martiald/e2e-encryption`, si vous utilisez `e2e-encryption`.

## Développement

```bash
npm install
```

Compiler :

```bash
npm run build
```

Lancer les tests unitaires (Jasmine) :

```bash
npm test
```

Tester sur un vrai projet Angular : compilez, puis depuis le projet cible :

```bash
npm link <chemin-vers>/my-initializr-schematics
```

```bash
ng generate my-initializr-schematics:ng-add
```

## Publication

```bash
npm run build
```

```bash
npm publish
```
