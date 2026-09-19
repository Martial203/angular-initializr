import { Rule, SchematicContext, Tree } from '@angular-devkit/schematics';
import { NodePackageInstallTask, RunSchematicTask } from '@angular-devkit/schematics/tasks';

// You don't have to export the function as default. You can also have more than one rule factory
// per file.
export function translation(_options: any): Rule {
  return (tree: Tree, _context: SchematicContext) => {
    _context.logger.info('Setting up translation and i18n files for the project...');

    const installTaskId = _context.addTask(new NodePackageInstallTask({
      packageName: '@jsverse/transloco'
    }));

    const translocoOptions = {
      langs: _options.langs || 'fr,en',
      loader: 'Http',
      ssr: _options.ssr || false
    }

    _context.addTask(new RunSchematicTask('@jsverse/transloco', 'ng-add', translocoOptions), [installTaskId]);
    
    _context.logger.info('Translation and i18n setup completed successfully.');
    
    return tree;
  };
}
