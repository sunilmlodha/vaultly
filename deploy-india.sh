#!/bin/bash
# Deploy Tijori India — run this to deploy the India app
# Usage: ./deploy-india.sh

set -e

# Switch to Tijori project
cat > .vercel/project.json << 'EOF'
{"projectId":"prj_mqSNhzQTGWcUFYxTOe7yhGlJQpkm","orgId":"team_ZZfoaE1RGaYjApV4xObH5vO0","projectName":"tijori"}
EOF

echo "Deploying Tijori India → tijori-xi.vercel.app"
npx vercel --prod

# Always restore UK as default after India deploy
cat > .vercel/project.json << 'EOF'
{"projectId":"prj_FWW1oI5C2hO6DffAO0IAWm3ybPOq","orgId":"team_ZZfoaE1RGaYjApV4xObH5vO0","projectName":"vaultly"}
EOF

echo "UK project restored as default."
