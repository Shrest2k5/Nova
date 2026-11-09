#!/bin/sh
set -e

if [ "$#" -gt 0 ]; then
  exec "$@"
fi
echo "Starting Novastat Backend API in production mode..."
exec node src/server.js

