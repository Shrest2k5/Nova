# Novastat Backend API

Enterprise-grade full-stack file upload and processing management system backend built with Node.js, Express.js, Prisma ORM, and PostgreSQL.

## 1. Architecture Overview

The backend follows a layered Clean Architecture design with strict separation of concerns:

- **Routes (`src/routes/`, `src/modules/*/`):** Define API endpoints, request validation bindings, and route guards.
- **Controllers (`src/modules/*/*.controller.js`):** Parse HTTP requests, delegate work to services, and format standardized responses (`ApiResponse`).
- **Services (`src/modules/*/*.service.js`):** Encapsulate business logic, orchestration, and domain rules.
- **Repositories (`src/modules/*/*.repository.js`):** Isolate all Prisma ORM database interactions and queries.
- **Storage Abstraction (`src/modules/files/file.storage.js`):** Decouples file persistence so storage can be swapped between local disk (Docker volumes) and cloud providers (S3/GCS) without altering controllers.
- **Background Worker (`src/modules/processing/`):** Asynchronous processing engine executing multi-stage simulated workloads (~25s) with live status updates.
- **Middleware (`src/middleware/`):** JWT authentication, Role-Based Access Control (USER/ADMIN), Multer file handling, structured Winston request logging, and centralized error handling.

## 2. Directory Structure

```
server/
├── prisma/
│   ├── schema.prisma            # PostgreSQL models, enums & relations
│   └── migrations/              # Prisma SQL migration history
├── src/
│   ├── config/
│   │   ├── env.js               # Zod-validated environment config
│   │   ├── database.js          # Prisma Client instance & BigInt serialization
│   │   └── logger.js            # Winston structured logger (Console & File)
│   ├── middleware/
│   │   ├── auth.middleware.js   # JWT verification & req.user attachment
│   │   ├── error.middleware.js  # Centralized error handler & status formatting
│   │   ├── request.middleware.js# HTTP traffic logger
│   │   ├── role.middleware.js   # RBAC authorization guard
│   │   └── upload.middleware.js # Multer configuration & file type/size validation
│   ├── modules/
│   │   ├── auth/                # Authentication & Session Management
│   │   ├── dashboard/           # Dashboard aggregations & recent uploads
│   │   ├── files/               # File uploads, metadata, download, delete
│   │   ├── processing/          # Background worker & job lifecycle
│   │   └── users/               # User administration & profiles
│   ├── routes/
│   │   └── index.js             # Root v1 route aggregator
│   ├── utils/
│   │   ├── ApiError.js          # Operational error class
│   │   ├── ApiResponse.js       # Standardized response wrapper
│   │   └── asyncHandler.js      # Async handler wrapper
│   ├── app.js                   # Express application setup
│   └── server.js                # Server entry point & graceful shutdown
├── uploads/                     # Persistent upload directory
├── logs/                        # Error and combined structured log files
├── tests/                       # Automated Vitest integration test suites
├── .env.example                 # Example environment variables
├── Dockerfile                   # Production Dockerfile
└── package.json                 # NPM scripts & dependencies
```

## 3. Database & Prisma Migrations

PostgreSQL is accessed via Prisma ORM with the following models:
- **`User`**: UUID primary key, unique email, bcrypt-hashed password, `Role` enum (`USER`, `ADMIN`), timestamps.
- **`File`**: UUID primary key, foreign key relation to `User`, original filename, stored unique filename, MIME type, BigInt file size, disk storage path, `FileStatus` enum (`PENDING`, `PROCESSING`, `COMPLETED`, `FAILED`), integer progress percentage (0-100), optional error message, completed timestamp.

### Running Migrations
```bash
# Create and apply new migrations during development
npm run prisma:migrate:dev

# Deploy migrations in production or CI/CD
npm run prisma:migrate

# Open Prisma Studio web inspector
npm run prisma:studio
```

## 4. Authentication and RBAC

- Passwords are salt-hashed using `bcryptjs` with 10 salt rounds. Plain-text passwords or hashes are never exposed in API responses.
- Stateless authentication uses JSON Web Tokens (JWT) signed with a secret key and configured expiration.
- Roles:
  - `USER`: Can upload files, monitor real-time processing, list/search/download/delete their own files, and access their own dashboard metrics.
  - `ADMIN`: Has full visibility into system-wide dashboard statistics, all user accounts, and all files.

## 5. File Processing Workflow

1. User sends `POST /api/v1/files/upload` with a `multipart/form-data` payload containing a supported file.
2. `uploadMiddleware` validates file extension and MIME type, verifies size limits (<50MB), and writes the file to disk with a cryptographically secure random filename.
3. `fileService` creates a database record in PostgreSQL with status `PENDING` and progress `0`.
4. The HTTP response is returned **promptly** to the client with HTTP status 201.
5. The background processor (`processingService.scheduleProcessing`) queues the job asynchronously using `setImmediate`.
6. `processingWorker` marks the status as `PROCESSING` and simulates a realistic 25-second pipeline through 5 discrete stages:
   - Stage 1: Virus & integrity scan (5s, progress 25%)
   - Stage 2: Metadata & content extraction (5s, progress 50%)
   - Stage 3: Text indexing & semantic analysis (5s, progress 75%)
   - Stage 4: Thumbnail & preview generation (5s, progress 90%)
   - Stage 5: Final index persistence (4s, progress 100%, status `COMPLETED`)
7. If processing encounters an error or corruption (e.g. filename containing `fail`), status transitions to `FAILED` with a detailed error message.
8. If the server receives `SIGTERM` or `SIGINT`, the worker gracefully cancels active jobs and releases database connections.

> **Note on Prototype vs Production Queues:** The current background worker runs in-process using an event-driven task worker. For distributed production workloads across multiple container replicas, the `processingService` interface can be swapped for a persistent Redis queue (such as BullMQ) without changing controllers.

## 6. Testing

The backend includes automated integration tests using Vitest and Supertest:

```bash
npm test
```

