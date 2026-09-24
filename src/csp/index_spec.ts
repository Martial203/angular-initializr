import { Tree } from '@angular-devkit/schematics';
import { SchematicTestRunner } from '@angular-devkit/schematics/testing';
import * as path from 'path';
import { buildCspValue } from './scripts/csp-value';
import { buildPermissionsPolicyValue } from './scripts/permissions-policy';

const collectionPath = path.join(__dirname, '../collection.json');

const INDEX_HTML = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>SampleApp</title>
  <base href="/">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <link rel="icon" type="image/x-icon" href="favicon.ico">
</head>
<body>
  <app-root></app-root>
</body>
</html>
`;

function createAppTree(): Tree {
  const tree = Tree.empty();
  tree.create('src/index.html', INDEX_HTML);
  tree.create('angular.json', JSON.stringify({
    version: 1,
    projects: {
      'sample-app': {
        projectType: 'application',
        root: '',
        sourceRoot: 'src',
        architect: {
          build: {
            builder: '@angular/build:application',
            options: {
              browser: 'src/main.ts'
            },
            configurations: {
              production: {}
            }
          }
        }
      }
    }
  }, null, 2));
  return tree;
}

describe('csp', () => {
  it('creates security-headers.conf with a CSP built from allowedOrigins', async () => {
    const runner = new SchematicTestRunner('schematics', collectionPath);
    const tree = await runner.runSchematic('csp', { allowedOrigins: 'https://api.example.com' }, createAppTree());

    const content = tree.readContent('security-headers.conf');
    expect(content).toContain(buildCspValue('https://api.example.com'));
    expect(content).toContain('X-Frame-Options "DENY"');
    expect(content).toContain('Strict-Transport-Security "max-age=31536000; includeSubDomains" always;');
  });

  it('creates nginx.conf', async () => {
    const runner = new SchematicTestRunner('schematics', collectionPath);
    const tree = await runner.runSchematic('csp', {}, createAppTree());

    expect(tree.exists('nginx.conf')).toBe(true);
    expect(tree.readContent('nginx.conf')).toContain('include /etc/nginx/security-headers.conf;');
  });

  it('clones index.html into index.prod.html without a CSP meta tag', async () => {
    const runner = new SchematicTestRunner('schematics', collectionPath);
    const tree = await runner.runSchematic('csp', { allowedOrigins: 'https://api.example.com' }, createAppTree());

    expect(tree.readContent('src/index.prod.html')).toBe(INDEX_HTML);
    expect(tree.readContent('src/index.prod.html')).not.toContain('Content-Security-Policy');
  });

  it('injects the CSP meta tag into index.html', async () => {
    const runner = new SchematicTestRunner('schematics', collectionPath);
    const tree = await runner.runSchematic('csp', { allowedOrigins: 'https://api.example.com' }, createAppTree());

    const indexContent = tree.readContent('src/index.html');
    expect(indexContent).toContain(`<meta http-equiv="Content-Security-Policy" content="${buildCspValue('https://api.example.com')}">`);
    // La balise doit rester juste après <head>, avant le reste du contenu original.
    expect(indexContent.indexOf('http-equiv="Content-Security-Policy"')).toBeLessThan(indexContent.indexOf('<title>'));
  });

  it('does not duplicate the CSP meta tag on a second run', async () => {
    const runner = new SchematicTestRunner('schematics', collectionPath);
    const appTree = createAppTree();

    const tree = await runner.runSchematic('csp', { allowedOrigins: 'https://api.example.com' }, appTree);
    const treeAfterSecondRun = await runner.runSchematic('csp', { allowedOrigins: 'https://api.example.com' }, tree);

    const matches = treeAfterSecondRun.readContent('src/index.html').match(/http-equiv="Content-Security-Policy"/g) || [];
    expect(matches.length).toBe(1);
  });

  it('overwrites the CSP meta tag of index.html with the new configuration on a second run', async () => {
    const runner = new SchematicTestRunner('schematics', collectionPath);

    const tree = await runner.runSchematic('csp', { allowedOrigins: 'https://old.example.com' }, createAppTree());
    const treeAfterSecondRun = await runner.runSchematic('csp', { allowedOrigins: 'https://new.example.com' }, tree);

    const indexContent = treeAfterSecondRun.readContent('src/index.html');
    expect(indexContent).toContain(`content="${buildCspValue('https://new.example.com')}"`);
    expect(indexContent).not.toContain('old.example.com');
  });

  it('never puts a CSP in index.prod.html, even after a second run', async () => {
    const runner = new SchematicTestRunner('schematics', collectionPath);

    const tree = await runner.runSchematic('csp', { allowedOrigins: 'https://api.example.com' }, createAppTree());
    const treeAfterSecondRun = await runner.runSchematic('csp', { allowedOrigins: 'https://api.example.com' }, tree);

    expect(treeAfterSecondRun.readContent('src/index.prod.html')).toBe(INDEX_HTML);
  });

  it('wires src/index.prod.html as the production index output', async () => {
    const runner = new SchematicTestRunner('schematics', collectionPath);
    const tree = await runner.runSchematic('csp', {}, createAppTree());

    const angularJson = JSON.parse(tree.readContent('angular.json'));
    const buildTarget = angularJson.projects['sample-app'].architect.build;

    expect(buildTarget.options.index).toEqual({ input: 'src/index.html', output: 'index.html' });
    expect(buildTarget.configurations.production.index).toEqual({ input: 'src/index.prod.html', output: 'index.html' });
  });

  it('creates a Dockerfile copying nginx.conf, security-headers.conf and the build output', async () => {
    const runner = new SchematicTestRunner('schematics', collectionPath);
    const tree = await runner.runSchematic('csp', {}, createAppTree());

    const dockerfile = tree.readContent('Dockerfile');
    expect(dockerfile).toContain('COPY nginx.conf /etc/nginx/nginx.conf');
    expect(dockerfile).toContain('COPY security-headers.conf /etc/nginx/security-headers.conf');
    expect(dockerfile).toContain('COPY --from=build /app/dist/sample-app/browser /usr/share/nginx/html');
  });

  it('denies all hardware features by default', async () => {
    const runner = new SchematicTestRunner('schematics', collectionPath);
    const tree = await runner.runSchematic('csp', {}, createAppTree());

    const content = tree.readContent('security-headers.conf');
    expect(content).toContain(`Permissions-Policy "${buildPermissionsPolicyValue([])}"`);
    expect(content).toContain('camera=(), microphone=(), payment=(), usb=()');
  });

  it('allows only the selected hardware features', async () => {
    const runner = new SchematicTestRunner('schematics', collectionPath);
    const tree = await runner.runSchematic('csp', { hardwareFeatures: ['camera', 'usb'] }, createAppTree());

    const content = tree.readContent('security-headers.conf');
    expect(content).toContain(`Permissions-Policy "${buildPermissionsPolicyValue(['camera', 'usb'])}"`);
    expect(content).toContain('camera=(self), microphone=(), payment=(), usb=(self)');
  });
});
