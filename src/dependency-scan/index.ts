import { chain, Rule, SchematicContext, Tree } from '@angular-devkit/schematics';
import { NodePackageInstallTask } from '@angular-devkit/schematics/tasks';
import { addPackageJsonDependency, NodeDependencyType } from '@schematics/angular/utility/dependencies';
import { DEPENDENCY_SCAN } from './scripts/dependency-scan';
import { installHusky } from '../utils/utils';

const PRE_COMMIT_HOOK_PATH = '.husky/pre-commit';
const DEPENDENCY_SCAN_SCRIPT = DEPENDENCY_SCAN;

function installDependencies(_options: any): Rule {
  return (tree: Tree, _context: SchematicContext) => {
    addPackageJsonDependency(tree, {
      type: NodeDependencyType.Dev,
      name: 'audit-export',
      version: '^5.1.5'
    });

    _context.addTask(new NodePackageInstallTask());
    
    return tree;
  }
}

function setupScanHook(_options: any): Rule {
  return (tree: Tree, _context: SchematicContext) => {

    const trimmedScript = DEPENDENCY_SCAN_SCRIPT.trim();

    if(!tree.exists(PRE_COMMIT_HOOK_PATH)) {
      tree.create(PRE_COMMIT_HOOK_PATH, `${trimmedScript}\n\n`);
    }else{
      const existingContent = tree.read(PRE_COMMIT_HOOK_PATH)!.toString('utf-8');
      if(!existingContent.includes(trimmedScript)){
        const separator = existingContent.length && !existingContent.endsWith('\n') ? '\n' : '';
        tree.overwrite(PRE_COMMIT_HOOK_PATH, `${existingContent}${separator}${trimmedScript}\n\n`);
      }
    }

    return tree;
  }
}

export function dependencyScan(_options: any): Rule {
  return chain([
    installHusky(_options),
    installDependencies(_options),
    setupScanHook(_options)
  ]);
}
