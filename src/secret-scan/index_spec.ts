import { Tree } from '@angular-devkit/schematics';
import { SchematicTestRunner } from '@angular-devkit/schematics/testing';
import * as path from 'path';
import { SCAN_CONFIG, SCAN_SCRIPT } from './scripts/secret-scan-script';

const collectionPath = path.join(__dirname, '../collection.json');

function createAppTree(): Tree {
  const tree = Tree.empty();
  tree.create('package.json', JSON.stringify({
    name: 'test-app',
    version: '0.0.0',
    scripts: {},
    dependencies: {},
    devDependencies: {}
  }, null, 2));
  return tree;
}

describe('secret-scan', () => {
  it('adds husky as a dev dependency and a prepare script', async () => {
    const runner = new SchematicTestRunner('schematics', collectionPath);
    const tree = await runner.runSchematic('secret-scan', {}, createAppTree());

    const packageJson = JSON.parse(tree.readContent('package.json'));
    expect(packageJson.devDependencies.husky).toBe('^9.1.7');
    expect(packageJson.scripts.prepare).toBe('husky');
  });

  it('creates .husky/pre-commit with the gitleaks scan script', async () => {
    const runner = new SchematicTestRunner('schematics', collectionPath);
    const tree = await runner.runSchematic('secret-scan', {}, createAppTree());

    expect(tree.readContent('.husky/pre-commit')).toBe(`${SCAN_SCRIPT.trim()}\n\n`);
  });

  it('creates .gitleaks.toml even on a fresh pre-commit hook', async () => {
    const runner = new SchematicTestRunner('schematics', collectionPath);
    const tree = await runner.runSchematic('secret-scan', {}, createAppTree());

    expect(tree.readContent('.gitleaks.toml')).toBe(SCAN_CONFIG.trim());
  });

  it('appends the gitleaks script to an existing pre-commit hook without duplicating it', async () => {
    const runner = new SchematicTestRunner('schematics', collectionPath);
    const appTree = createAppTree();
    appTree.create('.husky/pre-commit', 'npm run test\n');

    const tree = await runner.runSchematic('secret-scan', {}, appTree);

    expect(tree.readContent('.husky/pre-commit')).toBe(`npm run test\n${SCAN_SCRIPT.trim()}\n\n`);

    const treeAfterSecondRun = await runner.runSchematic('secret-scan', {}, tree);
    expect(treeAfterSecondRun.readContent('.husky/pre-commit')).toBe(`npm run test\n${SCAN_SCRIPT.trim()}\n\n`);
  });
});
