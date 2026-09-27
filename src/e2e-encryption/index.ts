import { chain, Rule, SchematicContext, SchematicsException, Tree } from '@angular-devkit/schematics';
import { NodePackageInstallTask } from '@angular-devkit/schematics/tasks';
import * as ts from 'typescript';
import { addNamedImports, appendToArrayLiteral, findProvidersArray } from '../utils/utils';


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

/**
 * Ajoute encryptionInterceptor à un appel provideHttpClient(...) déjà présent dans les providers.
 * Retourne undefined si aucun provideHttpClient n'existe.
 */
function addInterceptorToExistingHttpClient(content: string, providers: ts.ArrayLiteralExpression, sourceFile: ts.SourceFile): string | undefined {
  const httpClientCall = providers.elements.find((element): element is ts.CallExpression =>
    ts.isCallExpression(element) && element.expression.getText(sourceFile) === 'provideHttpClient'
  );
  if (!httpClientCall) return undefined;

  const withInterceptorsCall = httpClientCall.arguments.find((arg): arg is ts.CallExpression =>
    ts.isCallExpression(arg) && arg.expression.getText(sourceFile) === 'withInterceptors'
  );

  if (withInterceptorsCall) {
    const interceptors = withInterceptorsCall.arguments[0];
    if (!interceptors || !ts.isArrayLiteralExpression(interceptors)) return content;
    if (interceptors.elements.some((el) => el.getText(sourceFile) === 'encryptionInterceptor')) return content;

    const closePos = interceptors.getEnd() - 1;
    const separator = interceptors.elements.length > 0 ? ', ' : '';
    return content.slice(0, closePos).trimEnd() + `${separator}encryptionInterceptor` + content.slice(closePos);
  }

  // provideHttpClient(...) sans withInterceptors : on ajoute la feature en dernier argument
  const closeParenPos = httpClientCall.getEnd() - 1;
  const separator = httpClientCall.arguments.length > 0 ? ', ' : '';
  return content.slice(0, closeParenPos).trimEnd() + `${separator}withInterceptors([encryptionInterceptor])` + content.slice(closeParenPos);
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

    let sourceFile = ts.createSourceFile(CONFIG_PATH, content, ts.ScriptTarget.Latest, true);
    let providers = findProvidersArray(sourceFile);

    if (!providers) {
      _context.logger.warn('Could not find providers array in app.config.ts. Please add the E2E encryption providers manually.');
      return tree;
    }

    const providerCodes = [
      `provideE2EEncryption({\n      handshakeInitEndpointUrl: '${handshakeUrl}'\n    })`,
      `provideAppInitializer(() => {\n      const cryptoService = inject(CryptoService);\n      return cryptoService.establishSecureSession().pipe(\n        catchError((err: unknown) => {\n          const error = err as HttpErrorResponse;\n          console.error('Échec critique du Handshake Crypto:', error);\n          return throwError(() => error);\n        })\n      )\n    })`
    ];

    // Si provideHttpClient existe déjà (ex: ajouté par transloco), on l'enrichit au lieu de le dupliquer
    const httpClientImports = ['HttpErrorResponse', 'withInterceptors'];
    const updatedContent = addInterceptorToExistingHttpClient(content, providers, sourceFile);
    if (updatedContent !== undefined) {
      content = updatedContent;
      sourceFile = ts.createSourceFile(CONFIG_PATH, content, ts.ScriptTarget.Latest, true);
      providers = findProvidersArray(sourceFile)!;
    } else {
      providerCodes.push(`provideHttpClient(\n      withInterceptors([encryptionInterceptor])\n    )`);
      httpClientImports.push('provideHttpClient');
    }

    content = appendToArrayLiteral(content, providers, providerCodes);

    content = addNamedImports(content, ['provideE2EEncryption', 'CryptoService', 'encryptionInterceptor'], CRYPTO_PACKAGE_NAME);
    content = addNamedImports(content, ['catchError', 'throwError'], 'rxjs');
    content = addNamedImports(content, httpClientImports, '@angular/common/http');
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
