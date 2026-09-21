import { chain, Rule, schematic, SchematicContext, Tree } from '@angular-devkit/schematics';
import { NodePackageInstallTask } from '@angular-devkit/schematics/tasks';


// You don't have to export the function as default. You can also have more than one rule factory
// per file.
export function ngAdd(_options: any): Rule {
  return (tree: Tree, _context: SchematicContext) => {
    _context.logger.info('Running ng-add schematic...');
    _context.addTask(new NodePackageInstallTask());
    tree;

    return chain([
      schematic('obfuscator', _options)
    ]);
  };
}
