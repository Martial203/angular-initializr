import { Tree } from '@angular-devkit/schematics';
import { SchematicTestRunner } from '@angular-devkit/schematics/testing';
import * as path from 'path';

const collectionPath = path.join(__dirname, '../collection.json');
const CONFIG_PATH = 'src/app/app.config.ts';

function createTree(configContent: string): Tree {
  const tree = Tree.empty();
  tree.create(CONFIG_PATH, configContent);
  return tree;
}

const BASE_CONFIG = `import { ApplicationConfig } from '@angular/core';
import { provideRouter } from '@angular/router';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes)
  ]
};
`;

describe('xss-sanitization', () => {
  let runner: SchematicTestRunner;

  beforeEach(() => {
    runner = new SchematicTestRunner('schematics', collectionPath);
  });

  it('adds provideHttpClient with the interceptor and its imports when absent', async () => {
    const tree = await runner.runSchematic('xss-sanitization', {}, createTree(BASE_CONFIG));

    const content = tree.readContent(CONFIG_PATH);
    expect(content).toContain('provideHttpClient(\n      withInterceptors([xssSanitizationInterceptor])\n    )');
    expect(content).toContain(`import { xssSanitizationInterceptor } from '@martiald/xss-sanitization';`);
    expect(content).toContain(`import { provideHttpClient, withInterceptors } from '@angular/common/http';`);
  });

  it('adds the interceptor first in an existing withInterceptors', async () => {
    const tree = await runner.runSchematic('xss-sanitization', {}, createTree(BASE_CONFIG.replace(
      'provideRouter(routes)',
      'provideRouter(routes),\n    provideHttpClient(withInterceptors([authInterceptor]))'
    )));

    const content = tree.readContent(CONFIG_PATH);
    expect(content.match(/provideHttpClient\(/g)?.length).toBe(1);
    expect(content).toContain('withInterceptors([xssSanitizationInterceptor, authInterceptor])');
  });

  it('adds withInterceptors to an existing provideHttpClient without it', async () => {
    const tree = await runner.runSchematic('xss-sanitization', {}, createTree(BASE_CONFIG.replace(
      'provideRouter(routes)',
      'provideRouter(routes),\n    provideHttpClient(withFetch())'
    )));

    expect(tree.readContent(CONFIG_PATH)).toContain('provideHttpClient(withFetch(), withInterceptors([xssSanitizationInterceptor]))');
  });

  it('is idempotent', async () => {
    const first = await runner.runSchematic('xss-sanitization', {}, createTree(BASE_CONFIG));
    const once = first.readContent(CONFIG_PATH);
    const second = await runner.runSchematic('xss-sanitization', {}, first);

    expect(second.readContent(CONFIG_PATH)).toBe(once);
  });

  it('keeps sanitization before encryption, whatever the execution order', async () => {
    const e2eOptions = { handshakeInitEndpointUrl: '/api/crypto/handshake/init' };

    const xssFirst = await runner.runSchematic('xss-sanitization', {}, createTree(BASE_CONFIG));
    const xssThenE2e = await runner.runSchematic('e2e-encryption', e2eOptions, xssFirst);

    const e2eFirst = await runner.runSchematic('e2e-encryption', e2eOptions, createTree(BASE_CONFIG));
    const e2eThenXss = await runner.runSchematic('xss-sanitization', {}, e2eFirst);

    for (const tree of [xssThenE2e, e2eThenXss]) {
      const content = tree.readContent(CONFIG_PATH);
      expect(content).toContain('withInterceptors([xssSanitizationInterceptor, encryptionInterceptor])');
      expect(content.match(/provideHttpClient\(/g)?.length).toBe(1);
    }
  });
});
