# `translation` — traduction / i18n

Met en place l'internationalisation avec [Transloco](https://jsverse.gitbook.io/transloco) et la librairie `@martiald/translator`.

```bash
ng generate my-initializr-schematics:translation
```

## Options

| Option | Type | Défaut | Description |
|---|---|---|---|
| `langs` | `string` | `fr,en` | Langues à configurer, séparées par des virgules. |
| `ssr` | `boolean` | `false` | Le projet utilise-t-il le Server-Side Rendering ? |

Les deux options sont demandées si elles ne sont pas passées en ligne de commande.

## Ce que fait le schematic

1. Installe `@jsverse/transloco` et `@martiald/translator`.
2. Exécute le `ng-add` de Transloco avec les langues choisies, un loader HTTP et l'option SSR. Transloco génère ses fichiers (loader, fichiers de traduction par langue) et sa configuration.
3. Ajoute dans les `providers` de `src/app/app.config.ts` un initializer qui charge la langue au démarrage :

```ts
provideAppInitializer(() => {
  const translateService = inject(TranslatorService);
  translateService.initLanguage();
})
```

4. Ajoute les imports manquants (`inject`, `provideAppInitializer`, `TranslatorService`).

## Bon à savoir

- `src/app/app.config.ts` doit exister (projet standalone). Sinon le schematic s'arrête en erreur.
- Si le tableau `providers` n'est pas trouvé, un avertissement est affiché et l'initializer est à ajouter à la main.
- Les fichiers de traduction sont chargés en HTTP. Ils doivent donc être servis avec l'application, et autorisés par la CSP si vous utilisez le schematic [`csp`](../csp/README.md). C'est le cas par défaut, puisqu'ils sont servis depuis la même origine (`'self'`).
