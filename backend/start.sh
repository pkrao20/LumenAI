#!/bin/bash

PORT=5000

PID=$(lsof -t -i:$PORT)

if [ -n "$PID" ]; then
  echo "Killing process running on port $PORT (PID: $PID)"
  kill -9 $PID
else
  echo "No process running on port $PORT"
fi

echo "Starting NestJS app..."
npm run start:dev