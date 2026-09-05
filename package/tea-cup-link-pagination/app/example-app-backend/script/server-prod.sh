#!/usr/bin/env bash
set -e

PORT="${PORT:-3011}"
echo "Building frontend and backend for production..."
cd ../example-app && pnpm build
cd ../example-app-backend
stack build --fast
echo "Starting production backend server on port $PORT..."
stack exec example-app-backend-exe
