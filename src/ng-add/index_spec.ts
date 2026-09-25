import { Tree } from '@angular-devkit/schematics';
import { SchematicTestRunner } from '@angular-devkit/schematics/testing';
import * as path from 'path';

const collectionPath = path.join(__dirname, '../collection.json');

function createTree(): Tree {
  const tree = Tree.empty();
  tree.create('package.json', JSON.stringify({ name: 'app', scripts: {}, devDependencies: {} }));
  return tree;
}

describe('ng-add', () => {
  const runner = new SchematicTestRunner('schematics', collectionPath);

  it('does nothing when no feature is selected', async () => {
    const tree = await runner.runSchematic('ng-add', { features: [] }, createTree());

    expect(tree.files).toEqual(['/package.json']);
  });

  it('runs only the selected schematics, in the collection order', async () => {
    const tree = await runner.runSchematic('ng-add', { features: ['dependency-scan', 'secret-scan'] }, createTree());

    const hook = tree.readContent('.husky/pre-commit');
    expect(hook).toContain('gitleaks');
    expect(hook).toContain('npm audit');
    expect(hook.indexOf('gitleaks')).toBeLessThan(hook.indexOf('npm audit'));
    expect(tree.exists('.gitleaks.toml')).toBeTrue();
    expect(tree.exists('nginx.conf')).toBeFalse();
  });

  it('forwards feature options to the sub-schematics', async () => {
    const tree = createTree();
    tree.create('src/app/app.config.ts', `export const appConfig = {\n  providers: []\n};\n`);

    const result = await runner.runSchematic('ng-add', {
      features: ['e2e-encryption'],
      handshakeInitEndpointUrl: '/api/crypto/handshake/init'
    }, tree);

    expect(result.readContent('src/app/app.config.ts')).toContain(`handshakeInitEndpointUrl: '/api/crypto/handshake/init'`);
  });
});
