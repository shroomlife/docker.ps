#!/bin/sh

set -e # Exit immediately if a command exits with a non-zero status

echo "🚀 Prisma deploy is starting..."
bunx prisma migrate deploy
echo "✅ Prisma deploy is done!"

echo "💻 Server is starting..."
exec bun .output/server/index.mjs
