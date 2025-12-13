#!/bin/sh

echo "Starting InfoHub OSINT Professional Platform..."

# Start API server in background
echo "Starting API server on port 3001..."
cd /app/packages/api && node osint-api.js &

# Start frontend server in background  
echo "Starting frontend server on port 3002..."
cd /app/packages/frontend && node server.js &

# Start dashboard server
echo "Starting dashboard on port 3000..."
cd /app/packages/frontend && python3 -m http.server 3000 --directory . &

# Wait for services to start
sleep 5

echo "All services started successfully!"
echo "Dashboard: http://localhost:3000/dashboard.html"
echo "API: http://localhost:3001/api/health"
echo "Frontend: http://localhost:3002"

# Keep container running
wait