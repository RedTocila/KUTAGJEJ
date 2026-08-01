#!/usr/bin/env bash
# Keeps the Express API on :5001 alive across crashes (local dev only).
set -u
cd "$(dirname "$0")/.."
mkdir -p logs
PORT="${PORT:-5001}"
export PORT

while true; do
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] starting API on :${PORT}" >> logs/api.dev.log
  node server.js >> logs/api.dev.log 2>&1
  code=$?
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] API exited with ${code}; restarting in 1s" >> logs/api.dev.log
  sleep 1
done
