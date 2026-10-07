import { Rule, SchematicContext, Tree } from '@angular-devkit/schematics';
import { NodePackageInstallTask } from '@angular-devkit/schematics/tasks';
import * as ts from 'typescript';

export function isSymbolImported(sourceText: string, symbol: string, moduleName: string): boolean {
  const sourceFile = ts.createSourceFile('file.ts', sourceText, ts.ScriptTarget.Latest, true);
  let imported = false;

  ts.forEachChild(sourceFile, (node) => {
    // On cherche les déclarations d'import (ex: import { ... } from '...')
    if (ts.isImportDeclaration(node)) {
      const moduleSpecifier = node.moduleSpecifier.getText(sourceFile).replace(/['"]/g, '');
      
      // On vérifie si c'est le bon module (ex: @angular/core)
      if (moduleSpecifier === moduleName && node.importClause && node.importClause.namedBindings) {
        const namedBindings = node.importClause.namedBindings;
        
        // On cherche dans les imports nommés { inject, provideAppInitializer }
        if (ts.isNamedImports(namedBindings)) {
          namedBindings.elements.forEach((element) => {
            if (element.name.text === symbol) {
              imported = true;
            }
          });
        }
      }
    }
  });

  return imported;
}

/**
 * Ajoute les symboles manquants à l'import du module donné.
 * Complète un import nommé existant, sinon crée une nouvelle ligne d'import en tête de fichier.
 */
export function addNamedImports(sourceText: string, symbols: string[], moduleName: string): string {
  const missing = symbols.filter((symbol) => !isSymbolImported(sourceText, symbol, moduleName));
  if (missing.length === 0) return sourceText;

  const sourceFile = ts.createSourceFile('file.ts', sourceText, ts.ScriptTarget.Latest, true);
  const existingImport = sourceFile.statements.find((node): node is ts.ImportDeclaration =>
    ts.isImportDeclaration(node)
    && node.moduleSpecifier.getText(sourceFile).replace(/['"]/g, '') === moduleName
    && !!node.importClause?.namedBindings
    && ts.isNamedImports(node.importClause.namedBindings)
  );

  if (existingImport) {
    const namedImports = existingImport.importClause!.namedBindings as ts.NamedImports;
    // On insère juste après l'accolade ouvrante
    const insertPos = namedImports.getStart(sourceFile) + 1;
    return sourceText.slice(0, insertPos) + ` ${missing.join(', ')},` + sourceText.slice(insertPos);
  }

  return `import { ${missing.join(', ')} } from '${moduleName}';\n` + sourceText;
}

/**
 * Retourne le tableau `providers: [...]` du fichier (ex: app.config.ts), ou undefined.
 */
export function findProvidersArray(sourceFile: ts.SourceFile): ts.ArrayLiteralExpression | undefined {
  let providers: ts.ArrayLiteralExpression | undefined;

  const visit = (node: ts.Node) => {
    if (providers) return;
    if (
      ts.isPropertyAssignment(node)
      && node.name.getText(sourceFile) === 'providers'
      && ts.isArrayLiteralExpression(node.initializer)
    ) {
      providers = node.initializer;
      return;
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);

  return providers;
}

/**
 * Insère des éléments à la fin d'un tableau littéral, en gérant la virgule de séparation.
 */
export function appendToArrayLiteral(sourceText: string, array: ts.ArrayLiteralExpression, items: string[], indent = '    '): string {
  const closePos = array.getEnd() - 1;
  const before = sourceText.slice(0, closePos).trimEnd();
  const needsComma = array.elements.length > 0 && !before.endsWith(',');
  const inserted = (needsComma ? ',' : '') + items.map((item) => `\n${indent}${item}`).join(',') + '\n' + indent.slice(2);

  return before + inserted + sourceText.slice(closePos);
}

const HUSKY_VERSION = '^9.1.7';

// `husky` lancé comme commande : en début de chaîne ou après &&, || ou ;, éventuellement via npx.
// Ne matche pas `husky-init` ni un mot qui ne fait que contenir "husky".
const HUSKY_COMMAND_REGEX = /(^|&&|\|\||;)\s*(npx\s+)?husky(?=\s|$|&&|\|\||;)/;

/**
 * Installe Husky si nécessaire et garantit que le script `prepare` l'active :
 * - `prepare` absent → `"husky"`
 * - `prepare` contenant déjà la commande `husky` → inchangé
 * - `prepare` existant sans `husky` → `"husky && <commande existante>"`
 * L'installation npm n'est lancée que si quelque chose a changé.
 */
export function installHusky(_options: any): Rule {
  return (tree: Tree, _context: SchematicContext) => {

    const packageJsonBuffer = tree.read('package.json');
    if (!packageJsonBuffer) {
      _context.logger.warn('Could not find package.json, Husky was not installed.');
      return tree;
    }

    const packageJson = JSON.parse(packageJsonBuffer.toString('utf-8'));
    let changed = false;

    const hasHusky = !!(packageJson.devDependencies?.husky || packageJson.dependencies?.husky);
    if (!hasHusky) {
      packageJson.devDependencies = packageJson.devDependencies || {};
      packageJson.devDependencies.husky = HUSKY_VERSION;
      changed = true;
    }

    packageJson.scripts = packageJson.scripts || {};
    const prepare: string | undefined = packageJson.scripts['prepare'];
    if (!prepare || !prepare.trim()) {
      packageJson.scripts['prepare'] = 'husky';
      changed = true;
    } else if (!HUSKY_COMMAND_REGEX.test(prepare)) {
      packageJson.scripts['prepare'] = `husky && ${prepare.trim()}`;
      _context.logger.info(`Existing "prepare" script updated to activate Husky: "${packageJson.scripts['prepare']}"`);
      changed = true;
    }

    if (changed) {
      tree.overwrite('package.json', JSON.stringify(packageJson, null, 2));
      // allowScripts : nécessaire pour que `prepare` s'exécute et active les hooks.
      _context.addTask(new NodePackageInstallTask({ allowScripts: true }));
    }

    return tree;
  };
}

export type InterceptorPosition = 'start' | 'end';

/**
 * Ajoute un intercepteur fonctionnel dans `provideHttpClient(withInterceptors([...]))` du tableau `providers` :
 * - `withInterceptors([...])` existe → l'intercepteur y est inséré (en tête ou en fin selon `position`) ;
 * - `provideHttpClient(...)` existe sans `withInterceptors` → `withInterceptors([interceptor])` est ajouté en argument ;
 * - pas de `provideHttpClient` → `provideHttpClient(withInterceptors([interceptor]))` est ajouté à la fin des providers.
 *
 * Ordre : le premier intercepteur du tableau traite la requête en premier et la réponse en dernier.
 * `'end'` place donc l'intercepteur au plus près du réseau.
 *
 * Ajoute aussi les imports `@angular/common/http` nécessaires (pas celui de l'intercepteur).
 * Retourne undefined si aucun tableau `providers` n'est trouvé ; le contenu inchangé si l'intercepteur est déjà présent.
 */
export function addHttpInterceptor(sourceText: string, interceptor: string, position: InterceptorPosition = 'end'): string | undefined {
  const sourceFile = ts.createSourceFile('app.config.ts', sourceText, ts.ScriptTarget.Latest, true);
  const providers = findProvidersArray(sourceFile);
  if (!providers) return undefined;

  const httpClientCall = providers.elements.find((element): element is ts.CallExpression =>
    ts.isCallExpression(element) && element.expression.getText(sourceFile) === 'provideHttpClient'
  );

  let content: string;

  if (!httpClientCall) {
    content = appendToArrayLiteral(sourceText, providers, [`provideHttpClient(\n      withInterceptors([${interceptor}])\n    )`]);
    return addNamedImports(content, ['provideHttpClient', 'withInterceptors'], '@angular/common/http');
  }

  const withInterceptorsCall = httpClientCall.arguments.find((arg): arg is ts.CallExpression =>
    ts.isCallExpression(arg) && arg.expression.getText(sourceFile) === 'withInterceptors'
  );

  if (withInterceptorsCall) {
    const interceptors = withInterceptorsCall.arguments[0];
    if (!interceptors || !ts.isArrayLiteralExpression(interceptors)) return sourceText;
    if (interceptors.elements.some((el) => el.getText(sourceFile) === interceptor)) return sourceText;

    if (interceptors.elements.length === 0) {
      const closePos = interceptors.getEnd() - 1;
      content = sourceText.slice(0, closePos) + interceptor + sourceText.slice(closePos);
    } else if (position === 'start') {
      const firstPos = interceptors.elements[0].getStart(sourceFile);
      content = sourceText.slice(0, firstPos) + `${interceptor}, ` + sourceText.slice(firstPos);
    } else {
      const lastEnd = interceptors.elements[interceptors.elements.length - 1].getEnd();
      content = sourceText.slice(0, lastEnd) + `, ${interceptor}` + sourceText.slice(lastEnd);
    }
  } else {
    // provideHttpClient(...) sans withInterceptors : on ajoute la feature en dernier argument
    const closeParenPos = httpClientCall.getEnd() - 1;
    const separator = httpClientCall.arguments.length > 0 ? ', ' : '';
    content = sourceText.slice(0, closeParenPos).trimEnd() + `${separator}withInterceptors([${interceptor}])` + sourceText.slice(closeParenPos);
  }

  return addNamedImports(content, ['withInterceptors'], '@angular/common/http');
}
