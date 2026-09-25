# `obfuscator` — obfuscation du bundle de production

Ajoute une étape d'obfuscation du JavaScript produit par le build, avec [javascript-obfuscator](https://github.com/javascript-obfuscator/javascript-obfuscator).

```bash
ng generate my-initializr-schematics:obfuscator
```

## Options

| Option | Type | Défaut | Description |
|---|---|---|---|
| `reservedStrings` | `string` | `""` | Chaînes à ne pas obfusquer, séparées par des virgules. Utile pour des placeholders remplacés au déploiement (ex. `PLACEHOLDER`). |

## Ce que fait le schematic

1. Installe `javascript-obfuscator` en dépendance de développement.
2. Crée (ou écrase) `javascript-obfuscator.config.json` :

```json
{
  "compact": true,
  "selfDefending": true,
  "stringArray": true,
  "stringArrayEncoding": ["base64"],
  "reservedStrings": []
}
```

3. Ajoute deux scripts au `package.json` :

| Script | Rôle |
|---|---|
| `npm run obfuscate` | Obfusque `dist/<projet>` sur place |
| `npm run build:prod` | Build de production puis obfuscation |

## Bon à savoir

- **Utilisez `npm run build:prod`** pour vos livraisons : `ng build` seul ne déclenche pas l'obfuscation. Pensez à l'utiliser dans votre CI et, si vous utilisez [`csp`](../csp/README.md), dans le `Dockerfile`.
- L'obfuscation **complique** la lecture du code, elle ne le protège pas. Ne mettez jamais de secret côté front, obfusqué ou non.
- Elle augmente la taille du bundle et peut ralentir l'exécution. Mesurez l'impact.
- Si une valeur est injectée ou remplacée au déploiement dans les fichiers JS, déclarez-la dans `reservedStrings`, sinon elle sera encodée et introuvable.
- Le nom du projet est lu dans `angular.json` (premier projet). Le schematic échoue s'il ne peut pas le déterminer.
