import { chain, Rule, SchematicContext, Tree } from '@angular-devkit/schematics';
import { buildCspValue } from './scripts/csp-value';
import { buildSecurityHeaders } from './scripts/security-headers';
import { buildPermissionsPolicyValue } from './scripts/permissions-policy';
import { NGINX_CONF } from './scripts/nginx-conf';
import { buildDockerfile } from './scripts/dockerfile';

interface CspOptions {
  allowedOrigins?: string;
  hardwareFeatures?: string[];
}

const SECURITY_HEADERS_PATH = 'security-headers.conf';
const NGINX_CONF_PATH = 'nginx.conf';
const DOCKERFILE_PATH = 'Dockerfile';
const INDEX_PATH = 'src/index.html';
const INDEX_PROD_PATH = 'src/index.prod.html';
const CSP_META_REGEX = /[ \t]*<meta\s+http-equiv=["']Content-Security-Policy["'][^>]*>[ \t]*\r?\n?/gi;

function writeNginxFiles(_options: CspOptions): Rule {
  return (tree: Tree, _context: SchematicContext) => {

    const cspValue = buildCspValue(_options.allowedOrigins || '');
    const permissionsPolicyValue = buildPermissionsPolicyValue(_options.hardwareFeatures || []);
    const securityHeaders = buildSecurityHeaders(cspValue, permissionsPolicyValue);

    if (tree.exists(SECURITY_HEADERS_PATH)) {
      tree.overwrite(SECURITY_HEADERS_PATH, securityHeaders);
    } else {
      tree.create(SECURITY_HEADERS_PATH, securityHeaders);
    }

    if (tree.exists(NGINX_CONF_PATH)) {
      tree.overwrite(NGINX_CONF_PATH, NGINX_CONF);
    } else {
      tree.create(NGINX_CONF_PATH, NGINX_CONF);
    }

    return tree;
  };
}

function writeDockerfile(_options: CspOptions): Rule {
  return (tree: Tree, _context: SchematicContext) => {

    // Le builder `application` sort dans dist/<projet>/browser ; joker si le nom n'est pas déterminable.
    let projectName = '*';
    const angularJsonBuffer = tree.read('angular.json');
    if (angularJsonBuffer) {
      const projectNames = Object.keys(JSON.parse(angularJsonBuffer.toString('utf-8')).projects || {});
      if (projectNames.length === 1) {
        projectName = projectNames[0];
      }
    }

    const dockerfile = buildDockerfile(`dist/${projectName}/browser`);

    if (tree.exists(DOCKERFILE_PATH)) {
      tree.overwrite(DOCKERFILE_PATH, dockerfile);
    } else {
      tree.create(DOCKERFILE_PATH, dockerfile);
    }

    return tree;
  };
}

function setupDualIndexHtml(_options: CspOptions): Rule {
  return (tree: Tree, _context: SchematicContext) => {

    if (!tree.exists(INDEX_PATH)) {
      return tree;
    }

    const cleanIndexContent = tree.read(INDEX_PATH)!.toString('utf-8').replace(CSP_META_REGEX, '');

    // index.prod.html : jamais de balise CSP (les headers HTTP nginx s'en chargent en prod).
    if (tree.exists(INDEX_PROD_PATH)) {
      tree.overwrite(INDEX_PROD_PATH, cleanIndexContent);
    } else {
      tree.create(INDEX_PROD_PATH, cleanIndexContent);
    }

    // index.html (dev / ng serve) : la CSP en <meta> est toujours régénérée depuis la config courante.
    // Note : une CSP en <meta> ignore silencieusement frame-ancestors (spec CSP), sans
    // impact ici puisque ce fichier ne sert jamais en prod.
    const cspValue = buildCspValue(_options.allowedOrigins || '');
    const metaTag = `  <meta http-equiv="Content-Security-Policy" content="${cspValue}">\n`;
    const updatedIndexContent = cleanIndexContent.replace(
      /<head(\s[^>]*)?>(?:[ \t]*\r?\n)?/i,
      (match) => `${match}${metaTag}`
    );
    tree.overwrite(INDEX_PATH, updatedIndexContent);

    return tree;
  };
}

function wireProductionIndex(_options: CspOptions): Rule {
  return (tree: Tree, _context: SchematicContext) => {

    const angularJsonBuffer = tree.read('angular.json');
    if (!angularJsonBuffer) {
      return tree;
    }

    const angularJson = JSON.parse(angularJsonBuffer.toString('utf-8'));
    const projectNames = Object.keys(angularJson.projects || {});

    if (projectNames.length !== 1) {
      return tree;
    }

    const project = angularJson.projects[projectNames[0]];
    const buildTarget = project.architect && project.architect.build;

    if (!buildTarget) {
      return tree;
    }

    buildTarget.options = buildTarget.options || {};
    if (!buildTarget.options.index) {
      buildTarget.options.index = { input: INDEX_PATH, output: 'index.html' };
    }

    buildTarget.configurations = buildTarget.configurations || {};
    buildTarget.configurations.production = buildTarget.configurations.production || {};
    buildTarget.configurations.production.index = { input: INDEX_PROD_PATH, output: 'index.html' };

    tree.overwrite('angular.json', JSON.stringify(angularJson, null, 2));

    return tree;
  };
}

export function csp(_options: CspOptions): Rule {
  return chain([
    writeNginxFiles(_options),
    writeDockerfile(_options),
    setupDualIndexHtml(_options),
    wireProductionIndex(_options)
  ]);
}
