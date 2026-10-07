import { chain, Rule, SchematicContext, SchematicsException, Tree } from '@angular-devkit/schematics';
import { NodePackageInstallTask } from '@angular-devkit/schematics/tasks';
import * as ts from 'typescript';
import { addHttpInterceptor, addNamedImports, appendToArrayLiteral, findProvidersArray } from '../utils/utils';


// You don't have to export the function as default. You can also have more than one rule factory
// per file.

const CRYPTO_PACKAGE_NAME = '@martiald/e2e-encryption';
const CONFIG_PATH = 'src/app/app.config.ts';

export function installDependencies(_options: any): Rule {
  return (tree: Tree, _context: SchematicContext) => {

    _context.addTask(new NodePackageInstallTask({
      packageName: CRYPTO_PACKAGE_NAME
    }))

    return tree;
  }

}

function setupE2EEncryptionProviders(_options: any): Rule {
  return (tree: Tree, _context: SchematicContext) => {

    if (!tree.exists(CONFIG_PATH)) throw new SchematicsException(`Could not find ${CONFIG_PATH}`);

    let content = tree.read(CONFIG_PATH)!.toString('utf-8');

    if (content.includes('provideE2EEncryption(')) {
      _context.logger.info('provideE2EEncryption is already configured in app.config.ts, skipping.');
      return tree;
    }

    const handshakeUrl = String(_options.handshakeInitEndpointUrl ?? '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");

    const sourceFile = ts.createSourceFile(CONFIG_PATH, content, ts.ScriptTarget.Latest, true);
    const providers = findProvidersArray(sourceFile);

    if (!providers) {
      _context.logger.warn('Could not find providers array in app.config.ts. Please add the E2E encryption providers manually.');
      return tree;
    }

    const providerCodes = [
      `provideE2EEncryption({\n      handshakeInitEndpointUrl: '${handshakeUrl}'\n    })`,
      `provideAppInitializer(() => {\n      const cryptoService = inject(CryptoService);\n      return cryptoService.establishSecureSession().pipe(\n        catchError((err: unknown) => {\n          const error = err as HttpErrorResponse;\n          console.error('Échec critique du Handshake Crypto:', error);\n          return throwError(() => error);\n        })\n      )\n    })`
    ];

    content = appendToArrayLiteral(content, providers, providerCodes);

    // En fin de tableau : au plus près du réseau, pour que les autres intercepteurs (ex: xssSanitizationInterceptor)
    // travaillent sur le contenu en clair. Réutilise provideHttpClient s'il existe déjà (ex: ajouté par Transloco).
    content = addHttpInterceptor(content, 'encryptionInterceptor', 'end')!;

    content = addNamedImports(content, ['provideE2EEncryption', 'CryptoService', 'encryptionInterceptor'], CRYPTO_PACKAGE_NAME);
    content = addNamedImports(content, ['catchError', 'throwError'], 'rxjs');
    content = addNamedImports(content, ['HttpErrorResponse'], '@angular/common/http');
    content = addNamedImports(content, ['inject', 'provideAppInitializer'], '@angular/core');

    tree.overwrite(CONFIG_PATH, content);
    _context.logger.info('Successfully added E2E encryption providers to app.config.ts');

    return tree;
  };
}

function warnBackendRequirement(_options: any): Rule {
  return (tree: Tree, _context: SchematicContext) => {
    _context.logger.warn(
      `Le endpoint '${_options.handshakeInitEndpointUrl}' doit implémenter le protocole de handshake de ${CRYPTO_PACKAGE_NAME}. ` +
      `Sans backend compatible, l'établissement de la session chiffrée échouera au démarrage de l'application.`
    );
    return tree;
  };
}

export function e2eEncryption(_options: any): Rule {
  return chain([
    warnBackendRequirement(_options),
    installDependencies(_options),
    setupE2EEncryptionProviders(_options)
  ]);
}
