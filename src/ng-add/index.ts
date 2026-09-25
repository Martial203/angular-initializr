import { chain, noop, Rule, schematic, SchematicContext, Tree } from '@angular-devkit/schematics';

/**
 * Ordre d'exécution des schematics, indépendant de l'ordre de sélection.
 * Les schematics qui écrivent dans .husky/pre-commit (lint-rules, secret-scan, dependency-scan)
 * sont en dernier : l'ordre ici est l'ordre des contrôles dans le hook.
 */
export const AVAILABLE_FEATURES = [
  'translation',
  'e2e-encryption',
  'csp',
  'obfuscator',
  'lint-rules',
  'secret-scan',
  'dependency-scan'
] as const;

export type Feature = typeof AVAILABLE_FEATURES[number];

interface NgAddOptions {
  features?: Feature[] | string;
  [option: string]: unknown;
}

function normalizeFeatures(features: NgAddOptions['features']): string[] {
  if (!features) return [];
  return Array.isArray(features) ? features : features.split(',').map((f) => f.trim()).filter(Boolean);
}

export function ngAdd(_options: NgAddOptions): Rule {
  return (_tree: Tree, _context: SchematicContext) => {
    const { features, ...featureOptions } = _options;
    const selected = normalizeFeatures(features);

    const unknown = selected.filter((f) => !(AVAILABLE_FEATURES as readonly string[]).includes(f));
    if (unknown.length > 0) {
      _context.logger.warn(`Configurations inconnues ignorées : ${unknown.join(', ')}`);
    }

    const toRun = AVAILABLE_FEATURES.filter((f) => selected.includes(f));
    if (toRun.length === 0) {
      _context.logger.info('Aucune configuration sélectionnée, rien à faire.');
      return noop();
    }

    _context.logger.info(`Configurations sélectionnées : ${toRun.join(', ')}`);

    // Les options restantes (ex: --handshake-init-endpoint-url, --langs) sont transmises à chaque
    // schematic ; celles qu'il ne reçoit pas lui sont demandées via ses propres x-prompt.
    return chain(toRun.map((feature) => schematic(feature, featureOptions)));
  };
}
