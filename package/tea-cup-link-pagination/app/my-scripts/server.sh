#!/usr/bin/env bash

SESSION_NAME="tea-cup-example"

# Get the root directory of the project
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/.." && pwd )"

cd "$PROJECT_ROOT"

# Kill existing session if it exists
tmux kill-session -t "$SESSION_NAME" 2>/dev/null

# Start new session, detached (-d)
tmux new-session -d -s "$SESSION_NAME" -n "services"
tmux set-option -t "$SESSION_NAME" mouse on

# 1. Top Left: Backend API
tmux send-keys -t "$SESSION_NAME" "make run-backend" C-m

# 2. Top Right: Frontend Web
tmux split-window -h -t "$SESSION_NAME"
tmux send-keys -t "$SESSION_NAME" "cd example-app && pnpm dev" C-m

# 3. Enforce grid layout
tmux select-layout -t "$SESSION_NAME" tiled

# Attach to the session
tmux attach-session -t "$SESSION_NAME"
