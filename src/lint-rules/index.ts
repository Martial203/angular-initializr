import { chain, Rule, SchematicContext, Tree } from '@angular-devkit/schematics';
import { NodePackageInstallTask, RunSchematicTask } from '@angular-devkit/schematics/tasks';
import { addPackageJsonDependency, NodeDependencyType } from '@schematics/angular/utility/dependencies';
import { ESLINT_CONFIG } from './scripts/eslint-config';
import { LINT_SCAN_SCRIPT } from './scripts/lint-scan';
import { installHusky } from '../utils/utils';

const ESLINT_CONFIG_PATH = 'eslint.config.js';
const PRE_COMMIT_HOOK_PATH = '.husky/pre-commit';


// You don't have to export the function as default. You can also have more than one rule factory
// per file.

function installDependencies(_options: any): Rule {
  return (tree: Tree, _context: SchematicContext) => {

    addPackageJsonDependency(tree, {
      type: NodeDependencyType.Dev,
      name: 'eslint-config-prettier',
      version: '^10.1.8'
    });

    addPackageJsonDependency(tree, {
      type: NodeDependencyType.Dev,
      name: 'eslint-plugin-rxjs-angular-x',
      version: '^1.0.1'
    });

    addPackageJsonDependency(tree, {
      type: NodeDependencyType.Dev,
      name: 'eslint-plugin-rxjs-x',
      version: '^1.0.6'
    });

    addPackageJsonDependency(tree, {
      type: NodeDependencyType.Dev,
      name: 'eslint-plugin-unused-imports',
      version: '^4.4.1'
    });

    addPackageJsonDependency(tree, {
      type: NodeDependencyType.Dev,
      name: 'eslint-plugin-sonarjs',
      version: '^4.2.1'
    });

    addPackageJsonDependency(tree, {
      type: NodeDependencyType.Dev,
      name: 'lint-staged',
      version: '^17.0.8'
    });

    addPackageJsonDependency(tree, {
      type: NodeDependencyType.Dev,
      name: 'prettier',
      version: '^3.8.4'
    });

    addPackageJsonDependency(tree, {
      type: NodeDependencyType.Dev,
      name: '@angular-eslint/schematics',
      version: '^21.4.0'
    });

    const installTaskId = _context.addTask(new NodePackageInstallTask());

    _context.addTask(new RunSchematicTask('@angular-eslint/schematics', 'ng-add', {}), [installTaskId]);

    return tree
  }
}

function registerLintTarget(_options: any): Rule {
  return (tree: Tree, _context: SchematicContext) => {

    const angularJsonBuffer = tree.read('angular.json');
    if (!angularJsonBuffer) {
      return tree;
    }

    const angularJson = JSON.parse(angularJsonBuffer.toString('utf-8'));
    const projectNames = Object.keys(angularJson.projects || {});

    if (projectNames.length !== 1) {
      return tree;
    }

    const project = angularJson.projects[projectNames[0]];
    project.architect = project.architect || {};

    if (!project.architect.lint) {
      const lintFilePatternsRoot = project.root ? project.root : (project.sourceRoot || 'src');
      project.architect.lint = {
        builder: '@angular-eslint/builder:lint',
        options: {
          lintFilePatterns: [
            `${lintFilePatternsRoot}/**/*.ts`,
            `${lintFilePatternsRoot}/**/*.html`
          ]
        }
      };

      tree.overwrite('angular.json', JSON.stringify(angularJson, null, 2));
    }

    return tree;
  };
}

function setupLintRules(_options: any): Rule{
  return (tree: Tree, _context: SchematicContext) => {

    const packageJsonBuffer = tree.read('package.json');
    if(packageJsonBuffer) {
      const packageJson = JSON.parse(packageJsonBuffer.toString('utf-8'));

      if(!packageJson.scripts){
        packageJson.scripts = {};
      }
      packageJson.scripts['lint'] = "ng lint";
      packageJson.scripts['lint:fix'] = "ng lint --fix";
      packageJson.scripts['format'] = "prettier --write \"src/**/*.{ts,html,scss,css,json}\"";
      packageJson.scripts['format:check'] = "prettier --check \"src/**/*.{ts,html,scss,css,json}\"";

      packageJson['lint-staged'] = {
        "*.{ts,html}": "eslint --fix --max-warnings=0",
        "*.{ts,html,scss,css,json}": "prettier --write"
      }

      tree.overwrite('package.json', JSON.stringify(packageJson, null, 2));
    }

    if (tree.exists(ESLINT_CONFIG_PATH)) {
      tree.overwrite(ESLINT_CONFIG_PATH, ESLINT_CONFIG);
    } else {
      tree.create(ESLINT_CONFIG_PATH, ESLINT_CONFIG);
    }

    const trimmedLintScanScript = LINT_SCAN_SCRIPT.trim();

    if (!tree.exists(PRE_COMMIT_HOOK_PATH)) {
      tree.create(PRE_COMMIT_HOOK_PATH, `${trimmedLintScanScript}\n\n`);
    } else {
      const existingContent = tree.read(PRE_COMMIT_HOOK_PATH)!.toString('utf-8');
      if (!existingContent.includes(trimmedLintScanScript)) {
        const separator = existingContent.length && !existingContent.endsWith('\n') ? '\n' : '';
        tree.overwrite(PRE_COMMIT_HOOK_PATH, `${existingContent}${separator}${trimmedLintScanScript}\n\n`);
      }
    }

    return tree;
  }
}

export function lintRules(_options: any): Rule {
  return chain([
    installHusky(_options),
    installDependencies(_options),
    setupLintRules(_options),
    registerLintTarget(_options)
  ])
}
