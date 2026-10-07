import { Tree } from '@angular-devkit/schematics';
import { SchematicTestRunner } from '@angular-devkit/schematics/testing';
import * as path from 'path';
import { DEPENDENCY_SCAN } from './scripts/dependency-scan';

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

describe('dependency-scan', () => {
  let runner: SchematicTestRunner;

  beforeEach(() => {
    runner = new SchematicTestRunner('schematics', collectionPath);
  });

  it('adds audit-export and husky as dev dependencies', async () => {
    const tree = await runner.runSchematic('dependency-scan', {}, createAppTree());

    const packageJson = JSON.parse(tree.readContent('package.json'));
    expect(packageJson.devDependencies['audit-export']).toBe('^5.1.5');
    expect(packageJson.devDependencies.husky).toBe('^9.1.7');
    expect(packageJson.scripts.prepare).toBe('husky');
  });

  it('creates .husky/pre-commit with the npm audit script', async () => {
    const tree = await runner.runSchematic('dependency-scan', {}, createAppTree());

    expect(tree.readContent('.husky/pre-commit')).toBe(`${DEPENDENCY_SCAN.trim()}\n\n`);
  });

  it('appends the audit script to an existing pre-commit hook without duplicating it', async () => {
    const appTree = createAppTree();
    appTree.create('.husky/pre-commit', 'npm run test\n');

    const tree = await runner.runSchematic('dependency-scan', {}, appTree);
    expect(tree.readContent('.husky/pre-commit')).toBe(`npm run test\n${DEPENDENCY_SCAN.trim()}\n\n`);

    const treeAfterSecondRun = await runner.runSchematic('dependency-scan', {}, tree);
    expect(treeAfterSecondRun.readContent('.husky/pre-commit')).toBe(`npm run test\n${DEPENDENCY_SCAN.trim()}\n\n`);
  });
});
