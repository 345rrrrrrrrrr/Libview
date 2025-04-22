#!/bin/bash

# Display header
echo "=========================================="
echo "   Starting Python Library Explorer WebApp"
echo "=========================================="

# Check if tmux is installed
if ! command -v tmux &> /dev/null; then
    echo "tmux is not installed. Please install it with:"
    echo "    sudo apt-get install tmux"
    exit 1
fi

# Kill any existing tmux session
tmux kill-session -t libview 2>/dev/null

# Create a new tmux session
tmux new-session -d -s libview

# Split the window
tmux split-window -h -t libview

# Start the backend in the left pane
tmux send-keys -t libview:0.0 "cd /workspaces/Libview/backend && python run.py" C-m

# Start the frontend in the right pane
tmux send-keys -t libview:0.1 "cd /workspaces/Libview/frontend && npm start" C-m

# Attach to the session
echo "Starting services... (Press Ctrl+C to stop)"
echo "Backend will run at: http://localhost:5000"
echo "Frontend will run at: http://localhost:3000"
echo ""

tmux attach-session -t libview