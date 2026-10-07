import { chain, Rule, SchematicContext, SchematicsException, Tree } from '@angular-devkit/schematics';
import { NodePackageInstallTask } from '@angular-devkit/schematics/tasks';
import { addHttpInterceptor, addNamedImports } from '../utils/utils';


// You don't have to export the function as default. You can also have more than one rule factory
// per file.

const XSS_SANITIZATION_PACKAGE_NAME = '@martiald/xss-sanitization';
const CONFIG_PATH = 'src/app/app.config.ts';

export function installDependencies(_options: any): Rule {
  return (tree: Tree, _context: SchematicContext) => {

    _context.addTask(new NodePackageInstallTask({
      packageName: XSS_SANITIZATION_PACKAGE_NAME
    }))

    _context.addTask(new NodePackageInstallTask({
      packageName: 'dompurify'
    }))

    return tree;
  };
}

function setupXssSanitizationInterceptor(_options: any): Rule {
  return (tree: Tree, _context: SchematicContext) => {
    if (!tree.exists(CONFIG_PATH)) throw new SchematicsException(`Could not find ${CONFIG_PATH}`);

    const content = tree.read(CONFIG_PATH)!.toString('utf-8');

    // En tête de tableau : l'assainissement doit voir le contenu en clair, donc s'exécuter avant
    // le chiffrement sur la requête et après le déchiffrement sur la réponse (cf. encryptionInterceptor en fin).
    const updatedContent = addHttpInterceptor(content, 'xssSanitizationInterceptor', 'start');

    if (updatedContent === undefined) {
      _context.logger.warn('Could not find providers array in app.config.ts. Please add xssSanitizationInterceptor to withInterceptors manually.');
      return tree;
    }

    if (updatedContent === content) {
      _context.logger.info('xssSanitizationInterceptor is already configured in app.config.ts, skipping.');
      return tree;
    }

    tree.overwrite(CONFIG_PATH, addNamedImports(updatedContent, ['xssSanitizationInterceptor'], XSS_SANITIZATION_PACKAGE_NAME));
    _context.logger.info('Successfully added xssSanitizationInterceptor to app.config.ts');

    return tree;
  };
}

export function xssSanitization(_options: any): Rule {
  return chain([
    installDependencies(_options),
    setupXssSanitizationInterceptor(_options)
  ]);
}
