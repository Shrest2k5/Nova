# Novastat

Novastat is a React, Express, Prisma and PostgreSQL document application with asynchronous, extraction-only processing.

## Processing architecture

Uploads are stored on disk and inserted into the persistent BullMQ `fileProcessing` queue in Redis. The API returns immediately. A separate worker (default concurrency: 2) extracts complete raw text with pdf-parse, Mammoth, ExcelJS/XLSX, Node filesystem reads, and Tesseract.js OCR for scanned PDFs and images, then commits the text to PostgreSQL. No document content is sent to an AI provider; summaries and semantic analysis are not part of the system.

## Run with Docker

```bash
docker compose up --build
```

This starts PostgreSQL, Redis with AOF persistence, the Express API, the independent worker, and the frontend.

## Local development

Start PostgreSQL and Redis, copy `.env.example` to `.env`, then run:

```bash
npm run install:all
npm --prefix server run prisma:migrate:dev
npm run dev:server
npm --prefix server run worker
npm run dev:client
```

Required server settings include `DATABASE_URL`, `JWT_SECRET`, `REDIS_URL`, `UPLOAD_DIR`, and `MAX_FILE_SIZE` (50 MB by default). `WORKER_CONCURRENCY` defaults to 2.

## API

All file endpoints require authentication and enforce owner/admin access:

- `POST /api/v1/files/upload`
- `GET /api/v1/files`
- `GET /api/v1/files/:id/status`
- `GET /api/v1/files/:id/text`
- `POST /api/v1/files/:id/reprocess`
- `GET /api/v1/files/:id/download`

The Bull Board dashboard is available at `/admin/queues` to authenticated ADMIN users.

## Verification

Run `npm test` for the available parser tests and `npm run build:client` for the frontend build. Integration tests require PostgreSQL and Redis to be running and the Prisma migrations to be applied.
