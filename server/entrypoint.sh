#!/bin/sh
set -e

echo "Running Prisma migrations..."
npx prisma migrate deploy

echo "Starting Novastat Backend Server in production mode..."
exec node src/server.js

