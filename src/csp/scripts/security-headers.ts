export function buildSecurityHeaders(cspValue: string, permissionsPolicyValue: string): string {
  return `# --- Anti-Clickjacking Protection ---
add_header X-Frame-Options "DENY" always;

# --- MIME Sniffing & XSS Protection ---
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "0" always; # Desactive au profit de la CSP (evite les vecteurs de contournement d'audit)

# --- Referrer Policy ---
add_header Referrer-Policy "strict-origin-when-cross-origin" always;

# --- HTTP Strict Transport Security (HSTS) ---
# Pas de directive "preload" : inscription quasi irreversible sur une liste embarquee
# dans les navigateurs. A activer consciemment plus tard si besoin, pas par defaut.
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

# --- Hardware & Browser Feature Permissions ---
add_header Permissions-Policy "${permissionsPolicyValue}" always;

# --- Cross-Origin Process Isolation ---
add_header Cross-Origin-Opener-Policy "same-origin" always;
add_header Cross-Origin-Resource-Policy "same-origin" always;

# --- Content Security Policy (CSP) ---
add_header Content-Security-Policy "${cspValue}" always;
`;
}
