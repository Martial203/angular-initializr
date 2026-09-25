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
