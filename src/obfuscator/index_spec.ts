import { Tree } from '@angular-devkit/schematics';
import { SchematicTestRunner } from '@angular-devkit/schematics/testing';
import * as path from 'path';

const collectionPath = path.join(__dirname, '../collection.json');
const CONFIG_PATH = 'javascript-obfuscator.config.json';

function createAppTree(): Tree {
  const tree = Tree.empty();
  tree.create('package.json', JSON.stringify({
    name: 'test-app',
    version: '0.0.0',
    scripts: { build: 'ng build' },
    dependencies: {},
    devDependencies: {}
  }, null, 2));
  tree.create('angular.json', JSON.stringify({
    version: 1,
    projects: { 'test-app': { root: '', sourceRoot: 'src', architect: {} } }
  }, null, 2));
  return tree;
}

describe('obfuscator', () => {
  let runner: SchematicTestRunner;

  beforeEach(() => {
    runner = new SchematicTestRunner('schematics', collectionPath);
  });

  it('adds javascript-obfuscator and the obfuscate / build:prod scripts', async () => {
    const tree = await runner.runSchematic('obfuscator', {}, createAppTree());

    const packageJson = JSON.parse(tree.readContent('package.json'));
    expect(packageJson.devDependencies['javascript-obfuscator']).toBe('^4.0.0');
    expect(packageJson.scripts.obfuscate)
      .toBe(`javascript-obfuscator ./dist/test-app --config ${CONFIG_PATH} --output ./dist/test-app`);
    expect(packageJson.scripts['build:prod']).toBe('npm run build -- --configuration production && npm run obfuscate');
  });

  it('creates the obfuscator config with the reserved strings', async () => {
    const tree = await runner.runSchematic('obfuscator', { reservedStrings: 'PLACEHOLDER, API_URL' }, createAppTree());

    const config = JSON.parse(tree.readContent(CONFIG_PATH));
    expect(config.reservedStrings).toEqual(['PLACEHOLDER', 'API_URL']);
    expect(config.selfDefending).toBeTrue();
    expect(config.stringArrayEncoding).toEqual(['base64']);
  });

  it('fails when package.json is missing', async () => {
    await expectAsync(runner.runSchematic('obfuscator', {}, Tree.empty()))
      .toBeRejectedWithError('Could not find package.json');
  });
});
