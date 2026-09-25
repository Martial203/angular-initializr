# `e2e-encryption` — chiffrement de bout en bout des échanges HTTP

Branche la librairie [`@martiald/e2e-encryption`](https://www.npmjs.com/package/@martiald/e2e-encryption) dans l'application : une session chiffrée est négociée avec le backend au démarrage, puis toutes les requêtes `HttpClient` sont chiffrées et les réponses déchiffrées.

```bash
ng generate my-initializr-schematics:e2e-encryption
```

## ⚠️ Prérequis : un backend compatible

**Ce schematic ne configure que le front.** Le chiffrement ne fonctionne que si le backend :

- expose l'endpoint de négociation de clé (handshake) dont l'URL est demandée à l'installation ;
- déchiffre les requêtes et chiffre les réponses selon le même protocole que `@martiald/e2e-encryption`.

Sans backend compatible, **l'application ne démarre pas** (voir plus bas).

## Options

| Option | Type | Obligatoire | Description |
|---|---|---|---|
| `handshakeInitEndpointUrl` | `string` | oui | URL de l'endpoint de négociation de clé. Demandée si absente. |

## Ce que fait le schematic

1. Installe `@martiald/e2e-encryption`.
2. Ajoute dans les `providers` de `src/app/app.config.ts` :

```ts
provideE2EEncryption({
  handshakeInitEndpointUrl: '<URL saisie>'
}),

provideAppInitializer(() => {
  const cryptoService = inject(CryptoService);
  return cryptoService.establishSecureSession().pipe(
    catchError((err: unknown) => {
      const error = err as HttpErrorResponse;
      console.error('Échec critique du Handshake Crypto:', error);
      return throwError(() => error);
    })
  )
}),

provideHttpClient(
  withInterceptors([encryptionInterceptor])
)
```

3. Ajoute les imports manquants (`@angular/core`, `@angular/common/http`, `rxjs`, `@martiald/e2e-encryption`) sans dupliquer ceux qui existent.

Détails :

- Si `provideHttpClient(...)` est **déjà présent** (ajouté par Transloco par exemple), il n'est pas dupliqué : `encryptionInterceptor` est ajouté à son `withInterceptors([...])`, ou `withInterceptors([encryptionInterceptor])` est ajouté en argument.
- Si `provideE2EEncryption` est déjà configuré, le schematic ne modifie rien : il peut être relancé sans risque.
- Si aucun tableau `providers` n'est trouvé, un avertissement est affiché et la configuration est à ajouter à la main.

## Comportement à connaître

- **Le démarrage est bloquant.** Si le handshake échoue (backend arrêté, URL erronée, 404, CORS…), l'initializer renvoie une erreur et Angular n'amorce pas l'application : écran blanc et erreur `Échec critique du Handshake Crypto` dans la console. C'est voulu : l'application refuse de fonctionner sans canal chiffré.
- **Toutes les requêtes `HttpClient` passent par l'intercepteur**, y compris vers des API tierces. Vérifiez comment la librairie gère les exclusions si vous appelez d'autres domaines.
- **URL en dur.** L'URL est écrite telle quelle dans `app.config.ts`. Préférez une URL relative (`/api/crypto/handshake/init`) avec un proxy en dev (`proxy.conf.json`), ou déplacez-la dans vos fichiers `environment`.
- **CORS / CSP.** Si l'endpoint est sur un autre domaine, le backend doit autoriser l'origine du front (CORS), et ce domaine doit figurer dans `connect-src` si vous utilisez le schematic [`csp`](../csp/README.md).
- **SSR.** Avec le Server-Side Rendering, l'initializer s'exécute aussi côté serveur. Vérifiez que c'est le comportement souhaité.

## Ce que ça protège… et ce que ça ne protège pas

- ✅ La confidentialité des payloads applicatifs, même si TLS est terminé par un intermédiaire (proxy, load balancer, outils de journalisation).
- ❌ Ne protège pas contre une faille XSS : un script injecté dans la page a accès aux clés en mémoire.
- ❌ Ne remplace ni HTTPS ni l'authentification.

## Dépannage

| Symptôme | Cause probable |
|---|---|
| Écran blanc au démarrage, erreur de handshake en console | Backend arrêté, mauvaise URL ou endpoint non implémenté |
| Handshake bloqué par le navigateur | CORS côté backend, ou domaine absent du `connect-src` de la CSP |
| Erreurs de déchiffrement après un moment | Session expirée côté serveur |
