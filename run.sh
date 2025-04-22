#!/bin/bash

# Display header
echo "=========================================="
echo "   Starting Python Library Explorer WebApp"
echo "=========================================="

echo "Starting the backend on port 5000..."
cd /workspaces/Libview/backend
python run.py &
BACKEND_PID=$!

echo "Backend started with PID $BACKEND_PID"
echo "Waiting 3 seconds for backend to initialize..."
sleep 3

echo "Starting the frontend on port 3000..."
cd /workspaces/Libview/frontend
npm start

# Cleanup when the frontend is terminated
kill $BACKEND_PID
echo "Backend process terminated."