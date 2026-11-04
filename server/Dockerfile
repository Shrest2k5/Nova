# Production Dockerfile for Node.js Express Backend

FROM node:22-alpine

# Install OpenSSL for Prisma
RUN apk add --no-cache openssl

WORKDIR /app

# Copy dependency manifests
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy Prisma schema and generate client
COPY prisma ./prisma
RUN npx prisma generate

# Copy source code and entrypoint
COPY src ./src
COPY entrypoint.sh ./entrypoint.sh

# Ensure uploads and logs directories exist
RUN mkdir -p uploads logs && chmod +x entrypoint.sh

EXPOSE 5000

ENV NODE_ENV=production

ENTRYPOINT ["./entrypoint.sh"]

