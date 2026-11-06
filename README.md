# Novastat — Full-Stack File Upload and Processing Management System

Novastat is an enterprise-grade full-stack file upload and processing management application built with a decoupled architecture: React (Vite) frontend, Node.js/Express REST API, Prisma ORM, and PostgreSQL.

Designed for scalability, security, and maintainability, it features a non-blocking 5-stage background processing engine (~25s lifecycle), real-time polling updates that persist across page refreshes, and role-based access control.

---

## Architecture Highlights

```
                                  +---------------------------+
                                  |    React.js + Vite UI     |
                                  |  Tailwind CSS + Context   |
                                  +-------------+-------------+
                                                |
                                      Axios (TLS / Bearer)
                                                |
                                                v
                                  +-------------+-------------+
                                  |   Express REST API Engine |
                                  |   (Auth, Files, Dashboard)|
                                  +-----+---------------+-----+
                                        |               |
                         Prompt Response|               | Non-blocking Job Trigger
                                        v               v
                        +---------------+--+      +-----+---------------------+
                        |  PostgreSQL 16   |      | In-Process Background     |
                        |   (Prisma ORM)   |<-----+ Worker (5 Stages, ~25s)   |
                        +------------------+      +---------------------------+
                                                        | Persists files
                                                        v
                                                  +-----+---------------------+
                                                  | Persistent Storage Volume |
                                                  | (uploads_data)            |
                                                  +---------------------------+
```

---

## Key Features

- **Authentication & User Management:**
  - Secure registration, login, and token-based sessions via JWT and `bcryptjs`.
  - Role-Based Access Control (`USER` and `ADMIN`).
  - Protected frontend routes and server-side authorization middleware.
  - Zero password or hash leakage in logs or responses.
- **Modern Responsive Dashboard:**
  - Database-driven metrics: Total Files, Completed Files, Processing Tasks, and Failed Tasks.
  - Live upload activity feed with row-level progress bars.
  - Admin view with system-wide file and user metrics.
- **File Upload & Validation Engine:**
  - Drag-and-drop and native file picker interfaces.
  - Dual client & server-side validation for file extensions and MIME content types.
  - 50MB file size limit enforcement.
  - Live upload progress tracking using Axios `onUploadProgress`.
  - Storage abstraction (`FileStorageService`) enabling seamless transitions from Docker persistent volumes to Amazon S3 or Google Cloud Storage without touching controllers.
- **Asynchronous 4-Stage Document Intelligence Pipeline (16–20s):**
  - Prompt HTTP responses (upload endpoint returns immediately upon saving file record).
  - Background worker executes discrete multi-stage workloads (~16-20 seconds total):
    - **Stage 1: PDF Validation (0–25%):** File signature (`%PDF-`) verification, 50MB size limit check, password/encryption detection, page metadata retrieval.
    - **Stage 2: Text Extraction (25–50%):** Text parsing via `pdf-parse`, per-page boundary mapping, page count recording, and scanned PDF detection without selectable text (reporting OCR requirement).
    - **Stage 3: Gemini AI Content Analysis (50–75%):** Official `@google/genai` SDK integration, token-conscious text chunking, extraction of main topics, key concepts, findings, terminology, facts, and conclusions.
    - **Stage 4: Summary Generation & Persistence (75–100%):** Strict JSON schema generation (title, overview, keyPoints, importantTerms, importantFacts, conclusion), JSON validation, and atomic commit to PostgreSQL.
  - Graceful cancellation on delete or server shutdown (`SIGTERM`, `SIGINT`).
  - Automatic failure detection with error messaging for corrupted payloads.
  - Document reprocessing via `POST /api/v1/files/:id/reprocess` allowing retries without re-uploading.
- **Document Intelligence View (File Details Page):**
  - **TAB 1: AI Summary:** Title, overview, bulleted key points, terminology dictionary, key facts & figures, overall conclusion.
  - **TAB 2: Extracted Text:** Complete selectable document content with page separation and one-click copy-to-clipboard.
  - **TAB 3: Document Information:** Filename, internal stored name, MIME type, page count, upload date, processing status, and completion timestamps.
- **Real-Time Polling Hook (`useFileStatus`):**
  - Smooth continuous polling every 1.5s while in non-terminal states.
  - Automatically halts on `COMPLETED` or `FAILED`.
  - Memory-safe unmount cleanup.
  - Status survives browser refreshes by pulling live database records.
- **File Management & User Isolation:**
  - Search by filename and filter by status (`ALL`, `PENDING`, `PROCESSING`, `COMPLETED`, `FAILED`).
  - Streaming file download for completed files.
  - Deletion with confirmation modals (removes physical disk file and database record).
  - Strict user isolation preventing unauthorized access to other users' files.

---

## Technology Stack

### Frontend
- **Framework:** React.js (v19) with Vite (v8)
- **Styling:** Tailwind CSS (v4)
- **Routing:** React Router DOM (v7)
- **HTTP Client:** Axios with request/response interceptors
- **Icons:** Lucide React
- **State Management:** React Context API

### Backend
- **Runtime:** Node.js (ES Modules)
- **Framework:** Express.js
- **Database ORM:** Prisma ORM (v5)
- **Database Engine:** PostgreSQL 16
- **PDF Extraction:** `pdf-parse`
- **AI Intelligence & Summarization:** Official Google Gen AI SDK (`@google/genai`)
- **Authentication:** JSON Web Tokens (`jsonwebtoken`) & `bcryptjs`
- **File Handling:** Multer (with disk storage & MIME validation)
- **Validation:** Zod schemas
- **Logging:** Winston (Console and File transports)
- **Security:** Helmet, CORS, and Express Rate Limit

### Infrastructure
- **Containerization:** Docker & multi-stage Dockerfiles
- **Orchestration:** Docker Compose
- **Web Server:** Nginx Alpine (production frontend reverse proxy)

---

## Directory Structure

```
Novastat/
├── client/                      # React Vite Frontend Application
│   ├── src/
│   │   ├── components/          # Reusable common, layout, files, and dashboard components
│   │   ├── context/             # AuthContext provider
│   │   ├── hooks/               # useAuth and useFileStatus polling hook
│   │   ├── pages/               # Login, Register, Dashboard, UploadFiles, FileHistory, FileDetails
│   │   ├── routes/              # ProtectedRoute and AppRoutes
│   │   ├── services/            # Axios API wrappers (authService, fileService)
│   │   └── utils/               # Formatting utilities
│   ├── Dockerfile               # Multi-stage production Nginx container
│   ├── nginx.conf               # Nginx reverse proxy configuration
│   └── package.json
│
├── server/                      # Node.js Express Backend API
│   ├── prisma/                  # schema.prisma and SQL migration history
│   ├── src/
│   │   ├── config/              # Environment (Zod), Database (Prisma), Winston Logger
│   │   ├── middleware/          # Auth, Role, Error, Request, and Upload middlewares
│   │   ├── modules/             # Auth, Users, Files, Processing, and Dashboard modules
│   │   ├── routes/              # Express API v1 route aggregator
│   │   ├── utils/               # ApiError, ApiResponse, asyncHandler
│   │   ├── app.js               # Express app configuration
│   │   └── server.js            # Server entrypoint and graceful shutdown
│   ├── tests/                   # Vitest automated integration test suites
│   ├── Dockerfile               # Production Node.js Alpine container
│   ├── entrypoint.sh            # Migration runner & production bootstrap
│   └── package.json
│
├── .env.example                 # Root environment variables template
├── API_DOCUMENTATION.md         # Detailed endpoint documentation
├── DEPLOYMENT.md                # Deployment and container orchestration guide
├── docker-compose.yml           # Production Docker Compose definition
├── package.json                 # Workspace root scripts
├── README.md                    # Main project overview and setup
└── REQUIREMENTS.md              # Requirements and acceptance verification matrix
```

---

## Quick Start with Docker Compose

Ensure Docker and Docker Compose are installed.

```bash
# 1. Clone repository
git clone <repo-url> novastat
cd novastat

# 2. Configure environment
cp .env.example .env

# 3. Build and launch all services
docker compose up --build
```

### URLs
- **Web Application:** [http://localhost:3000](http://localhost:3000)
- **Backend API:** [http://localhost:5000/api/v1](http://localhost:5000/api/v1)
- **Health Check:** [http://localhost:5000/api/v1/health](http://localhost:5000/api/v1/health)

---

## Local Development Setup (Manual)

### 1. PostgreSQL Database
Start a local PostgreSQL instance or run via Docker:
```bash
docker run -d --name novastat-postgres \
  -e POSTGRES_USER=novastat \
  -e POSTGRES_PASSWORD=novastat_password \
  -e POSTGRES_DB=novastat_db \
  -p 5432:5432 \
  postgres:16-alpine
```

### 2. Backend Server
```bash
cd server
cp .env.example .env
npm install

# Run database migrations
npm run prisma:migrate:dev

# Run automated tests
npm test

# Start backend server
npm start
```

### 3. Frontend Client
```bash
cd client
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## Testing

The project includes automated integration tests covering the authentication lifecycle, file upload validation, user isolation, and background processing workers:

```bash
cd server
npm test
```

### Test Coverage Highlights
- User registration, duplicate conflict checks, login, and token generation.
- `/api/v1/auth/me` verification and unauthenticated request rejection.
- Valid multipart file uploads, PENDING status issuance, and background task queueing.
- Unsupported file extension rejection.
- Filename search, status filtering, and pagination.
- Cross-user file access isolation (403 Forbidden).
- File deletion and persistent disk cleanup.
- Background worker state transitions (PENDING -> PROCESSING -> COMPLETED).
- Corrupt payload failure handling (FAILED status and error message).

---

## Environment Variables

| Variable | Description | Default |
|---|---|---|
| `PORT` | Backend HTTP port | `5000` |
| `NODE_ENV` | Runtime environment (`development`, `production`, `test`) | `development` |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://novastat:novastat_password@localhost:5432/novastat_db?schema=public` |
| `JWT_SECRET` | Secret key for JWT signing | `novastat_jwt_secure_secret_key_production_grade_32_chars` |
| `JWT_EXPIRES_IN` | Token duration | `7d` |
| `UPLOAD_DIR` | Directory for uploaded files | `uploads` |
| `MAX_FILE_SIZE` | Maximum file size in bytes | `52428800` (50MB) |
| `ALLOWED_MIME_TYPES` | Comma-separated list of permitted MIME types | PDF, Images, ZIP, TXT, JSON, CSV, DOCX, XLSX |
| `CLIENT_URL` | Frontend origin for CORS | `http://localhost:5173` |

---

## Documentation Links

- [REST API Documentation (API_DOCUMENTATION.md)](API_DOCUMENTATION.md)
- [Deployment Guide (DEPLOYMENT.md)](DEPLOYMENT.md)
- [Requirements & Acceptance Criteria (REQUIREMENTS.md)](REQUIREMENTS.md)
- [Backend Architecture Guide (server/README.md)](server/README.md)
- [Frontend Architecture Guide (client/README.md)](client/README.md)

