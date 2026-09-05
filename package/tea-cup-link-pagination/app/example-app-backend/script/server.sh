#!/usr/bin/env bash
set -e

PORT="${PORT:-3011}"
echo "Starting example-app-backend on port $PORT..."
stack exec example-app-backend-exe
