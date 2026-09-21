import { Rule, SchematicContext, Tree } from '@angular-devkit/schematics';
import { addPackageJsonDependency, NodeDependencyType } from '@schematics/angular/utility/dependencies';


// You don't have to export the function as default. You can also have more than one rule factory
// per file.
export function secretScan(_options: any): Rule {
  return (tree: Tree, _context: SchematicContext) => {

    addPackageJsonDependency(tree, {
      type: NodeDependencyType.Dev,
      name: 'husky',
      version: '^9.1.7'
    });

    return tree;
  };
}
