import { Tree } from '@angular-devkit/schematics';
import { SchematicTestRunner } from '@angular-devkit/schematics/testing';
import * as path from 'path';
import { ESLINT_CONFIG } from './scripts/eslint-config';
import { LINT_SCAN_SCRIPT } from './scripts/lint-scan';

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

function createAngularAppTree(): Tree {
  const tree = createAppTree();
  tree.create('angular.json', JSON.stringify({
    version: 1,
    projects: {
      'test-app': {
        projectType: 'application',
        root: '',
        sourceRoot: 'src',
        architect: {
          build: { builder: '@angular/build:application' }
        }
      }
    }
  }, null, 2));
  return tree;
}

describe('lint-rules', () => {
  it('adds lint/format scripts and lint-staged config to package.json', async () => {
    const runner = new SchematicTestRunner('schematics', collectionPath);
    const tree = await runner.runSchematic('lint-rules', {}, createAppTree());

    const packageJson = JSON.parse(tree.readContent('package.json'));
    expect(packageJson.scripts.lint).toBe('ng lint');
    expect(packageJson.scripts['lint:fix']).toBe('ng lint --fix');
    expect(packageJson.scripts.format).toBe('prettier --write "src/**/*.{ts,html,scss,css,json}"');
    expect(packageJson.scripts['format:check']).toBe('prettier --check "src/**/*.{ts,html,scss,css,json}"');
    expect(packageJson['lint-staged']).toEqual({
      '*.{ts,html}': 'eslint --fix --max-warnings=0',
      '*.{ts,html,scss,css,json}': 'prettier --write'
    });
  });

  it('creates eslint.config.js with the project rules', async () => {
    const runner = new SchematicTestRunner('schematics', collectionPath);
    const tree = await runner.runSchematic('lint-rules', {}, createAppTree());

    expect(tree.readContent('eslint.config.js')).toBe(ESLINT_CONFIG);
  });

  it('creates .husky/pre-commit with the lint-staged scan script', async () => {
    const runner = new SchematicTestRunner('schematics', collectionPath);
    const tree = await runner.runSchematic('lint-rules', {}, createAppTree());

    expect(tree.readContent('.husky/pre-commit')).toBe(`${LINT_SCAN_SCRIPT.trim()}\n\n`);
  });

  it('appends the lint-staged script to an existing pre-commit hook without duplicating it', async () => {
    const runner = new SchematicTestRunner('schematics', collectionPath);
    const appTree = createAppTree();
    appTree.create('.husky/pre-commit', 'gitleaks detect -v\n');

    const tree = await runner.runSchematic('lint-rules', {}, appTree);

    expect(tree.readContent('.husky/pre-commit')).toBe(`gitleaks detect -v\n${LINT_SCAN_SCRIPT.trim()}\n\n`);

    const treeAfterSecondRun = await runner.runSchematic('lint-rules', {}, tree);
    expect(treeAfterSecondRun.readContent('.husky/pre-commit')).toBe(`gitleaks detect -v\n${LINT_SCAN_SCRIPT.trim()}\n\n`);
  });

  it('registers the lint architect target on angular.json so ng-add does not regenerate eslint.config.js', async () => {
    const runner = new SchematicTestRunner('schematics', collectionPath);
    const tree = await runner.runSchematic('lint-rules', {}, createAngularAppTree());

    const angularJson = JSON.parse(tree.readContent('angular.json'));
    expect(angularJson.projects['test-app'].architect.lint).toEqual({
      builder: '@angular-eslint/builder:lint',
      options: {
        lintFilePatterns: ['src/**/*.ts', 'src/**/*.html']
      }
    });
  });

  it('does not overwrite an already-registered lint target', async () => {
    const runner = new SchematicTestRunner('schematics', collectionPath);
    const appTree = createAngularAppTree();
    const angularJson = JSON.parse(appTree.read('angular.json')!.toString('utf-8'));
    angularJson.projects['test-app'].architect.lint = { builder: 'custom:lint', options: {} };
    appTree.overwrite('angular.json', JSON.stringify(angularJson, null, 2));

    const tree = await runner.runSchematic('lint-rules', {}, appTree);

    const resultAngularJson = JSON.parse(tree.readContent('angular.json'));
    expect(resultAngularJson.projects['test-app'].architect.lint).toEqual({ builder: 'custom:lint', options: {} });
  });
});
