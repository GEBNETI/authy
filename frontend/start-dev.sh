#!/bin/bash

echo "Starting Authy Frontend..."

# Kill any existing processes
pkill -f vite 2>/dev/null || true

# Wait a moment
sleep 1

# Start Vite with specific configuration
npx vite --host 0.0.0.0 --port 8090 --force