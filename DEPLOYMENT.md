# Deployment Guide

This guide covers building, running, and deploying the Novastat Full-Stack File Upload and Processing Management System.

---

## 1. Prerequisites

- **Docker:** v20.10+ (or Docker Desktop on Windows/macOS)
- **Docker Compose:** v2.0+ (built into `docker compose`)
- For local manual development (without Docker Compose):
  - **Node.js:** v18+ (tested on Node v20/v22/v24)
  - **npm:** v9+
  - **PostgreSQL:** v14+ instance

---

## 2. Quick Start with Docker Compose (Recommended)

The entire multi-container stack (PostgreSQL, Express Backend, and React Nginx Frontend) can be started with a single command.

### Step 1: Clone the repository and configure environment
```bash
git clone <repo-url> novastat
cd novastat

# Copy the example environment file
cp .env.example .env
```

Review `.env` and configure passwords and JWT secret keys if running in production.

### Step 2: Build and start the containers
```bash
docker compose up --build
```

### Step 3: Access the application
- **Frontend Dashboard:** [http://localhost:3000](http://localhost:3000)
- **Backend REST API:** [http://localhost:5000/api/v1](http://localhost:5000/api/v1)
- **Health Check:** [http://localhost:5000/api/v1/health](http://localhost:5000/api/v1/health)

To run the containers detached in the background:
```bash
docker compose up -d --build
```

To stop all services and preserve data volumes:
```bash
docker compose down
```

To stop all services and wipe persistent volumes:
```bash
docker compose down -v
```

---

## 3. Persistent Volumes

Docker Compose configures three named persistent volumes:
1. `novastat_postgres_data`: Persists the PostgreSQL database records, schema, and relations.
2. `novastat_uploads_data`: Persists all uploaded files on the host across container restarts.
3. `novastat_logs_data`: Persists Winston audit and error logs.

---

## 4. Manual Local Development (Without Docker)

### Step 1: Start PostgreSQL
Run a local PostgreSQL instance or start a temporary container:
```bash
docker run -d --name novastat-postgres \
  -e POSTGRES_USER=novastat \
  -e POSTGRES_PASSWORD=novastat_password \
  -e POSTGRES_DB=novastat_db \
  -p 5432:5432 \
  postgres:16-alpine
```

### Step 2: Configure and run the Backend
```bash
cd server
cp .env.example .env

# Install dependencies
npm install

# Run database migrations
npm run prisma:migrate:dev

# Run automated integration tests
npm test

# Start backend server
npm start
```
The backend starts on `http://localhost:5000`.

### Step 3: Run the Frontend
In a separate terminal:
```bash
cd client

# Install dependencies
npm install

# Start development server
npm run dev
```
The frontend starts on `http://localhost:5173` with automated proxying to the backend on port 5000.

---

## 5. Production Hardening & Recommendations

1. **Secrets Management:** Generate a strong random string (at least 32 characters) for `JWT_SECRET`. Store in AWS Secrets Manager, HashiCorp Vault, or environment secrets.
2. **Reverse Proxy & SSL/TLS:** In cloud environments (AWS ECS, Kubernetes, DigitalOcean), place an Application Load Balancer or Cloudflare in front of the application with TLS termination (HTTPS).
3. **Distributed Worker Architecture:** For multi-container scaling, substitute the in-process `ProcessingWorker` with a persistent Redis queue (such as BullMQ). The modular `ProcessingService` interface was built specifically to accommodate this without requiring any modifications to controllers or database repositories.
4. **Cloud Object Storage:** The storage layer is encapsulated behind `FileStorageService` (`file.storage.js`). To transition from local Docker volumes to Amazon S3 or Google Cloud Storage, implement an S3 storage provider matching the interface methods (`saveFile`, `getFileStream`, `deleteFile`, `fileExists`).

