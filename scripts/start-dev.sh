#!/bin/bash
# start-dev.sh — Start all development services
set -a
source .env
set +a

echo "Starting API server on port 4000..."
pnpm tsx apps/api/src/main.ts &
API_PID=$!

echo "Starting Next.js frontend on port 3000..."
cd apps/web && pnpm dev &
WEB_PID=$!

echo ""
echo "🚀 Universal iDRAC Console running!"
echo "   Frontend: http://localhost:3000"
echo "   API:      http://localhost:4000/api"
echo ""
echo "Press Ctrl+C to stop all services"

trap "kill $API_PID $WEB_PID 2>/dev/null; exit" INT
wait
