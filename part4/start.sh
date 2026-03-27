#!/bin/bash

# Stop any existing listeners on the app ports
for port in 5000 8080; do
  pids=$(lsof -ti:"$port" 2>/dev/null)
  if [ -n "$pids" ]; then
    kill $pids 2>/dev/null
  fi
done

echo "Starting HBnB backend on http://localhost:5000 ..."
python3 run.py &
BACKEND_PID=$!

echo "Starting HBnB frontend on http://localhost:8080 ..."
python3 -m http.server 8080 --directory frontend &
FRONTEND_PID=$!

echo ""
echo "  Backend  → http://localhost:5000/api/v1/"
echo "  Frontend → http://localhost:8080/login.html"
echo ""
echo "Press Ctrl+C to stop both servers."

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; echo 'Servers stopped.'" SIGINT SIGTERM
wait
