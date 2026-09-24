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
