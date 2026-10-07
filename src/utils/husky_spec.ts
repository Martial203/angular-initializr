import { Tree } from '@angular-devkit/schematics';
import { SchematicTestRunner } from '@angular-devkit/schematics/testing';
import * as path from 'path';

const collectionPath = path.join(__dirname, '../collection.json');

function createTree(packageJson: Record<string, unknown>): Tree {
  const tree = Tree.empty();
  tree.create('package.json', JSON.stringify({ name: 'app', ...packageJson }, null, 2));
  return tree;
}

function installTasks(runner: SchematicTestRunner) {
  return runner.tasks.filter((task) => task.name === 'node-package');
}

describe('installHusky', () => {
  let runner: SchematicTestRunner;

  beforeEach(() => {
    runner = new SchematicTestRunner('schematics', collectionPath);
  });

  it('adds husky and a "husky" prepare script when both are absent', async () => {
    const tree = await runner.runSchematic('secret-scan', {}, createTree({}));
    const packageJson = JSON.parse(tree.readContent('package.json'));

    expect(packageJson.devDependencies.husky).toBe('^9.1.7');
    expect(packageJson.scripts.prepare).toBe('husky');
    expect(installTasks(runner).length).toBe(1);
  });

  it('prepends husky to an existing prepare script that does not run it', async () => {
    const tree = await runner.runSchematic('secret-scan', {}, createTree({
      scripts: { prepare: 'ng build lib' },
      devDependencies: { husky: '^9.0.0' }
    }));
    const packageJson = JSON.parse(tree.readContent('package.json'));

    expect(packageJson.scripts.prepare).toBe('husky && ng build lib');
    expect(packageJson.devDependencies.husky).toBe('^9.0.0');
  });

  for (const prepare of ['husky', 'ng build lib && husky', 'npx husky', 'is-ci || husky install']) {
    it(`leaves "${prepare}" untouched and skips the install when husky is already set up`, async () => {
      const tree = await runner.runSchematic('secret-scan', {}, createTree({
        scripts: { prepare },
        devDependencies: { husky: '^9.0.0' }
      }));

      expect(JSON.parse(tree.readContent('package.json')).scripts.prepare).toBe(prepare);
      expect(installTasks(runner).length).toBe(0);
    });
  }

  it('does not mistake husky-init for the husky command', async () => {
    const tree = await runner.runSchematic('secret-scan', {}, createTree({
      scripts: { prepare: 'husky-init' },
      devDependencies: { husky: '^9.0.0' }
    }));

    expect(JSON.parse(tree.readContent('package.json')).scripts.prepare).toBe('husky && husky-init');
  });

  it('installs husky only once when several hook schematics run through ng-add', async () => {
    const tree = await runner.runSchematic('ng-add', { features: ['secret-scan', 'dependency-scan'] }, createTree({}));
    const packageJson = JSON.parse(tree.readContent('package.json'));

    expect(packageJson.scripts.prepare).toBe('husky');
    // 1 install Husky (allowScripts) + 1 install pour audit-export
    expect(installTasks(runner).filter((task) => (task.options as { allowScripts?: boolean }).allowScripts).length).toBe(1);
  });
});
