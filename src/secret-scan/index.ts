import { chain, Rule, SchematicContext, Tree } from '@angular-devkit/schematics';
import { SCAN_CONFIG, SCAN_SCRIPT } from './scripts/secret-scan-script';
import { installHusky } from '../utils/utils';

const PRE_COMMIT_HOOK_PATH = '.husky/pre-commit';
const SECRET_SCAN_SCRIPT = SCAN_SCRIPT;
const PRE_COMMIT_SCAN_CONFIG = '.gitleaks.toml';

function installDependencies(_options: any): Rule {
  return installHusky(_options);
}

function setupScanHook(_options: any): Rule {
  return (tree: Tree, _context: SchematicContext) => {

    const trimmedScript = SECRET_SCAN_SCRIPT.trim();

    if (!tree.exists(PRE_COMMIT_HOOK_PATH)) {
      tree.create(PRE_COMMIT_HOOK_PATH, `${trimmedScript}\n\n`);
    } else {
      const existingContent = tree.read(PRE_COMMIT_HOOK_PATH)!.toString('utf-8');
      if (!existingContent.includes(trimmedScript)) {
        const separator = existingContent.length && !existingContent.endsWith('\n') ? '\n' : '';
        tree.overwrite(PRE_COMMIT_HOOK_PATH, `${existingContent}${separator}${trimmedScript}\n\n`);
      }
    }

    if(tree.exists(PRE_COMMIT_SCAN_CONFIG)) {
      tree.overwrite(PRE_COMMIT_SCAN_CONFIG, SCAN_CONFIG.trim());
    }else{
      tree.create(PRE_COMMIT_SCAN_CONFIG, SCAN_CONFIG.trim());
    }

    return tree;
  };
}

export function secretScan(_options: any): Rule {
  return chain([
    installDependencies(_options),
    setupScanHook(_options)
  ]);
}
