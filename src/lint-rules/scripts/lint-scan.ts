export const LINT_SCAN_SCRIPT = `
#    Qualité de code sur les fichiers stagés uniquement (lint-staged)
#    → eslint --fix + prettier --write, avec re-staging automatique.
echo "🔍 Contrôle qualité (lint + format) des fichiers stagés..."
if ! npx lint-staged; then
    echo "❌ Commit annulé : erreurs de lint/format. Corrige-les avant de committer."
    exit 1
fi
echo "✅ Contrôle qualité réussi"
`;
