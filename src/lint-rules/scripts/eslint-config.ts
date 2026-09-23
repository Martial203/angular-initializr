export const ESLINT_CONFIG = `// @ts-check
const eslint = require('@eslint/js');
const { defineConfig } = require('eslint/config');
const tseslint = require('typescript-eslint');
const angular = require('angular-eslint');
const rxjsAngularX = require('eslint-plugin-rxjs-angular-x');
const rxjsX = require('eslint-plugin-rxjs-x');
const unusedImports = require('eslint-plugin-unused-imports');
const sonarjs = require('eslint-plugin-sonarjs');

module.exports = defineConfig([
  {
    files: ['**/*.ts'],
    extends: [
      eslint.configs.recommended,
      tseslint.configs.recommended,
      tseslint.configs.stylistic,
      angular.configs.tsRecommended,
      sonarjs.configs.recommended,
    ],
    processor: angular.processInlineTemplates,
    rules: {
      '@angular-eslint/directive-selector': 'off',
      '@angular-eslint/component-selector': [
        'error',
        {
          type: 'element',
          prefix: 'app',
          style: 'kebab-case',
        },
      ],

      // ── Règles à fort signal : bloquantes (error) ──
      '@typescript-eslint/no-explicit-any': 'error',
      // \`no-unused-vars\` est délégué au plugin \`unused-imports\` (bloc plus bas,
      // auto-fixable) → on ne le règle pas ici pour éviter les doublons.
      '@typescript-eslint/no-inferrable-types': 'off',
      '@typescript-eslint/no-empty-function': 'error',
      // Règles angular-eslint 22 verrouillées en \`error\` : OnPush + inject().
      '@angular-eslint/prefer-on-push-component-change-detection': 'error',
      '@angular-eslint/prefer-inject': 'error',
    },
  },
  {
    files: ['**/*.html'],
    extends: [angular.configs.templateRecommended, angular.configs.templateAccessibility],
    rules: {
      // Accessibilité verrouillée en \`error\` dès l'initialisation du projet :
      // le chantier coûte cher a posteriori, rien à rattraper si rien ne passe.
      '@angular-eslint/template/label-has-associated-control': 'error',
      '@angular-eslint/template/interactive-supports-focus': 'error',
      '@angular-eslint/template/click-events-have-key-events': 'error',
      '@angular-eslint/template/no-autofocus': 'error',
      '@angular-eslint/template/alt-text': 'error',
      // Le nouveau flot de contrôle (@if/@for) est la seule forme admise ici :
      // aucun *ngIf/*ngFor hérité à migrer sur un projet neuf.
      '@angular-eslint/template/prefer-control-flow': 'error',
    },
  },
  {
    // Règles RxJS (type-aware) + nettoyage des imports/variables inutilisés.
    // Les presets de base (eslint/tseslint/angular) sont déjà appliqués par le
    // premier bloc \`**/*.ts\` ; on n'ajoute ici que ce qui est spécifique.
    files: ['**/*.ts'],
    extends: [rxjsX.default.configs.recommended],
    languageOptions: {
      parserOptions: {
        projectService: true,
      },
    },
    plugins: {
      'rxjs-angular-x': rxjsAngularX.default,
      'unused-imports': unusedImports,
    },
    rules: {
      // ── Cycle de vie des souscriptions : takeUntilDestroyed obligatoire ──
      '@angular-eslint/no-implicit-take-until-destroyed': 'error',
      'rxjs-angular-x/prefer-takeuntil': ['error', { alias: ['takeUntilDestroyed'] }],
      'rxjs-x/no-async-subscribe': 'error',
      'rxjs-x/no-subscribe-in-pipe': 'error',
      'rxjs-x/no-unsafe-takeuntil': 'error',
      'rxjs-x/no-redundant-notify': 'error',
      'rxjs-x/no-ignored-notifier': 'error',
      'rxjs-x/no-nested-subscribe': 'error',
      'rxjs-x/no-create': 'error',
      'rxjs-x/no-ignored-replay-buffer': 'error',
      'rxjs-x/no-ignored-takewhile-value': 'off',
      'rxjs-x/no-implicit-any-catch': 'error',
      'rxjs-x/no-index': 'off',
      'rxjs-x/no-internal': 'off',
      'rxjs-x/no-sharereplay': ['error', { allowConfig: true }],
      'rxjs-x/no-subject-unsubscribe': 'error',
      'rxjs-x/no-topromise': 'error',
      'rxjs-x/no-unbound-methods': 'off',
      'rxjs-x/no-unsafe-subject-next': 'error',
      'rxjs-x/prefer-observer': 'error',
      'rxjs-x/prefer-root-operators': 'off',
      'rxjs-x/throw-error': 'error',

      // ── Imports / variables inutilisés (auto-fixables) ──
      // On délègue au plugin unused-imports → désactiver les règles de base
      // pour éviter les doublons de signalement.
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      'unused-imports/no-unused-imports': 'error',
      'unused-imports/no-unused-vars': [
        'error',
        {
          vars: 'all',
          varsIgnorePattern: '^_',
          args: 'after-used',
          argsIgnorePattern: '^_',
        },
      ],
    },
  },
]);
`;
