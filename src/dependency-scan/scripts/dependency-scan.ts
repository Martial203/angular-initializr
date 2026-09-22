export const DEPENDENCY_SCAN = `
echo "🔍 Auditing dependencies to find vulnerabilities..."
if ! npm audit --omit=dev --audit-level=low --json > /dev/null; then
    echo "❌ Commit aborted: Severe vulnerabilities found in PRODUCTION packages! Fix them before committing."
    
    npm audit --omit=dev --audit-level=low --json | npx audit-export --path ./audit-report.html --title "Production Audit Report"
    
    # 3. Ouverture automatique compatible Windows, Mac et Linux
    if command -v start > /dev/null; then start audit-report.html
    elif command -v open > /dev/null; then open audit-report.html
    elif command -v xdg-open > /dev/null; then xdg-open audit-report.html; fi
    
    exit 1
fi
echo "✅ Dependencies audit checks success"
`;