#!/bin/bash
# Deploy UK Vaultly — run this to deploy the UK app
# Usage: ./deploy-uk.sh

set -e

# Always restore UK project before deploying
cat > .vercel/project.json << 'EOF'
{"projectId":"prj_FWW1oI5C2hO6DffAO0IAWm3ybPOq","orgId":"team_ZZfoaE1RGaYjApV4xObH5vO0","projectName":"vaultly"}
EOF

echo "Deploying Vaultly UK → vaultly-mu.vercel.app"
npx vercel --prod
