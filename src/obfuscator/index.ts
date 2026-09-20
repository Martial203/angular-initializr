import { Rule, SchematicContext, Tree } from '@angular-devkit/schematics';
import { NodePackageInstallTask } from '@angular-devkit/schematics/tasks';
import { addPackageJsonDependency, NodeDependencyType } from '@schematics/angular/utility/dependencies';

export function obfuscator(_options: any): Rule {
  return (tree: Tree, _context: SchematicContext) => {
    
    _context.logger.info('Setting up obfuscator for the project...');
    
    if (!tree.exists('package.json')) {
      throw new Error('Could not find package.json');
    }

    const obfuscatorDependency = {
      type: NodeDependencyType.Dev,
      name: 'javascript-obfuscator',
      version: '^4.0.0'
    };

    addPackageJsonDependency(tree, obfuscatorDependency);
    _context.addTask(new NodePackageInstallTask());

    const configPath = "javascript-obfuscator.config.json";
    let reservedStrings: string[] = [];
    if(_options.reservedStrings) {
      reservedStrings = Array.isArray(_options.reservedStrings)
      ? _options.reservedStrings
      : _options.reservedStrings.split(',').map((s: string) => s.trim());
    }

    const obfuscatorConfig = {
      compact: true,
      selfDefending: true,
      stringArray: true,
      stringArrayEncoding: ['base64'],
      reservedStrings: reservedStrings
    }

    if(tree.exists(configPath)) {
      tree.overwrite(configPath, JSON.stringify(obfuscatorConfig, null, 2));
    }else {
      tree.create(configPath, JSON.stringify(obfuscatorConfig, null, 2));
    }

    const packageJsonBuffer = tree.read('package.json');
    if (packageJsonBuffer) {
      const packageJson = JSON.parse(packageJsonBuffer.toString('utf-8'));
      
      if (!packageJson.scripts) {
        packageJson.scripts = {};
      }

      const projectName = getProjectNameFromAngularJson(tree);
      if (!projectName) {
        throw new Error('Could not determine the project name from angular.json');
      }
      
      packageJson.scripts['obfuscate'] = `javascript-obfuscator ./dist/${projectName} --config ${configPath} --output ./dist/${projectName}`;
      packageJson.scripts['build:prod'] = `npm run build -- --configuration production && npm run obfuscate`;

      tree.overwrite('package.json', JSON.stringify(packageJson, null, 2));
    }

    return tree;
  };
}

function getProjectNameFromAngularJson(tree: Tree): string | null {
  const angularJsonBuffer = tree.read('angular.json');
  if (angularJsonBuffer) {
    const angularJson = JSON.parse(angularJsonBuffer.toString('utf-8'));
    const projectNames = Object.keys(angularJson.projects);
    return angularJson.defaultProject || projectNames[0] || null;
  }
  return null;
}