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

1. Installe `husky` en dépendance de développement et ajoute le script `"prepare": "husky"` (Husky s'active à chaque `npm install`).
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
- Ce schematic installe Husky, dont dépendent aussi les hooks de [`lint-rules`](../lint-rules/README.md) et [`dependency-scan`](../dependency-scan/README.md).
