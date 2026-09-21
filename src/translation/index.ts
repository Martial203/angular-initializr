import { chain, Rule, SchematicContext, Tree } from '@angular-devkit/schematics';
import { NodePackageInstallTask, RunSchematicTask } from '@angular-devkit/schematics/tasks';
import { isSymbolImported } from '../utils/utils';

// You don't have to export the function as default. You can also have more than one rule factory
// per file.

const TRANSLATOR_PACKAGE_NAME = '@martiald/translator';
const TRANSLOCO_PACKAGE_NAME = '@jsverse/transloco';
const CONFIG_PATH = 'src/app/app.config.ts';

function installDependencies(_options: any): Rule {
  return (tree: Tree, _context: SchematicContext) => {
    _context.logger.info('Setting up translation and i18n files for the project...');

    const installTaskId1 = _context.addTask(new NodePackageInstallTask({
      packageName: TRANSLOCO_PACKAGE_NAME
    }));

    const installTaskId2 = _context.addTask(new NodePackageInstallTask({
      packageName: TRANSLATOR_PACKAGE_NAME
    }));

    const translocoOptions = {
      langs: _options.langs || 'fr,en',
      loader: 'Http',
      ssr: _options.ssr || false
    }

    _context.addTask(new RunSchematicTask(TRANSLOCO_PACKAGE_NAME, 'ng-add', translocoOptions), [installTaskId1, installTaskId2]);

    return tree;
  }
}

function setupTranslationInitializer(_options: any): Rule {
  return (tree: Tree, _context: SchematicContext) => {

    if(!tree.exists(CONFIG_PATH)) throw new Error(`Could not find ${CONFIG_PATH}`);

    const configBuffer = tree.read(CONFIG_PATH);
    if(configBuffer) {
      let content = configBuffer.toString('utf-8');

      const hasInject = isSymbolImported(content, 'inject', '@angular/core');
      const hasInitializer = isSymbolImported(content, 'provideAppInitializer', '@angular/core');
      const hasTranslatorService = isSymbolImported(content, 'TranslatorService', TRANSLATOR_PACKAGE_NAME);

      const coreImportsToInsert: string[] = [];
      if(!hasInject) coreImportsToInsert.push('inject');
      if(!hasInitializer) coreImportsToInsert.push('provideAppInitializer');

      if (coreImportsToInsert.length > 0) {
        const angularCoreRegex = /(import\s*{)([^}]*)(}\s*from\s*['"]@angular\/core['"])/;
        if (angularCoreRegex.test(content)) {
          // On insère les nouveaux symboles juste après l'ouverture de l'accolade du premier groupe
          const symbolsString = ` ${coreImportsToInsert.join(', ')}, `;
          content = content.replace(angularCoreRegex, `$1${symbolsString}$2$3`);
        } else {
          content = `import { ${coreImportsToInsert.join(', ')} } from '@angular/core';\n` + content;
        }
      }

      if (!hasTranslatorService) {
        content = `import { TranslatorService } from '${TRANSLATOR_PACKAGE_NAME}';\n` + content;
      }

      const providersRegex = /(providers\s*:\s*\[[\s\S]*?)(\s*\])/;

      if (providersRegex.test(content)) {
        const providerCode = `,\n    provideAppInitializer(() => {\n      const translateService = inject(TranslatorService);\n      translateService.initLanguage();\n    })`;
        
        content = content.replace(providersRegex, `$1${providerCode}$2`);
        tree.overwrite(CONFIG_PATH, content);
        _context.logger.info('Successfully added TranslatorService initializer to the end of providers in app.config.ts');
      } else {
        _context.logger.warn('Could not find providers array in app.config.ts. Please add the initializer manually.');
      }


    }
    
    _context.logger.info('Translation and i18n setup completed successfully.');
    
    return tree;
  };
}

export function translation(_options: any): Rule {
  return chain([
    installDependencies(_options),
    setupTranslationInitializer(_options)
  ]);
}
