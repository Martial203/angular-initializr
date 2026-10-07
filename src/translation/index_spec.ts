import { Tree } from '@angular-devkit/schematics';
import { SchematicTestRunner } from '@angular-devkit/schematics/testing';
import * as path from 'path';

const collectionPath = path.join(__dirname, '../collection.json');
const CONFIG_PATH = 'src/app/app.config.ts';

function createAppTree(): Tree {
  const tree = Tree.empty();
  tree.create(CONFIG_PATH,
`import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes)
  ]
};
`);
  return tree;
}

describe('translation', () => {
  let runner: SchematicTestRunner;

  beforeEach(() => {
    runner = new SchematicTestRunner('schematics', collectionPath);
  });

  it('adds the TranslatorService initializer and its imports to app.config.ts', async () => {
    const tree = await runner.runSchematic('translation', {}, createAppTree());

    const content = tree.readContent(CONFIG_PATH);
    expect(content).toContain('provideAppInitializer(() => {');
    expect(content).toContain('inject(TranslatorService)');
    expect(content).toContain('translateService.initLanguage()');
    expect(content).toContain(`import { TranslatorService } from '@martiald/translator';`);
    expect(content).toMatch(/import \{ inject, provideAppInitializer,\s*ApplicationConfig/);
  });

  it('schedules the package installs and the Transloco ng-add with the chosen options', async () => {
    await runner.runSchematic('translation', { langs: 'fr,en,de', ssr: true }, createAppTree());

    const installs = runner.tasks.filter((task) => task.name === 'node-package');
    expect(installs.map((task) => (task.options as { packageName?: string }).packageName))
      .toEqual(['@jsverse/transloco', '@martiald/translator']);

    const translocoTask = runner.tasks.find((task) => task.name === 'run-schematic');
    expect(translocoTask?.options).toEqual(jasmine.objectContaining({
      collection: '@jsverse/transloco',
      name: 'ng-add',
      options: { langs: 'fr,en,de', loader: 'Http', ssr: true }
    }));
  });

  it('fails when app.config.ts is missing', async () => {
    await expectAsync(runner.runSchematic('translation', {}, Tree.empty()))
      .toBeRejectedWithError(`Could not find ${CONFIG_PATH}`);
  });
});
