import { Tree } from '@angular-devkit/schematics';
import { SchematicTestRunner } from '@angular-devkit/schematics/testing';
import * as path from 'path';

const collectionPath = path.join(__dirname, '../collection.json');
const CONFIG_PATH = 'src/app/app.config.ts';
const HANDSHAKE_URL = 'https://api.example.com/crypto/handshake/init';

function createTree(configContent: string): Tree {
  const tree = Tree.empty();
  tree.create(CONFIG_PATH, configContent);
  return tree;
}

describe('e2e-encryption', () => {
  const runner = new SchematicTestRunner('schematics', collectionPath);

  it('adds the E2E providers and imports to app.config.ts', async () => {
    const tree = await runner.runSchematic('e2e-encryption', { handshakeInitEndpointUrl: HANDSHAKE_URL }, createTree(
`import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes)
  ]
};
`));

    const content = tree.readContent(CONFIG_PATH);
    expect(content).toContain(`handshakeInitEndpointUrl: '${HANDSHAKE_URL}'`);
    expect(content).toContain('inject(CryptoService)');
    expect(content).toContain('withInterceptors([encryptionInterceptor])');
    expect(content).toContain(`import { provideE2EEncryption, CryptoService, encryptionInterceptor } from '@martiald/e2e-encryption';`);
    expect(content).toContain(`import { catchError, throwError } from 'rxjs';`);
    expect(content).toContain(`import { HttpErrorResponse, withInterceptors, provideHttpClient } from '@angular/common/http';`);
    expect(content).toMatch(/import \{ inject, provideAppInitializer,\s*ApplicationConfig/);
  });

  it('reuses an existing provideHttpClient instead of duplicating it', async () => {
    const tree = await runner.runSchematic('e2e-encryption', { handshakeInitEndpointUrl: HANDSHAKE_URL }, createTree(
`import { ApplicationConfig } from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';

export const appConfig: ApplicationConfig = {
  providers: [
    provideHttpClient(withInterceptors([authInterceptor])),
  ]
};
`));

    const content = tree.readContent(CONFIG_PATH);
    expect(content.match(/provideHttpClient\(/g)?.length).toBe(1);
    expect(content).toContain('withInterceptors([authInterceptor, encryptionInterceptor])');
    expect(content).toContain('provideE2EEncryption({');
  });

  it('is idempotent', async () => {
    const first = await runner.runSchematic('e2e-encryption', { handshakeInitEndpointUrl: HANDSHAKE_URL }, createTree(
`import { ApplicationConfig } from '@angular/core';

export const appConfig: ApplicationConfig = {
  providers: []
};
`));
    const once = first.readContent(CONFIG_PATH);
    const second = await runner.runSchematic('e2e-encryption', { handshakeInitEndpointUrl: HANDSHAKE_URL }, first);

    expect(second.readContent(CONFIG_PATH)).toBe(once);
  });
});
