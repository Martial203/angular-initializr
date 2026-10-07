# `xss-sanitization` — protection XSS des échanges HTTP

Branche la librairie [`@martiald/xss-sanitization`](https://www.npmjs.com/package/@martiald/xss-sanitization) dans l'application : un intercepteur HTTP assainit les données échangées avec le backend, grâce à [DOMPurify](https://github.com/cure53/DOMPurify), pour neutraliser les contenus malveillants (scripts, attributs d'événements, URLs `javascript:`…).

```bash
ng generate @martiald/seto:xss-sanitization
```

Pas d'option.

## Ce que fait le schematic

1. Installe `@martiald/xss-sanitization` et `dompurify`.
2. Ajoute `xssSanitizationInterceptor` dans `provideHttpClient(withInterceptors([...]))` de `src/app/app.config.ts` :

| Situation dans `app.config.ts` | Résultat |
|---|---|
| Pas de `provideHttpClient` | `provideHttpClient(withInterceptors([xssSanitizationInterceptor]))` ajouté à la fin des providers |
| `provideHttpClient(...)` sans `withInterceptors` | `withInterceptors([xssSanitizationInterceptor])` ajouté en argument |
| `withInterceptors([...])` existant | `xssSanitizationInterceptor` inséré **en tête** du tableau |
| `xssSanitizationInterceptor` déjà présent | Rien n'est modifié |

3. Ajoute les imports manquants (`@angular/common/http`, `@martiald/xss-sanitization`) sans dupliquer ceux qui existent.

Résultat sur un projet sans client HTTP configuré :

```ts
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { xssSanitizationInterceptor } from '@martiald/xss-sanitization';

export const appConfig: ApplicationConfig = {
  providers: [
    // ...
    provideHttpClient(
      withInterceptors([xssSanitizationInterceptor])
    )
  ]
};
```

Le schematic peut être relancé sans risque. Si aucun tableau `providers` n'est trouvé, un avertissement est affiché et l'intercepteur est à ajouter à la main.

## Position de l'intercepteur

Dans `withInterceptors([...])`, le premier intercepteur traite la requête en premier et la réponse en dernier. `xssSanitizationInterceptor` est donc placé **en tête**, pour traiter :

- les **requêtes** avant les autres intercepteurs (notamment avant le chiffrement) ;
- les **réponses** après eux (notamment après le déchiffrement).

Avec [`e2e-encryption`](../e2e-encryption/README.md), on obtient toujours, quel que soit l'ordre d'exécution des deux schematics :

```ts
withInterceptors([xssSanitizationInterceptor, encryptionInterceptor])
```

Dans l'ordre inverse, l'assainissement s'appliquerait à des données chiffrées et ne servirait à rien.

Si vous ajoutez vous-même un intercepteur qui transforme le corps des échanges (compression, encodage…), placez-le **après** `xssSanitizationInterceptor`.

## Ce que ça protège… et ce que ça ne protège pas

- ✅ Les contenus HTML malveillants transitant par `HttpClient`, avant qu'ils n'atteignent vos composants ou le backend.
- ❌ Les données qui ne passent pas par `HttpClient` : `fetch` direct, WebSocket, `localStorage`, paramètres d'URL, saisie utilisateur affichée sans appel HTTP.
- ❌ Ne remplace pas la validation et l'échappement côté backend : un client malveillant peut envoyer des requêtes sans passer par l'application.
- ❌ Ne remplace pas les protections d'Angular : évitez `bypassSecurityTrust*` et `innerHTML` sur des données non maîtrisées.

C'est une couche de **défense en profondeur**. Elle se combine bien avec une CSP stricte (schematic [`csp`](../csp/README.md)), qui bloque l'exécution de scripts injectés même si un contenu malveillant passe entre les mailles.

## Bon à savoir

- Si votre application échange volontairement du HTML riche (éditeur WYSIWYG, contenus CMS), vérifiez que le résultat assaini correspond à ce que vous attendez : certaines balises ou attributs peuvent être retirés.
- Les échanges binaires (fichiers, `Blob`) ne contiennent pas de HTML à assainir. Vérifiez comment la librairie les traite si votre application en manipule beaucoup.
