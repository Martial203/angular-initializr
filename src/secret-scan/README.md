# `secret-scan` — détection de secrets au commit

Bloque tout commit contenant un secret (clé d'API, mot de passe, token, numéro de carte…) grâce à [gitleaks](https://github.com/gitleaks/gitleaks), exécuté par un hook Husky.

```bash
ng generate @martiald/seto:secret-scan
```

Pas d'option.

## ⚠️ Prérequis : gitleaks sur chaque poste

gitleaks est un binaire, **pas un paquet npm** : chaque développeur doit l'installer lui-même ([instructions](https://github.com/gitleaks/gitleaks#installing)).

```bash
winget install gitleaks
```

```bash
brew install gitleaks
```

S'il est absent, le hook **refuse le commit** avec un message indiquant comment l'installer.

## Ce que fait le schematic

1. Installe Husky s'il est absent et s'assure que le script `prepare` l'active (voir [plus bas](#husky-et-le-script-prepare)).
2. Ajoute à `.husky/pre-commit` le scan des fichiers stagés :

```bash
gitleaks git --staged --redact --verbose
```

3. Crée (ou écrase) `.gitleaks.toml`. Il reprend les règles par défaut de gitleaks et en ajoute :
   - **numéros de carte bancaire** (PCI-DSS) ;
   - **chaînes à forte entropie** près de mots-clés sensibles (`secret`, `password`, `token`, `key`, `iban`…) ;
   - **chaînes de connexion** à une base de données contenant des identifiants ;
   - **tokens de passerelles de paiement** (Stripe, Adyen, PayPal…).

   Les lockfiles et les fichiers de polices sont ignorés.

## Bon à savoir

- Les secrets sont masqués dans la sortie (`--redact`).
- Pour un faux positif, ajoutez une exception dans la section `[allowlist]` de `.gitleaks.toml`, ou le commentaire `gitleaks:allow` sur la ligne concernée.
- `git commit --no-verify` contourne le hook. Pour une vraie garantie, exécutez aussi gitleaks en CI.
- Husky est partagé avec [`lint-rules`](../lint-rules/README.md) et [`dependency-scan`](../dependency-scan/README.md) : les trois schematics écrivent dans le même `.husky/pre-commit`.

## Husky et le script `prepare`

`lint-rules`, `secret-scan` et `dependency-scan` installent Husky de la même façon :

| Situation | Résultat |
|---|---|
| `husky` absent des dépendances | Ajouté en dépendance de développement (`^9.1.7`) |
| `husky` déjà présent | Version existante conservée |
| Script `prepare` absent | `"prepare": "husky"` |
| `prepare` lance déjà `husky` (`husky`, `npx husky`, `ng build && husky`…) | Inchangé |
| `prepare` existant sans `husky` (ex. `ng build lib`) | `"husky && ng build lib"` |

`npm install` n'est relancé que si l'un de ces éléments a changé : sélectionner les trois schematics dans `ng add` n'installe Husky qu'une fois.

- Sans dépôt Git (CI, build Docker), `husky` affiche un avertissement mais n'échoue pas : le reste du script `prepare` s'exécute normalement.
- `npm ci --omit=dev` exécute quand même `prepare` alors que Husky n'est pas installé : `prepare` échoue (`husky: command not found`) et la suite de la commande ne s'exécute pas. Ajoutez `--ignore-scripts` à cette installation. `HUSKY=0` ne suffit pas : cette variable désactive Husky lorsqu'il est installé, mais n'empêche pas l'erreur s'il est absent.
- `HUSKY=0` sert en revanche à désactiver les hooks dans un environnement où Husky est installé (CI, build Docker complet).
