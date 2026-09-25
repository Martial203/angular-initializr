# `dependency-scan` — audit des dépendances au commit

Bloque le commit si une dépendance **de production** présente une vulnérabilité connue, et génère un rapport HTML lisible.

```bash
ng generate my-initializr-schematics:dependency-scan
```

Pas d'option.

## Ce que fait le schematic

1. Installe `audit-export` en dépendance de développement.
2. Ajoute à `.husky/pre-commit` un contrôle qui :
   - exécute `npm audit --omit=dev --audit-level=low` ;
   - en cas de vulnérabilité, génère `audit-report.html` à la racine du projet, l'ouvre dans le navigateur (Windows, macOS, Linux) et **annule le commit**.

## Bon à savoir

- **Seules les dépendances de production sont auditées** (`--omit=dev`) : ce sont celles qui finissent dans le bundle livré.
- **Le seuil est `low`** : toute vulnérabilité, même mineure, bloque le commit. C'est volontairement strict ; pour l'assouplir, remplacez `low` par `moderate`, `high` ou `critical` dans `.husky/pre-commit`.
- `npm audit` interroge le registre npm : il faut un accès réseau au moment du commit.
- Ajoutez `audit-report.html` à votre `.gitignore`.
- Pour corriger : `npm audit fix`, ou mise à jour manuelle de la dépendance concernée.
- **Husky n'est pas installé par ce schematic** : il est installé par [`secret-scan`](../secret-scan/README.md). Sans Husky, le hook ne s'exécute pas.
