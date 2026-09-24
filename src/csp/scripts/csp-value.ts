export function buildCspValue(allowedOrigins: string): string {
  const extraOrigins = allowedOrigins
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  const connectSrc = ['\'self\'', ...extraOrigins].join(' ');

  const directives = [
    `default-src 'none'`,
    `script-src 'self'`,
    `style-src 'self' 'unsafe-inline'`,
    `img-src 'self' data:`,
    `font-src 'self'`,
    `frame-src 'self'`,
    `frame-ancestors 'none'`,
    `object-src 'none'`,
    `connect-src ${connectSrc}`,
    `base-uri 'self'`,
    `form-action 'self'`,
    `media-src 'none'`,
    `manifest-src 'self'`,
    `worker-src 'self'`,
    `upgrade-insecure-requests`
  ];

  return `${directives.join('; ')};`;
}
