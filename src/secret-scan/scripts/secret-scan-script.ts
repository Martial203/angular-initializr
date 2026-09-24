export const SCAN_SCRIPT = `
# 1. Détection de secrets dans les changements stagés (gitleaks)
echo "🔍 Recherche de secrets dans les fichiers stagés..."
if ! command -v gitleaks >/dev/null 2>&1; then
    echo "❌ gitleaks n'est pas installé — impossible de scanner les secrets."
    echo "   Installe-le : https://github.com/gitleaks/gitleaks#installing"
    exit 1
fi
gitleaks git --staged --redact --verbose || exit 1
echo "✅ Aucun secret détecté"
`;


export const SCAN_CONFIG = String.raw`
[extend]
useDefault = true

# 1. PCI-DSS Compliance: Credit Card Numbers (PAN)
[[rules]]
    id = "pci-dss-pan"
    description = "Potential credit card number detected (PCI-DSS Violation)"
    regex = '''\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|6(?:011|5[0-9][0-9])[0-9]{12}|3[0-9]{13}|3(?:0[0-5]|[0-9])[0-9]{11}|(?:2131|1800|35\d{3})\d{11})\b'''
    keywords = ["card", "visa", "mastercard", "amex", "pan"]

# 2. High Entropy Strings: Catching strong passwords, secrets, salts, and keys
[[rules]]
    id = "generic-high-entropy-banking"
    description = "High entropy string detected near sensitive banking keywords"
    regex = '''['"‘“]([a-zA-Z0-9/+=\-_]{40,})['"’”]'''
    keywords = ["secret", "password", "passwd", "pwd", "token", "api", "key", "salt", "cipher", "swift", "iban", "private"]
    # Modern Gitleaks syntax for entropy: defined directly on the rule [1, 2]
    secretGroup = 1
    entropy = 4.3

# 3. Database Credentials in Connection Strings
[[rules]]
    id = "db-connection-string"
    description = "Database connection string containing explicit credentials"
    regex = '''(?i)(sql|postgres|mysql|oracle|mongodb|redis):\/\/[a-z0-9_-]+:[^@]+@[a-z0-9._-]+'''
    keywords = ["://"]

# 4. Payment Gateway Access Tokens
[[rules]]
    id = "payment-gateway-token"
    description = "API key or access token from a payment gateway provider"
    regex = '''(?i)(sk_live_|pk_live_|client_secret|api_key|auth_token)[a-zA-Z0-9_-]{20,50}'''
    keywords = ["sk_live", "pk_live", "client_secret", "adyen", "stripe", "paypal"]

[allowlist]
    paths = [
        '''package-lock\.json''',
        '''yarn\.lock''',
        '''pnpm-lock\.yaml''',        
        '''\.(woff|woff2|ttf|eot|otf)$'''
    ]
`;