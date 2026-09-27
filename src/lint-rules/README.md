# `lint-rules` — lint et formatage

Configure ESLint (angular-eslint) avec un jeu de règles strict, Prettier, et un contrôle automatique des fichiers modifiés à chaque commit via lint-staged.

```bash
ng generate @martiald/seto:lint-rules
```

Pas d'option.

## Ce que fait le schematic

1. Ajoute en dépendances de développement :
   - `@angular-eslint/schematics` (puis exécute son `ng-add`)
   - `eslint-plugin-rxjs-x`, `eslint-plugin-rxjs-angular-x`
   - `eslint-plugin-unused-imports`, `eslint-plugin-sonarjs`
   - `eslint-config-prettier`, `prettier`, `lint-staged`
2. Crée (ou écrase) `eslint.config.js`.
3. Ajoute la cible `lint` dans `angular.json` si elle n'existe pas.
4. Ajoute au `package.json` :

| Script | Rôle |
|---|---|
| `npm run lint` | `ng lint` |
| `npm run lint:fix` | `ng lint --fix` |
| `npm run format` | Formate `src/` avec Prettier |
| `npm run format:check` | Vérifie le formatage sans modifier |

   ainsi qu'une configuration `lint-staged` (`eslint --fix` sur `.ts`/`.html`, `prettier --write` sur `.ts`/`.html`/`.scss`/`.css`/`.json`).
5. Ajoute à `.husky/pre-commit` un contrôle `npx lint-staged` qui annule le commit en cas d'erreur.

## Règles principales (bloquantes)

- **TypeScript :** pas de `any`, pas de fonction vide, imports et variables inutilisés interdits (corrigés automatiquement ; préfixe `_` pour ignorer).
- **Angular :** `ChangeDetectionStrategy.OnPush` obligatoire, `inject()` plutôt que l'injection par constructeur, sélecteurs de composants `app-kebab-case`.
- **Templates :** nouveau flot de contrôle (`@if`, `@for`) obligatoire, règles d'accessibilité (`alt`, labels associés, focus, événements clavier, pas d'`autofocus`).
- **RxJS :** `takeUntilDestroyed` obligatoire pour les souscriptions, pas de `subscribe` imbriqué, pas de `toPromise`, `shareReplay` avec configuration explicite…
- **SonarJS :** preset recommandé.

## Bon à savoir

- `eslint.config.js` est **écrasé** s'il existe déjà.
- Les règles sont pensées pour un **projet neuf**. Sur un projet existant, attendez-vous à beaucoup d'erreurs au premier `npm run lint`.
- **Husky n'est pas installé par ce schematic** : il est installé par [`secret-scan`](../secret-scan/README.md). Sans Husky, le hook pre-commit ne s'exécute pas.
- Le préfixe de sélecteur `app` est fixe. Modifiez `eslint.config.js` si votre projet en utilise un autre.
