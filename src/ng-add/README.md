# `ng-add` — point d'entrée

Schematic exécuté par `ng add`. Il demande quelles configurations ajouter au projet, puis exécute les schematics correspondants.

## Utilisation

```bash
ng add @martiald/seto
```

Un menu à choix multiples s'affiche :

| Choix | Schematic exécuté |
|---|---|
| Traduction / i18n | [`translation`](../translation/README.md) |
| Chiffrement de bout en bout | [`e2e-encryption`](../e2e-encryption/README.md) |
| CSP + headers de sécurité | [`csp`](../csp/README.md) |
| Obfuscation du bundle | [`obfuscator`](../obfuscator/README.md) |
| Lint & formatage | [`lint-rules`](../lint-rules/README.md) |
| Détection de secrets | [`secret-scan`](../secret-scan/README.md) |
| Audit des dépendances | [`dependency-scan`](../dependency-scan/README.md) |

Chaque schematic sélectionné pose ensuite ses propres questions (URL du handshake, langues, domaines autorisés…).

## Options

| Option | Type | Description |
|---|---|---|
| `features` | `string[]` | Configurations à ajouter. Si absente, elle est demandée. |

Les autres options passées en ligne de commande sont transmises telles quelles à chaque schematic sélectionné, ce qui permet une exécution sans prompt (CI, scripts) :

```bash
ng add @martiald/seto --features=e2e-encryption,secret-scan --handshake-init-endpoint-url=/api/crypto/handshake/init
```

## Ordre d'exécution

Les schematics s'exécutent toujours dans cet ordre, quel que soit l'ordre de sélection :

1. `translation`
2. `e2e-encryption`
3. `csp`
4. `obfuscator`
5. `lint-rules`
6. `secret-scan`
7. `dependency-scan`

Les trois derniers écrivent dans `.husky/pre-commit` : cet ordre est donc aussi celui des contrôles au moment du commit (lint → secrets → dépendances).

## Bon à savoir

- **Husky est partagé** par `lint-rules`, `secret-scan` et `dependency-scan` : chacun l'installe s'il est absent, et il n'est installé qu'une seule fois même si les trois sont sélectionnés.
- **E2E + CSP :** si l'endpoint de handshake est sur un autre domaine que l'application, ajoutez ce domaine dans les domaines autorisés demandés par `csp` (`connect-src`), sinon le navigateur bloquera le handshake.
- Chaque schematic peut aussi être lancé seul : `ng generate @martiald/seto:<nom>`.
